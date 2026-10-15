import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import {
  Allow,
  ConfigService,
  Ctx,
  Customer,
  CustomerService,
  Logger,
  NativeAuthenticationMethod,
  Order,
  Permission,
  RequestContext,
  setSessionToken,
  TransactionalConnection,
} from '@vendure/core';
import { OrderAccessService } from '../services/order-access.service';
import { GuestAccountService } from '../services/guest-account.service';
import { OrderAccessEmailService } from '../services/order-access-email.service';
import { isGuestCheckoutEnabled, getOrderAccessLinkTtlHours } from '../../../config/guest-checkout';

const loggerCtx = 'GuestCheckoutResolver';

/** Neutral message used for both success and "not found" to prevent enumeration. */
const NEUTRAL_LOOKUP_MESSAGE =
  'Jika kode pesanan dan email cocok, kami telah mengirim tautan akses ke email Anda.';

/** Order states from which a download link makes sense. */
const ACCESSIBLE_ORDER_STATES = new Set(['PaymentSettled', 'Fulfilled', 'Delivered']);

@Resolver()
export class GuestCheckoutResolver {
  constructor(
    private connection: TransactionalConnection,
    private orderAccessService: OrderAccessService,
    private guestAccountService: GuestAccountService,
    private orderAccessEmailService: OrderAccessEmailService,
    private customerService: CustomerService,
    private configService: ConfigService,
  ) {}

  /**
   * Guest order lookup: sends a fresh magic link when the code + email match a
   * paid order. Always returns the same neutral response so it cannot be used
   * to enumerate orders or customers, and never returns order data.
   */
  @Allow(Permission.Public)
  @Mutation()
  async requestOrderAccessLink(
    @Ctx() ctx: RequestContext,
    @Args() args: { orderCode: string; emailAddress: string },
  ): Promise<{ success: boolean; message: string }> {
    if (!isGuestCheckoutEnabled()) {
      return {
        success: false,
        message: 'Fitur akses tamu sedang tidak tersedia. Silakan hubungi dukungan.',
      };
    }

    const orderCode = (args.orderCode || '').trim();
    const emailAddress = (args.emailAddress || '').trim().toLowerCase();

    if (orderCode && emailAddress) {
      try {
        const order = await this.connection
          .getRepository(ctx, Order)
          .findOne({ where: { code: orderCode }, relations: ['customer'] });

        const matches =
          order &&
          order.customer &&
          order.customer.emailAddress.toLowerCase() === emailAddress &&
          ACCESSIBLE_ORDER_STATES.has(order.state);

        if (matches && order!.customer) {
          await this.sendAccessLink(ctx, order!, order!.customer);
        }
      } catch (error) {
        Logger.error(
          `requestOrderAccessLink failed for ${orderCode}: ${(error as Error).message}`,
          loggerCtx,
        );
      }
    }

    return { success: true, message: NEUTRAL_LOOKUP_MESSAGE };
  }

  /**
   * Exchanges a magic link token for a real Vendure session token.
   *
   * Consumption is intentionally NOT gated by the kill switch: a customer who
   * already holds a link for a paid order must never be cut off.
   */
  @Allow(Permission.Public)
  @Mutation()
  async authenticateWithOrderLink(
    @Ctx() ctx: RequestContext,
    @Context('req') req: any,
    @Context('res') res: any,
    @Args() args: { token: string },
  ): Promise<{
    success: boolean;
    message: string;
    orderCode?: string | null;
  }> {
    const record = await this.orderAccessService.consume(ctx, args.token);
    if (!record) {
      return { success: false, message: 'Tautan tidak valid atau sudah kedaluwarsa.' };
    }

    const customer = await this.customerService.findOne(ctx, record.customerId);
    if (!customer) {
      return { success: false, message: 'Tautan tidak valid atau sudah kedaluwarsa.' };
    }

    const session = await this.guestAccountService.createSessionForCustomer(ctx, customer);
    if (!session) {
      return { success: false, message: 'Gagal membuka sesi. Silakan minta tautan baru.' };
    }

    // Persist the session exactly like the standard login flow does, so the
    // httpOnly session cookie is set for the storefront.
    setSessionToken({
      req,
      res,
      authOptions: this.configService.authOptions,
      rememberMe: true,
      sessionToken: session.token,
    });

    const order = await this.connection
      .getRepository(ctx, Order)
      .findOne({ where: { id: record.orderId } });

    return {
      success: true,
      message: 'Berhasil masuk.',
      orderCode: order?.code ?? null,
    };
  }

  /**
   * Claims the guest account by setting a password. No current password is
   * required because the hidden guest User was created with an unknown random
   * one. On success the Customer is no longer marked as a guest.
   */
  @Allow(Permission.Owner)
  @Mutation()
  async setPasswordForGuest(
    @Ctx() ctx: RequestContext,
    @Args() args: { newPassword: string },
  ): Promise<{ success: boolean; message: string }> {
    if (!ctx.activeUserId) {
      return { success: false, message: 'Anda harus masuk terlebih dahulu.' };
    }

    const validation = await this.configService.authOptions.passwordValidationStrategy.validate(
      ctx,
      args.newPassword,
    );
    if (validation !== true) {
      return {
        success: false,
        message:
          typeof validation === 'string' ? validation : 'Password tidak memenuhi persyaratan.',
      };
    }

    const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);
    if (!customer) {
      return { success: false, message: 'Akun tidak ditemukan.' };
    }

    const nativeAuth = await this.connection
      .getRepository(ctx, NativeAuthenticationMethod)
      .findOne({ where: { user: { id: ctx.activeUserId } } });
    if (!nativeAuth) {
      return { success: false, message: 'Akun tidak mendukung password.' };
    }

    nativeAuth.passwordHash = await this.configService.authOptions.passwordHashingStrategy.hash(
      args.newPassword,
    );
    await this.connection.getRepository(ctx, NativeAuthenticationMethod).save(nativeAuth);

    await this.guestAccountService.markAsClaimed(ctx, customer);

    Logger.info(`Guest customer ${customer.id} claimed their account`, loggerCtx);
    return { success: true, message: 'Password berhasil disimpan. Akun Anda kini aktif.' };
  }

  /** Issues a token and emails the magic link for the given order. */
  private async sendAccessLink(
    ctx: RequestContext,
    order: Order,
    customer: Customer,
  ): Promise<void> {
    const ttlHours = getOrderAccessLinkTtlHours();
    const rawToken = await this.orderAccessService.issue(ctx, order.id, customer.id, ttlHours);

    const storefrontUrl = process.env.STOREFRONT_URL || 'http://localhost:3001';
    const accessUrl = `${storefrontUrl}/auth/order-access?token=${encodeURIComponent(rawToken)}`;

    await this.orderAccessEmailService.sendOrderAccessLink({
      to: customer.emailAddress,
      customerName: customer.firstName || 'Customer',
      orderCode: order.code,
      accessUrl,
      expiresInHours: ttlHours,
    });
  }
}
