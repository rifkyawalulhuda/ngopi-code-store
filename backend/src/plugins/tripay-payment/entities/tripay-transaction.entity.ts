import { DeepPartial, VendureEntity, ID } from '@vendure/core';
import { Entity, Column, Index } from 'typeorm';

/**
 * TripayTransaction entity stores payment transaction records
 * created via the Tripay payment gateway.
 *
 * Tracks the lifecycle of a payment from creation (UNPAID)
 * through to completion (PAID) or failure (EXPIRED/FAILED).
 *
 * @see Requirements 1.2 - Store TripayTransaction record with Tripay reference,
 *   merchant reference, payment method, amount, status, payment URL, and expiry time
 */
@Entity()
export class TripayTransaction extends VendureEntity {
  constructor(input?: DeepPartial<TripayTransaction>) {
    super(input);
  }

  /** The Vendure order ID associated with this transaction */
  @Column()
  @Index()
  orderId: ID;

  /** Vendure order code used as the merchant reference at Tripay (unique per transaction) */
  @Column({ unique: true })
  @Index()
  merchantRef: string;

  /** Tripay-assigned reference ID, set after successful transaction creation */
  @Column({ nullable: true })
  @Index()
  tripayReference: string;

  /** Payment channel code, e.g., 'BRIVA', 'QRIS', 'OVO' */
  @Column()
  paymentMethod: string;

  /** Transaction amount in IDR (smallest unit) */
  @Column({ type: 'int' })
  amount: number;

  /** Fee charged to the merchant by Tripay */
  @Column({ type: 'int', default: 0 })
  feeMerchant: number;

  /** Fee charged to the customer by Tripay */
  @Column({ type: 'int', default: 0 })
  feeCustomer: number;

  /** Transaction status: UNPAID | PAID | EXPIRED | FAILED */
  @Column({ default: 'UNPAID' })
  status: string;

  /** URL for the customer to complete payment at Tripay */
  @Column({ nullable: true })
  paymentUrl: string;

  /** Timestamp when this transaction expires if not paid */
  @Column({ type: 'timestamp', nullable: true })
  expiredAt: Date | null;

  /** Timestamp when payment was confirmed */
  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;
}
