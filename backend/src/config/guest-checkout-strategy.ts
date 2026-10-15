import {
  Customer,
  CustomerService,
  ErrorResultUnion,
  GuestCheckoutStrategy,
  Injector,
  isGraphQlErrorResult,
  RequestContext,
  TransactionalConnection,
} from '@vendure/core';
import { CreateCustomerInput, SetCustomerForOrderResult } from '@vendure/common/lib/generated-shop-types';
// Vendure does not re-export the generated shop error results from the package
// root; the core itself imports them from this path.
import {
  AlreadyLoggedInError,
  EmailAddressConflictError,
  GuestCheckoutError,
} from '@vendure/core/dist/common/error/generated-graphql-shop-errors';
import { isGuestCheckoutEnabled } from './guest-checkout';

/**
 * NgopiGuestCheckoutStrategy
 *
 * Guest checkout policy for NgopiCode:
 *
 * - Disabled globally when the kill switch is off.
 * - Never for already-authenticated users.
 * - A guest email that matches a REAL registered account is rejected with
 *   `EmailAddressConflictError`, which the storefront turns into "log in or use
 *   a magic link" rather than silently creating a duplicate.
 * - A guest email that matches a PREVIOUS GUEST (marked `isGuest`) is reused, so
 *   repeat guests attach to the same Customer.
 * - New guests are marked `isGuest = true`.
 *
 * No User is created here: that happens lazily at fulfillment, so abandoned or
 * expired carts never leave orphan Users behind.
 */
export class NgopiGuestCheckoutStrategy implements GuestCheckoutStrategy {
  private customerService: CustomerService;
  private connection: TransactionalConnection;

  init(injector: Injector) {
    this.customerService = injector.get(CustomerService);
    this.connection = injector.get(TransactionalConnection);
  }

  async setCustomerForOrder(
    ctx: RequestContext,
    order: unknown,
    input: CreateCustomerInput,
  ): Promise<ErrorResultUnion<SetCustomerForOrderResult, Customer>> {
    if (!isGuestCheckoutEnabled()) {
      return new GuestCheckoutError({
        errorDetail: 'Guest checkout is currently disabled',
      });
    }

    if (ctx.activeUserId) {
      return new AlreadyLoggedInError();
    }

    const emailAddress = input.emailAddress.trim().toLowerCase();

    const existing = await this.connection
      .getRepository(ctx, Customer)
      .findOne({ where: { emailAddress }, relations: ['user'] });

    // A real (non-guest) account owns this email → force login / magic link.
    if (existing?.user && !this.isGuest(existing)) {
      return new EmailAddressConflictError();
    }

    const customer = await this.customerService.createOrUpdate(ctx, input, false);
    if (isGraphQlErrorResult(customer)) {
      return customer;
    }

    // Mark as guest so repeat purchases resolve to the same Customer.
    if (!this.isGuest(customer)) {
      customer.customFields = { ...((customer.customFields as any) ?? {}), isGuest: true } as any;
      await this.connection.getRepository(ctx, Customer).save(customer);
    }

    return customer;
  }

  private isGuest(customer: Customer): boolean {
    return Boolean((customer.customFields as any)?.isGuest);
  }
}
