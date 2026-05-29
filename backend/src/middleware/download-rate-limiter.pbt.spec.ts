import * as fc from 'fast-check';
import { DownloadRateLimiter } from './download-rate-limiter.middleware';

/**
 * Property 15: Rate Limiting
 *
 * For any customer making download requests, the system allows at most
 * 10 requests per minute. The 11th request within a 60-second window
 * is rejected.
 *
 * **Validates: Requirements 13.2**
 */
describe('Property 15: Rate Limiting', () => {
  it('should allow exactly 10 requests and reject the 11th within a 60-second window for any customer', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // arbitrary customer ID
        fc.integer({ min: 0, max: 1_000_000_000 }), // arbitrary base timestamp
        (customerId, baseTime) => {
          const limiter = new DownloadRateLimiter({ maxRequests: 10, windowMs: 60_000 });

          // First 10 requests within the window should all be allowed
          for (let i = 0; i < 10; i++) {
            const result = limiter.check(customerId, baseTime + i * 100);
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(9 - i);
          }

          // 11th request within the same window should be rejected
          const rejected = limiter.check(customerId, baseTime + 10 * 100);
          expect(rejected.allowed).toBe(false);
          expect(rejected.remaining).toBe(0);
          expect(rejected.retryAfterSeconds).toBeGreaterThan(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should allow requests again after the 60-second window expires', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // arbitrary customer ID
        fc.integer({ min: 100_000, max: 1_000_000_000 }), // arbitrary base timestamp
        fc.integer({ min: 1, max: 59_000 }), // time within window for the 11th attempt
        (customerId, baseTime, withinWindowOffset) => {
          const limiter = new DownloadRateLimiter({ maxRequests: 10, windowMs: 60_000 });

          // Exhaust the limit
          for (let i = 0; i < 10; i++) {
            limiter.check(customerId, baseTime);
          }

          // Verify rejected within window
          const rejectedResult = limiter.check(customerId, baseTime + withinWindowOffset);
          expect(rejectedResult.allowed).toBe(false);

          // After the window expires (60_001ms later), requests should be allowed again
          const afterWindowResult = limiter.check(customerId, baseTime + 60_001);
          expect(afterWindowResult.allowed).toBe(true);
          expect(afterWindowResult.remaining).toBe(9);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should enforce independent rate limits for different customers', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 0, max: 1_000_000_000 }),
        (customerA, customerB, baseTime) => {
          // Ensure distinct customers
          fc.pre(customerA !== customerB);

          const limiter = new DownloadRateLimiter({ maxRequests: 10, windowMs: 60_000 });

          // Exhaust customer A's limit
          for (let i = 0; i < 10; i++) {
            limiter.check(customerA, baseTime);
          }

          // Customer A should be rejected
          const resultA = limiter.check(customerA, baseTime + 1000);
          expect(resultA.allowed).toBe(false);

          // Customer B should still be allowed (independent limit)
          const resultB = limiter.check(customerB, baseTime + 1000);
          expect(resultB.allowed).toBe(true);
          expect(resultB.remaining).toBe(9);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should respect the sliding window - partial expiry frees up slots', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 100_000, max: 1_000_000_000 }),
        fc.integer({ min: 1, max: 9 }), // number of early requests
        (customerId, baseTime, earlyCount) => {
          const limiter = new DownloadRateLimiter({ maxRequests: 10, windowMs: 60_000 });
          const lateCount = 10 - earlyCount;

          // Make earlyCount requests at baseTime
          for (let i = 0; i < earlyCount; i++) {
            limiter.check(customerId, baseTime);
          }

          // Make lateCount requests at baseTime + 30_000 (30s later)
          for (let i = 0; i < lateCount; i++) {
            limiter.check(customerId, baseTime + 30_000);
          }

          // At baseTime + 60_001, the early requests expire, freeing earlyCount slots
          // The lateCount requests are still within the window
          const afterPartialExpiry = limiter.check(customerId, baseTime + 60_001);
          expect(afterPartialExpiry.allowed).toBe(true);
          // Remaining should be: 10 - lateCount - 1 (the new request just made)
          expect(afterPartialExpiry.remaining).toBe(earlyCount - 1);
        },
      ),
      { numRuns: 200 },
    );
  });
});
