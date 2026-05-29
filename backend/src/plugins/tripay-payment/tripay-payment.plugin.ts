import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { TripayTransaction } from './entities/tripay-transaction.entity';
import { tripayPaymentMethodHandler } from './tripay-payment-method.handler';

/**
 * TripayPaymentPlugin
 *
 * Registers:
 *  - The {@link TripayTransaction} database entity.
 *  - The {@link tripayPaymentMethodHandler}, which surfaces Tripay credentials
 *    (API key, private key, merchant code, sandbox, URLs, default channel) as a
 *    configurable form under Settings → Payment methods in the Admin UI.
 *
 * No custom Admin UI build is required — Vendure renders the handler's
 * `args` as a native settings form.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [TripayTransaction],
  compatibility: '^3.0.0',
  configuration: (config) => {
    config.paymentOptions.paymentMethodHandlers.push(tripayPaymentMethodHandler);
    return config;
  },
})
export class TripayPaymentPlugin {}
