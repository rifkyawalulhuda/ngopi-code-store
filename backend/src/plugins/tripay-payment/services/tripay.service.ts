import * as crypto from 'crypto';
import {
  TripayPluginOptions,
  TripayCreateTransactionInput,
  TripayCreateTransactionResponse,
  TripayOrderItem,
} from '@shared/types/tripay.types';

/**
 * Error thrown when the Tripay API call fails.
 * Covers timeout, network errors, and API-level error responses.
 */
export class TripayApiError extends Error {
  constructor(
    message: string,
    public readonly code: 'TIMEOUT' | 'API_ERROR' | 'NETWORK_ERROR',
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'TripayApiError';
  }
}

/**
 * Error thrown when the payment channel code is not in the allowed list.
 */
export class InvalidPaymentChannelError extends Error {
  constructor(channelCode: string) {
    super(`Invalid payment channel code: ${channelCode}. Channel is not in the allowed list.`);
    this.name = 'InvalidPaymentChannelError';
  }
}

/** Timeout duration for Tripay API calls in milliseconds */
const TRIPAY_TIMEOUT_MS = 30_000;

/**
 * TripayService handles communication with the Tripay payment gateway API.
 *
 * Responsibilities:
 * - Create payment transactions at Tripay
 * - Generate HMAC SHA256 signatures for transaction requests
 * - Validate payment channel codes against configured allowed channels
 * - Handle timeout and error responses from Tripay
 *
 * @see Requirements 1.1, 1.4, 1.5, 1.6, 1.7
 */
export class TripayService {
  private readonly baseUrl: string;

  constructor(private readonly options: TripayPluginOptions) {
    this.baseUrl = options.sandbox
      ? 'https://tripay.co.id/api-sandbox'
      : 'https://tripay.co.id/api';
  }

  /**
   * Creates a payment transaction at Tripay.
   *
   * @param input - Transaction creation input with order details
   * @returns The Tripay transaction response with payment URL and reference
   *
   * @throws {InvalidPaymentChannelError} If the payment channel is not in the allowed list (Req 1.7)
   * @throws {TripayApiError} If the API call times out (Req 1.4), returns an error (Req 1.6), or network fails
   */
  async createTransaction(
    input: TripayCreateTransactionInput,
  ): Promise<TripayCreateTransactionResponse> {
    // Requirement 1.7: Validate payment channel code against allowed channels
    this.validatePaymentChannel(input.method);

    // Generate HMAC SHA256 signature for the transaction
    const signature = this.generateSignature(
      input.merchant_ref,
      input.amount,
    );

    // Build the request payload
    const payload = {
      method: input.method,
      merchant_ref: input.merchant_ref,
      amount: input.amount,
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone || '081200000000',
      // Requirement 1.5: Include all order line items with name, price, quantity
      order_items: input.order_items.map((item: TripayOrderItem) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      callback_url: this.options.callbackUrl,
      return_url: `${this.options.returnUrl}/${input.merchant_ref}`,
      expired_time: this.calculateExpiredTime(),
      signature,
    };

    // Requirement 1.4: 30-second timeout for Tripay API calls
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TRIPAY_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/transaction/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = (await response.json()) as {
        success: boolean;
        message?: string;
        data?: TripayCreateTransactionResponse['data'];
      };

      // Requirement 1.6: Handle Tripay error responses
      if (!response.ok || !responseBody.success) {
        throw new TripayApiError(
          responseBody.message || `Tripay API error: ${response.statusText}`,
          'API_ERROR',
          response.status,
        );
      }

      return responseBody as TripayCreateTransactionResponse;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      // Re-throw our own errors
      if (error instanceof TripayApiError) {
        throw error;
      }

      // Requirement 1.4: Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TripayApiError(
          'Payment service unavailable: request timed out after 30 seconds',
          'TIMEOUT',
        );
      }

      // Handle network errors
      throw new TripayApiError(
        `Payment service unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
        'NETWORK_ERROR',
      );
    }
  }

  /**
   * Validates that the payment channel code is in the configured allowed channels list.
   *
   * @param channelCode - The payment channel code to validate
   * @throws {InvalidPaymentChannelError} If the channel is not allowed
   *
   * @see Requirement 1.7
   */
  validatePaymentChannel(channelCode: string): void {
    const isAllowed = this.options.allowedChannels.some(
      (channel) => channel.code === channelCode && channel.active,
    );

    if (!isAllowed) {
      throw new InvalidPaymentChannelError(channelCode);
    }
  }

  /**
   * Generates the HMAC SHA256 signature for a Tripay transaction.
   *
   * The signature is computed as: HMAC-SHA256(privateKey, merchantCode + merchantRef + amount)
   *
   * @param merchantRef - The merchant reference (order code)
   * @param amount - The transaction amount
   * @returns Hex-encoded HMAC SHA256 signature
   */
  generateSignature(merchantRef: string, amount: number): string {
    const data = this.options.merchantCode + merchantRef + amount;
    return crypto
      .createHmac('sha256', this.options.privateKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Calculates the expiry timestamp for a transaction.
   * Sets expiry to 24 hours from now (Unix timestamp in seconds).
   */
  private calculateExpiredTime(): number {
    const twentyFourHoursInSeconds = 24 * 60 * 60;
    return Math.floor(Date.now() / 1000) + twentyFourHoursInSeconds;
  }
}
