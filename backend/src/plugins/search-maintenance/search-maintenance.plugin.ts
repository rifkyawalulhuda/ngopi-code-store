import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { SearchReindexService } from './search-reindex.service';

/**
 * SearchMaintenancePlugin
 *
 * Keeps the search index from drifting out of sync with the catalog.
 *
 * The DefaultSearchPlugin updates the index in response to product events. Any
 * change made outside that path — direct SQL edits, bulk imports, database
 * restores — leaves stale entries: deleted products keep showing up in search
 * and on the catalog page while their detail pages 404. That is exactly what
 * happened before the search-first homepage shipped.
 *
 * This plugin schedules a periodic full rebuild as a safety net. Cadence and
 * kill switch are environment-driven; see `src/config/search.ts`. For an
 * on-demand rebuild, run `node scripts/reindex.js`.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [SearchReindexService],
  exports: [SearchReindexService],
  compatibility: '^3.0.0',
})
export class SearchMaintenancePlugin {}
