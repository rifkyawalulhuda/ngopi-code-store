/**
 * Search index maintenance configuration.
 *
 * The search index is normally kept current by the DefaultSearchPlugin reacting
 * to product events. Changes made outside that path (direct SQL, bulk imports,
 * restores) leave it stale — deleted products keep appearing in search while
 * their pages 404. A periodic reindex is the safety net.
 */

/** Default reindex cadence, in hours. */
const DEFAULT_REINDEX_INTERVAL_HOURS = 24;

/**
 * Whether the periodic reindex runs. Defaults to enabled.
 * Set `SEARCH_REINDEX_ENABLED=false` to turn it off (e.g. if you prefer to
 * reindex manually with `scripts/reindex.js`).
 */
export function isSearchReindexEnabled(): boolean {
  const raw = process.env.SEARCH_REINDEX_ENABLED;
  if (raw === undefined) {
    return true;
  }
  const value = raw.trim().toLowerCase();
  if (value === '') {
    return true;
  }
  return !(value === 'false' || value === '0' || value === 'no' || value === 'off');
}

/**
 * How often to rebuild the search index, in hours. Defaults to 24.
 * Invalid or non-positive values fall back to the default.
 */
export function getSearchReindexIntervalHours(): number {
  const raw = process.env.SEARCH_REINDEX_INTERVAL_HOURS;
  const parsed = raw ? Number.parseFloat(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_REINDEX_INTERVAL_HOURS;
  }
  return parsed;
}
