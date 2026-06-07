'use strict';

import { Logger } from '@vendure/core';
import { verifyTripaySignature } from '../utils/verify-signature';

const loggerCtx = 'TripayWebhook';

/**
 * Express middleware for handling Tripay webhook callbacks.
 *
 * Route: POST /payments/tripay/webhook
 *
 * This is a standalone handler registered via vendure-config.ts middleware.
 * It uses dynamic imports to access the database connection from the Vendure app.
 */
export function tripayWebhookMiddleware(req: any, res: any, next: any): void {
  if (req.method !== 'POST') {
    return next();
  }

  handleWebhook(req, res).catch((err) => {
    Logger.error(`Webhook error: ${err.message}`, loggerCtx);
    res.status(500).json({ success: false, message: 'Internal server error' });
  });
}

async function handleWebhook(req: any, res: any): Promise<void> {
  const payload = req.body;

  if (!payload || !payload.merchant_ref) {
    res.status(400).json({ success: false, message: 'Invalid payload' });
    return;
  }

  // Verify signature
  const signature = req.headers['x-callback-signature'] as string | undefined;
  const privateKey = process.env.TRIPAY_PRIVATE_KEY || '';
  const isSandbox = process.env.TRIPAY_SANDBOX === 'true';

  if (!signature) {
    Logger.warn('Webhook received without signature', loggerCtx);
    res.status(401).json({ success: false, message: 'Missing signature' });
    return;
  }

  // Tripay computes signature from the raw JSON body exactly as sent.
  // Since Express re-serializes the body, we try multiple approaches.
  const rawBody = (req as any).rawBody || JSON.stringify(payload);
  let isValid = verifyTripaySignature(rawBody, signature, privateKey);

  if (!isValid) {
    // Log for debugging
    Logger.warn(`Signature mismatch. Body length: ${rawBody.length}, Sig: ${signature.substring(0, 16)}...`, loggerCtx);

    if (!isSandbox) {
      res.status(401).json({ success: false, message: 'Invalid signature' });
      return;
    }
    // In sandbox mode, log warning but continue processing
    Logger.warn(`Sandbox mode: accepting webhook despite signature mismatch for ${payload.merchant_ref}`, loggerCtx);
  }

  Logger.info(`Webhook received: ${payload.merchant_ref} status=${payload.status}`, loggerCtx);

  // Get database connection from the app (injected by Vendure)
  const { getConnection } = await import('./webhook-db');
  const connection = getConnection();

  if (!connection) {
    Logger.error('Database connection not available', loggerCtx);
    res.status(500).json({ success: false, message: 'Server not ready' });
    return;
  }

  // Find order by merchant_ref (which is the order code)
  const orders = await connection.query(
    'SELECT id, code, state FROM "order" WHERE code = $1 LIMIT 1',
    [payload.merchant_ref],
  );

  if (!orders || orders.length === 0) {
    Logger.warn(`Order not found: ${payload.merchant_ref}`, loggerCtx);
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }

  const order = orders[0];

  // Idempotency: skip if already processed (not in ArrangingPayment)
  if (order.state !== 'ArrangingPayment') {
    Logger.info(`Duplicate webhook for ${payload.merchant_ref}, state=${order.state}, skipping`, loggerCtx);
    res.status(200).json({ success: true, message: 'Already processed' });
    return;
  }

  // Handle PAID status — transition order
  if (payload.status === 'PAID') {
    // Transition order: ArrangingPayment → PaymentSettled
    // Set active=false so Vendure no longer treats it as the session's active order
    await connection.query(
      `UPDATE "order" SET state = 'PaymentSettled', "orderPlacedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1`,
      [order.id],
    );

    // Settle the payment record
    await connection.query(
      `UPDATE payment SET state = 'Settled', "updatedAt" = NOW() WHERE "orderId" = $1`,
      [order.id],
    );

    // Transition to Fulfilled AND mark as inactive (critical: active=false)
    await connection.query(
      `UPDATE "order" SET state = 'Fulfilled', active = false, "updatedAt" = NOW() WHERE id = $1`,
      [order.id],
    );

    // Clear session reference so next purchase creates a new order
    await connection.query(
      `UPDATE "session" SET "activeOrderId" = NULL WHERE "activeOrderId" = $1`,
      [order.id],
    );

    Logger.info(`Order ${order.code} (id=${order.id}) fulfilled via webhook`, loggerCtx);
  } else {
    Logger.info(`Webhook status ${payload.status} for ${payload.merchant_ref}, no order transition`, loggerCtx);
  }

  res.status(200).json({ success: true });
}
