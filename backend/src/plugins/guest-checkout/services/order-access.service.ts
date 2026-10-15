import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ID, RequestContext, TransactionalConnection } from '@vendure/core';
import { OrderAccessToken } from '../entities/order-access-token.entity';
import { getOrderAccessLinkTtlHours } from '../../../config/guest-checkout';

/**
 * OrderAccessService
 *
 * Issues and consumes single-use magic links that let a guest open a session
 * for the Customer owning an Order.
 *
 * Only the SHA-256 hash of a token is persisted. The raw token travels solely
 * in the emailed link, so a database leak does not expose usable links.
 */
@Injectable()
export class OrderAccessService {
  constructor(private connection: TransactionalConnection) {}

  /** Deterministic hash of a raw token (hex SHA-256). */
  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Issues a fresh token for the given order + customer and returns the raw
   * token (the only time it exists in plaintext).
   */
  async issue(
    ctx: RequestContext,
    orderId: ID,
    customerId: ID,
    ttlHours: number = getOrderAccessLinkTtlHours(),
  ): Promise<string> {
    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const repo = this.connection.getRepository(ctx, OrderAccessToken);
    await repo.save(
      new OrderAccessToken({
        tokenHash: this.hashToken(rawToken),
        orderId,
        customerId,
        expiresAt,
        consumedAt: null,
      }),
    );

    return rawToken;
  }

  /**
   * Consumes a raw token, marking it used. Returns the record when the token is
   * valid and usable, otherwise null. Never reveals why it failed.
   */
  async consume(ctx: RequestContext, rawToken: string): Promise<OrderAccessToken | null> {
    if (!rawToken) {
      return null;
    }

    const repo = this.connection.getRepository(ctx, OrderAccessToken);
    const record = await repo.findOne({ where: { tokenHash: this.hashToken(rawToken) } });
    if (!record || !record.isUsable()) {
      return null;
    }

    record.consumedAt = new Date();
    await repo.save(record);
    return record;
  }
}
