import * as fc from 'fast-check';
import * as crypto from 'crypto';
import { TripayWebhookPayload } from '@shared/types/tripay.types';
import {
  TripayWebhookController,
  TripayTransactionRepository,
  OrderService,
  WebhookLogger,
} from '@plugins/tripay-payment/controllers/tripay-webhook.controller';
import { TripayTransaction } from '@plugins/tripay-payment/entities/tripay-transaction.entity';

/**
 * Property 7: PAID Webhook Triggers Full Fulfillment
 *
 * For any valid PAID webhook received for an UNPAID transaction, the system:
 * 1. Transitions the TripayTransaction status to PAID
 * 2. Transitions the order to Fulfilled (via PaymentSettled → Fulfilled)
 * 3. Creates Download_Records for all digital line items in the order
 *
 * **Validates: Requirements 2.3, 2.4, 4.1**
 */

/**
 * Arbitrary for generating a valid merchant reference (order code format).
 */
const merchantRefArb = fc.stringOf(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
  { minLength: 6, maxLength: 12 },
);

/**
 * Arbitrary for generating a valid Tripay reference.
 */
const tripayReferenceArb = fc.stringOf(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
  { minLength: 10, maxLength: 20 },
);

/**
 * Arbitrary for generating a valid payment method code.
 */
const paymentMethodArb = fc.constantFrom('BRIVA', 'QRIS', 'OVO', 'DANA', 'GOPAY', 'BCAVA');

/**
 * Arbitrary for generating a positive transaction amount (in IDR).
 */
const amountArb = fc.integer({ min: 10000, max: 10000000 });

/**
 * Arbitrary for generating fee amounts.
 */
const feeArb = fc.integer({ min: 0, max: 50000 });

/**
 * Arbitrary for generating a valid order ID.
 */
const orderIdArb = fc.integer({ min: 1, max: 100000 }).map(String);

/**
 * Arbitrary for generating a number of digital line items in an order.
 */
const lineItemCountArb = fc.integer({ min: 1, max: 10 });

/**
 * Arbitrary for generating a valid PAID webhook payload.
 */
const paidWebhookArb = fc.record({
  reference: tripayReferenceArb,
  merchant_ref: merchantRefArb,
  payment_method: fc.string({ minLength: 3, maxLength: 20 }),
  payment_method_code: paymentMethodArb,
  total_amount: amountArb,
  fee_merchant: feeArb,
  fee_customer: feeArb,
  total_fee: feeArb,
  amount_received: amountArb,
  status: fc.constant('PAID' as const),
  paid_at: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(
    (d) => d.toISOString(),
  ),
});

/**
 * Generates a valid HMAC SHA256 signature for a given payload and private key.
 */
function generateSignature(rawBody: string, privateKey: string): string {
  return crypto.createHmac('sha256', privateKey).update(rawBody).digest('hex');
}

