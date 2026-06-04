/**
 * DigitalDownload Entity
 *
 * Represents a customer's download access record for a purchased digital product.
 * Created when an order transitions to Fulfilled state.
 *
 * @see Requirements 4.2 - Generate unique UUID v4 download token, initial count 0, active true
 * @see Requirements 4.3 - Set expiry to current time + downloadExpiryHours (default 72, range 1-168)
 * @see Requirements 4.4 - Set maxDownloads from DigitalProduct config (default 5, range 1-10)
 */
import { DeepPartial, VendureEntity, ID } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

@Entity()
export class DigitalDownload extends VendureEntity {
  constructor(input?: DeepPartial<DigitalDownload>) {
    super(input);
  }

  @Column({ type: 'int' })
  @Index()
  orderId: ID;

  @Column({ type: 'int' })
  customerId: ID;

  @Column({ type: 'int' })
  productVariantId: ID;

  @Column({ unique: true })
  @Index()
  downloadToken: string; // UUID v4

  @Column({ default: 5 })
  maxDownloads: number;

  @Column({ default: 0 })
  currentDownloads: number;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastDownloadedAt: Date | null;

  @Column({ default: true })
  isActive: boolean;

  /**
   * Validates that currentDownloads does not exceed maxDownloads.
   * Returns true if the record is in a valid state.
   */
  isDownloadCountValid(): boolean {
    return this.currentDownloads <= this.maxDownloads;
  }

  /**
   * Checks if the download record has expired based on the current time.
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Checks if the download limit has been reached.
   */
  isLimitReached(): boolean {
    return this.currentDownloads >= this.maxDownloads;
  }

  /**
   * Checks if the download is currently accessible (active, not expired, not at limit).
   */
  isAccessible(): boolean {
    return this.isActive && !this.isExpired() && !this.isLimitReached();
  }
}
