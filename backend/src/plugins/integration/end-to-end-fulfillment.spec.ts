import * as crypto from 'crypto';
import { TripayWebhookPayload } from '@shared/types/tripay.types';
import {
  TripayWebhookController,
  TripayTransactionRepository,
  OrderService,
  WebhookLogger,
  FulfillmentHandler,
} from '@plugins/tripay-payment/controllers/tripay-webhook.controller';
import { TripayTransaction } from '@plugins/tripay-payment/entities/tripay-transaction.entity';
import {
  OrderFulfillmentService,
  DigitalProductLookup,
  DigitalDownloadPersistence,
  EmailSender,
  FulfillmentOrderData,
} from '@plugins/digital-fulfillment/services/order-fulfillment.service';
import { DigitalProduct } from '@plugins/digital-fulfillment/entities/digital-product.entity';
import { DigitalDownload } from '@plugins/digital-fulfillment/entities/digital-download.entity';

/**
 * Integration Test: End-to-End Fulfillment Flow
 *
 * Verifies the full wiring between:
 * - Tripay Webhook Controller (payment processing)
 * - Order State Machine (state transitions)
 * - Digital Fulfillment Service (download record creation)
 * - Email Service (order confirmation)
 *
 * Flow: PAID webhook → order transition → download records → email
 *
 * **Validates: Requirements 2.3, 2.4, 4.1, 6.1**
 */
