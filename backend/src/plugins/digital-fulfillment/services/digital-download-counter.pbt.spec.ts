import * as fc from 'fast-check';
import { DigitalDownload } from '../entities/digital-download.entity';

/**
 * Property 3: Download Counter Monotonicity and Deactivation
 *
 * For any Download_Record, the currentDownloads value is monotonically non-decreasing,
 * never exceeds maxDownloads, and when currentDownloads reaches maxDownloads the record
 * is deactivated (isActive becomes false).
 *
 * **Validates: Requirements 5.4, 5.5**
 */
describe('Property 3: Download Counter Monotonicity and Deactivation', () => {
  /**
   * Simulates the download operation as described in the design document's
   * generateSecureDownloadLink algorithm:
   * - Atomically increment download counter (Requirement 5.4)
   * - Deactivate record when limit reached (Requirement 5.5)
   *
   * Returns the new state of the record after the download attempt.
   */
  function performDownload(record: DigitalDownload): DigitalDownload {
    // Only perform download if record is accessible
    if (!record.isActive || record.currentDownloads >= record.maxDownloads) {
      // No change - download rejected
      return record;
    }

    // Atomically increment download counter (Requirement 5.4)
    record.currentDownloads += 1;
    record.lastDownloadedAt = new Date();

    // Deactivate if limit reached (Requirement 5.5)
    if (record.currentDownloads >= record.maxDownloads) {
      record.isActive = false;
    }

    return record;
  }

  /**
   * Creates a fresh DigitalDownload record with the given maxDownloads.
   */
  function createDownloadRecord(maxDownloads: number): DigitalDownload {
    return new DigitalDownload({
      orderId: '1',
      customerId: '1',
      productVariantId: '1',
      downloadToken: 'test-token',
      maxDownloads,
      currentDownloads: 0,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours from now
      lastDownloadedAt: null,
      isActive: true,
    });
  }

  /**
   * Arbitrary for maxDownloads value (valid range 1-10 per Requirements 4.4).
   */
  const maxDownloadsArbitrary = fc.integer({ min: 1, max: 10 });

  /**
   * Arbitrary for a sequence of download attempts (1 to 20 attempts).
   * Each attempt is represented as a boolean indicating whether to try downloading.
   * We use more attempts than maxDownloads to test behavior after limit is reached.
   */
  const downloadSequenceArbitrary = fc.array(fc.boolean(), { minLength: 1, maxLength: 20 });

  it('download counter is monotonically non-decreasing across any sequence of operations', () => {
    fc.assert(
      fc.property(
        maxDownloadsArbitrary,
        downloadSequenceArbitrary,
        (maxDownloads, downloadAttempts) => {
          const record = createDownloadRecord(maxDownloads);
          let previousCount = record.currentDownloads;

          for (const shouldAttempt of downloadAttempts) {
            if (shouldAttempt) {
              performDownload(record);
            }

            // Monotonicity: counter never decreases
            expect(record.currentDownloads).toBeGreaterThanOrEqual(previousCount);
            previousCount = record.currentDownloads;
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it('download counter never exceeds maxDownloads', () => {
    fc.assert(
      fc.property(
        maxDownloadsArbitrary,
        downloadSequenceArbitrary,
        (maxDownloads, downloadAttempts) => {
          const record = createDownloadRecord(maxDownloads);

          for (const shouldAttempt of downloadAttempts) {
            if (shouldAttempt) {
              performDownload(record);
            }

            // Bounded: counter never exceeds max
            expect(record.currentDownloads).toBeLessThanOrEqual(record.maxDownloads);
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it('record deactivates exactly when counter reaches maxDownloads', () => {
    fc.assert(
      fc.property(
        maxDownloadsArbitrary,
        downloadSequenceArbitrary,
        (maxDownloads, downloadAttempts) => {
          const record = createDownloadRecord(maxDownloads);

          for (const shouldAttempt of downloadAttempts) {
            if (shouldAttempt) {
              performDownload(record);
            }

            // Deactivation invariant:
            // If counter has reached max, record must be inactive
            if (record.currentDownloads >= record.maxDownloads) {
              expect(record.isActive).toBe(false);
            }
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it('record remains active while counter is below maxDownloads (unless externally deactivated)', () => {
    fc.assert(
      fc.property(
        maxDownloadsArbitrary,
        downloadSequenceArbitrary,
        (maxDownloads, downloadAttempts) => {
          const record = createDownloadRecord(maxDownloads);

          for (const shouldAttempt of downloadAttempts) {
            if (shouldAttempt) {
              performDownload(record);
            }

            // If counter is below max, record should still be active
            // (since we only deactivate at max, and started active)
            if (record.currentDownloads < record.maxDownloads) {
              expect(record.isActive).toBe(true);
            }
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it('after maxDownloads successful downloads, no further increments occur', () => {
    fc.assert(
      fc.property(
        maxDownloadsArbitrary,
        fc.integer({ min: 1, max: 20 }),
        (maxDownloads, extraAttempts) => {
          const record = createDownloadRecord(maxDownloads);

          // Exhaust all downloads
          for (let i = 0; i < maxDownloads; i++) {
            performDownload(record);
          }

          expect(record.currentDownloads).toBe(maxDownloads);
          expect(record.isActive).toBe(false);

          // Attempt additional downloads beyond the limit
          for (let i = 0; i < extraAttempts; i++) {
            performDownload(record);
          }

          // Counter should not have changed
          expect(record.currentDownloads).toBe(maxDownloads);
          expect(record.isActive).toBe(false);
        },
      ),
      { numRuns: 500 },
    );
  });
});
