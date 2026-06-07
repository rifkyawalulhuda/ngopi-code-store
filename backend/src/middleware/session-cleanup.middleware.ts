'use strict';

import { Logger } from '@vendure/core';

const loggerCtx = 'SessionCleanup';

/**
 * Middleware that detects and fixes stale sessions where activeOrderId
 * references a completed/fulfilled order. This happens after webhook
 * fulfillment via raw SQL (which doesn't clear Vendure's in-memory session cache).
 *
 * When detected, it nullifies the activeOrderId so Vendure creates a new order
 * on the next addItemToOrder call.
 */
export function sessionCleanupMiddleware(req: any, res: any, next: any): void {
  // Only run on shop-api POST requests
  if (req.method !== 'POST') {
    return next();
  }

  const body = req.body;
  if (!body || typeof body.query !== 'string') {
    return next();
  }

  // Only intercept addItemToOrder mutations
  if (!body.query.includes('addItemToOrder')) {
    return next();
  }

  // After the response is sent, check if there was an OrderModificationError
  // and proactively clean the session
  const originalJson = res.json.bind(res);
  res.json = function(data: any) {
    // Check if response contains OrderModificationError for state issues
    const responseStr = JSON.stringify(data);
    if (responseStr.includes('OrderModificationError') && responseStr.includes('AddingItems')) {
      // Session has a stale activeOrder — clean it up asynchronously
      cleanStaleSession(req).catch(err => {
        Logger.warn(`Session cleanup failed: ${err.message}`, loggerCtx);
      });
    }
    return originalJson(data);
  };

  next();
}

async function cleanStaleSession(req: any): Promise<void> {
  try {
    // Access the DataSource from the app
    const { getConnection } = await import('../plugins/tripay-payment/middleware/webhook-db');
    const connection = getConnection();
    if (!connection) return;

    // Get session token from cookie or auth header
    const sessionToken = req.headers?.['vendure-token'] || 
      req.cookies?.['session'] ||
      req.cookies?.['vendure-token'];

    if (!sessionToken) return;

    // Clear activeOrderId for sessions with fulfilled orders
    await connection.query(`
      UPDATE "session" s
      SET "activeOrderId" = NULL
      FROM "order" o
      WHERE s."activeOrderId" = o.id
        AND o.state IN ('Fulfilled', 'Delivered', 'PaymentSettled', 'Cancelled')
        AND s.token = $1
    `, [sessionToken]);

    Logger.info('Cleaned stale session activeOrderId', loggerCtx);
  } catch {
    // Silent fail — don't break the request
  }
}
