import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { GitHubAuthStrategy, GitHubAuthOptions } from './github-auth-strategy';

/**
 * Plugin that adds GitHub OAuth authentication to the Shop API.
 *
 * Usage in vendure-config.ts:
 *   GitHubAuthPlugin.init({
 *     clientId: process.env.GITHUB_OAUTH_CLIENT_ID!,
 *     clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET!,
 *   })
 *
 * Frontend calls the `authenticate` mutation with:
 *   authenticate(input: { github: { code: "...", state: "..." } })
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: (config) => {
    const options = GitHubAuthPlugin.options;
    if (options?.clientId && options?.clientSecret) {
      config.authOptions.shopAuthenticationStrategy!.push(
        new GitHubAuthStrategy(options),
      );
    }
    return config;
  },
})
export class GitHubAuthPlugin {
  static options: GitHubAuthOptions;

  static init(options: GitHubAuthOptions) {
    this.options = options;
    return GitHubAuthPlugin;
  }
}
