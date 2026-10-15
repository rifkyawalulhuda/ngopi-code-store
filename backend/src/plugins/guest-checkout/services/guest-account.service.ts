import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import {
  AuthenticatedSession,
  AuthService,
  Customer,
  CustomerService,
  isGraphQlErrorResult,
  Logger,
  NativeAuthenticationMethod,
  NATIVE_AUTH_STRATEGY_NAME,
  RequestContext,
  TransactionalConnection,
  User,
  UserService,
} from '@vendure/core';

const loggerCtx = 'GuestAccountService';

/**
 * GuestAccountService
 *
 * Owns the "hidden User" half of the guest identity model.
 *
 * A guest Customer created at checkout has no {@link User}. That is fine while
 * an order is unpaid, but digital download access is enforced against
 * `ctx.activeUserId` and a `customer.userId -> user.id` ownership join. So a
 * User is created lazily, at fulfillment time, immediately before download
 * records are written.
 *
 * The hidden User:
 * - is `verified = true` so it can hold a session despite `requireVerification`,
 * - carries a cryptographically random password nobody knows (never emailed),
 * - has its verification token cleared so no verification email/link lingers.
 */
@Injectable()
export class GuestAccountService {
  constructor(
    private connection: TransactionalConnection,
    private userService: UserService,
    private customerService: CustomerService,
    private authService: AuthService,
  ) {}

  /**
   * Returns the Customer's User, creating a hidden one if the Customer does not
   * have one yet. Idempotent: a Customer that already has a User is returned
   * untouched.
   */
  async ensureHiddenUser(ctx: RequestContext, customer: Customer): Promise<User> {
    if (customer.user) {
      return customer.user;
    }

    // Unknown to everyone — access is only ever granted via a magic order link.
    const randomPassword = randomBytes(32).toString('hex');

    const created = await this.userService.createCustomerUser(
      ctx,
      customer.emailAddress,
      randomPassword,
    );
    if (isGraphQlErrorResult(created)) {
      throw new Error(`Failed to create hidden guest user: ${created.message}`);
    }

    created.verified = true;
    await this.connection.getRepository(ctx, User).save(created);

    // Clear the verification token minted by createCustomerUser so that the
    // hidden account never leaks a usable email-verification link.
    const nativeAuth = await this.connection
      .getRepository(ctx, NativeAuthenticationMethod)
      .findOne({ where: { user: { id: created.id } } });
    if (nativeAuth) {
      nativeAuth.verificationToken = null;
      await this.connection.getRepository(ctx, NativeAuthenticationMethod).save(nativeAuth);
    }

    customer.user = created;
    await this.connection.getRepository(ctx, Customer).save(customer);

    Logger.info(`Created hidden guest user for customer ${customer.id}`, loggerCtx);
    return created;
  }

  /**
   * Mints a real Vendure session for the Customer's (hidden) User, returning the
   * authenticated session so its token can be handed back to the storefront.
   */
  async createSessionForCustomer(
    ctx: RequestContext,
    customer: Customer,
  ): Promise<AuthenticatedSession | null> {
    const user = await this.ensureHiddenUser(ctx, customer);
    const session = await this.authService.createAuthenticatedSessionForUser(
      ctx,
      user,
      NATIVE_AUTH_STRATEGY_NAME,
    );
    if (isGraphQlErrorResult(session)) {
      Logger.warn(
        `Could not create session for guest user ${user.id}: ${session.message}`,
        loggerCtx,
      );
      return null;
    }
    return session;
  }

  /**
   * Marks a guest Customer as claimed (no longer a guest) so subsequent
   * purchases with the same email are treated as a normal account.
   */
  async markAsClaimed(ctx: RequestContext, customer: Customer): Promise<void> {
    customer.customFields = { ...((customer.customFields as any) ?? {}), isGuest: false } as any;
    await this.connection.getRepository(ctx, Customer).save(customer);
  }
}
