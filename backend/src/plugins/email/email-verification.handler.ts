/**
 * Email Verification Handler
 *
 * Listens to Vendure's AccountRegistrationEvent and sends a verification email
 * to the customer using Resend.
 *
 * The verification token is stored in NativeAuthenticationMethod entity.
 * We query it via the injected connection after the event fires.
 */

import { OnApplicationBootstrap, Injectable } from '@nestjs/common';
import {
  EventBus,
  AccountRegistrationEvent,
  VendurePlugin,
  PluginCommonModule,
  TransactionalConnection,
  NativeAuthenticationMethod,
} from '@vendure/core';
import { Resend } from 'resend';
import { renderVerificationEmail } from './templates/email-verification.template';

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
    this.eventBus.ofType(AccountRegistrationEvent).subscribe(async (event) => {
      try {
        const { user } = event;

        // Query the NativeAuthenticationMethod to get the verification token
        const nativeAuth = await this.connection.rawConnection
          .getRepository(NativeAuthenticationMethod)
          .findOne({
            where: { user: { id: user.id } },
          });

        if (!nativeAuth || !nativeAuth.verificationToken) {
          console.warn('[EmailVerification] No verification token found for user:', user.identifier);
          return;
        }

        const verificationToken = nativeAuth.verificationToken;
        const customerName = user.identifier.split('@')[0] || 'Customer';
        const verificationUrl = `${this.storefrontUrl}/auth/verify?token=${verificationToken}`;

        const html = renderVerificationEmail({
          customerName,
          verificationUrl,
        });

        const result = await this.resend.emails.send({
          from: this.fromEmail,
          to: user.identifier,
          subject: 'Verifikasi Email Anda - NgopiCode',
          html,
        });

        console.log(`[EmailVerification] Verification email sent to ${user.identifier}`, result);
      } catch (error) {
        console.error('[EmailVerification] Failed to send verification email:', error);
      }
    });
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [EmailVerificationService],
})
export class EmailVerificationPlugin {}
