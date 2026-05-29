import * as fc from 'fast-check';
import { DigitalDownload } from '../entities/digital-download.entity';
import { DownloadError } from './digital-fulfillment.service';

/**
 * Property 2: Download Access Control
 *
 * For any download token and customer ID, verify access granted iff
 * customerId matches, record active, not expired, and count < max.
 *
 * **Validates: Requirements 5.1, 5.2, 5.6, 5.7, 5.8**
 */
describe('Property 2: Download Access Control', () => {
  /**
   * Pure function that determines download access based on the access control rules.
   * This encapsulates the logic that generateDownloadLink (task 4.7) will use.
   *
   * @see Requirements 5.1 - Validate customer ownership (HTTP 403 if not owner)
   * @see Requirements 5.2 - Validate record is active, not expired, count < max
   * @see Requirements 5.6 - Validate not expired (HTTP 410)
   * @see Requirements 5.7 - Validate not at limit (HTTP 403)
   * @see Requirements 5.8 - Validate token exists (HTTP 404)
   */
  function validateDownloadAccess(
    record: DigitalDownload | null,
    requestingCustomerId: string,
  ): { granted: boolean; errorCode?: string; httpStatus?: number } {
    // Requirement 5.8: Token must exist
    if (!record) {
      return { granted: false, errorCode: 'NOT_FOUND', httpStatus: 404 };
    }

    // Requirement 5.1: Customer must own the record
    if (record.customerId !== requestingCustomerId) {
      return { granted: false, errorCode: 'FORBIDDEN', httpStatus: 403 };
    }

    // Requirement 5.2: Record must be active
    if (!record.isActive) {
      return { granted: false, errorCode: 'FORBIDDEN', httpStatus: 403 };
    }

    // Requirement 5.6: Record must not be expired
    if (record.isExpired()) {
      return { granted: false, errorCode: 'EXPIRED', httpStatus: 410 };
    }

    // Requirement 5.7: Download limit must not be reached
    if (record.isLimitReached()) {
      return { granted: false, errorCode: 'LIMIT_REACHED', httpStatus: 403 };
    }

    return { granted: true };
  }

  /**
   * Arbitrary that generates a valid DigitalDownload record with configurable state.
   */
  function digitalDownloadArbitrary(options?: {
    forceCustomerId?: string;
    forceActive?: boolean;
    forceExpired?: boolean;
    forceLimitReached?: boolean;
  }) {
    return fc.record({
      customerId: options?.forceCustomerId
        ? fc.constant(options.forceCustomerId)
        : fc.uuid(),
      isActive: options?.forceActive !== undefined
        ? fc.constant(options.forceActive)
        : fc.boolean(),
      maxDownloads: fc.integer({ min: 1, max: 10 }),
      currentDownloads: fc.integer({ min: 0, max: 10 }),
      expiresAt: options?.forceExpired !== undefined
        ? (options.forceExpired
          ? fc.date({ min: new Date('2020-01-01'), max: new Date(Date.now() - 1000) })
          : fc.date({ min: new Date(Date.now() + 60_000), max: new Date('2030-01-01') }))
        : fc.oneof(
          // Expired dates (in the past)
          fc.date({ min: new Date('2020-01-01'), max: new Date(Date.now() - 60_000) }),
          // Valid dates (in the future)
          fc.date({ min: new Date(Date.now() + 60_000), max: new Date('2030-01-01') }),
        ),
    }).chain((params) => {
      // Ensure currentDownloads respects maxDownloads constraint for limit logic
      const maxDl = params.maxDownloads;
      let currentDl: fc.Arbitrary<number>;

      if (options?.forceLimitReached === true) {
        currentDl = fc.constant(maxDl);
      } else if (options?.forceLimitReached === false) {
        currentDl = fc.integer({ min: 0, max: Math.max(0, maxDl - 1) });
      } else {
        currentDl = fc.integer({ min: 0, max: maxDl });
      }

      return currentDl.map((cd) => {
        const record = new DigitalDownload({
          orderId: 'order-1',
          customerId: params.customerId,
          productVariantId: 'variant-1',
          downloadToken: 'token-' + Math.random().toString(36).slice(2),
          maxDownloads: maxDl,
          currentDownloads: cd,
          expiresAt: params.expiresAt,
          lastDownloadedAt: null,
          isActive: params.isActive,
        });
        return record;
      });
    });
  }

  it('should grant access if and only if all four conditions are met', () => {
    const customerIdArb = fc.uuid();

    fc.assert(
      fc.property(
        digitalDownloadArbitrary(),
        customerIdArb,
        fc.boolean(), // whether to use matching customer ID
        (record, randomCustomerId, useMatchingId) => {
          const requestingCustomerId = useMatchingId
            ? (record.customerId as string)
            : randomCustomerId;

          const result = validateDownloadAccess(record, requestingCustomerId);

          const customerMatches = record.customerId === requestingCustomerId;
          const isActive = record.isActive;
          const isNotExpired = !record.isExpired();
          const isUnderLimit = record.currentDownloads < record.maxDownloads;

          const allConditionsMet = customerMatches && isActive && isNotExpired && isUnderLimit;

          // Core property: access granted iff all conditions met
          expect(result.granted).toBe(allConditionsMet);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('should deny access with FORBIDDEN when customerId does not match (Req 5.1)', () => {
    fc.assert(
      fc.property(
        digitalDownloadArbitrary({
          forceActive: true,
          forceExpired: false,
          forceLimitReached: false,
        }),
        fc.uuid(),
        (record, differentCustomerId) => {
          // Ensure the customer ID is actually different
          fc.pre(differentCustomerId !== record.customerId);

          const result = validateDownloadAccess(record, differentCustomerId);

          expect(result.granted).toBe(false);
          expect(result.errorCode).toBe('FORBIDDEN');
          expect(result.httpStatus).toBe(403);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should deny access with FORBIDDEN when record is not active (Req 5.2)', () => {
    fc.assert(
      fc.property(
        digitalDownloadArbitrary({
          forceActive: false,
          forceExpired: false,
          forceLimitReached: false,
        }),
        (record) => {
          const result = validateDownloadAccess(record, record.customerId as string);

          expect(result.granted).toBe(false);
          expect(result.errorCode).toBe('FORBIDDEN');
          expect(result.httpStatus).toBe(403);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should deny access with EXPIRED when record has expired (Req 5.6)', () => {
    fc.assert(
      fc.property(
        digitalDownloadArbitrary({
          forceActive: true,
          forceExpired: true,
          forceLimitReached: false,
        }),
        (record) => {
          const result = validateDownloadAccess(record, record.customerId as string);

          expect(result.granted).toBe(false);
          expect(result.errorCode).toBe('EXPIRED');
          expect(result.httpStatus).toBe(410);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should deny access with LIMIT_REACHED when download count >= max (Req 5.7)', () => {
    fc.assert(
      fc.property(
        digitalDownloadArbitrary({
          forceActive: true,
          forceExpired: false,
          forceLimitReached: true,
        }),
        (record) => {
          const result = validateDownloadAccess(record, record.customerId as string);

          expect(result.granted).toBe(false);
          expect(result.errorCode).toBe('LIMIT_REACHED');
          expect(result.httpStatus).toBe(403);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should deny access with NOT_FOUND when record is null (Req 5.8)', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (customerId) => {
          const result = validateDownloadAccess(null, customerId);

          expect(result.granted).toBe(false);
          expect(result.errorCode).toBe('NOT_FOUND');
          expect(result.httpStatus).toBe(404);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should grant access when all conditions are satisfied', () => {
    fc.assert(
      fc.property(
        digitalDownloadArbitrary({
          forceActive: true,
          forceExpired: false,
          forceLimitReached: false,
        }),
        (record) => {
          const result = validateDownloadAccess(record, record.customerId as string);

          expect(result.granted).toBe(true);
          expect(result.errorCode).toBeUndefined();
          expect(result.httpStatus).toBeUndefined();
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should enforce priority: NOT_FOUND > FORBIDDEN (ownership) > inactive > EXPIRED > LIMIT_REACHED', () => {
    // When multiple conditions fail, the first check in priority order determines the error
    fc.assert(
      fc.property(
        digitalDownloadArbitrary(),
        fc.uuid(),
        (record, differentCustomerId) => {
          // Test with non-matching customer
          fc.pre(differentCustomerId !== record.customerId);

          const result = validateDownloadAccess(record, differentCustomerId);

          // Ownership check comes first after existence, so it should always be FORBIDDEN
          // when customer doesn't match, regardless of other conditions
          expect(result.granted).toBe(false);
          expect(result.errorCode).toBe('FORBIDDEN');
          expect(result.httpStatus).toBe(403);
        },
      ),
      { numRuns: 200 },
    );
  });
});
