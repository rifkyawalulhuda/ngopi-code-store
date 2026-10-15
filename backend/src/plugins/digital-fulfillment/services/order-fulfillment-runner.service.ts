import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ID, Logger, Order, RequestContext, TransactionalConnection } from '@vendure/core';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalDownload } from '../entities/digital-download.entity';
import { OrderReceiptEmailService } from './order-receipt-email.service';
import { GuestAccountService } from '../../guest-checkout/services/guest-account.service';
import { OrderAccessService } from '../../guest-checkout/services/order-access.service';
import { WhatsappService } from '../../whatsapp/services/whatsapp.service';
import { getOrderAccessLinkTtlHours } from '../../../config/guest-checkout';
import { getStorefrontUrl } from '../../../config/whatsapp';

const loggerCtx = 'OrderFulfillmentRunner';

export interface FulfillmentRunResult {
  downloadRecordsCreated: number;
  emailSent: boolean;
  whatsappSent: boolean;
}

/**
 * OrderFulfillmentRunner
 *
 * The real, DI-wired fulfillment path invoked when an order becomes paid.
 *
 * Steps (idempotent by order id):
 *  1. Ensure the Customer has a User. For guests this creates the hidden,
 *     verified, password-less User that digital download ownership depends on.
 *  2. Create a DigitalDownload record per digital line item.
 *  3. Issue a magic order-access link (guests) or a plain download-page link
 *     (registered customers).
 *  4. Send the order-confirmation receipt carrying that link.
 *
 * This replaces the previous behaviour where the Tripay webhook only flipped
 * order state via raw SQL and never delivered anything.
 */
@Injectable()
export class OrderFulfillmentRunner {
  constructor(
    private connection: TransactionalConnection,
    private guestAccountService: GuestAccountService,
    private orderAccessService: OrderAccessService,
    private receiptEmailService: OrderReceiptEmailService,
    private whatsapp: WhatsappService,
  ) {}

  async run(ctx: RequestContext, orderId: ID): Promise<FulfillmentRunResult> {
    const order = await this.connection.getRepository(ctx, Order).findOne({
      where: { id: orderId },
      relations: ['customer', 'lines', 'lines.productVariant', 'payments'],
    });

    if (!order || !order.customer) {
      Logger.warn(`Fulfillment skipped: order ${orderId} or its customer is missing`, loggerCtx);
      return { downloadRecordsCreated: 0, emailSent: false, whatsappSent: false };
    }

    const customer = order.customer;
    const isGuest = !customer.user;

    // 1. Guest identity: hidden User so download ownership resolves.
    if (isGuest) {
      await this.guestAccountService.ensureHiddenUser(ctx, customer);
    }

    // 2. Download records.
    const downloadRecordsCreated = await this.createDownloadRecords(ctx, order, customer.id);

    // 3. Access link.
    const storefrontUrl = getStorefrontUrl();
    let downloadUrl: string;
    if (isGuest) {
      const ttlHours = getOrderAccessLinkTtlHours();
      const rawToken = await this.orderAccessService.issue(ctx, order.id, customer.id, ttlHours);
      downloadUrl = `${storefrontUrl}/auth/order-access?token=${encodeURIComponent(rawToken)}`;
    } else {
      downloadUrl = `${storefrontUrl}/downloads/${order.code}`;
    }

    const customerName =
      `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || 'Customer';
    const paymentMethod = order.payments?.[0]?.method ?? 'tripay';
    const items = order.lines.map((line) => ({
      productName: line.productVariant?.name ?? `Item ${line.id}`,
      price: line.proratedUnitPriceWithTax ?? line.listPrice,
    }));

    // 4. Receipt email (primary channel).
    const emailSent = await this.receiptEmailService.sendOrderConfirmation({
      customerName,
      customerEmail: customer.emailAddress,
      orderCode: order.code,
      items: items.map((item) => ({ ...item, downloadUrl })),
      totalAmount: order.totalWithTax,
      paymentMethod,
      paidAt: new Date(),
    });

    // 5. WhatsApp notification (complementary channel, best-effort).
    const phone = (customer.customFields as any)?.whatsappNumber as string | undefined;
    const waOutcome = await this.whatsapp.sendOrderConfirmation(phone, {
      customerName,
      orderCode: order.code,
      items,
      totalAmount: order.totalWithTax,
      paymentMethod,
      accessUrl: downloadUrl,
      accessExpiresInHours: getOrderAccessLinkTtlHours(),
      receiptUrl: `${storefrontUrl}/receipt/${order.code}`,
    });

    Logger.info(
      `Fulfilled order ${order.code}: ${downloadRecordsCreated} download record(s), ` +
        `emailSent=${emailSent}, whatsappSent=${waOutcome.sent}`,
      loggerCtx,
    );

    return { downloadRecordsCreated, emailSent, whatsappSent: waOutcome.sent };
  }

  /**
   * Creates a DigitalDownload per digital line item, skipping items that have
   * no uploaded file and records that already exist (idempotent).
   */
  private async createDownloadRecords(
    ctx: RequestContext,
    order: Order,
    customerId: ID,
  ): Promise<number> {
    const productRepo = this.connection.getRepository(ctx, DigitalProduct);
    const downloadRepo = this.connection.getRepository(ctx, DigitalDownload);
    let created = 0;

    for (const line of order.lines) {
      const variantId = line.productVariantId;

      const digitalProduct = await productRepo.findOne({
        where: { productVariantId: variantId as any },
      });
      if (!digitalProduct) {
        continue;
      }

      const existing = await downloadRepo.findOne({
        where: { orderId: order.id as any, productVariantId: variantId as any },
      });
      if (existing) {
        continue;
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + digitalProduct.downloadExpiryHours);

      await downloadRepo.save(
        new DigitalDownload({
          orderId: order.id,
          customerId,
          productVariantId: variantId,
          downloadToken: randomUUID(),
          maxDownloads: digitalProduct.maxDownloadsPerOrder,
          currentDownloads: 0,
          expiresAt,
          lastDownloadedAt: null,
          isActive: true,
        }),
      );
      created += 1;
    }

    return created;
  }
}
