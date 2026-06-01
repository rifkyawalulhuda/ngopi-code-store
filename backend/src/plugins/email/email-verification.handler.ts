/**
 * Email Verification Handler
 *
 * Listens to Vendure auth events and sends emails via Resend:
 * - AccountRegistrationEvent → account verification email (new signups)
 * - IdentifierChangeRequestEvent → email-change confirmation (sent to the NEW email)
 *
 * Verification/change tokens are stored in NativeAuthenticationMethod entity,
 * queried via the injected connection after each event fires.
 */

import { OnApplicationBootstrap, Injectable } from '@nestjs/common';
import {
  EventBus,
  AccountRegistrationEvent,
  IdentifierChangeRequestEvent,
  VendurePlugin,
  PluginCommonModule,
  TransactionalConnection,
  NativeAuthenticationMethod,
} from '@vendure/core';
import { Resend } from 'resend';
import { renderVerificationEmail } from './templates/email-verification.template';
import { renderEmailChangeEmail } from './templates/email-change.template';

@Injectable()
class EmailVerificationService implements OnApplicationBootstrap {
  private resend: Resend;
  private fromEmail: string;
  private storefrontUrl: string;

  constructor(
    private eventBus: EventBus,
    private connection: TransactionalConnection,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY || '');
    const fromName = process.env.EMAIL_FROM_NAME || 'NgopiCode Store';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@info.ngopidulur.my.id';
    this.fromEmail = `${fromName} <${fromAddress}>`;
    this.storefrontUrl = process.env.STOREFRONT_URL || 'http://localhost:3001';
  }

  onApplicationBootstrap() {
    // New account registration → verification email
    this.eventBus.ofType(AccountRegistrationEvent).subscribe(async (event) => {
      try {
        const { user } = event;
        const nativeAuth = await this.getNativeAuth(user.id);
        if (!nativeAuth?.verificationToken) {
          console.warn('[EmailVerification] No verification token for user:', user.identifier);
          return;
        }

        const customerName = user.identifier.split('@')[0] || 'Customer';
        const verificationUrl = `${this.storefrontUrl}/auth/verify?token=${nativeAuth.verificationToken}`;

        await this.resend.emails.send({
          from: this.fromEmail,
          to: user.identifier,
          subject: 'Verifikasi Email Anda - NgopiCode',
          html: renderVerificationEmail({ customerName, verificationUrl }),
        });
        console.log(`[EmailVerification] Verification email sent to ${user.identifier}`);
      } catch (error) {
        console.error('[EmailVerification] Failed to send verification email:', error);
      }
    });

    // Email-change request → confirmation email to the NEW address
    this.eventBus.ofType(IdentifierChangeRequestEvent).subscribe(async (event) => {
      try {
        const { user } = event;
        const nativeAuth = await this.getNativeAuth(user.id);
        if (!nativeAuth?.identifierChangeToken || !nativeAuth?.pendingIdentifier) {
          console.warn('[EmailChange] No change token / pending identifier for user:', user.identifier);
          return;
        }

        const newEmail = nativeAuth.pendingIdentifier;
        const customerName = user.identifier.split('@')[0] || 'Customer';
        const verificationUrl = `${this.storefrontUrl}/auth/verify-email?token=${nativeAuth.identifierChangeToken}`;

        await this.resend.emails.send({
          from: this.fromEmail,
          to: newEmail,
          subject: 'Konfirmasi Perubahan Email - NgopiCode',
          html: renderEmailChangeEmail({ customerName, newEmail, verificationUrl }),
        });
        console.log(`[EmailChange] Email-change confirmation sent to ${newEmail}`);
      } catch (error) {
        console.error('[EmailChange] Failed to send email-change confirmation:', error);
      }
    });
  }

  /** Load the NativeAuthenticationMethod row for a user (contains tokens). */
  private async getNativeAuth(userId: string | number): Promise<NativeAuthenticationMethod | null> {
    return this.connection.rawConnection
      .getRepository(NativeAuthenticationMethod)
      .findOne({ where: { user: { id: userId } } });
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [EmailVerificationService],
})
export class EmailVerificationPlugin {}
