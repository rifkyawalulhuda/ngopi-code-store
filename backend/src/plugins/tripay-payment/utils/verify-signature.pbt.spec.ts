import * as crypto from 'crypto';
import * as fc from 'fast-check';
import { verifyTripaySignature } from './verify-signature';

/**
 * Property 5: Webhook Signature Round-Trip
 *
 * For any payload string and private key, computing the HMAC SHA256 signature
 * and then verifying it with the same payload and key always returns true.
 * Conversely, verifying with a different payload or key always returns false.
 *
 * **Validates: Requirements 2.1, 2.2, 11.1, 11.3**
 */
describe('Property 5: Webhook Signature Round-Trip', () => {
  /**
   * Helper to compute HMAC SHA256 signature (simulates Tripay signing).
   */
  function sign(payload: string, key: string): string {
    return crypto.createHmac('sha256', key).update(payload).digest('hex');
  }

  /**
   * Arbitrary for generating non-empty payload strings (JSON-like content).
   */
  const payloadArbitrary = fc.oneof(
    // Realistic JSON payloads
    fc.record({
      reference: fc.string({ minLength: 1, maxLength: 30 }),
      merchant_ref: fc.string({ minLength: 1, maxLength: 30 }),
      status: fc.constantFrom('PAID', 'EXPIRED', 'FAILED'),
      total_amount: fc.integer({ min: 1, max: 100_000_000 }),
    }).map((obj) => JSON.stringify(obj)),
    // Arbitrary non-empty strings
    fc.string({ minLength: 1, maxLength: 500 }),
  );

  /**
   * Arbitrary for generating non-empty private keys.
   */
  const keyArbitrary = fc.string({ minLength: 1, maxLength: 100 });

  it('verify(sign(payload, key), payload, key) should always return true', () => {
    fc.assert(
      fc.property(payloadArbitrary, keyArbitrary, (payload, key) => {
        const signature = sign(payload, key);
        expect(verifyTripaySignature(payload, signature, key)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('verify with a different payload should always return false', () => {
    fc.assert(
      fc.property(
        payloadArbitrary,
        payloadArbitrary,
        keyArbitrary,
        (payload1, payload2, key) => {
          // Only test when payloads are actually different
          fc.pre(payload1 !== payload2);

          const signature = sign(payload1, key);
          expect(verifyTripaySignature(payload2, signature, key)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('verify with a different key should always return false', () => {
    fc.assert(
      fc.property(
        payloadArbitrary,
        keyArbitrary,
        keyArbitrary,
        (payload, key1, key2) => {
          // Only test when keys are actually different
          fc.pre(key1 !== key2);

          const signature = sign(payload, key1);
          expect(verifyTripaySignature(payload, signature, key2)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('verify with both different payload and key should always return false', () => {
    fc.assert(
      fc.property(
        payloadArbitrary,
        payloadArbitrary,
        keyArbitrary,
        keyArbitrary,
        (payload1, payload2, key1, key2) => {
          // Only test when at least one of payload or key differs
          fc.pre(payload1 !== payload2 || key1 !== key2);

          const signature = sign(payload1, key1);
          // Verify with different payload and/or key
          expect(verifyTripaySignature(payload2, signature, key2)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });
});
