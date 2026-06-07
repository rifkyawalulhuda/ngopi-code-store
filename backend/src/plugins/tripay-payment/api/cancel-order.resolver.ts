import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  Ctx,
  RequestContext,
  TransactionalConnection,
  ForbiddenError,
  Logger,
} from '@vendure/core';
import { TripayTransaction } from '../entities/tripay-transaction.entity';

const loggerCtx = 'CancelOrder';

/**
 * Shop API resolver allowing an authenticated customer to cancel
 * their own order while it is still awaiting payment (ArrangingPayment).
 *
 * Note on Tripay sync: Tripay does NOT expose a public endpoint to cancel
 * a "closed payment" transaction. Such transactions auto-expire at their
 * `expired_time`. We therefore mark the local TripayTransaction as CANCELLED
 * and transition the Vendure order to Cancelled; the Tripay-side transaction
 * will lapse to EXPIRED automatically once its deadline passes.
 */
@Resolver()
export class CancelOrderResolver {
  constructor(private connection: TransactionalConnection) {}

  @Mutation()
  async cancelMyOrder(
    @Ctx() ctx: RequestContext,
    @Args() args: { orderCode: string },
  ): Promise<{ success: boolean; message: string }> {
    if (!ctx.activeUserId) {
      throw new ForbiddenError();
    }

    const { orderCode } = args;

    // Find the order and verify ownership + state
    const orders = await this.connection.rawConnection.query(
      `SELECT o.id, o.code, o.state
       FROM "order" o
       JOIN customer c ON o."customerId" = c.id
       JOIN "user" u ON c."userId" = u.id
       WHERE o.code = $1 AND u.id = $2
       LIMIT 1`,
      [orderCode, ctx.activeUserId],
    );

    if (!orders || orders.length === 0) {
      return { success: false, message: 'Pesanan tidak ditemukan.' };
    }

    const order = orders[0];

    // Only orders awaiting payment can be cancelled by the customer
    if (order.state !== 'ArrangingPayment') {
      return {
        success: false,
        message: `Pesanan tidak dapat dibatalkan karena status saat ini: ${order.state}.`,
      };
    }

    try {
      // Transition order to Cancelled and mark inactive
      await this.connection.rawConnection.query(
        `UPDATE "order" SET state = 'Cancelled', active = false, "updatedAt" = NOW() WHERE id = $1`,
        [order.id],
      );

      // Cancel any pending payment records for the order
      await this.connection.rawConnection.query(
        `UPDATE payment SET state = 'Cancelled', "updatedAt" = NOW() WHERE "orderId" = $1 AND state IN ('Created', 'Authorized', 'Declined')`,
        [order.id],
      );

      // Mark the local Tripay transaction as CANCELLED (Tripay side auto-expires)
      await this.connection.rawConnection
        .getRepository(TripayTransaction)
        .createQueryBuilder()
        .update()
        .set({ status: 'CANCELLED' as any })
        .where('"merchantRef" = :code', { code: orderCode })
        .execute()
        .catch(() => {
          // Transaction record may not exist; ignore
        });

      // Release session reference so the customer can start a new order
      await this.connection.rawConnection.query(
        `UPDATE "session" SET "activeOrderId" = NULL WHERE "activeOrderId" = $1`,
        [order.id],
      );

      Logger.info(`Order ${orderCode} cancelled by customer (user ${ctx.activeUserId})`, loggerCtx);

      return { success: true, message: 'Pesanan berhasil dibatalkan.' };
    } catch (err: any) {
      Logger.error(`Failed to cancel order ${orderCode}: ${err.message}`, loggerCtx);
      return { success: false, message: 'Gagal membatalkan pesanan. Silakan coba lagi.' };
    }
  }
}
