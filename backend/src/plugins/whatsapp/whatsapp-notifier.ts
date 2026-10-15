import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import {
  EventBus,
  ID,
  Logger,
  Order,
  Payment,
  PaymentStateTransitionEvent,
  RequestContext,
  RequestContextService,
  TransactionalConnection,
} from '@vendure/core';
import { WhatsappService } from './services/whatsapp.service';
import {
  getPaymentReminderIntervalMinutes,
  getPaymentReminderLeadMinutes,
  getStorefrontUrl,
  isWhatsappEnabled,
  isWhatsappReminderEnabled,
} from '../../config/whatsapp';

const loggerCtx = 'WhatsappNotifier';

/** Guards against starting more than one reminder timer per process. */
let reminderLoopStarted = false;

/** Tripay payment metadata as surfaced by the payment method handler. */
interface TripayPublicMeta {
  paymentUrl?: string;
  payCode?: string;
  paymentName?: string;
  channelCode?: string;
  amount?: number;
  /** Unix timestamp in seconds. */
  expiredTime?: number;
  instructions?: Array<{ title: string; steps: string[] }>;
}

/**
 * Drives WhatsApp notifications that are triggered by events rather than by
 * the fulfillment runner:
 *
 *  - `payment-instructions`: sent when a Tripay payment becomes Authorized
 *    (i.e. right after the customer picks a channel).
 *  - `payment-reminder`: a periodic scan that nudges customers whose payment
 *    is about to expire.
 *
 * Order confirmation (with the access link) and the receipt link are sent by
 * OrderFulfillmentRunner once the order is actually paid.
 *
 * The reminder loop runs only in the worker context and uses a plain interval
 * rather than Vendure's scheduler plugin: that plugin registers cron jobs in a
 * process-global registry, which throws when the server and worker are
 * bootstrapped in the same process (this project's deployment model).
 */
@Injectable()
export class WhatsappNotifier implements OnApplicationBootstrap, OnApplicationShutdown {
  private reminderTimer?: ReturnType<typeof setInterval>;
  private reminderRunning = false;

  constructor(
    private eventBus: EventBus,
    private connection: TransactionalConnection,
    private whatsapp: WhatsappService,
    private requestContextService: RequestContextService,
  ) {}

  onApplicationBootstrap(): void {
    this.eventBus.ofType(PaymentStateTransitionEvent).subscribe((event) => {
      if (event.toState !== 'Authorized') {
        return;
      }
      // Fire-and-forget: WhatsApp must never block or fail the payment flow.
      void this.sendPaymentInstructions(event.ctx, event.order, event.payment).catch((error) => {
        Logger.warn(
          `payment-instructions dispatch failed: ${(error as Error).message}`,
          loggerCtx,
        );
      });
    });

    this.startReminderLoop();
  }

  onApplicationShutdown(): void {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
      this.reminderTimer = undefined;
    }
  }

  /**
   * Starts the periodic reminder scan.
   *
   * Deliberately NOT gated on `ProcessContext.isWorker`: with the inline-worker
   * deployment used here (server + worker bootstrapped in one process), plugin
   * lifecycle hooks fire exactly once — in the server context — so an isWorker
   * gate would mean the loop never starts. A module-level guard keeps it to a
   * single timer per process; `WHATSAPP_REMINDER_ENABLED` lets an operator
   * disable it in any process if the worker is ever split out.
   */
  private startReminderLoop(): void {
    if (reminderLoopStarted) {
      return;
    }
    if (!isWhatsappReminderEnabled()) {
      Logger.info('WhatsApp payment reminders disabled', loggerCtx);
      return;
    }
    if (!isWhatsappEnabled()) {
      Logger.info(
        'WhatsApp payment reminders idle: WHATSAPP_ENABLED is off or WAHA_API_KEY is missing',
        loggerCtx,
      );
      return;
    }

    reminderLoopStarted = true;
    const intervalMs = getPaymentReminderIntervalMinutes() * 60_000;
    this.reminderTimer = setInterval(() => {
      void this.runReminderScan().catch((error) => {
        Logger.warn(`payment-reminder scan failed: ${(error as Error).message}`, loggerCtx);
      });
    }, intervalMs);
    // Do not keep the process alive solely for the reminder loop.
    this.reminderTimer.unref?.();

    Logger.info(
      `WhatsApp payment reminder loop started (every ${getPaymentReminderIntervalMinutes()}m)`,
      loggerCtx,
    );
  }

  private async runReminderScan(): Promise<void> {
    if (this.reminderRunning) {
      return; // never overlap
    }
    this.reminderRunning = true;
    try {
      const ctx = await this.requestContextService.create({ apiType: 'admin' });
      await scanForPaymentReminders(ctx, this.connection, this.whatsapp);
    } finally {
      this.reminderRunning = false;
    }
  }

  private async sendPaymentInstructions(
    ctx: RequestContext,
    order: Order,
    payment: Payment,
  ): Promise<void> {
    if (!this.whatsapp.isEnabled()) {
      return;
    }

    const customer = await this.loadCustomer(ctx, order.id);
    if (!customer?.phone) {
      return;
    }

    const meta = extractTripayMeta(payment);
    const fresh = await this.connection
      .getRepository(ctx, Order)
      .findOne({ where: { id: order.id } });

    await this.whatsapp.sendPaymentInstructions(customer.phone, {
      customerName: customer.name,
      orderCode: order.code,
      channelName: meta.paymentName || meta.channelCode || payment.method,
      payCode: meta.payCode ?? null,
      amount: fresh?.subTotalWithTax ?? meta.amount ?? 0,
      expiresAt: meta.expiredTime ? new Date(meta.expiredTime * 1000) : null,
      paymentUrl: meta.paymentUrl ?? null,
      instructions: meta.instructions,
    });
  }

  private async loadCustomer(
    ctx: RequestContext,
    orderId: ID,
  ): Promise<{ phone: string | null; name: string } | null> {
    const rows = await this.connection.rawConnection.query(
      `SELECT c."customFieldsWhatsappnumber" AS phone,
              COALESCE(NULLIF(TRIM(CONCAT(c."firstName", ' ', c."lastName")), ''), 'Pelanggan') AS name
       FROM "order" o
       JOIN customer c ON c.id = o."customerId"
       WHERE o.id = $1
       LIMIT 1`,
      [orderId],
    );
    if (!rows?.length) {
      return null;
    }
    return { phone: rows[0].phone ?? null, name: rows[0].name };
  }
}

