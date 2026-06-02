import {
  AuthenticationStrategy,
  ExternalAuthenticationService,
  Injector,
  Logger,
  RequestContext,
  User,
} from '@vendure/core';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';

export interface GitHubAuthData {
  code: string;
  state: string;
}

export interface GitHubAuthOptions {
  clientId: string;
  clientSecret: string;
}

/**
 * Custom AuthenticationStrategy for GitHub OAuth.
 *
 * Flow:
 * 1. Frontend redirects user to GitHub authorization URL
 * 2. User authorizes → GitHub redirects back with `code` and `state`
 * 3. Frontend sends code+state to Vendure via `authenticate` mutation
 * 4. This strategy exchanges code for access token, fetches user info
 * 5. Creates/finds Vendure customer based on GitHub profile
 */
export class GitHubAuthStrategy implements AuthenticationStrategy<GitHubAuthData> {
  readonly name = 'github';
  private externalAuthenticationService!: ExternalAuthenticationService;
  private logger = new Logger();

  constructor(private options: GitHubAuthOptions) {}

  init(injector: Injector) {
    this.externalAuthenticationService = injector.get(ExternalAuthenticationService);
  }

  defineInputType(): DocumentNode {
    return gql`
      input GitHubAuthInput {
        code: String!
        state: String!
      }
    `;
  }

  async authenticate(ctx: RequestContext, data: GitHubAuthData): Promise<User | false> {
    const { code, state } = data;

    try {
      // Step 1: Exchange authorization code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.options.clientId,
          client_secret: this.options.clientSecret,
          code,
          state,
        }),
      });

      const tokenData: any = await tokenResponse.json();
      if (tokenData.error) {
        this.logger.error(
          `GitHub OAuth token error: ${tokenData.error_description}`,
          'GitHubAuthStrategy',
        );
        return false;
      }

      // Step 2: Fetch user profile from GitHub
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      const ghUser: any = await userResponse.json();
      if (!ghUser.login) {
        this.logger.error('Unable to retrieve user info from GitHub', 'GitHubAuthStrategy');
        return false;
      }

      // Step 3: Try to get user's primary email from GitHub
      let email = ghUser.email;
      if (!email) {
        try {
          const emailResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          });
          const emails = await emailResponse.json() as any[];
          const primaryEmail = emails.find((e: any) => e.primary && e.verified);
          email = primaryEmail?.email || `${ghUser.login}@users.noreply.github.com`;
        } catch {
          email = `${ghUser.login}@users.noreply.github.com`;
        }
      }

      // Step 4: Check if this GitHub user already has a Vendure account
      const existingUser = await this.externalAuthenticationService.findCustomerUser(
        ctx,
        this.name,
        String(ghUser.id), // Use GitHub numeric ID as stable identifier
      );

      if (existingUser) {
        return existingUser;
      }

      // Step 5: Create new customer
      const nameParts = (ghUser.name || ghUser.login).split(' ');
      const firstName = nameParts[0] || ghUser.login;
      const lastName = nameParts.slice(1).join(' ') || '';

      const createdUser = await this.externalAuthenticationService.createCustomerAndUser(ctx, {
        strategy: this.name,
        externalIdentifier: String(ghUser.id),
        verified: true, // GitHub accounts are pre-verified
        emailAddress: email,
        firstName,
        lastName,
      });

      return createdUser;
    } catch (error: any) {
      this.logger.error(`GitHub authentication failed: ${error.message}`, 'GitHubAuthStrategy');
      return false;
    }
  }
}