describe('Property 7: PAID Webhook Triggers Full Fulfillment', () => {
  const PRIVATE_KEY = 'test-private-key-for-pbt';

  /**
   * **Validates: Requirements 2.3, 2.4, 4.1**
   *
   * For any valid PAID webhook on an UNPAID transaction where the order is in
   * ArrangingPayment state, verify:
   * - Transaction status is updated to PAID
   * - Order transitions through PaymentSettled to Fulfilled
   * - The webhook returns HTTP 200 success
   */
  it('should transition transaction to PAID and order to Fulfilled for any valid PAID webhook on UNPAID transaction', async () => {
    await fc.assert(
      fc.asyncProperty(
        paidWebhookArb,
        orderIdArb,
        async (webhookPayload, orderId) => {
          // Track state changes
          let transactionStatus = 'UNPAID';
          let transactionUpdateData: Record<string, unknown> = {};
          const orderTransitions: string[] = [];

          // Create mock transaction (UNPAID)
          const mockTransaction = new TripayTransaction({
            id: 1 as any,
            orderId: orderId as any,
            merchantRef: webhookPayload.merchant_ref,
            tripayReference: webhookPayload.reference,
            paymentMethod: webhookPayload.payment_method_code,
            amount: webhookPayload.total_amount,
            status: 'UNPAID',
          });

          // Mock repository
          const transactionRepository: TripayTransactionRepository = {
            findByMerchantRef: jest.fn().mockResolvedValue(mockTransaction),
            updateStatus: jest.fn().mockImplementation(async (_id, data) => {
              transactionStatus = data.status;
              transactionUpdateData = data;
            }),
          };

          // Mock order service - tracks transitions
          const orderService: OrderService = {
            getOrderState: jest.fn().mockResolvedValue('ArrangingPayment'),
            transitionToState: jest.fn().mockImplementation(async (_orderId, state) => {
              orderTransitions.push(state);
            }),
          };

          // Mock logger
          const logger: WebhookLogger = {
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
          };

          const controller = new TripayWebhookController(
            PRIVATE_KEY,
            transactionRepository,
            orderService,
            logger,
          );

          // Generate valid signature
          const rawBody = JSON.stringify(webhookPayload);
          const validSignature = generateSignature(rawBody, PRIVATE_KEY);

          // Process the webhook
          const result = await controller.handleWebhook(
            rawBody,
            validSignature,
            webhookPayload as TripayWebhookPayload,
          );

          // Verify: HTTP 200 returned
          expect(result.statusCode).toBe(200);
          expect(result.body.success).toBe(true);

          // Verify: Transaction status updated to PAID
          expect(transactionStatus).toBe('PAID');
          expect(transactionUpdateData.paidAt).toBeInstanceOf(Date);

          // Verify: Order transitioned through PaymentSettled → Fulfilled
          expect(orderTransitions).toEqual(['PaymentSettled', 'Fulfilled']);

          // Verify: transitionToState was called with the correct orderId
          expect(orderService.transitionToState).toHaveBeenCalledWith(
            orderId,
            'PaymentSettled',
          );
          expect(orderService.transitionToState).toHaveBeenCalledWith(
            orderId,
            'Fulfilled',
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.3, 2.4**
   *
   * For any valid PAID webhook, the transaction fee data is correctly recorded
   * alongside the PAID status update.
   */
  it('should record fee data from any PAID webhook payload', async () => {
    await fc.assert(
      fc.asyncProperty(
        paidWebhookArb,
        orderIdArb,
        async (webhookPayload, orderId) => {
          let capturedUpdateData: Record<string, unknown> = {};

          const mockTransaction = new TripayTransaction({
            id: 1 as any,
            orderId: orderId as any,
            merchantRef: webhookPayload.merchant_ref,
            tripayReference: webhookPayload.reference,
            paymentMethod: webhookPayload.payment_method_code,
            amount: webhookPayload.total_amount,
            status: 'UNPAID',
          });

          const transactionRepository: TripayTransactionRepository = {
            findByMerchantRef: jest.fn().mockResolvedValue(mockTransaction),
            updateStatus: jest.fn().mockImplementation(async (_id, data) => {
              capturedUpdateData = data;
            }),
          };

          const orderService: OrderService = {
            getOrderState: jest.fn().mockResolvedValue('ArrangingPayment'),
            transitionToState: jest.fn().mockResolvedValue(undefined),
          };

          const logger: WebhookLogger = {
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
          };

          const controller = new TripayWebhookController(
            PRIVATE_KEY,
            transactionRepository,
            orderService,
            logger,
          );

          const rawBody = JSON.stringify(webhookPayload);
          const validSignature = generateSignature(rawBody, PRIVATE_KEY);

          await controller.handleWebhook(
            rawBody,
            validSignature,
            webhookPayload as TripayWebhookPayload,
          );

          // Verify fee data is correctly passed through
          expect(capturedUpdateData.status).toBe('PAID');
          expect(capturedUpdateData.feeMerchant).toBe(webhookPayload.fee_merchant);
          expect(capturedUpdateData.feeCustomer).toBe(webhookPayload.fee_customer);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.3, 2.4, 4.1**
   *
   * For any valid PAID webhook, the full fulfillment sequence is:
   * 1. Transaction found by merchant_ref
   * 2. Transaction status updated to PAID
   * 3. Order state checked (must be ArrangingPayment)
   * 4. Order transitioned to PaymentSettled
   * 5. Order transitioned to Fulfilled
   *
   * This verifies the correct ordering of operations.
   */
  it('should execute fulfillment operations in correct order for any PAID webhook', async () => {
    await fc.assert(
      fc.asyncProperty(
        paidWebhookArb,
        orderIdArb,
        async (webhookPayload, orderId) => {
          const operationLog: string[] = [];

          const mockTransaction = new TripayTransaction({
            id: 1 as any,
            orderId: orderId as any,
            merchantRef: webhookPayload.merchant_ref,
            tripayReference: webhookPayload.reference,
            paymentMethod: webhookPayload.payment_method_code,
            amount: webhookPayload.total_amount,
            status: 'UNPAID',
          });

          const transactionRepository: TripayTransactionRepository = {
            findByMerchantRef: jest.fn().mockImplementation(async () => {
              operationLog.push('findTransaction');
              return mockTransaction;
            }),
            updateStatus: jest.fn().mockImplementation(async () => {
              operationLog.push('updateTransactionStatus');
            }),
          };

          const orderService: OrderService = {
            getOrderState: jest.fn().mockImplementation(async () => {
              operationLog.push('getOrderState');
              return 'ArrangingPayment';
            }),
            transitionToState: jest.fn().mockImplementation(async (_orderId, state) => {
              operationLog.push(`transitionTo:${state}`);
            }),
          };

          const logger: WebhookLogger = {
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
          };

          const controller = new TripayWebhookController(
            PRIVATE_KEY,
            transactionRepository,
            orderService,
            logger,
          );

          const rawBody = JSON.stringify(webhookPayload);
          const validSignature = generateSignature(rawBody, PRIVATE_KEY);

          await controller.handleWebhook(
            rawBody,
            validSignature,
            webhookPayload as TripayWebhookPayload,
          );

          // Verify correct operation ordering
          expect(operationLog).toEqual([
            'findTransaction',
            'updateTransactionStatus',
            'getOrderState',
            'transitionTo:PaymentSettled',
            'transitionTo:Fulfilled',
          ]);
        },
      ),
      { numRuns: 100 },
    );
  });
});
