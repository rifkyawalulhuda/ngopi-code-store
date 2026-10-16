import dotenv from 'dotenv';
dotenv.config();

import { bootstrap, runMigrations, bootstrapWorker } from '@vendure/core';
import { config } from './vendure-config';
import { assertPortAvailable, describePortInUse, PortInUseError } from './preflight';

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

    // Fail fast if the HTTP port is taken.
    //
    // Vendure initialises for ~10s before binding the port, so a conflict
    // otherwise shows up as "started successfully" followed by EADDRINUSE and a
    // silent exit — indistinguishable from the server dying on its own.
    const port = config.apiOptions.port;
    try {
      await assertPortAvailable(port);
    } catch (err) {
      if (err instanceof PortInUseError) {
        console.error(describePortInUse(err));
        process.exit(1);
      }
      throw err;
    }

    // In development, first bootstrap with synchronize to create core schema,
    // then run custom migrations that depend on Vendure tables.
    if (isDev) {
      (config.dbConnectionOptions as any).synchronize = true;
    }

    const app = await bootstrap(config);

    // Trust proxy headers (Cloudflare Tunnel / reverse proxy)
    // Required for correct client IP detection in rate limiters
    const httpAdapter = app.getHttpAdapter();
    if (httpAdapter && typeof httpAdapter.getInstance === 'function') {
      const expressInstance = httpAdapter.getInstance();
      expressInstance.set('trust proxy', 1);
    }

    // Set DB connection for webhook middleware
    const { setConnection, setWebhookApp } = await import('./plugins/tripay-payment/middleware/webhook-db');
    const { DataSource } = await import('typeorm');
    const ds = app.get(DataSource);
    if (ds) {
      setConnection(ds);
    }
    // Give the raw Express webhook middleware access to the DI container so it
    // can delegate to TripayWebhookService / OrderFulfillmentRunner.
    setWebhookApp(app);

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
