import * as fc from 'fast-check';
import { isValidForwardTransition } from './custom-order-process';

/**
 * Property-Based Test: Order State Machine Forward-Only Transitions
 *
 * **Validates: Requirements 10.1, 10.2**
 *
 * Property 6: For any order state, verify only forward transitions (exactly one step)
 * are permitted. Backward transitions, state skipping, and same-state transitions
 * are all rejected.
 */

const STATE_SEQUENCE = ['AddingItems', 'ArrangingPayment', 'PaymentSettled', 'Fulfilled'] as const;
type OrderState = (typeof STATE_SEQUENCE)[number];

/** Arbitrary that generates a valid state from the sequence */
const stateArb = fc.constantFrom(...STATE_SEQUENCE);

/** Arbitrary that generates a pair of state indices */
const stateIndexPairArb = fc.tuple(
  fc.integer({ min: 0, max: STATE_SEQUENCE.length - 1 }),
  fc.integer({ min: 0, max: STATE_SEQUENCE.length - 1 }),
);

describe('Property 6: Order State Machine Forward-Only Transitions', () => {
  /**
   * **Validates: Requirements 10.1, 10.2**
   *
   * For any pair of states, isValidForwardTransition returns true
   * if and only if the destination is exactly one step forward from the source.
   */
  it('should return true only when toIndex === fromIndex + 1', () => {
    fc.assert(
      fc.property(stateIndexPairArb, ([fromIndex, toIndex]) => {
        const from = STATE_SEQUENCE[fromIndex];
        const to = STATE_SEQUENCE[toIndex];
        const result = isValidForwardTransition(from, to);

        if (toIndex === fromIndex + 1) {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 10.2**
   *
   * For any backward transition (toIndex < fromIndex), the transition is always rejected.
   */
  it('should reject all backward transitions', () => {
    fc.assert(
      fc.property(
        stateIndexPairArb.filter(([fromIndex, toIndex]) => toIndex < fromIndex),
        ([fromIndex, toIndex]) => {
          const from = STATE_SEQUENCE[fromIndex];
          const to = STATE_SEQUENCE[toIndex];
          expect(isValidForwardTransition(from, to)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 10.2**
   *
   * For any state-skipping transition (toIndex > fromIndex + 1), the transition is always rejected.
   */
  it('should reject all state-skipping transitions', () => {
    fc.assert(
      fc.property(
        stateIndexPairArb.filter(([fromIndex, toIndex]) => toIndex > fromIndex + 1),
        ([fromIndex, toIndex]) => {
          const from = STATE_SEQUENCE[fromIndex];
          const to = STATE_SEQUENCE[toIndex];
          expect(isValidForwardTransition(from, to)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 10.2**
   *
   * For any same-state transition (from === to), the transition is always rejected.
   */
  it('should reject all same-state transitions', () => {
    fc.assert(
      fc.property(stateArb, (state) => {
        expect(isValidForwardTransition(state, state)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
