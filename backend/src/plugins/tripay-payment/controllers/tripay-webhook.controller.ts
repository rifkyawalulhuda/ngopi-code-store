import { TripayWebhookPayload } from '@shared/types/tripay.types';
import { verifyTripaySignature } from '../utils/verify-signature';
import { TripayTransaction } from '../entities/tripay-transaction.entity';

/**
 * Logger interface for the webhook controller.
 * Allows injection of any logger implementation.
 */
export interface WebhookLogger {
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  log(message: string, context?: Record<string, unknown>): void;
}

/**
 * Repository interface for TripayTransaction persistence.
 */
export interface TripayTransactionRepository {
  findByMerchantRef(merchantRef: string): Promise<TripayTransaction | null>;
  updateStatus(
    id: string | number,
    data: {
      status: string;
      feeMerchant?: number;
      feeCustomer?: number;
      paidAt?: Date | null;
    },
  ): Promise<void>;
}

/**
 * Order service interface for managing order state transitions.
 */
export interface OrderService {
  getOrderState(orderId: string | number): Promise<string>;
  transitionToState(orderId: string | number, state: string): Promise<void>;
}

/**
 * Fulfillment handler interface for processing order fulfillment
 * after a PAID webhook transitions the order to Fulfilled state.
 *
 * This wires the Tripay plugin with the Digital Fulfillment and Email plugins.
 * @see Requirements 2.3, 2.4, 4.1, 6.1
 */
export interface FulfillmentHandler {
  onOrderFulfilled(orderId: string | number, webhookPayload: TripayWebhookPayload): Promise<void>;
}

/**
 * Webhook processing result returned to the HTTP layer.
 */
export interface WebhookResult {
  statusCode: number;
  body: { success: boolean; message?: string };
}

/**
 * TripayWebhookController handles incoming payment notifications from Tripay.
 *
 * Responsibilities:
 * - Verify webhook signature (HMAC SHA256)
 * - Process PAID webhooks: update transaction → transition order to PaymentSettled → Fulfilled
 * - Process EXPIRED/FAILED webhooks: update transaction status only
 * - Handle duplicate webhooks (idempotency)
 * - Handle missing transaction records
 * - Handle order state mismatch
 *
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */
export class TripayWebhookController {
  constructor(
    private readonly privateKey: string,
    private readonly transactionRepository: TripayTransactionRepository,
    private readonly orderService: OrderService,
    private readonly logger: WebhookLogger,
    private readonly fulfillmentHandler?: FulfillmentHandler,
  ) {}

  /**
   * POST /payments/tripay/webhook
   *
   * Processes an incoming Tripay webhook callback.
   *
   * @param rawBody - The raw JSON string of the request body (used for signature verification)
   * @param signature - The X-Callback-Signature header value
   * @param payload - The parsed TripayWebhookPayload
   * @returns WebhookResult with appropriate HTTP status code and response body
   */
  async handleWebhook(
    rawBody: string,
    signature: string | undefined,
    payload: TripayWebhookPayload,
  ): Promise<WebhookResult> {
    // Requirement 11.3: Reject requests without signature header
    if (!signature) {
      this.logger.warn('Webhook received without signature header', {
        merchantRef: payload.merchant_ref,
      });
      return {
        statusCode: 400,
        body: { success: false, message: 'Missing signature header' },
      };
    }

    // Requirement 2.1, 11.1, 11.2: Verify HMAC SHA256 signature
    const isValid = verifyTripaySignature(rawBody, signature, this.privateKey);
    if (!isValid) {
      // Requirement 2.2, 11.4: Log security warning on invalid signature
      this.logger.warn('Invalid webhook signature detected', {
        merchantRef: payload.merchant_ref,
        providedSignature: signature,
      });
      return {
        statusCode: 400,
        body: { success: false, message: 'Invalid signature' },
      };
    }

    // Step 2: Find transaction record
    const transaction = await this.transactionRepository.findByMerchantRef(
      payload.merchant_ref,
    );

    // Requirement 2.7: Handle missing transaction records
    if (!transaction) {
      this.logger.warn('Webhook received for unknown transaction', {
        merchantRef: payload.merchant_ref,
        reference: payload.reference,
      });
      return {
        statusCode: 400,
        body: { success: false, message: 'Transaction not found' },
      };
    }

    // Requirement 2.6: Handle duplicate webhooks (idempotency)
    // If transaction is no longer UNPAID, return 200 without state changes
    if (transaction.status !== 'UNPAID') {
      this.logger.log('Duplicate webhook received, skipping processing', {
        merchantRef: payload.merchant_ref,
        currentStatus: transaction.status,
        webhookStatus: payload.status,
      });
      return {
        statusCode: 200,
        body: { success: true },
      };
    }

    // Step 3: Update transaction status
    await this.transactionRepository.updateStatus(transaction.id, {
      status: payload.status,
      feeMerchant: payload.fee_merchant,
      feeCustomer: payload.fee_customer,
      paidAt: payload.status === 'PAID' ? new Date(payload.paid_at) : null,
    });

    // Requirement 2.5: For EXPIRED/FAILED, only update transaction status
    if (payload.status === 'EXPIRED' || payload.status === 'FAILED') {
      this.logger.log('Webhook processed: transaction status updated', {
        merchantRef: payload.merchant_ref,
        status: payload.status,
      });
      return {
        statusCode: 200,
        body: { success: true },
      };
    }

    // Requirement 2.3, 2.4: Process PAID webhook - transition order
    if (payload.status === 'PAID') {
      const orderState = await this.orderService.getOrderState(transaction.orderId);

      // Requirement 2.8: Handle order state mismatch
      if (orderState !== 'ArrangingPayment') {
        this.logger.warn('Order state mismatch on PAID webhook', {
          merchantRef: payload.merchant_ref,
          orderId: transaction.orderId,
          expectedState: 'ArrangingPayment',
          actualState: orderState,
        });
        return {
          statusCode: 200,
          body: { success: true },
        };
      }

      // Transition order: ArrangingPayment → PaymentSettled → Fulfilled
      await this.orderService.transitionToState(transaction.orderId, 'PaymentSettled');
      await this.orderService.transitionToState(transaction.orderId, 'Fulfilled');

      // Trigger fulfillment: download record creation + email notification
      // @see Requirements 2.3, 2.4, 4.1, 6.1
      if (this.fulfillmentHandler) {
        try {
          await this.fulfillmentHandler.onOrderFulfilled(transaction.orderId, payload);
        } catch (error) {
          // Log fulfillment error but don't fail the webhook response
          // Order is already in Fulfilled state (Req 6.4: email failure doesn't rollback)
          this.logger.error('Fulfillment processing failed after order transition', {
            merchantRef: payload.merchant_ref,
            orderId: transaction.orderId,
            error: (error as Error).message,
          });
        }
      }

      this.logger.log('PAID webhook processed: order fulfilled', {
        merchantRef: payload.merchant_ref,
        orderId: transaction.orderId,
      });
    }

    return {
      statusCode: 200,
      body: { success: true },
    };
  }
}
