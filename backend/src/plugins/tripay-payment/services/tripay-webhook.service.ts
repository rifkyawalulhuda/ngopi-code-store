import { Injectable } from '@nestjs/common';
import {
  Logger,
  Order,
  OrderService,
  RequestContextService,
  TransactionalConnection,
} from '@vendure/core';
import { TripayWebhookPayload } from '@shared/types/tripay.types';
import { verifyTripaySignature } from '../utils/verify-signature';
import { TripayTransaction } from '../entities/tripay-transaction.entity';
import { OrderFulfillmentQueue } from '../../digital-fulfillment/services/order-fulfillment-queue.service';

const loggerCtx = 'TripayWebhook';

export interface WebhookHttpResult {
  statusCode: number;
  body: { success: boolean; message?: string };
}

/**
 * TripayWebhookService
 *
 * The DI-wired webhook brain. Replaces the previous raw-SQL-only handler:
 *
 *  1. Verifies the HMAC signature.
 *  2. Resolves the Order by code (Tripay's `merchant_ref`).
 *  3. On PAID: records the transaction as PAID, transitions the order through
 *     PaymentSettled → Fulfilled via {@link OrderService}, then runs the real
 *     {@link OrderFulfillmentRunner} (hidden guest User + download records +
 *     receipt email with the magic link).
 *  4. On EXPIRED/FAILED: cancels the order and its pending payment.
 *
 * The custom order process (`customOrderProcess`) does not flip `active`/clear
 * the session the way the default process does, so those two updates are
 * applied explicitly — matching the previous behaviour.
 */
@Injectable()
export class TripayWebhookService {
  constructor(
    private connection: TransactionalConnection,
    private orderService: OrderService,
    private requestContextService: RequestContextService,
    private fulfillmentQueue: OrderFulfillmentQueue,
  ) {}

  async handle(
    rawBody: string,
    signature: string | undefined,
    payload: TripayWebhookPayload,
  ): Promise<WebhookHttpResult> {
    if (!payload || !payload.merchant_ref) {
      return { statusCode: 400, body: { success: false, message: 'Invalid payload' } };
    }

    if (!signature) {
      Logger.warn('Webhook received without signature', loggerCtx);
      return { statusCode: 401, body: { success: false, message: 'Missing signature' } };
    }

    const privateKey = process.env.TRIPAY_PRIVATE_KEY || '';
    const isSandbox = process.env.TRIPAY_SANDBOX === 'true';
    const isValid = verifyTripaySignature(rawBody, signature, privateKey);
    if (!isValid && !isSandbox) {
      Logger.warn(`Invalid webhook signature for ${payload.merchant_ref}`, loggerCtx);
      return { statusCode: 401, body: { success: false, message: 'Invalid signature' } };
    }

    const ctx = await this.requestContextService.create({ apiType: 'shop' });

    const orders = await this.connection.rawConnection.query(
      'SELECT id, code, state FROM "order" WHERE code = $1 LIMIT 1',
      [payload.merchant_ref],
    );
    if (!orders || orders.length === 0) {
      Logger.warn(`Order not found: ${payload.merchant_ref}`, loggerCtx);
      return { statusCode: 404, body: { success: false, message: 'Order not found' } };
    }

    const orderId = orders[0].id as number;

    // Idempotency: anything not awaiting payment has already been processed.
    if (orders[0].state !== 'ArrangingPayment') {
      Logger.info(
        `Duplicate webhook for ${payload.merchant_ref} (state=${orders[0].state}), skipping`,
        loggerCtx,
      );
      return { statusCode: 200, body: { success: true, message: 'Already processed' } };
    }

    if (payload.status === 'PAID') {
      return this.handlePaid(ctx, orderId, payload);
    }

    if (payload.status === 'EXPIRED' || payload.status === 'FAILED') {
      return this.handleFailed(ctx, orderId, payload);
    }

    Logger.info(`Webhook status ${payload.status} for ${payload.merchant_ref}: no action`, loggerCtx);
    return { statusCode: 200, body: { success: true } };
  }

