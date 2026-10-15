import { Logger } from '@vendure/core';
import {
  getWahaApiKey,
  getWahaBaseUrl,
  getWahaSession,
  isWhatsappEnabled,
} from '../../../config/whatsapp';
import { toWhatsappChatId, formatIndonesianPhone } from '../utils/phone';
import { WahaClient } from './waha.client';
import {
  renderOrderConfirmationMessage,
  renderPaymentInstructionsMessage,
  renderPaymentReminderMessage,
  renderReceiptMessage,
  type WhatsappOrderConfirmationData,
  type WhatsappPaymentInstructionsData,
  type WhatsappPaymentReminderData,
  type WhatsappReceiptData,
} from '../templates';

const loggerCtx = 'WhatsappService';

export interface WhatsappSendOutcome {
  sent: boolean;
  reason?: string;
}

/**
 * High-level WhatsApp notifier.
 *
 * WhatsApp is a best-effort side channel: every method resolves to an outcome
 * object and never throws, so a WAHA outage can never break order fulfillment
 * or block email delivery.
 */
export class WhatsappService {
  constructor(private readonly clientOverride?: WahaClient) {}

  /** True when WhatsApp notifications are enabled and credentials exist. */
  isEnabled(): boolean {
    return isWhatsappEnabled();
  }

  async sendOrderConfirmation(
    phone: string | null | undefined,
    data: WhatsappOrderConfirmationData,
  ): Promise<WhatsappSendOutcome> {
    return this.dispatch(phone, renderOrderConfirmationMessage(data), 'order-confirmation');
  }

  async sendPaymentInstructions(
    phone: string | null | undefined,
    data: WhatsappPaymentInstructionsData,
  ): Promise<WhatsappSendOutcome> {
    return this.dispatch(phone, renderPaymentInstructionsMessage(data), 'payment-instructions');
  }

  async sendPaymentReminder(
    phone: string | null | undefined,
    data: WhatsappPaymentReminderData,
  ): Promise<WhatsappSendOutcome> {
    return this.dispatch(phone, renderPaymentReminderMessage(data), 'payment-reminder');
  }

  async sendReceipt(
    phone: string | null | undefined,
    data: WhatsappReceiptData,
  ): Promise<WhatsappSendOutcome> {
    return this.dispatch(phone, renderReceiptMessage(data), 'receipt');
  }

  /** Diagnostics for admin/health endpoints. */
  async getDiagnostics(): Promise<{
    enabled: boolean;
    session: string;
    sessionWorking: boolean;
    error?: string;
  }> {
    const session = getWahaSession();
    if (!this.isEnabled()) {
      return { enabled: false, session, sessionWorking: false, error: 'WhatsApp is disabled' };
    }
    try {
      const working = await this.getClient().isSessionWorking();
      return { enabled: true, session, sessionWorking: working };
    } catch (error) {
      return {
        enabled: true,
        session,
        sessionWorking: false,
        error: (error as Error).message,
      };
    }
  }

  private getClient(): WahaClient {
    if (this.clientOverride) {
      return this.clientOverride;
    }
    return new WahaClient({
      baseUrl: getWahaBaseUrl(),
      apiKey: getWahaApiKey(),
      session: getWahaSession(),
    });
  }

  /** Shared send pipeline: gate → normalise → render → send → log. */
  private async dispatch(
    phone: string | null | undefined,
    text: string,
    label: string,
  ): Promise<WhatsappSendOutcome> {
    if (!this.isEnabled()) {
      return { sent: false, reason: 'whatsapp-disabled' };
    }

    const chatId = toWhatsappChatId(phone);
    if (!chatId) {
      Logger.warn(`Skipping ${label}: no valid WhatsApp number (${phone ?? 'empty'})`, loggerCtx);
      return { sent: false, reason: 'invalid-phone' };
    }

    const result = await this.getClient().sendText(chatId, text);
    if (!result.success) {
      Logger.warn(
        `Failed to send ${label} to ${formatIndonesianPhone(phone)}: ${result.errorMessage}`,
        loggerCtx,
      );
      return { sent: false, reason: result.errorMessage };
    }

    Logger.info(`Sent ${label} to ${formatIndonesianPhone(phone)}`, loggerCtx);
    return { sent: true };
  }
}
