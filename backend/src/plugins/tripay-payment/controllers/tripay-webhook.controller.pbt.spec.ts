import * as crypto from 'crypto';
import * as fc from 'fast-check';
import {
  TripayWebhookController,
  TripayTransactionRepository,
  OrderService,
  WebhookLogger,
} from './tripay-webhook.controller';
import { TripayWebhookPayload } from '@shared/types/tripay.types';
import { TripayTransaction } from '../entities/tripay-transaction.entity';

/**
 * Property 4: Webhook Idempotency
 *
 * For any TripayWebhookPayload, processing the same webhook twice produces
 * the same final state. The second invocation is a no-op when the transaction
 * status is no longer UNPAID, resulting in no duplicate fulfillments or emails.
 *
 * **Validates: Requirements 2.6**
 */
describe('Property 4: Webhook Idempotency', () => {
  const PRIVATE_KEY = 'test-private-key-for-pbt';

  /**
   * Helper to compute HMAC SHA256 signature (simulates Tripay signing).
   */
  function sign(payload: string): string {
    return crypto.createHmac('sha256', PRIVATE_KEY).update(payload).digest('hex');
  }

  /**
   * Arbitrary for generating valid TripayWebhookPayload with PAID status.
   */
  const paidWebhookPayloadArbitrary = fc
    .record({
      reference: fc.stringMatching(/^T[0-9]{10,19}$/).filter((s) => s.length >= 11),
      merchant_ref: fc.stringMatching(/^ORD-[0-9]{3,10}$/).filter((s) => s.length >= 7),
      payment_method: fc.constantFrom('BRI Virtual Account', 'QRIS', 'OVO'),
      payment_method_code: fc.constantFrom('BRIVA', 'QRIS', 'OVO'),
      total_amount: fc.integer({ min: 10000, max: 100_000_000 }),
      fee_merchant: fc.integer({ min: 0, max: 10000 }),
      fee_customer: fc.integer({ min: 0, max: 10000 }),
      total_fee: fc.integer({ min: 0, max: 20000 }),
      amount_received: fc.integer({ min: 10000, max: 100_000_000 }),
      status: fc.constant('PAID' as const),
      paid_at: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(
        (d) => d.toISOString(),
      ),
    })
    .map((rec) => rec as TripayWebhookPayload);

  /**
   * Arbitrary for generating valid TripayWebhookPayload with any status.
   */
  const webhookPayloadArbitrary = fc
    .record({
      reference: fc.stringMatching(/^T[0-9]{10,19}$/).filter((s) => s.length >= 11),
      merchant_ref: fc.stringMatching(/^ORD-[0-9]{3,10}$/).filter((s) => s.length >= 7),
      payment_method: fc.constantFrom('BRI Virtual Account', 'QRIS', 'OVO'),
      payment_method_code: fc.constantFrom('BRIVA', 'QRIS', 'OVO'),
      total_amount: fc.integer({ min: 10000, max: 100_000_000 }),
      fee_merchant: fc.integer({ min: 0, max: 10000 }),
      fee_customer: fc.integer({ min: 0, max: 10000 }),
      total_fee: fc.integer({ min: 0, max: 20000 }),
      amount_received: fc.integer({ min: 10000, max: 100_000_000 }),
      status: fc.constantFrom('PAID' as const, 'EXPIRED' as const, 'FAILED' as const),
      paid_at: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(
        (d) => d.toISOString(),
      ),
    })
    .map((rec) => rec as TripayWebhookPayload);

  /**
   * Creates mock dependencies that track calls for assertion.
   * The transaction starts as UNPAID and transitions after first webhook processing.
   */
  function createMockDependencies(payload: TripayWebhookPayload) {
    let transactionStatus = 'UNPAID';
    let updateStatusCallCount = 0;
    let transitionCallCount = 0;

    const transaction: TripayTransaction = {
      id: 1,
      orderId: 'order-123',
      merchantRef: payload.merchant_ref,
      tripayReference: payload.reference,
      paymentMethod: payload.payment_method_code,
      amount: payload.total_amount,
      feeMerchant: 0,
      feeCustomer: 0,
      status: 'UNPAID',
      paymentUrl: 'https://tripay.co.id/checkout/test',
      expiredAt: null,
      paidAt: null,
    } as unknown as TripayTransaction;

    const transactionRepository: TripayTransactionRepository = {
      findByMerchantRef: jest.fn(async () => {
        // Return transaction with current status (simulates DB state)
        return { ...transaction, status: transactionStatus } as TripayTransaction;
      }),
      updateStatus: jest.fn(async (_id, data) => {
        transactionStatus = data.status;
        updateStatusCallCount++;
      }),
    };

    const orderService: OrderService = {
      getOrderState: jest.fn(async () => 'ArrangingPayment'),
      transitionToState: jest.fn(async () => {
        transitionCallCount++;
      }),
    };

    const logger: WebhookLogger = {
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    return {
      transactionRepository,
      orderService,
      logger,
      getUpdateStatusCallCount: () => updateStatusCallCount,
      getTransitionCallCount: () => transitionCallCount,
      getTransactionStatus: () => transactionStatus,
    };
  }

  it('processing the same PAID webhook twice: second invocation is a no-op (no duplicate fulfillments)', async () => {
    await fc.assert(
      fc.asyncProperty(paidWebhookPayloadArbitrary, async (payload) => {
        const mocks = createMockDependencies(payload);
        const controller = new TripayWebhookController(
          PRIVATE_KEY,
          mocks.transactionRepository,
          mocks.orderService,
          mocks.logger,
        );

        const rawBody = JSON.stringify(payload);
        const signature = sign(rawBody);

        // First invocation: should process normally
        const result1 = await controller.handleWebhook(rawBody, signature, payload);
        expect(result1.statusCode).toBe(200);
        expect(result1.body.success).toBe(true);

        // Capture state after first invocation
        const updateCountAfterFirst = mocks.getUpdateStatusCallCount();
        const transitionCountAfterFirst = mocks.getTransitionCallCount();

        // Second invocation: should be a no-op (idempotent)
        const result2 = await controller.handleWebhook(rawBody, signature, payload);
        expect(result2.statusCode).toBe(200);
        expect(result2.body.success).toBe(true);

        // Verify no additional state changes occurred on second invocation
        const updateCountAfterSecond = mocks.getUpdateStatusCallCount();
        const transitionCountAfterSecond = mocks.getTransitionCallCount();

        expect(updateCountAfterSecond).toBe(updateCountAfterFirst);
        expect(transitionCountAfterSecond).toBe(transitionCountAfterFirst);
      }),
      { numRuns: 100 },
    );
  });

  it('processing the same webhook (any status) twice: second invocation produces no additional state mutations', async () => {
    await fc.assert(
      fc.asyncProperty(webhookPayloadArbitrary, async (payload) => {
        const mocks = createMockDependencies(payload);
        const controller = new TripayWebhookController(
          PRIVATE_KEY,
          mocks.transactionRepository,
          mocks.orderService,
          mocks.logger,
        );

        const rawBody = JSON.stringify(payload);
        const signature = sign(rawBody);

        // First invocation
        const result1 = await controller.handleWebhook(rawBody, signature, payload);
        expect(result1.statusCode).toBe(200);

        const updateCountAfterFirst = mocks.getUpdateStatusCallCount();
        const transitionCountAfterFirst = mocks.getTransitionCallCount();

        // Second invocation: idempotent - no additional mutations
        const result2 = await controller.handleWebhook(rawBody, signature, payload);
        expect(result2.statusCode).toBe(200);
        expect(result2.body.success).toBe(true);

        // No additional updateStatus or transitionToState calls
        expect(mocks.getUpdateStatusCallCount()).toBe(updateCountAfterFirst);
        expect(mocks.getTransitionCallCount()).toBe(transitionCountAfterFirst);
      }),
      { numRuns: 100 },
    );
  });

  it('final transaction status is the same whether webhook is processed once or twice', async () => {
    await fc.assert(
      fc.asyncProperty(webhookPayloadArbitrary, async (payload) => {
        const mocks = createMockDependencies(payload);
        const controller = new TripayWebhookController(
          PRIVATE_KEY,
          mocks.transactionRepository,
          mocks.orderService,
          mocks.logger,
        );

        const rawBody = JSON.stringify(payload);
        const signature = sign(rawBody);

        // Process first time
        await controller.handleWebhook(rawBody, signature, payload);
        const statusAfterFirst = mocks.getTransactionStatus();

        // Process second time
        await controller.handleWebhook(rawBody, signature, payload);
        const statusAfterSecond = mocks.getTransactionStatus();

        // Final state is identical
        expect(statusAfterSecond).toBe(statusAfterFirst);
      }),
      { numRuns: 100 },
    );
  });
});
