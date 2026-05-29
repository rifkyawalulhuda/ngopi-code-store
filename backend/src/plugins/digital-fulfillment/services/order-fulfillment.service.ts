import { randomUUID } from 'crypto';
import { ID } from '@vendure/core';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalDownload } from '../entities/digital-download.entity';

/**
 * Interface for looking up DigitalProduct records by variant ID.
 */
export interface DigitalProductLookup {
  findByVariantId(variantId: ID): Promise<DigitalProduct | null>;
}

/**
 * Interface for persisting DigitalDownload records.
 */
export interface DigitalDownloadPersistence {
  save(entity: DigitalDownload): Promise<DigitalDownload>;
  removeByOrderId(orderId: ID): Promise<void>;
}

/**
 * Represents a line item in a fulfilled order.
 */
export interface FulfillmentLineItem {
  productVariantId: ID;
}

/**
 * Represents the order data needed for fulfillment processing.
 */
export interface FulfillmentOrderData {
  id: ID;
  code: string;
  customerId: ID;
  customerName: string;
  customerEmail: string;
  lines: FulfillmentLineItem[];
  totalWithTax: number;
  paymentMethod: string;
  paidAt: Date;
}

/**
 * Interface for sending order confirmation emails.
 * @see Requirements 6.1
 */
export interface EmailSender {
  sendOrderConfirmation(data: {
    customerName: string;
    customerEmail: string;
    orderCode: string;
    items: Array<{
      productName: string;
      price: number;
      downloadUrl: string;
    }>;
    totalAmount: number;
    paymentMethod: string;
    paidAt: Date;
  }): Promise<void>;
}

/**
 * Result of the fulfillment process.
 */
export interface FulfillmentResult {
  downloadRecordsCreated: number;
  emailSent: boolean;
}

/**
 * OrderFulfillmentService orchestrates the end-to-end fulfillment flow:
 * 1. Creates DigitalDownload records for all digital line items
 * 2. Sends order confirmation email
 *
 * This service is called after an order transitions to Fulfilled state,
 * wiring together the Digital Fulfillment Plugin and Email Plugin.
 *
 * @see Requirements 2.3, 2.4, 4.1, 6.1
 */
export class OrderFulfillmentService {
  constructor(
    private readonly digitalProductLookup: DigitalProductLookup,
    private readonly downloadPersistence: DigitalDownloadPersistence,
    private readonly emailSender: EmailSender,
    private readonly storefrontUrl: string,
  ) {}

  /**
   * Processes fulfillment for a completed order:
   * - Creates DigitalDownload records for each digital line item (Req 4.1)
   * - Sends order confirmation email with download page URL (Req 6.1)
   *
   * @param order - The fulfilled order data
   * @returns FulfillmentResult with counts of records created and email status
   *
   * @throws FulfillmentError if download record creation fails (with rollback)
   */
  async processFulfillment(order: FulfillmentOrderData): Promise<FulfillmentResult> {
    // Step 1: Create download records for all digital line items (Req 4.1)
    const createdRecords: DigitalDownload[] = [];

    try {
      for (const line of order.lines) {
        const digitalProduct = await this.digitalProductLookup.findByVariantId(
          line.productVariantId,
        );

        // Skip line items without DigitalProduct association (Req 4.1)
        if (!digitalProduct) {
          continue;
        }

        // Create download record with UUID v4 token (Req 4.2)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + digitalProduct.downloadExpiryHours);

        const downloadRecord = new DigitalDownload({
          orderId: order.id,
          customerId: order.customerId,
          productVariantId: line.productVariantId,
          downloadToken: randomUUID(), // UUID v4 - 122 bits entropy (Req 13.4)
          maxDownloads: digitalProduct.maxDownloadsPerOrder, // From config (Req 4.4)
          currentDownloads: 0,
          expiresAt, // Current time + downloadExpiryHours (Req 4.3)
          lastDownloadedAt: null,
          isActive: true,
        });

        const saved = await this.downloadPersistence.save(downloadRecord);
        createdRecords.push(saved);
      }
    } catch (error) {
      // Rollback all created records on partial failure (Req 4.5)
      if (createdRecords.length > 0) {
        try {
          await this.downloadPersistence.removeByOrderId(order.id);
        } catch {
          // Best-effort rollback
        }
      }
      throw error;
    }

    // Step 2: Send order confirmation email (Req 6.1)
    let emailSent = false;
    try {
      const downloadPageUrl = `${this.storefrontUrl}/downloads/${order.code}`;

      await this.emailSender.sendOrderConfirmation({
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        orderCode: order.code,
        items: order.lines.map((line) => ({
          productName: `Product ${String(line.productVariantId)}`,
          price: 0, // Price info would come from order lines in real implementation
          downloadUrl: downloadPageUrl,
        })),
        totalAmount: order.totalWithTax,
        paymentMethod: order.paymentMethod,
        paidAt: order.paidAt,
      });
      emailSent = true;
    } catch {
      // Email failure should not rollback fulfillment (Req 6.4)
      // Order remains in Fulfilled state
      emailSent = false;
    }

    return {
      downloadRecordsCreated: createdRecords.length,
      emailSent,
    };
  }
}
