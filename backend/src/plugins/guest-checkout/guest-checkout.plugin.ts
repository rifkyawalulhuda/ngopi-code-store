import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { OrderAccessToken } from './entities/order-access-token.entity';
import { OrderAccessService } from './services/order-access.service';
import { GuestAccountService } from './services/guest-account.service';
import { OrderAccessEmailService } from './services/order-access-email.service';
import { GuestCheckoutResolver } from './api/guest-checkout.resolver';
import { guestCheckoutShopApiExtensions } from './api/api-extensions';

/**
 * GuestCheckoutPlugin
 *
 * Adds password-less guest purchasing:
 * - Shop API: requestOrderAccessLink, authenticateWithOrderLink, setPasswordForGuest
 * - Entities: OrderAccessToken (single-use magic links)
 * - Services: hidden guest User creation + session minting + access-link email
 *
 * The guestCheckoutStrategy is wired in vendure-config.ts so registered emails
 * still resolve to their real account.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [OrderAccessToken],
  providers: [OrderAccessService, GuestAccountService, OrderAccessEmailService],
  exports: [OrderAccessService, GuestAccountService, OrderAccessEmailService],
  shopApiExtensions: {
    schema: guestCheckoutShopApiExtensions,
    resolvers: [GuestCheckoutResolver],
  },
  compatibility: '^3.0.0',
})
export class GuestCheckoutPlugin {}
