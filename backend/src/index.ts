import { bootstrap, runMigrations } from '@vendure/core';
import { config } from './vendure-config';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Bootstrap the Vendure server.
 *
 * Memory limits are enforced via:
 * - Node.js --max-old-space-size=900 flag (set in production)
 * - Memory guard middleware rejecting requests above 1GB RSS (Req 12.5)
 *
 * Worker runs inline (Req 12.4) - no separate worker process needed.
 */
async function main() {
  try {
    await runMigrations(config);
    await bootstrap(config);
  } catch (err) {
    console.error('Failed to start Vendure server:', err);
    process.exit(1);
  }
}

main();
