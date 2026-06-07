import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import gql from 'graphql-tag';
import { TripayTransaction } from './entities/tripay-transaction.entity';
import { tripayPaymentMethodHandler } from './tripay-payment-method.handler';
import { CancelOrderResolver } from './api/cancel-order.resolver';

const shopApiExtensions = gql`
  type CancelMyOrderResult {
    success: Boolean!
    message: String!
  }

  extend type Mutation {
    cancelMyOrder(orderCode: String!): CancelMyOrderResult!
  }
`;

/**
 * TripayPaymentPlugin
 *
 * Registers:
 *  - The {@link TripayTransaction} database entity.
 *  - The {@link tripayPaymentMethodHandler}, which surfaces Tripay credentials
 *    (API key, private key, merchant code, sandbox, URLs, default channel) as a
 *    configurable form under Settings → Payment methods in the Admin UI.
 *  - The {@link CancelOrderResolver} Shop API mutation for customer-initiated
 *    cancellation of orders still awaiting payment.
 *
 * No custom Admin UI build is required — Vendure renders the handler's
 * `args` as a native settings form.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [TripayTransaction],
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [CancelOrderResolver],
  },
  compatibility: '^3.0.0',
  configuration: (config) => {
    config.paymentOptions.paymentMethodHandlers.push(tripayPaymentMethodHandler);
    return config;
  },
})
export class TripayPaymentPlugin {}
