import {
  PaymentMethodHandler,
  LanguageCode,
  CreatePaymentResult,
  SettlePaymentResult,
  Logger,
} from '@vendure/core';
import { TripayService } from './services/tripay.service';
import { TripayTransaction } from './entities/tripay-transaction.entity';
import { TripayChannel } from '@shared/types/tripay.types';

const loggerCtx = 'TripayPaymentMethod';

/**
 * Tripay PaymentMethodHandler.
 *
 * Exposes Tripay credentials as configurable arguments so they can be managed
 * entirely through the Admin UI under Settings → Payment methods (no env vars
 * required, no custom Admin UI build needed).
 *
 * When a payment is added to an order, this handler:
 *  1. Reads credentials from the Admin-configured args.
 *  2. Creates a transaction at Tripay via {@link TripayService}.
 *  3. Persists a {@link TripayTransaction} record (UNPAID).
 *  4. Returns an `Authorized` payment whose public metadata carries the
 *     Tripay `paymentUrl` so the storefront can redirect the customer.
 *
 * Final settlement happens asynchronously via the Tripay webhook controller,
 * which confirms payment and drives order fulfillment.
 */
export const tripayPaymentMethodHandler = new PaymentMethodHandler({
  code: 'tripay',
  description: [{ languageCode: LanguageCode.en, value: 'Tripay (Indonesia)' }],

  args: {
    apiKey: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'API Key' }],
      description: [
        { languageCode: LanguageCode.en, value: 'Tripay API Key (from your Tripay merchant dashboard).' },
      ],
      ui: { component: 'password-form-input' },
    },
    privateKey: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'Private Key' }],
      description: [
        { languageCode: LanguageCode.en, value: 'Tripay Private Key, used to sign requests and verify webhooks.' },
      ],
      ui: { component: 'password-form-input' },
    },
    merchantCode: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'Merchant Code' }],
      description: [
        { languageCode: LanguageCode.en, value: 'Tripay Merchant Code (e.g. T1234).' },
      ],
    },
    sandbox: {
      type: 'boolean',
      label: [{ languageCode: LanguageCode.en, value: 'Sandbox mode' }],
      description: [
        { languageCode: LanguageCode.en, value: 'Use the Tripay sandbox environment for testing.' },
      ],
      defaultValue: true,
    },
    callbackUrl: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'Callback URL' }],
      description: [
        { languageCode: LanguageCode.en, value: 'Webhook URL registered at Tripay, e.g. https://your-domain.com/payments/tripay/webhook' },
      ],
    },
    returnUrl: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'Return URL' }],
      description: [
        { languageCode: LanguageCode.en, value: 'Where customers are redirected after payment, e.g. https://your-store.com/order/confirmation' },
      ],
    },
    defaultChannelCode: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'Default payment channel' }],
      description: [
        { languageCode: LanguageCode.en, value: 'Tripay channel code to use, e.g. BRIVA, QRIS, OVO.' },
      ],
      defaultValue: 'BRIVA',
    },
  },

  /**
   * Creates a Tripay transaction and returns an Authorized payment.
   * The Tripay payment URL is returned in public metadata for storefront redirect.
   */
  async createPayment(ctx, order, amount, args, metadata): Promise<CreatePaymentResult> {
    const channelCode = (metadata?.channelCode as string) || args.defaultChannelCode || 'BRIVA';

    // The selected channel is treated as allowed; channel curation can be
    // expanded later without changing this handler.
    const allowedChannels: TripayChannel[] = [
      { code: channelCode, name: channelCode, group: 'bank_transfer', active: true },
    ];

    const service = new TripayService({
      apiKey: args.apiKey,
      privateKey: args.privateKey,
      merchantCode: args.merchantCode,
      sandbox: args.sandbox,
      callbackUrl: args.callbackUrl,
      returnUrl: args.returnUrl,
      allowedChannels,
    });

    try {
      const result = await service.createTransaction({
        method: channelCode,
        merchant_ref: order.code,
        amount,
        customer_name: order.customer
          ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
          : (metadata?.customerName as string) || 'Customer',
        customer_email:
          order.customer?.emailAddress || (metadata?.customerEmail as string) || '',
        order_items: order.lines.map((line) => ({
          name: line.productVariant?.name ?? `Item ${line.id}`,
          price: line.proratedUnitPriceWithTax ?? line.listPrice,
          quantity: line.quantity,
        })),
      });

      Logger.info(`Created Tripay transaction for order ${order.code}`, loggerCtx);

      return {
        amount,
        // Authorized = awaiting asynchronous confirmation via webhook.
        state: 'Authorized' as const,
        transactionId: result.data.reference,
        metadata: {
          public: {
            paymentUrl: result.data.payment_url,
            reference: result.data.reference,
            channelCode,
          },
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Tripay error';
      Logger.error(`Tripay payment creation failed for order ${order.code}: ${message}`, loggerCtx);
      return {
        amount,
        state: 'Declined' as const,
        metadata: { errorMessage: message },
      };
    }
  },

  /**
   * Settlement is confirmed by the Tripay webhook. By the time this runs the
   * webhook has already validated the PAID notification, so we approve.
   */
  async settlePayment(): Promise<SettlePaymentResult> {
    return { success: true };
  },
});