  private async handlePaid(
    ctx: Awaited<ReturnType<RequestContextService['create']>>,
    orderId: number,
    payload: TripayWebhookPayload,
  ): Promise<WebhookHttpResult> {
    const order = await this.connection
      .getRepository(ctx, Order)
      .findOne({ where: { id: orderId } });
    if (!order) {
      return { statusCode: 404, body: { success: false, message: 'Order not found' } };
    }

    // Record the transaction as PAID so the order-process payment guard passes.
    await this.upsertPaidTransaction(ctx, order, payload);

    // ArrangingPayment → PaymentSettled → Fulfilled
    const settled = await this.orderService.transitionToState(ctx, order.id, 'PaymentSettled');
    if ((settled as any).errorCode) {
      Logger.error(
        `Failed to settle order ${order.code}: ${(settled as any).message}`,
        loggerCtx,
      );
      return { statusCode: 500, body: { success: false, message: 'State transition failed' } };
    }

    const fulfilled = await this.orderService.transitionToState(
      ctx,
      order.id,
      'Fulfilled' as any,
    );
    if ((fulfilled as any).errorCode) {
      Logger.error(
        `Failed to fulfil order ${order.code}: ${(fulfilled as any).message}`,
        loggerCtx,
      );
      return { statusCode: 500, body: { success: false, message: 'State transition failed' } };
    }

    // Custom process does not clear these automatically.
    await this.connection.rawConnection.query(
      `UPDATE "order" SET active = false, "updatedAt" = NOW() WHERE id = $1`,
      [order.id],
    );
    await this.connection.rawConnection.query(
      `UPDATE "session" SET "activeOrderId" = NULL WHERE "activeOrderId" = $1`,
      [order.id],
    );

    // Real fulfillment (hidden guest User + downloads + receipt email +
    // WhatsApp) is queued rather than awaited: the webhook must acknowledge
    // Tripay quickly, and the queue retries transient delivery failures.
    await this.fulfillmentQueue.enqueue(order.id);

    Logger.info(`Order ${order.code} paid; fulfillment queued`, loggerCtx);
    return { statusCode: 200, body: { success: true } };
  }

  private async handleFailed(
    ctx: Awaited<ReturnType<RequestContextService['create']>>,
    orderId: number,
    payload: TripayWebhookPayload,
  ): Promise<WebhookHttpResult> {
    await this.connection.rawConnection.query(
      `UPDATE "order" SET state = 'Cancelled', active = false, "updatedAt" = NOW() WHERE id = $1`,
      [orderId],
    );
    await this.connection.rawConnection.query(
      `UPDATE payment SET state = 'Cancelled', "updatedAt" = NOW() WHERE "orderId" = $1`,
      [orderId],
    );
    await this.connection
      .getRepository(ctx, TripayTransaction)
      .createQueryBuilder()
      .update()
      .set({ status: payload.status })
      .where('"merchantRef" = :ref', { ref: payload.merchant_ref })
      .execute();
    await this.connection.rawConnection.query(
      `UPDATE "session" SET "activeOrderId" = NULL WHERE "activeOrderId" = $1`,
      [orderId],
    );

    Logger.info(
      `Order ${payload.merchant_ref} cancelled — payment ${payload.status}`,
      loggerCtx,
    );
    return { statusCode: 200, body: { success: true } };
  }

  /** Upserts the TripayTransaction as PAID for the order. */
  private async upsertPaidTransaction(
    ctx: Awaited<ReturnType<RequestContextService['create']>>,
    order: Order,
    payload: TripayWebhookPayload,
  ): Promise<void> {
    const repo = this.connection.getRepository(ctx, TripayTransaction);
    const existing = await repo.findOne({ where: { merchantRef: payload.merchant_ref } });

    const paidAt = payload.paid_at ? new Date(payload.paid_at) : new Date();

    if (existing) {
      existing.status = 'PAID';
      existing.paidAt = paidAt;
      existing.feeMerchant = payload.fee_merchant ?? existing.feeMerchant;
      existing.feeCustomer = payload.fee_customer ?? existing.feeCustomer;
      await repo.save(existing);
      return;
    }

    await repo.save(
      new TripayTransaction({
        orderId: order.id,
        merchantRef: payload.merchant_ref,
        tripayReference: payload.reference ?? '',
        paymentMethod: payload.payment_method ?? 'tripay',
        amount: order.totalWithTax,
        feeMerchant: payload.fee_merchant ?? 0,
        feeCustomer: payload.fee_customer ?? 0,
        status: 'PAID',
        paidAt,
      }),
    );
  }
}
