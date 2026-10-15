import { Injectable, OnModuleInit } from '@nestjs/common';
import { ID, JobQueue, JobQueueService, Logger, RequestContextService } from '@vendure/core';
import { OrderFulfillmentRunner } from './order-fulfillment-runner.service';

const loggerCtx = 'OrderFulfillmentQueue';

/**
 * Durable, retrying queue for post-payment fulfillment.
 *
 * Why a queue instead of doing the work inline in the payment webhook:
 *  - The webhook must acknowledge Tripay quickly. Fulfillment sends an email and
 *    a WhatsApp message, each of which can take seconds; blocking the webhook on
 *    them risks a slow ack and unnecessary Tripay retries.
 *  - Delivery can fail transiently. A DB-backed queue (DefaultJobQueuePlugin)
 *    retries the job instead of silently losing the notification.
 *
 * The job itself is idempotent: the runner skips download records that already
 * exist, so a retry cannot double-create them.
 */
@Injectable()
export class OrderFulfillmentQueue implements OnModuleInit {
  private queue?: JobQueue<{ orderId: number }>;

  constructor(
    private jobQueueService: JobQueueService,
    private requestContextService: RequestContextService,
    private runner: OrderFulfillmentRunner,
  ) {}

  async onModuleInit(): Promise<void> {
    this.queue = await this.jobQueueService.createQueue({
      name: 'order-fulfillment',
      process: async (job) => {
        const ctx = await this.requestContextService.create({ apiType: 'shop' });
        return this.runner.run(ctx, job.data.orderId);
      },
    });
  }

  /**
   * Queues fulfillment for a paid order.
   *
   * @returns true when the job was accepted. On failure the order is still in
   *   `Fulfilled` state; fulfillment can be re-run by re-posting the webhook or
   *   invoking the runner manually.
   */
  async enqueue(orderId: ID): Promise<boolean> {
    if (!this.queue) {
      Logger.error(
        `Fulfillment queue is not ready; could not enqueue order ${orderId}`,
        loggerCtx,
      );
      return false;
    }
    try {
      await this.queue.add({ orderId: Number(orderId) }, { retries: 3 });
      Logger.info(`Queued fulfillment for order ${orderId}`, loggerCtx);
      return true;
    } catch (error) {
      Logger.error(
        `Failed to enqueue fulfillment for order ${orderId}: ${(error as Error).message}`,
        loggerCtx,
      );
      return false;
    }
  }
}
