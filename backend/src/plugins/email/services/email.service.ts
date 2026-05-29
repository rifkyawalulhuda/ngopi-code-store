/**
 * Email Service
 *
 * Handles sending transactional emails for order confirmations.
 * Uses Resend as the email delivery provider.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4
 */

import { OrderConfirmationEmailData } from '@shared/types/email.types';

/** Represents a fulfilled order with all data needed for email generation */
export interface FulfilledOrderData {
  orderCode: string;
  customer: {
    firstName: string;
    emailAddress: string;
  };
  lines: Array<{
    productVariant: {
      name: string;
    };
    unitPriceWithTax: number;
  }>;
  totalWithTax: number;
  paymentMethod: string;
  paidAt: Date;
}

/** Configuration for the email service */
export interface EmailServiceConfig {
  storefrontUrl: string;
}

/**
 * Builds the order confirmation email data from a fulfilled order.
 *
 * For any fulfilled order, the email data must contain:
 * - Order code (non-empty string)
 * - All product names from the order
 * - All prices from the order
 * - Total amount
 * - Payment method name
 * - Download page URL
 *
 * @see Requirements 6.2
 */
export function buildOrderConfirmationEmailData(
  order: FulfilledOrderData,
  config: EmailServiceConfig,
): OrderConfirmationEmailData {
  return {
    customerName: order.customer.firstName,
    customerEmail: order.customer.emailAddress,
    orderCode: order.orderCode,
    items: order.lines.map((line) => ({
      productName: line.productVariant.name,
      price: line.unitPriceWithTax,
      downloadUrl: `${config.storefrontUrl}/downloads/${order.orderCode}`,
    })),
    totalAmount: order.totalWithTax,
    paymentMethod: order.paymentMethod,
    paidAt: order.paidAt,
  };
}
