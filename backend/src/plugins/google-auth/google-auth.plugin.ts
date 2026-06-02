import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { GoogleAuthStrategy } from './google-auth-strategy';

export interface GoogleAuthPluginOptions {
  googleClientId: string;
}

/**
 * Plugin that adds Google OAuth authentication to the Shop API.
 *
 * Usage in vendure-config.ts:
 *   GoogleAuthPlugin.init({ googleClientId: process.env.GOOGLE_CLIENT_ID! })
 *
 * Frontend calls the `authenticate` mutation with:
 *   authenticate(input: { google: { token: "..." } })
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: (config) => {
    const options = GoogleAuthPlugin.options;
    if (options?.googleClientId) {
      config.authOptions.shopAuthenticationStrategy!.push(
        new GoogleAuthStrategy({ googleClientId: options.googleClientId }),
      );
    }
    return config;
  },
})
export class GoogleAuthPlugin {
  static options: GoogleAuthPluginOptions;

  static init(options: GoogleAuthPluginOptions) {
    this.options = options;
    return GoogleAuthPlugin;
  }
}
