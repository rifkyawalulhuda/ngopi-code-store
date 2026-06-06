import { VendureConfig, DefaultSearchPlugin, DefaultJobQueuePlugin, LanguageCode } from '@vendure/core';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import path from 'path';
import { memoryGuardMiddleware } from './middleware/memory-guard.middleware';
import { healthCheckMiddleware } from './middleware/health-check.middleware';
import { authRateLimiterMiddleware } from './middleware/auth-rate-limiter.middleware';
import { customOrderProcess } from './config/custom-order-process';
import { IdrMoneyStrategy } from './config/idr-money-strategy';
import { TripayPaymentPlugin } from './plugins/tripay-payment/tripay-payment.plugin';
import { EmailVerificationPlugin } from './plugins/email/email-verification.handler';
import { GoogleAuthPlugin } from './plugins/google-auth';
import { GitHubAuthPlugin } from './plugins/github-auth';
import { DigitalFulfillmentPlugin } from './plugins/digital-fulfillment/digital-fulfillment.plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';

/**
 * Vendure configuration for NgopiCode Digital Store.
 *
 * Key constraints (self-hosted on 8GB RAM):
 * - PostgreSQL connection pool: max 10 connections (Req 12.2)
 * - Worker runs inline (no background process) for MVP (Req 12.4)
 * - Memory limit: 900MB normal operation, 1GB rejection threshold (Req 12.1, 12.5)
 *
 * Plugin Registration:
 * - Tripay Payment Plugin: handles payment creation and webhook processing
 * - Digital Fulfillment Plugin: manages file storage and download record creation
 * - Email Plugin: sends order confirmation emails
 *
 * Integration Wiring (Req 2.3, 2.4, 4.1, 6.1):
 * - PAID webhook â†’ order transition to Fulfilled
 * - Order Fulfilled â†’ DigitalDownload records created for all digital items
 * - Order Fulfilled â†’ order confirmation email sent
 */
export const config: VendureConfig = {
  apiOptions: {
    port: parseInt(process.env.PORT || '3000', 10),
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    // CORS: allow frontend origins (credentials require explicit origin, not wildcard)
    cors: {
      origin: [
        process.env.STOREFRONT_URL || 'http://localhost:3001',
        'http://localhost:3001',
        'http://localhost:3000',
        'https://ngopicode.com',
        'https://www.ngopicode.com',
        'https://api.ngopicode.com',
      ],
      credentials: true,
    },
    middleware: [
      {
        handler: healthCheckMiddleware,
        route: '*splat',
        beforeListen: true,
      },
      {
        handler: memoryGuardMiddleware,
        route: '*splat',
        beforeListen: true,
      },
      {
        handler: authRateLimiterMiddleware,
        route: 'shop-api',
      },
    ],
  },
  authOptions: {
    tokenMethod: ['bearer', 'cookie'],
    requireVerification: true,
    verificationTokenDuration: '7d',
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
      password: process.env.SUPERADMIN_PASSWORD || 'superadmin',
    },
    cookieOptions: {
      secret: process.env.COOKIE_SECRET || 'change-me-in-production',
    },
  },
  dbConnectionOptions: {
    type: 'postgres',
    synchronize: false,
    migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
    logging: process.env.DB_LOGGING === 'true',
    database: process.env.DB_NAME || 'ngopicode',
    schema: process.env.DB_SCHEMA || 'public',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    extra: {
      // Requirement 12.2: Database connection pool limited to 10 connections
      max: 10,
    },
  },
  orderOptions: {
    // Requirement 10.1, 10.2, 10.3: Custom order process with forward-only transitions
    // and payment verification guard
    process: [customOrderProcess],
  },
  entityOptions: {
    // IDR is a zero-decimal currency: store Rp 150.000 as 150000 (precision 0)
    moneyStrategy: new IdrMoneyStrategy(),
  },
  paymentOptions: {
    paymentMethodHandlers: [],
  },
  customFields: {
    Channel: [
      {
        name: 'whatsappNumber',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'WhatsApp Number' }],
        description: [{ languageCode: LanguageCode.en, value: 'Owner WhatsApp number with country code (e.g. 6281234567890). Displayed as a contact button on product pages.' }],
        nullable: true,
        public: true,
      },
      {
        name: 'githubLink',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'GitHub Link' }],
        description: [{ languageCode: LanguageCode.en, value: 'Owner GitHub profile/organization URL (e.g. https://github.com/ngopicode). Displayed in the storefront footer.' }],
        nullable: true,
        public: true,
      },
      {
        name: 'ownerEmail',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Owner Email' }],
        description: [{ languageCode: LanguageCode.en, value: 'Contact email shown in the storefront footer (e.g. hello@ngopicode.com).' }],
        nullable: true,
        public: true,
      },
    ],
    Customer: [
      {
        name: 'whatsappNumber',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'WhatsApp Number' }],
        description: [{ languageCode: LanguageCode.en, value: 'Customer WhatsApp number for contact (optional).' }],
        nullable: true,
        public: true,
      },
      {
        name: 'wishlistProductIds',
        type: 'text',
        label: [{ languageCode: LanguageCode.en, value: 'Wishlist Product IDs' }],
        description: [{ languageCode: LanguageCode.en, value: 'JSON array of product IDs in customer wishlist. Managed by storefront.' }],
        nullable: true,
        public: true,
        ui: { component: 'textarea-form-input' },
      },
    ],
    Product: [
      {
        name: 'keyFeatures',
        type: 'text',
        label: [{ languageCode: LanguageCode.en, value: 'Key Features (one per line)' }],
        description: [{ languageCode: LanguageCode.en, value: 'List of key features, separated by newlines. Displayed as a checklist on the product page.' }],
        nullable: true,
        ui: { component: 'textarea-form-input' },
      },
      {
        name: 'deliveryInfo',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Delivery Info' }],
        description: [{ languageCode: LanguageCode.en, value: 'Digital delivery description shown on the product page (e.g. "Instant download, lifetime updates").' }],
        nullable: true,
      },
      {
        name: 'productType',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Product Type' }],
        description: [{ languageCode: LanguageCode.en, value: 'Type label shown as badge and in specs (e.g. Source Code, Ebook, Template). Use Facets for filtering/categorization.' }],
        nullable: true,
      },
      {
        name: 'fileFormat',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'File Format' }],
        description: [{ languageCode: LanguageCode.en, value: 'File format for specs table (e.g. ZIP Archive, PDF, etc.).' }],
        nullable: true,
      },
      {
        name: 'licenseType',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'License Type' }],
        description: [{ languageCode: LanguageCode.en, value: 'License type for specs table (e.g. Personal & Commercial).' }],
        nullable: true,
      },
    ],
  },
  plugins: [
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: path.join(__dirname, '..', 'static', 'assets'),
    }),
    DefaultSearchPlugin,
    DefaultJobQueuePlugin.init({}),
    TripayPaymentPlugin,
    EmailVerificationPlugin,
    DigitalFulfillmentPlugin,
    GoogleAuthPlugin.init({
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    }),
    GitHubAuthPlugin.init({
      clientId: process.env.GITHUB_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || '',
    }),
    DashboardPlugin.init({
      route: 'dashboard',
      appDir: './dist/dashboard',
    }),
  ],
  // Requirement 12.4: Single-process deployment for 8GB hardware.
  // DefaultJobQueuePlugin provides a DB-backed (SQL) job queue. The worker that
  // processes these jobs is started inline in index.ts via bootstrapWorker, so
  // search indexing and collection-filter jobs actually run without a separate
  // worker process.
  jobQueueOptions: {},
};

