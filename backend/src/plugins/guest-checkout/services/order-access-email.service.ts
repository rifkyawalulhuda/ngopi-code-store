import { Injectable } from '@nestjs/common';
import { Logger } from '@vendure/core';
import { Resend } from 'resend';
import { renderOrderAccessLinkEmail } from '../templates/order-access-link.template';

const loggerCtx = 'OrderAccessEmail';

export interface OrderAccessEmailInput {
  to: string;
  customerName: string;
  orderCode: string;
  accessUrl: string;
  expiresInHours: number;
}

/**
 * Sends the magic order-access email. Mirrors the Resend usage in the email
 * plugin so guest mail uses the same provider + sender identity.
 */
@Injectable()
export class OrderAccessEmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY || '');
    const fromName = process.env.EMAIL_FROM_NAME || 'NgopiCode Store';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@info.ngopidulur.my.id';
    this.fromEmail = `${fromName} <${fromAddress}>`;
  }

  async sendOrderAccessLink(input: OrderAccessEmailInput): Promise<boolean> {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: input.to,
        subject: `Akses Pesanan ${input.orderCode} - NgopiCode`,
        html: renderOrderAccessLinkEmail({
          customerName: input.customerName,
          orderCode: input.orderCode,
          accessUrl: input.accessUrl,
          expiresInHours: input.expiresInHours,
        }),
      });
      Logger.info(`Order access link sent to ${input.to} for ${input.orderCode}`, loggerCtx);
      return true;
    } catch (error) {
      Logger.error(
        `Failed to send order access link for ${input.orderCode}: ${(error as Error).message}`,
        loggerCtx,
      );
      return false;
    }
  }
}
