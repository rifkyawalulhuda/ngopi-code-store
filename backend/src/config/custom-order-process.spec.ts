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

  /**
   * Regression tests for a self-deadlock: the transition hooks used to write
   * through `connection.rawConnection`, which runs on a *different* pool
   * connection than the transition's transaction. The transaction held the row
   * lock while waiting for the hook to return, and the hook waited for that
   * lock — hanging the order forever in ArrangingPayment.
   *
   * The hooks must therefore go through the transaction-scoped repository
   * (`getRepository(ctx, ...)`), never the raw connection.
   */
  describe('transaction safety of the transition hooks', () => {
    const ctx = { __ctx: true } as any;

    function installConnection() {
      const update = jest.fn().mockResolvedValue({});
      const findOne = jest.fn().mockResolvedValue({ id: 1, status: 'PAID' });
      const getRepository = jest.fn().mockReturnValue({ update, findOne });
      const rawCreateQueryBuilder = jest.fn();
      const rawGetRepository = jest.fn();
      const connection = {
        getRepository,
        rawConnection: {
          createQueryBuilder: rawCreateQueryBuilder,
          getRepository: rawGetRepository,
        },
      };
      customOrderProcess.init!({ get: () => connection } as any);
      return { connection, getRepository, update, findOne, rawCreateQueryBuilder, rawGetRepository };
    }

    afterEach(() => {
      // Restore the "no connection" state the earlier tests rely on.
      customOrderProcess.init!({ get: () => undefined } as any);
    });

    it('onTransitionEnd writes orderPlacedAt through the ctx repository', async () => {
      const mocks = installConnection();
      const order = { id: 7, orderPlacedAt: null } as any;

      await customOrderProcess.onTransitionEnd!('ArrangingPayment', 'PaymentSettled', {
        ctx,
        order,
      } as any);

      expect(mocks.getRepository).toHaveBeenCalledWith(ctx, expect.anything());
      expect(mocks.update).toHaveBeenCalledWith(7, { orderPlacedAt: expect.any(Date) });
      expect(order.orderPlacedAt).toBeInstanceOf(Date);
    });

    it('onTransitionEnd never touches the raw connection', async () => {
      const mocks = installConnection();

      await customOrderProcess.onTransitionEnd!('ArrangingPayment', 'PaymentSettled', {
        ctx,
        order: { id: 7, orderPlacedAt: null } as any,
      } as any);

      expect(mocks.rawCreateQueryBuilder).not.toHaveBeenCalled();
      expect(mocks.rawGetRepository).not.toHaveBeenCalled();
    });

    it('onTransitionEnd does nothing when orderPlacedAt is already set', async () => {
      const mocks = installConnection();
      const placed = new Date('2024-01-01T00:00:00Z');

      await customOrderProcess.onTransitionEnd!('ArrangingPayment', 'PaymentSettled', {
        ctx,
        order: { id: 7, orderPlacedAt: placed } as any,
      } as any);

      expect(mocks.update).not.toHaveBeenCalled();
    });

    it('onTransitionEnd ignores transitions other than PaymentSettled', async () => {
      const mocks = installConnection();

      await customOrderProcess.onTransitionEnd!('AddingItems', 'ArrangingPayment', {
        ctx,
        order: { id: 7, orderPlacedAt: null } as any,
      } as any);

      expect(mocks.update).not.toHaveBeenCalled();
    });

    it('onTransitionStart reads TripayTransaction through the ctx repository', async () => {
      const mocks = installConnection();

      const result = await customOrderProcess.onTransitionStart!('PaymentSettled', 'Fulfilled', {
        ctx,
        order: { id: 7, totalWithTax: 50000 },
      } as any);

      expect(result).toBeUndefined();
      expect(mocks.getRepository).toHaveBeenCalledWith(ctx, expect.anything());
      expect(mocks.findOne).toHaveBeenCalled();
      expect(mocks.rawGetRepository).not.toHaveBeenCalled();
    });
  });
});
