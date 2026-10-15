'use strict';

import { Logger } from '@vendure/core';
import { TripayWebhookPayload } from '@shared/types/tripay.types';
import { getWebhookApp } from './webhook-db';
import { TripayWebhookService } from '../services/tripay-webhook.service';

const loggerCtx = 'TripayWebhook';

/**
 * Express adapter for the Tripay webhook.
 *
 * This file only does HTTP plumbing — it reads the (raw) body and the
 * `X-Callback-Signature` header, resolves the DI-wired {@link TripayWebhookService}
 * from the bootstrapped Nest application, and forwards the request.
 *
 * All business logic (signature verification, order transitions, fulfillment)
 * lives in the service.
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
  const payload = req.body as TripayWebhookPayload;

  if (!payload || !payload.merchant_ref) {
    res.status(400).json({ success: false, message: 'Invalid payload' });
    return;
  }

  const app = getWebhookApp();
  if (!app) {
    Logger.error('Webhook received before application bootstrap completed', loggerCtx);
    res.status(503).json({ success: false, message: 'Server not ready' });
    return;
  }

  // Tripay signs the exact raw JSON body. Express re-serializes, so prefer the
  // captured raw body and fall back to a re-serialization.
  const rawBody: string = req.rawBody || JSON.stringify(payload);
  const signature = req.headers['x-callback-signature'] as string | undefined;

  const service = app.get(TripayWebhookService);
  const result = await service.handle(rawBody, signature, payload);

  res.status(result.statusCode).json(result.body);
}
