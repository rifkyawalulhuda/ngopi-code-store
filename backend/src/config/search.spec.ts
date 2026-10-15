import { getSearchReindexIntervalHours, isSearchReindexEnabled } from './search';

describe('search config', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
    delete process.env.SEARCH_REINDEX_ENABLED;
    delete process.env.SEARCH_REINDEX_INTERVAL_HOURS;
  });

  afterEach(() => {
    process.env = { ...original };
  });

  describe('isSearchReindexEnabled', () => {
    it('defaults to enabled when unset', () => {
      expect(isSearchReindexEnabled()).toBe(true);
    });

    it('defaults to enabled when empty', () => {
      process.env.SEARCH_REINDEX_ENABLED = '';
      expect(isSearchReindexEnabled()).toBe(true);
    });

    it.each(['true', '1', 'yes', 'on', 'TRUE', ' true '])(
      'is enabled for "%s"',
      (value) => {
        process.env.SEARCH_REINDEX_ENABLED = value;
        expect(isSearchReindexEnabled()).toBe(true);
      },
    );

    it.each(['false', '0', 'no', 'off', 'FALSE', 'false '])(
      'is disabled for "%s"',
      (value) => {
        process.env.SEARCH_REINDEX_ENABLED = value;
        expect(isSearchReindexEnabled()).toBe(false);
      },
    );

    it('tolerates a trailing space (shell/Docker -e quirk)', () => {
      process.env.SEARCH_REINDEX_ENABLED = 'false ';
      expect(isSearchReindexEnabled()).toBe(false);
    });
  });

  describe('getSearchReindexIntervalHours', () => {
    it('defaults to 24 hours', () => {
      expect(getSearchReindexIntervalHours()).toBe(24);
    });

    it('parses a valid override', () => {
      process.env.SEARCH_REINDEX_INTERVAL_HOURS = '6';
      expect(getSearchReindexIntervalHours()).toBe(6);
    });

    it('accepts a fractional value', () => {
      process.env.SEARCH_REINDEX_INTERVAL_HOURS = '0.5';
      expect(getSearchReindexIntervalHours()).toBe(0.5);
    });

    it.each(['0', '-1', 'abc', ''])('falls back to the default for "%s"', (value) => {
      process.env.SEARCH_REINDEX_INTERVAL_HOURS = value;
      expect(getSearchReindexIntervalHours()).toBe(24);
    });
  });
});
