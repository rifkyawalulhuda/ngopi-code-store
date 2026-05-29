import * as fc from 'fast-check';
import {
  TripayWebhookController,
  TripayTransactionRepository,
  OrderService,
  WebhookLogger,
} from './tripay-webhook.controller';
import { TripayWebhookPayload } from '@shared/types/tripay.types';
import { TripayTransaction } from '../entities/tripay-transaction.entity';
import * as crypto from 'crypto';

/**
 * Property 8: Non-PAID Webhook Does Not Trigger Fulfillment
 *
 * For any webhook with status EXPIRED or FAILED, only the TripayTransaction
 * status is updated. The order state remains unchanged and no Download_Records
 * are created.
 *
 * **Validates: Requirements 2.5**
 */
describe('Property 8: Non-PAID Webhook Does Not Trigger Fulfillment', () => {
  const PRIVATE_KEY = 'test-private-key-for-pbt';

  /**
   * Helper to compute a valid HMAC SHA256 signature for a payload.
   */
  function sign(payload: string): string {
    return crypto.createHmac('sha256', PRIVATE_KEY).update(payload).digest('hex');
  }

  /**
   * Arbitrary for generating non-PAID webhook statuses (EXPIRED or FAILED).
   */
  const nonPaidStatusArbitrary = fc.constantFrom<'EXPIRED' | 'FAILED'>('EXPIRED', 'FAILED');

  /**
   * Arbitrary for generating realistic merchant references.
   */
  const merchantRefArbitrary = fc.stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'),
    { minLength: 3, maxLength: 20 },
  ).map((s) => `ORD-${s}`);

  /**
   * Arbitrary for generating Tripay references.
   */
  const tripayReferenceArbitrary = fc.stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
    { minLength: 10, maxLength: 25 },
  ).map((s) => `T${s}`);

  /**
   * Arbitrary for generating payment method codes.
   */
  const paymentMethodArbitrary = fc.constantFrom(
    'BRIVA', 'QRIS', 'OVO', 'DANA', 'BCAVA', 'MANDIRIVA',
  );

  /**
   * Arbitrary for generating positive amounts.
   */
  const amountArbitrary = fc.integer({ min: 1000, max: 100_000_000 });

  /**
   * Arbitrary for generating fee values.
   */
  const feeArbitrary = fc.integer({ min: 0, max: 10_000 });

  /**
   * Arbitrary for generating a complete non-PAID webhook payload.
   */
  const nonPaidWebhookArbitrary = fc.record({
    reference: tripayReferenceArbitrary,
    merchant_ref: merchantRefArbitrary,
    payment_method: paymentMethodArbitrary,
    payment_method_code: paymentMethodArbitrary,
    total_amount: amountArbitrary,
    fee_merchant: feeArbitrary,
    fee_customer: feeArbitrary,
    total_fee: feeArbitrary,
    amount_received: fc.constant(0),
    status: nonPaidStatusArbitrary,
    paid_at: fc.constant(''),
  }) as fc.Arbitrary<TripayWebhookPayload>;

  /**
   * Arbitrary for generating order IDs.
   */
  const orderIdArbitrary = fc.integer({ min: 1, max: 100_000 }).map(String);

  it('should only update transaction status and never transition order state for EXPIRED/FAILED webhooks', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonPaidWebhookArbitrary,
        orderIdArbitrary,
        async (payload, orderId) => {
          // Track all calls to verify isolation
          const updateStatusCalls: Array<{
            id: string | number;
            data: { status: string; feeMerchant?: number; feeCustomer?: number; paidAt?: Date | null };
          }> = [];
          const orderTransitionCalls: Array<{ orderId: string | number; state: string }> = [];

          // Create a mock transaction that is UNPAID (eligible for processing)
          const mockTransaction: TripayTransaction = Object.assign(
            new TripayTransaction(),
            {
              id: '1',
              orderId,
              merchantRef: payload.merchant_ref,
              tripayReference: payload.reference,
              paymentMethod: payload.payment_method,
              amount: payload.total_amount,
              feeMerchant: 0,
              feeCustomer: 0,
              status: 'UNPAID',
              paymentUrl: 'https://tripay.co.id/checkout/test',
              expiredAt: null,
              paidAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          );

          const mockRepository: TripayTransactionRepository = {
            findByMerchantRef: jest.fn().mockResolvedValue(mockTransaction),
            updateStatus: jest.fn().mockImplementation((id, data) => {
              updateStatusCalls.push({ id, data });
              return Promise.resolve();
            }),
          };

          const mockOrderService: OrderService = {
            getOrderState: jest.fn().mockResolvedValue('ArrangingPayment'),
            transitionToState: jest.fn().mockImplementation((oid, state) => {
              orderTransitionCalls.push({ orderId: oid, state });
              return Promise.resolve();
            }),
          };

          const mockLogger: WebhookLogger = {
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
          };

          const controller = new TripayWebhookController(
            PRIVATE_KEY,
            mockRepository,
            mockOrderService,
            mockLogger,
          );

          // Sign the payload to pass signature verification
          const rawBody = JSON.stringify(payload);
          const signature = sign(rawBody);

          // Process the webhook
          const result = await controller.handleWebhook(rawBody, signature, payload);

          // Verify HTTP 200 returned
          expect(result.statusCode).toBe(200);
          expect(result.body.success).toBe(true);

          // Verify transaction status was updated
          expect(updateStatusCalls.length).toBe(1);
          expect(updateStatusCalls[0].data.status).toBe(payload.status);
          expect(updateStatusCalls[0].data.paidAt).toBeNull();

          // CRITICAL: Verify order state was NEVER transitioned
          expect(orderTransitionCalls.length).toBe(0);
          expect(mockOrderService.transitionToState).not.toHaveBeenCalled();

          // CRITICAL: Verify getOrderState was never called (no order interaction)
          expect(mockOrderService.getOrderState).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 150 },
    );
  });

  it('should not create any Download_Records for EXPIRED/FAILED webhooks', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonPaidWebhookArbitrary,
        orderIdArbitrary,
        async (payload, orderId) => {
          // Track any attempt to create download records
          // In the real system, download records are created via the order fulfillment flow.
          // If the order is never transitioned, no download records should be created.
          let downloadRecordsCreated = 0;

          const mockTransaction: TripayTransaction = Object.assign(
            new TripayTransaction(),
            {
              id: '1',
              orderId,
              merchantRef: payload.merchant_ref,
              tripayReference: payload.reference,
              paymentMethod: payload.payment_method,
              amount: payload.total_amount,
              feeMerchant: 0,
              feeCustomer: 0,
              status: 'UNPAID',
              paymentUrl: 'https://tripay.co.id/checkout/test',
              expiredAt: null,
              paidAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          );

          const mockRepository: TripayTransactionRepository = {
            findByMerchantRef: jest.fn().mockResolvedValue(mockTransaction),
            updateStatus: jest.fn().mockResolvedValue(undefined),
          };

          // The order service should never be called for non-PAID webhooks
          // If transitionToState is called with 'Fulfilled', that would trigger
          // download record creation in the real system
          const mockOrderService: OrderService = {
            getOrderState: jest.fn().mockResolvedValue('ArrangingPayment'),
            transitionToState: jest.fn().mockImplementation(() => {
              // If this is called, it means the system is incorrectly trying to fulfill
              downloadRecordsCreated++;
              return Promise.resolve();
            }),
          };

          const mockLogger: WebhookLogger = {
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
          };

          const controller = new TripayWebhookController(
            PRIVATE_KEY,
            mockRepository,
            mockOrderService,
            mockLogger,
          );

          const rawBody = JSON.stringify(payload);
          const signature = sign(rawBody);

          const result = await controller.handleWebhook(rawBody, signature, payload);

          // No download records should be created (no order transitions happened)
          expect(downloadRecordsCreated).toBe(0);
          expect(mockOrderService.transitionToState).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 150 },
    );
  });

  it('should update transaction with correct fee data from EXPIRED/FAILED webhooks', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonPaidWebhookArbitrary,
        orderIdArbitrary,
        async (payload, orderId) => {
          const updateStatusCalls: Array<{
            id: string | number;
            data: { status: string; feeMerchant?: number; feeCustomer?: number; paidAt?: Date | null };
          }> = [];

          const mockTransaction: TripayTransaction = Object.assign(
            new TripayTransaction(),
            {
              id: '42',
              orderId,
              merchantRef: payload.merchant_ref,
              tripayReference: payload.reference,
              paymentMethod: payload.payment_method,
              amount: payload.total_amount,
              feeMerchant: 0,
              feeCustomer: 0,
              status: 'UNPAID',
              paymentUrl: 'https://tripay.co.id/checkout/test',
              expiredAt: null,
              paidAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          );

          const mockRepository: TripayTransactionRepository = {
            findByMerchantRef: jest.fn().mockResolvedValue(mockTransaction),
            updateStatus: jest.fn().mockImplementation((id, data) => {
              updateStatusCalls.push({ id, data });
              return Promise.resolve();
            }),
          };

          const mockOrderService: OrderService = {
            getOrderState: jest.fn(),
            transitionToState: jest.fn(),
          };

          const mockLogger: WebhookLogger = {
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
          };

          const controller = new TripayWebhookController(
            PRIVATE_KEY,
            mockRepository,
            mockOrderService,
            mockLogger,
          );

          const rawBody = JSON.stringify(payload);
          const signature = sign(rawBody);

          await controller.handleWebhook(rawBody, signature, payload);

          // Verify the transaction was updated with the correct data
          expect(updateStatusCalls.length).toBe(1);
          expect(updateStatusCalls[0].id).toBe('42');
          expect(updateStatusCalls[0].data.status).toBe(payload.status);
          expect(updateStatusCalls[0].data.feeMerchant).toBe(payload.fee_merchant);
          expect(updateStatusCalls[0].data.feeCustomer).toBe(payload.fee_customer);
          // paidAt should always be null for non-PAID webhooks
          expect(updateStatusCalls[0].data.paidAt).toBeNull();
        },
      ),
      { numRuns: 150 },
    );
  });
});
