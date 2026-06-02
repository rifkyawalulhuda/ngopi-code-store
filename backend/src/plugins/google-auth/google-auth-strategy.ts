import {
  AuthenticationStrategy,
  ExternalAuthenticationService,
  Injector,
  Logger,
  RequestContext,
  User,
} from '@vendure/core';
import { OAuth2Client } from 'google-auth-library';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';

export type GoogleAuthData = {
  token: string;
};

export interface GoogleAuthOptions {
  googleClientId: string;
}

/**
 * Custom AuthenticationStrategy that verifies Google ID tokens
 * and creates/finds Vendure customers based on Google account info.
 *
 * Flow:
 * 1. Frontend uses Google Identity Services to get an ID token
 * 2. Token is sent to Vendure via the `authenticate` mutation
 * 3. This strategy verifies the token with Google
 * 4. If valid, finds existing customer or creates a new one
 */
export class GoogleAuthStrategy implements AuthenticationStrategy<GoogleAuthData> {
  readonly name = 'google';
  private client: OAuth2Client;
  private externalAuthenticationService!: ExternalAuthenticationService;
  private logger = new Logger();

  constructor(private options: GoogleAuthOptions) {
    this.client = new OAuth2Client(options.googleClientId);
  }

  init(injector: Injector) {
    this.externalAuthenticationService = injector.get(ExternalAuthenticationService);
  }

  defineInputType(): DocumentNode {
    return gql`
      input GoogleAuthInput {
        token: String!
      }
    `;
  }

  async authenticate(ctx: RequestContext, data: GoogleAuthData): Promise<User | false> {
    try {
      // Verify the Google ID token
      const ticket = await this.client.verifyIdToken({
        idToken: data.token,
        audience: this.options.googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        this.logger.error('Invalid Google token or missing email', 'GoogleAuthStrategy');
        return false;
      }

      // Check if this Google user already has a Vendure account
      const existingUser = await this.externalAuthenticationService.findCustomerUser(
        ctx,
        this.name,
        payload.sub, // Google's unique user ID
      );

      if (existingUser) {
        return existingUser;
      }

      // Create a new customer account for first-time Google users
      const createdUser = await this.externalAuthenticationService.createCustomerAndUser(ctx, {
        strategy: this.name,
        externalIdentifier: payload.sub,
        verified: payload.email_verified || false,
        emailAddress: payload.email,
        firstName: payload.given_name || 'Google',
        lastName: payload.family_name || 'User',
      });

      return createdUser;
    } catch (error: any) {
      this.logger.error(`Google authentication failed: ${error.message}`, 'GoogleAuthStrategy');
      return false;
    }
  }
}