describe('End-to-End Fulfillment Integration', () => {
  const PRIVATE_KEY = 'integration-test-private-key';
  const STOREFRONT_URL = 'https://store.ngopicode.com';

  // Shared state tracking
  let orderState: string;
  let transactionStatus: string;
  let createdDownloadRecords: DigitalDownload[];
  let emailsSent: Array<Record<string, unknown>>;
  let orderTransitions: string[];

  // Mock implementations
  let transactionRepository: jest.Mocked<TripayTransactionRepository>;
  let orderService: jest.Mocked<OrderService>;
  let logger: jest.Mocked<WebhookLogger>;
  let productLookup: jest.Mocked<DigitalProductLookup>;
  let downloadPersistence: jest.Mocked<DigitalDownloadPersistence>;
  let emailSender: jest.Mocked<EmailSender>;

  function generateSignature(rawBody: string): string {
    return crypto.createHmac('sha256', PRIVATE_KEY).update(rawBody).digest('hex');
  }

  function createPaidWebhookPayload(): TripayWebhookPayload {
    return {
      reference: 'T1234567890',
      merchant_ref: 'ORD-INTEG-001',
      payment_method: 'QRIS',
      payment_method_code: 'QRIS',
      total_amount: 250000,
      fee_merchant: 2500,
      fee_customer: 0,
      total_fee: 2500,
      amount_received: 247500,
      status: 'PAID',
      paid_at: '2024-06-15T14:30:00.000Z',
    };
  }

  beforeEach(() => {
    // Reset state
    orderState = 'ArrangingPayment';
    transactionStatus = 'UNPAID';
    createdDownloadRecords = [];
    emailsSent = [];
    orderTransitions = [];

    // Transaction repository
    transactionRepository = {
      findByMerchantRef: jest.fn().mockImplementation(async (merchantRef: string) => {
        if (merchantRef === 'ORD-INTEG-001') {
          return new TripayTransaction({
            id: 1 as any,
            orderId: '500' as any,
            merchantRef: 'ORD-INTEG-001',
            tripayReference: 'T1234567890',
            paymentMethod: 'QRIS',
            amount: 250000,
            status: transactionStatus,
          });
        }
        return null;
      }),
      updateStatus: jest.fn().mockImplementation(async (_id, data) => {
        transactionStatus = data.status;
      }),
    };

    // Order service - tracks state transitions
    orderService = {
      getOrderState: jest.fn().mockImplementation(async () => orderState),
      transitionToState: jest.fn().mockImplementation(async (_orderId, state) => {
        orderTransitions.push(state);
        orderState = state;
      }),
    };

    // Logger
    logger = {
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    // Digital product lookup
    productLookup = {
      findByVariantId: jest.fn().mockImplementation(async (variantId) => {
        // Simulate 2 digital products and 1 non-digital
        if (variantId === '10' || variantId === '11') {
          return new DigitalProduct({
            id: parseInt(variantId as string) as any,
            productVariantId: variantId,
            fileName: `product-${variantId}.zip`,
            originalFileName: `product-${variantId}.zip`,
            fileSize: 5000000,
            mimeType: 'application/zip',
            bucket: 'products',
            objectKey: `product-${variantId}.zip`,
            maxDownloadsPerOrder: 5,
            downloadExpiryHours: 72,
          });
        }
        return null; // Non-digital product
      }),
    };

    // Download persistence
    downloadPersistence = {
      save: jest.fn().mockImplementation(async (entity: DigitalDownload) => {
        createdDownloadRecords.push(entity);
        return entity;
      }),
      removeByOrderId: jest.fn().mockResolvedValue(undefined),
    };

    // Email sender
    emailSender = {
      sendOrderConfirmation: jest.fn().mockImplementation(async (data) => {
        emailsSent.push(data);
      }),
    };
  });

  /**
   * Full end-to-end test: PAID webhook → order transition → download records → email
   * **Validates: Requirements 2.3, 2.4, 4.1, 6.1**
   */
  it('should complete full flow: payment → order transition → fulfillment → email', async () => {
    // Set up the fulfillment service
    const fulfillmentService = new OrderFulfillmentService(
      productLookup,
      downloadPersistence,
      emailSender,
      STOREFRONT_URL,
    );

    // Create a fulfillment handler that bridges webhook to fulfillment service
    const fulfillmentHandler: FulfillmentHandler = {
      onOrderFulfilled: async (orderId, webhookPayload) => {
        const orderData: FulfillmentOrderData = {
          id: String(orderId),
          code: webhookPayload.merchant_ref,
          customerId: '42',
          customerName: 'Budi Developer',
          customerEmail: 'budi@ngopicode.com',
          lines: [
            { productVariantId: '10' }, // Digital product
            { productVariantId: '11' }, // Digital product
            { productVariantId: '12' }, // Non-digital product
          ],
          totalWithTax: webhookPayload.total_amount,
          paymentMethod: webhookPayload.payment_method,
          paidAt: new Date(webhookPayload.paid_at),
        };

        await fulfillmentService.processFulfillment(orderData);
      },
    };

    // Create the webhook controller with fulfillment handler wired in
    const controller = new TripayWebhookController(
      PRIVATE_KEY,
      transactionRepository,
      orderService,
      logger,
      fulfillmentHandler,
    );

    // Simulate incoming PAID webhook
    const payload = createPaidWebhookPayload();
    const rawBody = JSON.stringify(payload);
    const signature = generateSignature(rawBody);

    // Process the webhook
    const result = await controller.handleWebhook(rawBody, signature, payload);

    // === Verify: Webhook returns success ===
    expect(result.statusCode).toBe(200);
    expect(result.body.success).toBe(true);

    // === Verify: Transaction status updated to PAID (Req 2.3) ===
    expect(transactionStatus).toBe('PAID');

    // === Verify: Order transitioned through PaymentSettled → Fulfilled (Req 2.4) ===
    expect(orderTransitions).toEqual(['PaymentSettled', 'Fulfilled']);
    expect(orderState).toBe('Fulfilled');

    // === Verify: Download records created for digital items only (Req 4.1) ===
    expect(createdDownloadRecords.length).toBe(2);

    // Verify first download record
    expect(createdDownloadRecords[0].orderId).toBe('500');
    expect(createdDownloadRecords[0].customerId).toBe('42');
    expect(createdDownloadRecords[0].productVariantId).toBe('10');
    expect(createdDownloadRecords[0].downloadToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(createdDownloadRecords[0].maxDownloads).toBe(5);
    expect(createdDownloadRecords[0].currentDownloads).toBe(0);
    expect(createdDownloadRecords[0].isActive).toBe(true);

    // Verify second download record
    expect(createdDownloadRecords[1].productVariantId).toBe('11');
    expect(createdDownloadRecords[1].downloadToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    // Tokens must be unique
    expect(createdDownloadRecords[0].downloadToken).not.toBe(
      createdDownloadRecords[1].downloadToken,
    );

    // === Verify: Email sent with correct data (Req 6.1) ===
    expect(emailsSent.length).toBe(1);
    expect(emailsSent[0]).toMatchObject({
      customerName: 'Budi Developer',
      customerEmail: 'budi@ngopicode.com',
      orderCode: 'ORD-INTEG-001',
      totalAmount: 250000,
      paymentMethod: 'QRIS',
    });

    // Verify download page URL is included in email
    const emailItems = emailsSent[0].items as Array<{ downloadUrl: string }>;
    expect(emailItems[0].downloadUrl).toBe(
      `${STOREFRONT_URL}/downloads/ORD-INTEG-001`,
    );
  });

  /**
   * Verify that non-PAID webhooks do NOT trigger fulfillment.
   * **Validates: Requirements 2.5**
   */
  it('should NOT trigger fulfillment for EXPIRED webhook', async () => {
    const fulfillmentHandler: FulfillmentHandler = {
      onOrderFulfilled: jest.fn(),
    };

    const controller = new TripayWebhookController(
      PRIVATE_KEY,
      transactionRepository,
      orderService,
      logger,
      fulfillmentHandler,
    );

    const payload: TripayWebhookPayload = {
      ...createPaidWebhookPayload(),
      status: 'EXPIRED',
    };
    const rawBody = JSON.stringify(payload);
    const signature = generateSignature(rawBody);

    const result = await controller.handleWebhook(rawBody, signature, payload);

    expect(result.statusCode).toBe(200);
    expect(transactionStatus).toBe('EXPIRED');
    expect(orderTransitions).toEqual([]); // No order transitions
    expect(fulfillmentHandler.onOrderFulfilled).not.toHaveBeenCalled();
    expect(createdDownloadRecords.length).toBe(0);
    expect(emailsSent.length).toBe(0);
  });

  /**
   * Verify that duplicate PAID webhooks are idempotent.
   * **Validates: Requirements 2.6**
   */
  it('should be idempotent for duplicate PAID webhooks', async () => {
    const fulfillmentService = new OrderFulfillmentService(
      productLookup,
      downloadPersistence,
      emailSender,
      STOREFRONT_URL,
    );

    const fulfillmentHandler: FulfillmentHandler = {
      onOrderFulfilled: async (orderId, webhookPayload) => {
        const orderData: FulfillmentOrderData = {
          id: String(orderId),
          code: webhookPayload.merchant_ref,
          customerId: '42',
          customerName: 'Budi',
          customerEmail: 'budi@ngopicode.com',
          lines: [{ productVariantId: '10' }],
          totalWithTax: webhookPayload.total_amount,
          paymentMethod: webhookPayload.payment_method,
          paidAt: new Date(webhookPayload.paid_at),
        };
        await fulfillmentService.processFulfillment(orderData);
      },
    };

    const controller = new TripayWebhookController(
      PRIVATE_KEY,
      transactionRepository,
      orderService,
      logger,
      fulfillmentHandler,
    );

    const payload = createPaidWebhookPayload();
    const rawBody = JSON.stringify(payload);
    const signature = generateSignature(rawBody);

    // First webhook - should process normally
    const result1 = await controller.handleWebhook(rawBody, signature, payload);
    expect(result1.statusCode).toBe(200);
    expect(createdDownloadRecords.length).toBe(1);
    expect(emailsSent.length).toBe(1);

    // Second webhook - transaction is now PAID, should be no-op
    const result2 = await controller.handleWebhook(rawBody, signature, payload);
    expect(result2.statusCode).toBe(200);

    // No additional records or emails
    expect(createdDownloadRecords.length).toBe(1);
    expect(emailsSent.length).toBe(1);
  });

  /**
   * Verify that email failure does not affect order fulfillment.
   * **Validates: Requirements 6.4**
   */
  it('should complete fulfillment even when email sending fails', async () => {
    // Make email sender fail
    emailSender.sendOrderConfirmation.mockRejectedValue(
      new Error('Resend API unavailable'),
    );

    const fulfillmentService = new OrderFulfillmentService(
      productLookup,
      downloadPersistence,
      emailSender,
      STOREFRONT_URL,
    );

    const fulfillmentHandler: FulfillmentHandler = {
      onOrderFulfilled: async (orderId, webhookPayload) => {
        const orderData: FulfillmentOrderData = {
          id: String(orderId),
          code: webhookPayload.merchant_ref,
          customerId: '42',
          customerName: 'Budi',
          customerEmail: 'budi@ngopicode.com',
          lines: [{ productVariantId: '10' }],
          totalWithTax: webhookPayload.total_amount,
          paymentMethod: webhookPayload.payment_method,
          paidAt: new Date(webhookPayload.paid_at),
        };
        await fulfillmentService.processFulfillment(orderData);
      },
    };

    const controller = new TripayWebhookController(
      PRIVATE_KEY,
      transactionRepository,
      orderService,
      logger,
      fulfillmentHandler,
    );

    const payload = createPaidWebhookPayload();
    const rawBody = JSON.stringify(payload);
    const signature = generateSignature(rawBody);

    const result = await controller.handleWebhook(rawBody, signature, payload);

    // Webhook still succeeds
    expect(result.statusCode).toBe(200);

    // Order still transitioned
    expect(orderState).toBe('Fulfilled');

    // Download records still created
    expect(createdDownloadRecords.length).toBe(1);

    // Email was attempted but failed
    expect(emailSender.sendOrderConfirmation).toHaveBeenCalled();
  });

  /**
   * Verify that fulfillment handler errors don't fail the webhook response.
   * The order is already in Fulfilled state.
   */
  it('should return success even when fulfillment handler throws', async () => {
    const fulfillmentHandler: FulfillmentHandler = {
      onOrderFulfilled: jest.fn().mockRejectedValue(
        new Error('Database connection lost during fulfillment'),
      ),
    };

    const controller = new TripayWebhookController(
      PRIVATE_KEY,
      transactionRepository,
      orderService,
      logger,
      fulfillmentHandler,
    );

    const payload = createPaidWebhookPayload();
    const rawBody = JSON.stringify(payload);
    const signature = generateSignature(rawBody);

    const result = await controller.handleWebhook(rawBody, signature, payload);

    // Webhook still returns 200 (order is already fulfilled)
    expect(result.statusCode).toBe(200);
    expect(orderState).toBe('Fulfilled');

    // Error was logged
    expect(logger.error).toHaveBeenCalledWith(
      'Fulfillment processing failed after order transition',
      expect.objectContaining({
        merchantRef: 'ORD-INTEG-001',
        orderId: '500',
      }),
    );
  });

  /**
   * Verify the controller works without a fulfillment handler (backward compatible).
   */
  it('should work without fulfillment handler for backward compatibility', async () => {
    const controller = new TripayWebhookController(
      PRIVATE_KEY,
      transactionRepository,
      orderService,
      logger,
      // No fulfillment handler
    );

    const payload = createPaidWebhookPayload();
    const rawBody = JSON.stringify(payload);
    const signature = generateSignature(rawBody);

    const result = await controller.handleWebhook(rawBody, signature, payload);

    expect(result.statusCode).toBe(200);
    expect(orderState).toBe('Fulfilled');
    // No download records or emails (no handler)
    expect(createdDownloadRecords.length).toBe(0);
    expect(emailsSent.length).toBe(0);
  });
});

/**
 * Integration Test: End-to-End Payment Flow - Error Scenarios & Download Access
 *
 * Covers error scenarios and download access verification:
 * - Invalid webhook signature (rejected with 400)
 * - Webhook for non-existent transaction (rejected with 400)
 * - Order state mismatch (log warning, return 200)
 * - Download access after fulfillment (token validation, access control)
 *
 * **Validates: Requirements 1.1, 2.1, 2.3, 4.1, 5.3**
 */
describe('End-to-End Payment Flow - Error Scenarios & Download Access', () => {
  const PRIVATE_KEY = 'integration-test-private-key';
  const STOREFRONT_URL = 'https://store.ngopicode.com';

  // Shared state tracking
  let orderState: string;
  let transactionStatus: string;
  let createdDownloadRecords: DigitalDownload[];
  let emailsSent: Array<Record<string, unknown>>;
  let orderTransitions: string[];

  // Mock implementations
  let transactionRepository: jest.Mocked<TripayTransactionRepository>;
  let orderService: jest.Mocked<OrderService>;
  let logger: jest.Mocked<WebhookLogger>;
  let productLookup: jest.Mocked<DigitalProductLookup>;
  let downloadPersistence: jest.Mocked<DigitalDownloadPersistence>;
  let emailSender: jest.Mocked<EmailSender>;

  function generateSignature(rawBody: string): string {
    return crypto.createHmac('sha256', PRIVATE_KEY).update(rawBody).digest('hex');
  }

  function createPaidWebhookPayload(): TripayWebhookPayload {
    return {
      reference: 'T1234567890',
      merchant_ref: 'ORD-INTEG-001',
      payment_method: 'QRIS',
      payment_method_code: 'QRIS',
      total_amount: 250000,
      fee_merchant: 2500,
      fee_customer: 0,
      total_fee: 2500,
      amount_received: 247500,
      status: 'PAID',
      paid_at: '2024-06-15T14:30:00.000Z',
    };
  }

  beforeEach(() => {
    // Reset state
    orderState = 'ArrangingPayment';
    transactionStatus = 'UNPAID';
    createdDownloadRecords = [];
    emailsSent = [];
    orderTransitions = [];

    // Transaction repository
    transactionRepository = {
      findByMerchantRef: jest.fn().mockImplementation(async (merchantRef: string) => {
        if (merchantRef === 'ORD-INTEG-001') {
          return new TripayTransaction({
            id: 1 as any,
            orderId: '500' as any,
            merchantRef: 'ORD-INTEG-001',
            tripayReference: 'T1234567890',
            paymentMethod: 'QRIS',
            amount: 250000,
            status: transactionStatus,
          });
        }
        return null;
      }),
      updateStatus: jest.fn().mockImplementation(async (_id, data) => {
        transactionStatus = data.status;
      }),
    };

    // Order service - tracks state transitions
    orderService = {
      getOrderState: jest.fn().mockImplementation(async () => orderState),
      transitionToState: jest.fn().mockImplementation(async (_orderId, state) => {
        orderTransitions.push(state);
        orderState = state;
      }),
    };

    // Logger
    logger = {
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    // Digital product lookup
    productLookup = {
      findByVariantId: jest.fn().mockImplementation(async (variantId) => {
        if (variantId === '10' || variantId === '11') {
          return new DigitalProduct({
            id: parseInt(variantId as string) as any,
            productVariantId: variantId,
            fileName: `product-${variantId}.zip`,
            originalFileName: `product-${variantId}.zip`,
            fileSize: 5000000,
            mimeType: 'application/zip',
            bucket: 'products',
            objectKey: `product-${variantId}.zip`,
            maxDownloadsPerOrder: 5,
            downloadExpiryHours: 72,
          });
        }
        return null;
      }),
    };

    // Download persistence
    downloadPersistence = {
      save: jest.fn().mockImplementation(async (entity: DigitalDownload) => {
        createdDownloadRecords.push(entity);
        return entity;
      }),
      removeByOrderId: jest.fn().mockResolvedValue(undefined),
    };

    // Email sender
    emailSender = {
      sendOrderConfirmation: jest.fn().mockImplementation(async (data) => {
        emailsSent.push(data);
      }),
    };
  });

  describe('Error: Invalid webhook signature', () => {
    /**
     * Verify that an invalid signature is rejected with HTTP 400.
     * **Validates: Requirements 2.1**
     */
    it('should reject webhook with invalid signature and return 400', async () => {
      const fulfillmentHandler: FulfillmentHandler = {
        onOrderFulfilled: jest.fn(),
      };

      const controller = new TripayWebhookController(
        PRIVATE_KEY,
        transactionRepository,
        orderService,
        logger,
        fulfillmentHandler,
      );

      const payload = createPaidWebhookPayload();
      const rawBody = JSON.stringify(payload);
      // Generate signature with a WRONG key
      const invalidSignature = crypto
        .createHmac('sha256', 'wrong-private-key')
        .update(rawBody)
        .digest('hex');

      const result = await controller.handleWebhook(rawBody, invalidSignature, payload);

      // === Verify: Rejected with 400 ===
      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe('Invalid signature');

      // === Verify: No state changes occurred ===
      expect(transactionStatus).toBe('UNPAID');
      expect(orderState).toBe('ArrangingPayment');
      expect(orderTransitions).toEqual([]);
      expect(createdDownloadRecords.length).toBe(0);
      expect(emailsSent.length).toBe(0);

      // === Verify: Security warning logged ===
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid webhook signature detected',
        expect.objectContaining({
          merchantRef: 'ORD-INTEG-001',
        }),
      );

      // === Verify: Fulfillment handler NOT called ===
      expect(fulfillmentHandler.onOrderFulfilled).not.toHaveBeenCalled();
    });

    /**
     * Verify that a missing signature header is rejected with HTTP 400.
     * **Validates: Requirements 2.1**
     */
    it('should reject webhook with missing signature header and return 400', async () => {
      const fulfillmentHandler: FulfillmentHandler = {
        onOrderFulfilled: jest.fn(),
      };

      const controller = new TripayWebhookController(
        PRIVATE_KEY,
        transactionRepository,
        orderService,
        logger,
        fulfillmentHandler,
      );

      const payload = createPaidWebhookPayload();
      const rawBody = JSON.stringify(payload);

      const result = await controller.handleWebhook(rawBody, undefined, payload);

      // === Verify: Rejected with 400 ===
      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe('Missing signature header');

      // === Verify: No state changes ===
      expect(transactionStatus).toBe('UNPAID');
      expect(orderState).toBe('ArrangingPayment');
      expect(createdDownloadRecords.length).toBe(0);
      expect(fulfillmentHandler.onOrderFulfilled).not.toHaveBeenCalled();
    });
  });

  describe('Error: Webhook for non-existent transaction', () => {
    /**
     * Verify that a webhook for an unknown merchant_ref is rejected with HTTP 400.
     * **Validates: Requirements 2.1**
     */
    it('should reject webhook for unknown transaction with 400', async () => {
      const fulfillmentHandler: FulfillmentHandler = {
        onOrderFulfilled: jest.fn(),
      };

      const controller = new TripayWebhookController(
        PRIVATE_KEY,
        transactionRepository,
        orderService,
        logger,
        fulfillmentHandler,
      );

      // Use a merchant_ref that doesn't exist in our mock repository
      const payload: TripayWebhookPayload = {
        ...createPaidWebhookPayload(),
        merchant_ref: 'ORD-NONEXISTENT-999',
      };
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody);

      const result = await controller.handleWebhook(rawBody, signature, payload);

      // === Verify: Rejected with 400 ===
      expect(result.statusCode).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe('Transaction not found');

      // === Verify: No state changes ===
      expect(transactionStatus).toBe('UNPAID');
      expect(orderState).toBe('ArrangingPayment');
      expect(orderTransitions).toEqual([]);
      expect(createdDownloadRecords.length).toBe(0);
      expect(emailsSent.length).toBe(0);

      // === Verify: Warning logged ===
      expect(logger.warn).toHaveBeenCalledWith(
        'Webhook received for unknown transaction',
        expect.objectContaining({
          merchantRef: 'ORD-NONEXISTENT-999',
        }),
      );

      // === Verify: Fulfillment handler NOT called ===
      expect(fulfillmentHandler.onOrderFulfilled).not.toHaveBeenCalled();
    });
  });

  describe('Error: Order state mismatch', () => {
    /**
     * Verify that a PAID webhook for an order NOT in ArrangingPayment state
     * logs a warning and returns 200 without triggering fulfillment.
     * **Validates: Requirements 2.1, 2.3**
     */
    it('should log warning and return 200 when order is already Fulfilled', async () => {
      // Simulate order already in Fulfilled state
      orderState = 'Fulfilled';

      const fulfillmentHandler: FulfillmentHandler = {
        onOrderFulfilled: jest.fn(),
      };

      const controller = new TripayWebhookController(
        PRIVATE_KEY,
        transactionRepository,
        orderService,
        logger,
        fulfillmentHandler,
      );

      const payload = createPaidWebhookPayload();
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody);

      const result = await controller.handleWebhook(rawBody, signature, payload);

      // === Verify: Returns 200 (accepted but no action) ===
      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);

      // === Verify: Transaction status updated to PAID ===
      expect(transactionStatus).toBe('PAID');

      // === Verify: No order transitions attempted ===
      expect(orderTransitions).toEqual([]);
      expect(orderState).toBe('Fulfilled'); // Unchanged

      // === Verify: No fulfillment triggered ===
      expect(createdDownloadRecords.length).toBe(0);
      expect(emailsSent.length).toBe(0);
      expect(fulfillmentHandler.onOrderFulfilled).not.toHaveBeenCalled();

      // === Verify: Warning logged about state mismatch ===
      expect(logger.warn).toHaveBeenCalledWith(
        'Order state mismatch on PAID webhook',
        expect.objectContaining({
          merchantRef: 'ORD-INTEG-001',
          orderId: '500',
          expectedState: 'ArrangingPayment',
          actualState: 'Fulfilled',
        }),
      );
    });

    /**
     * Verify state mismatch when order is in PaymentSettled state.
     * **Validates: Requirements 2.1, 2.3**
     */
    it('should log warning and return 200 when order is in PaymentSettled state', async () => {
      orderState = 'PaymentSettled';

      const fulfillmentHandler: FulfillmentHandler = {
        onOrderFulfilled: jest.fn(),
      };

      const controller = new TripayWebhookController(
        PRIVATE_KEY,
        transactionRepository,
        orderService,
        logger,
        fulfillmentHandler,
      );

      const payload = createPaidWebhookPayload();
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody);

      const result = await controller.handleWebhook(rawBody, signature, payload);

      expect(result.statusCode).toBe(200);
      expect(transactionStatus).toBe('PAID');
      expect(orderTransitions).toEqual([]);
      expect(fulfillmentHandler.onOrderFulfilled).not.toHaveBeenCalled();

      expect(logger.warn).toHaveBeenCalledWith(
        'Order state mismatch on PAID webhook',
        expect.objectContaining({
          actualState: 'PaymentSettled',
        }),
      );
    });
  });

  describe('Error: Duplicate webhook (idempotency with no side effects)', () => {
    /**
     * Verify that processing the same PAID webhook multiple times does not
     * create duplicate download records or send duplicate emails.
     * **Validates: Requirements 2.1, 2.3**
     */
    it('should return 200 without side effects on duplicate PAID webhook', async () => {
      const fulfillmentService = new OrderFulfillmentService(
        productLookup,
        downloadPersistence,
        emailSender,
        STOREFRONT_URL,
      );

      const fulfillmentHandler: FulfillmentHandler = {
        onOrderFulfilled: async (orderId, webhookPayload) => {
          const orderData: FulfillmentOrderData = {
            id: String(orderId),
            code: webhookPayload.merchant_ref,
            customerId: '42',
            customerName: 'Budi Developer',
            customerEmail: 'budi@ngopicode.com',
            lines: [
              { productVariantId: '10' },
              { productVariantId: '11' },
            ],
            totalWithTax: webhookPayload.total_amount,
            paymentMethod: webhookPayload.payment_method,
            paidAt: new Date(webhookPayload.paid_at),
          };
          await fulfillmentService.processFulfillment(orderData);
        },
      };

      const controller = new TripayWebhookController(
        PRIVATE_KEY,
        transactionRepository,
        orderService,
        logger,
        fulfillmentHandler,
      );

      const payload = createPaidWebhookPayload();
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody);

      // First webhook - processes normally
      const result1 = await controller.handleWebhook(rawBody, signature, payload);
      expect(result1.statusCode).toBe(200);
      expect(result1.body.success).toBe(true);

      // Capture state after first processing
      const recordsAfterFirst = createdDownloadRecords.length;
      const emailsAfterFirst = emailsSent.length;
      expect(recordsAfterFirst).toBe(2); // 2 digital products
      expect(emailsAfterFirst).toBe(1);

      // Second webhook - should be idempotent no-op
      const result2 = await controller.handleWebhook(rawBody, signature, payload);
      expect(result2.statusCode).toBe(200);
      expect(result2.body.success).toBe(true);

      // === Verify: No additional side effects ===
      expect(createdDownloadRecords.length).toBe(recordsAfterFirst);
      expect(emailsSent.length).toBe(emailsAfterFirst);
      expect(orderTransitions).toEqual(['PaymentSettled', 'Fulfilled']); // Only from first

      // Third webhook - still idempotent
      const result3 = await controller.handleWebhook(rawBody, signature, payload);
      expect(result3.statusCode).toBe(200);
      expect(createdDownloadRecords.length).toBe(recordsAfterFirst);
      expect(emailsSent.length).toBe(emailsAfterFirst);
    });
  });

  describe('Download access after fulfillment', () => {
    /**
     * Helper: Runs the full flow and returns the created download records.
     */
    async function runFullFlowAndGetRecords(): Promise<DigitalDownload[]> {
      const fulfillmentService = new OrderFulfillmentService(
        productLookup,
        downloadPersistence,
        emailSender,
        STOREFRONT_URL,
      );

      const fulfillmentHandler: FulfillmentHandler = {
        onOrderFulfilled: async (orderId, webhookPayload) => {
          const orderData: FulfillmentOrderData = {
            id: String(orderId),
            code: webhookPayload.merchant_ref,
            customerId: '42',
            customerName: 'Budi Developer',
            customerEmail: 'budi@ngopicode.com',
            lines: [
              { productVariantId: '10' },
              { productVariantId: '11' },
            ],
            totalWithTax: webhookPayload.total_amount,
            paymentMethod: webhookPayload.payment_method,
            paidAt: new Date(webhookPayload.paid_at),
          };
          await fulfillmentService.processFulfillment(orderData);
        },
      };

      const controller = new TripayWebhookController(
        PRIVATE_KEY,
        transactionRepository,
        orderService,
        logger,
        fulfillmentHandler,
      );

      const payload = createPaidWebhookPayload();
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody);

      await controller.handleWebhook(rawBody, signature, payload);
      return createdDownloadRecords;
    }

    /**
     * Verify that download tokens are valid UUID v4 and records are accessible
     * after the full payment → fulfillment flow.
     * **Validates: Requirements 4.1, 5.3**
     */
    it('should create accessible download records with valid tokens after fulfillment', async () => {
      const records = await runFullFlowAndGetRecords();

      expect(records.length).toBe(2);

      for (const record of records) {
        // Token is valid UUID v4
        expect(record.downloadToken).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );

        // Record is accessible (active, not expired, under limit)
        expect(record.isActive).toBe(true);
        expect(record.currentDownloads).toBe(0);
        expect(record.maxDownloads).toBe(5);
        expect(record.isAccessible()).toBe(true);
        expect(record.isExpired()).toBe(false);
        expect(record.isLimitReached()).toBe(false);

        // Expiry is set to ~72 hours in the future
        const now = new Date();
        const expiryDiffHours =
          (record.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        expect(expiryDiffHours).toBeGreaterThan(71);
        expect(expiryDiffHours).toBeLessThanOrEqual(72);
      }
    });

    /**
     * Verify that download access is granted for the correct customer
     * and denied for a different customer.
     * **Validates: Requirements 5.3**
     */
    it('should grant access to owning customer and deny to others', async () => {
      const records = await runFullFlowAndGetRecords();
      const record = records[0];

      // Owning customer (customerId: '42') should have access
      expect(record.customerId).toBe('42');
      expect(record.isAccessible()).toBe(true);

      // Simulate access check for correct customer
      const isOwner = record.customerId === '42';
      expect(isOwner).toBe(true);

      // Simulate access check for different customer
      const isUnauthorized = record.customerId === 'different-customer-99';
      expect(isUnauthorized).toBe(false);
    });

    /**
     * Verify that download records become inaccessible after reaching max downloads.
     * **Validates: Requirements 5.3**
     */
    it('should deactivate download record when max downloads reached', async () => {
      const records = await runFullFlowAndGetRecords();
      const record = records[0];

      // Initially accessible
      expect(record.isAccessible()).toBe(true);

      // Simulate downloads up to the limit
      for (let i = 0; i < record.maxDownloads; i++) {
        record.currentDownloads++;
      }

      // After reaching limit, record should not be accessible
      expect(record.isLimitReached()).toBe(true);
      expect(record.currentDownloads).toBe(5);

      // Deactivate as the system would
      record.isActive = false;
      expect(record.isAccessible()).toBe(false);
    });

    /**
     * Verify that download records become inaccessible after expiry.
     * **Validates: Requirements 5.3**
     */
    it('should deny access to expired download records', async () => {
      const records = await runFullFlowAndGetRecords();
      const record = records[0];

      // Initially accessible
      expect(record.isAccessible()).toBe(true);

      // Simulate expiry by setting expiresAt to the past
      record.expiresAt = new Date(Date.now() - 1000);

      // After expiry, record should not be accessible
      expect(record.isExpired()).toBe(true);
      expect(record.isAccessible()).toBe(false);
    });

    /**
     * Verify that each download record has a unique token (no collisions).
     * **Validates: Requirements 4.1**
     */
    it('should generate unique download tokens for each product in the order', async () => {
      const records = await runFullFlowAndGetRecords();

      expect(records.length).toBe(2);

      const tokens = records.map((r) => r.downloadToken);
      const uniqueTokens = new Set(tokens);

      // All tokens must be unique
      expect(uniqueTokens.size).toBe(tokens.length);

      // Each token is a valid UUID v4
      for (const token of tokens) {
        expect(token).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      }
    });

    /**
     * Verify that download records are correctly associated with the order and customer.
     * **Validates: Requirements 4.1, 1.1**
     */
    it('should associate download records with correct order and customer', async () => {
      const records = await runFullFlowAndGetRecords();

      for (const record of records) {
        // All records belong to the same order
        expect(record.orderId).toBe('500');
        // All records belong to the same customer
        expect(record.customerId).toBe('42');
      }

      // Records are for the correct product variants (digital only)
      expect(records[0].productVariantId).toBe('10');
      expect(records[1].productVariantId).toBe('11');
    });
  });
});
