import { bootstrap, runMigrations, bootstrapWorker } from '@vendure/core';
import { config } from './vendure-config';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Bootstrap the Vendure server.
 *
 * On first run (empty database), Vendure needs to create its core schema
 * before custom migrations can run (they reference Vendure tables like product_variant).
 *
 * Strategy:
 * - In development: enable synchronize to auto-create schema, then run custom migrations.
 * - In production: synchronize is always false; migrations must be run after initial deploy.
 *
 * Memory limits are enforced via:
 * - Node.js --max-old-space-size=900 flag (set in production)
 * - Memory guard middleware rejecting requests above 1GB RSS (Req 12.5)
 *
 * Worker runs inline (Req 12.4) - no separate worker process needed.
 */
async function main() {
  try {
    const isDev = process.env.NODE_ENV !== 'production';

    // In development, first bootstrap with synchronize to create core schema,
    // then run custom migrations that depend on Vendure tables.
    if (isDev) {
      (config.dbConnectionOptions as any).synchronize = true;
    }

    const app = await bootstrap(config);

    // After bootstrap (schema is ready), run custom migrations
    if (isDev) {
      (config.dbConnectionOptions as any).synchronize = false;
      await runMigrations(config);
    }

    // Start the job queue worker inline in this same process (Req 12.4:
    // single-process deployment for 8GB hardware). Without this, background
    // jobs (search indexing, apply-collection-filters) stay PENDING forever.
    const worker = await bootstrapWorker(config);
    await worker.startJobQueue();
  } catch (err) {
    console.error('Failed to start Vendure server:', err);
    process.exit(1);
  }
}

main();
