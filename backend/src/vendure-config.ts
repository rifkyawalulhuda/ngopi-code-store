import { VendureConfig, DefaultSearchPlugin, DefaultJobQueuePlugin, LanguageCode } from '@vendure/core';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import path from 'path';
import { memoryGuardMiddleware } from './middleware/memory-guard.middleware';
import { healthCheckMiddleware } from './middleware/health-check.middleware';
import { customOrderProcess } from './config/custom-order-process';
import { IdrMoneyStrategy } from './config/idr-money-strategy';
import { TripayPaymentPlugin } from './plugins/tripay-payment/tripay-payment.plugin';

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
    ],
  },
  authOptions: {
    tokenMethod: ['bearer', 'cookie'],
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
        description: [{ languageCode: LanguageCode.en, value: 'Type label shown as badge and in specs (e.g. Source Code, Ebook, Template).' }],
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
    AdminUiPlugin.init({
      route: 'admin',
      port: 3002,
    }),
    DefaultSearchPlugin,
    DefaultJobQueuePlugin.init({}),
    TripayPaymentPlugin,
  ],
  // Requirement 12.4: Single-process deployment for 8GB hardware.
  // DefaultJobQueuePlugin provides a DB-backed (SQL) job queue. The worker that
  // processes these jobs is started inline in index.ts via bootstrapWorker, so
  // search indexing and collection-filter jobs actually run without a separate
  // worker process.
  jobQueueOptions: {},
};

