/**
 * Shared Types - Barrel Export
 *
 * Re-exports all shared TypeScript interfaces used across plugins.
 * Import from '@shared/types' to access any shared type.
 */

export {
  TripayPluginOptions,
  TripayChannel,
  TripayOrderItem,
  TripayCreateTransactionInput,
  TripayCreateTransactionResponse,
  TripayWebhookPayload,
} from './tripay.types';

export {
  DigitalProductInput,
  DigitalDownloadRecord,
  DownloadLinkResponse,
} from './digital-fulfillment.types';

export {
  EmailPluginOptions,
  OrderConfirmationEmailData,
} from './email.types';