/**
 * Finds orders awaiting payment whose Tripay expiry falls inside the reminder
 * lead window, messages the customer, and marks the order as reminded.
 *
 * Exported for direct testing.
 */
export async function scanForPaymentReminders(
  ctx: RequestContext,
  connection: TransactionalConnection,
  whatsapp: WhatsappService,
): Promise<{ scanned: number; reminded: number }> {
  const leadMs = getPaymentReminderLeadMinutes() * 60_000;

  const rows: Array<{
    id: number;
    code: string;
    phone: string | null;
    name: string;
    subtotal: number;
    metadata: unknown;
  }> = await connection.rawConnection.query(
    `SELECT o.id,
            o.code,
            o."subTotalWithTax" AS subtotal,
            c."customFieldsWhatsappnumber" AS phone,
            COALESCE(NULLIF(TRIM(CONCAT(c."firstName", ' ', c."lastName")), ''), 'Pelanggan') AS name,
            p.metadata
     FROM "order" o
     JOIN customer c ON c.id = o."customerId"
     LEFT JOIN payment p ON p."orderId" = o.id
     WHERE o.state = 'ArrangingPayment'
       AND o.active = true
       AND c."customFieldsWhatsappnumber" IS NOT NULL
       AND c."customFieldsWhatsappnumber" <> ''
       AND o."customFieldsWhatsappremindersentat" IS NULL
     ORDER BY o.id DESC
     LIMIT 200`,
  );

  let reminded = 0;
  const now = Date.now();

  for (const row of rows) {
    const meta = parseMeta(row.metadata);
    const expiresAtMs = meta?.expiredTime ? meta.expiredTime * 1000 : null;

    // Without an expiry we cannot judge urgency — skip rather than spam.
    if (!expiresAtMs) {
      continue;
    }
    // Not yet inside the lead window.
    if (now < expiresAtMs - leadMs) {
      continue;
    }
    // Already expired: the webhook will cancel it; a reminder is pointless.
    if (now >= expiresAtMs) {
      continue;
    }

    const outcome = await whatsapp.sendPaymentReminder(row.phone, {
      customerName: row.name,
      orderCode: row.code,
      amount: row.subtotal,
      expiresAt: new Date(expiresAtMs),
      paymentUrl: meta?.paymentUrl ?? null,
    });

    if (outcome.sent) {
      reminded += 1;
    }

    // Mark regardless of delivery outcome so a bad number is not retried forever.
    await connection.rawConnection.query(
      `UPDATE "order" SET "customFieldsWhatsappremindersentat" = NOW(), "updatedAt" = NOW() WHERE id = $1`,
      [row.id],
    );
  }

  if (reminded > 0) {
    Logger.info(`Sent ${reminded} payment reminder(s) via WhatsApp`, loggerCtx);
  }
  return { scanned: rows.length, reminded };
}

/** Reads the Tripay `public` metadata block from a Payment entity. */
function extractTripayMeta(payment: Payment): TripayPublicMeta {
  return parseMeta(payment?.metadata) ?? {};
}

/** Payment metadata may be an object or a JSON string, depending on the driver. */
export function parseMeta(raw: unknown): TripayPublicMeta | null {
  if (!raw) return null;
  let value: any = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const publicBlock = value?.public ?? value;
  return publicBlock && typeof publicBlock === 'object' ? (publicBlock as TripayPublicMeta) : null;
}

/** Storefront receipt URL for an order code. */
export function receiptUrlFor(orderCode: string): string {
  return `${getStorefrontUrl()}/receipt/${orderCode}`;
}

/** Storefront downloads URL for an order code (registered customers). */
export function downloadsUrlFor(orderCode: string): string {
  return `${getStorefrontUrl()}/downloads/${orderCode}`;
}
