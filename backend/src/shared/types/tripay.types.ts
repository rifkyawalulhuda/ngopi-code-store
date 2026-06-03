/**
 * Tripay Payment Plugin - Shared TypeScript Interfaces
 *
 * These types define the contract between the Tripay payment gateway
 * and the Vendure backend plugin.
 *
 * @see Requirements 1.1 - Transaction creation with order amount, customer details, payment channel
 */

/** Configuration options for the Tripay payment plugin */
export interface TripayPluginOptions {
  apiKey: string;
  privateKey: string;
  merchantCode: string;
  sandbox: boolean;
  callbackUrl: string;
  returnUrl: string;
  allowedChannels: TripayChannel[];
}

/** Represents a payment channel available through Tripay */
export interface TripayChannel {
  /** Payment channel code, e.g., 'BRIVA', 'QRIS', 'OVO' */
  code: string;
  name: string;
  group: 'bank_transfer' | 'ewallet' | 'qris' | 'retail';
  active: boolean;
}

/** Individual order item included in a Tripay transaction request */
export interface TripayOrderItem {
  name: string;
  price: number;
  quantity: number;
}

/** Input payload for creating a transaction at Tripay */
export interface TripayCreateTransactionInput {
  method: string;
  merchant_ref: string;
  amount: number;
  customer_name: string;
  customer_email: string;
  order_items: TripayOrderItem[];
}

/** Response from Tripay after creating a transaction */
export interface TripayCreateTransactionResponse {
  success: boolean;
  data: {
    reference: string;
    merchant_ref: string;
    payment_url: string;
    payment_name: string;
    pay_code: string;
    pay_url: string;
    checkout_url: string;
    amount: number;
    amount_received: number;
    status: 'UNPAID' | 'PAID' | 'EXPIRED' | 'FAILED';
    expired_time: number;
    instructions: Array<{
      title: string;
      steps: string[];
    }>;
  };
}

/** Payload received from Tripay via webhook callback */
export interface TripayWebhookPayload {
  reference: string;
  merchant_ref: string;
  payment_method: string;
  payment_method_code: string;
  total_amount: number;
  fee_merchant: number;
  fee_customer: number;
  total_fee: number;
  amount_received: number;
  status: 'PAID' | 'EXPIRED' | 'FAILED';
  paid_at: string;
}
