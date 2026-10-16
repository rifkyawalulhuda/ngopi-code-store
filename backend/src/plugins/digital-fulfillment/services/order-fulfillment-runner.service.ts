import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ID, Logger, Order, OrderLine, RequestContext, TransactionalConnection } from '@vendure/core';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalDownload } from '../entities/digital-download.entity';
import { OrderReceiptEmailService } from './order-receipt-email.service';
import { GuestAccountService } from '../../guest-checkout/services/guest-account.service';
import { OrderAccessService } from '../../guest-checkout/services/order-access.service';
import { WhatsappService } from '../../whatsapp/services/whatsapp.service';
import { getOrderAccessLinkTtlHours } from '../../../config/guest-checkout';
import { getStorefrontUrl } from '../../../config/whatsapp';

const loggerCtx = 'OrderFulfillmentRunner';

/**
 * Whether an order line belongs to a service (jasa) product.
 *
 * Services are delivered by human work and have no uploaded file by design, so
 * they must not be treated as "undeliverable" — doing so logged a false error
 * for every service order. Several facet schemas exist across environments, so
 * a product counts as a service when ANY of these matches:
 *  - `product-category: jasa`      (production)
 *  - `purchase-rule: repeatable`   (production)
 *  - `product-type: service`       (legacy/local schema)
 */
function isServiceProductLine(line: OrderLine): boolean {
  const facetValues = (line.productVariant as any)?.product?.facetValues ?? [];
  return facetValues.some((fv: any) => {
    const facetCode = fv.facet?.code;
    return (
      (facetCode === 'product-category' && fv.code === 'jasa') ||
      (facetCode === 'purchase-rule' && fv.code === 'repeatable') ||
      (facetCode === 'product-type' && fv.code === 'service')
    );
  });
}

export interface FulfillmentRunResult {
  downloadRecordsCreated: number;
  emailSent: boolean;
  whatsappSent: boolean;
  /**
   * Names of paid line items whose variant had no uploaded file, so no download
   * record could be created. Non-empty means the customer paid for something
   * that cannot be delivered — surfaced so it is never silent.
   */
  missingFiles?: string[];
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
      relations: [
        'customer',
        'lines',
        'lines.productVariant',
        // Needed to tell a service (jasa) from a downloadable product.
        'lines.productVariant.product',
        'lines.productVariant.product.facetValues',
        'lines.productVariant.product.facetValues.facet',
        'payments',
      ],
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
    const { created: downloadRecordsCreated, missingFiles } = await this.createDownloadRecords(
      ctx,
      order,
      customer.id,
    );

    if (missingFiles.length) {
      Logger.error(
        `Order ${order.code} was fulfilled with ${missingFiles.length} undeliverable item(s): ` +
          `${missingFiles.join(', ')}. Those customers cannot download what they paid for.`,
        loggerCtx,
      );
    }

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

    return { downloadRecordsCreated, emailSent, whatsappSent: waOutcome.sent, missingFiles };
  }

  /**
   * Creates a DigitalDownload per digital line item, skipping records that
   * already exist (idempotent).
   *
   * A line whose variant has no uploaded file is NOT silently ignored: it is a
   * paid item that can never be delivered, so it is logged as an error and
   * reported back to the caller. Silent skipping used to hide exactly this —
   * a customer pays for a variant (e.g. an "Extended" tier) and receives zero
   * downloads with no signal anywhere.
   *
   * Services (jasa) are the exception: they are delivered by human work and
   * have no file by design, so they are skipped without an error.
   */
  private async createDownloadRecords(
    ctx: RequestContext,
    order: Order,
    customerId: ID,
  ): Promise<{ created: number; missingFiles: string[] }> {
    const productRepo = this.connection.getRepository(ctx, DigitalProduct);
    const downloadRepo = this.connection.getRepository(ctx, DigitalDownload);
    let created = 0;
    const missingFiles: string[] = [];

    for (const line of order.lines) {
      const variantId = line.productVariantId;

      // A service has no deliverable file, so there is nothing to create and
      // nothing to warn about.
      if (isServiceProductLine(line)) {
        continue;
      }

      const digitalProduct = await productRepo.findOne({
        where: { productVariantId: variantId as any },
      });
      if (!digitalProduct) {
        const variantName = line.productVariant?.name ?? `variant ${variantId}`;
        missingFiles.push(variantName);
        Logger.error(
          `Undeliverable item on paid order ${order.code}: no digital file uploaded for ` +
            `"${variantName}" (variant ${variantId}). The customer cannot download this item — ` +
            `upload a file for this variant in the admin uploader.`,
          loggerCtx,
        );
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

    return { created, missingFiles };
  }
}
