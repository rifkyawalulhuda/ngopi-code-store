import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { WhatsappService } from './services/whatsapp.service';
import { WhatsappNotifier } from './whatsapp-notifier';

/**
 * WhatsappPlugin
 *
 * WhatsApp notifications via a self-hosted WAHA (WhatsApp HTTP API) instance.
 * Complementary to the email channel — email remains the primary delivery path.
 *
 * Notifications:
 *  - payment instructions (VA/QRIS) when a Tripay payment is authorized
 *  - order confirmation + magic access link + receipt link when an order is paid
 *  - unpaid-order reminder shortly before payment expiry (scheduled task)
 *
 * Configuration is environment-driven; see `src/config/whatsapp.ts`.
 * The scheduled task is registered in `schedulerOptions.tasks` (vendure-config.ts).
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [
    { provide: WhatsappService, useFactory: () => new WhatsappService() },
    WhatsappNotifier,
  ],
  exports: [WhatsappService],
  compatibility: '^3.0.0',
})
export class WhatsappPlugin {}
