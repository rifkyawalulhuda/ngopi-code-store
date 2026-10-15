import { Injectable } from '@nestjs/common';
import { Logger } from '@vendure/core';
import { Resend } from 'resend';
import { renderOrderConfirmationEmail } from '../../email/templates/order-confirmation.template';
import { OrderConfirmationEmailData } from '../../../shared/types/email.types';

const loggerCtx = 'OrderReceiptEmail';

/**
 * Sends the order-confirmation ("receipt") email. For guest purchases the
 * download URL is a magic order-access link, since a guest has no account to
 * log in with.
 */
@Injectable()
export class OrderReceiptEmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY || '');
    const fromName = process.env.EMAIL_FROM_NAME || 'NgopiCode Store';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@info.ngopidulur.my.id';
    this.fromEmail = `${fromName} <${fromAddress}>`;
  }

  async sendOrderConfirmation(data: OrderConfirmationEmailData): Promise<boolean> {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: data.customerEmail,
        subject: `Pesanan ${data.orderCode} Berhasil - NgopiCode`,
        html: renderOrderConfirmationEmail(data),
      });
      Logger.info(`Order confirmation sent to ${data.customerEmail}`, loggerCtx);
      return true;
    } catch (error) {
      Logger.error(
        `Failed to send order confirmation for ${data.orderCode}: ${(error as Error).message}`,
        loggerCtx,
      );
      return false;
    }
  }
}
