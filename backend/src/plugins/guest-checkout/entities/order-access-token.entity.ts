import { DeepPartial, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

/**
 * OrderAccessToken Entity
 *
 * A single-use, expiring token that authorizes a guest (or a returning guest)
 * to open a session for the Customer that owns a given Order.
 *
 * Security model:
 * - Only the SHA-256 hash of the token is stored; the raw token exists solely
 *   in the emailed link.
 * - Single-use: `consumedAt` is stamped on first successful exchange.
 * - Time-boxed: `expiresAt` bounds the blast radius of a leaked link.
 */
@Entity()
export class OrderAccessToken extends VendureEntity {
  constructor(input?: DeepPartial<OrderAccessToken>) {
    super(input);
  }

  /** SHA-256 hash of the raw token (never the token itself) */
  @Column({ unique: true, length: 64 })
  tokenHash: string;

  /** The order this link grants access to */
  @Column({ type: 'int' })
  @Index()
  orderId: ID;

  /** The customer the resulting session belongs to */
  @Column({ type: 'int' })
  @Index()
  customerId: ID;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  consumedAt: Date | null;

  /** True when the token is neither expired nor already consumed */
  isUsable(now: Date = new Date()): boolean {
    return this.consumedAt === null && now < this.expiresAt;
  }
}
