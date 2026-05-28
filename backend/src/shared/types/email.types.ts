/**
 * Email Plugin - Shared TypeScript Interfaces
 *
 * These types define the contract for transactional email notifications,
 * including order confirmation emails with download links.
 *
 * @see Requirements 6.2 - Email includes order code, product names, prices, total, payment method, download URL
 */

/** Configuration options for the email plugin */
export interface EmailPluginOptions {
  provider: 'resend' | 'mailgun';
  apiKey: string;
  fromAddress: string;
  fromName: string;
  templateDir: string;
}

/** Data payload for rendering and sending an order confirmation email */
export interface OrderConfirmationEmailData {
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
}
