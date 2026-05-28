import { isValidForwardTransition, customOrderProcess } from './custom-order-process';

/**
 * Unit tests for the custom order process.
 *
 * Tests cover:
 * - Forward-only transition validation (Req 10.1, 10.2)
 * - Payment verification guard on Fulfilled transition (Req 10.3)
 */

describe('Custom Order Process', () => {
  describe('isValidForwardTransition', () => {
    it('should allow AddingItems → ArrangingPayment', () => {
      expect(isValidForwardTransition('AddingItems', 'ArrangingPayment')).toBe(true);
    });

    it('should allow ArrangingPayment → PaymentSettled', () => {
      expect(isValidForwardTransition('ArrangingPayment', 'PaymentSettled')).toBe(true);
    });

    it('should allow PaymentSettled → Fulfilled', () => {
      expect(isValidForwardTransition('PaymentSettled', 'Fulfilled')).toBe(true);
    });

    it('should reject backward transition ArrangingPayment → AddingItems', () => {
      expect(isValidForwardTransition('ArrangingPayment', 'AddingItems')).toBe(false);
    });

    it('should reject backward transition PaymentSettled → ArrangingPayment', () => {
      expect(isValidForwardTransition('PaymentSettled', 'ArrangingPayment')).toBe(false);
    });

    it('should reject backward transition Fulfilled → PaymentSettled', () => {
      expect(isValidForwardTransition('Fulfilled', 'PaymentSettled')).toBe(false);
    });

    it('should reject state skipping AddingItems → PaymentSettled', () => {
      expect(isValidForwardTransition('AddingItems', 'PaymentSettled')).toBe(false);
    });

    it('should reject state skipping AddingItems → Fulfilled', () => {
      expect(isValidForwardTransition('AddingItems', 'Fulfilled')).toBe(false);
    });

    it('should reject state skipping ArrangingPayment → Fulfilled', () => {
      expect(isValidForwardTransition('ArrangingPayment', 'Fulfilled')).toBe(false);
    });

    it('should reject same-state transition', () => {
      expect(isValidForwardTransition('AddingItems', 'AddingItems')).toBe(false);
    });

    it('should reject unknown states', () => {
      expect(isValidForwardTransition('Unknown', 'AddingItems')).toBe(false);
      expect(isValidForwardTransition('AddingItems', 'Unknown')).toBe(false);
    });
  });

  describe('transitions configuration', () => {
    it('should define AddingItems can only go to ArrangingPayment', () => {
      expect(customOrderProcess.transitions!.AddingItems).toEqual({
        to: ['ArrangingPayment'],
      });
    });

    it('should define ArrangingPayment can only go to PaymentSettled', () => {
      expect(customOrderProcess.transitions!.ArrangingPayment).toEqual({
        to: ['PaymentSettled'],
      });
    });

    it('should define PaymentSettled can only go to Fulfilled', () => {
      expect(customOrderProcess.transitions!.PaymentSettled).toEqual({
        to: ['Fulfilled'],
      });
    });
  });

  describe('onTransitionStart guard', () => {
    const onTransitionStart = customOrderProcess.onTransitionStart!;

    it('should allow valid forward transition AddingItems → ArrangingPayment', async () => {
      const data = { ctx: {} as any, order: { id: '1', totalWithTax: 100000 } as any };
      const result = await onTransitionStart('AddingItems', 'ArrangingPayment', data);
      expect(result).toBeUndefined();
    });

    it('should allow valid forward transition ArrangingPayment → PaymentSettled', async () => {
      const data = { ctx: {} as any, order: { id: '1', totalWithTax: 100000 } as any };
      const result = await onTransitionStart('ArrangingPayment', 'PaymentSettled', data);
      expect(result).toBeUndefined();
    });

    it('should reject backward transition with error message', async () => {
      const data = { ctx: {} as any, order: { id: '1', totalWithTax: 100000 } as any };
      const result = await onTransitionStart('ArrangingPayment', 'AddingItems', data);
      expect(result).toContain('Invalid state transition');
      expect(result).toContain('ArrangingPayment');
      expect(result).toContain('AddingItems');
    });

    it('should reject state skipping with error message', async () => {
      const data = { ctx: {} as any, order: { id: '1', totalWithTax: 100000 } as any };
      const result = await onTransitionStart('AddingItems', 'Fulfilled', data);
      expect(result).toContain('Invalid state transition');
    });

    describe('payment verification guard (Fulfilled transition)', () => {
      it('should allow zero-value orders to transition to Fulfilled without payment', async () => {
        const data = { ctx: {} as any, order: { id: '1', totalWithTax: 0 } as any };
        const result = await onTransitionStart('PaymentSettled', 'Fulfilled', data);
        expect(result).toBeUndefined();
      });

      it('should block Fulfilled transition when no connection is available', async () => {
        const data = { ctx: {} as any, order: { id: '1', totalWithTax: 50000 } as any };
        // connection is undefined by default in test environment
        const result = await onTransitionStart('PaymentSettled', 'Fulfilled', data);
        expect(result).toContain('Payment verification failed');
      });
    });
  });
});
