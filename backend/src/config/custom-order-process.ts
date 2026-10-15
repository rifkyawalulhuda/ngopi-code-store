import { CustomOrderProcess, OrderState, Injector, TransactionalConnection, Order } from '@vendure/core';
import { TripayTransaction } from '../plugins/tripay-payment/entities/tripay-transaction.entity';

/**
 * Defines the allowed sequential order states for NgopiCode Digital Store.
 * Only forward transitions are permitted:
 *   AddingItems → ArrangingPayment → PaymentSettled → Fulfilled
 *
 * @see Requirements 10.1 - Sequential forward transitions only
 * @see Requirements 10.2 - Reject backward transitions and state skipping
 * @see Requirements 10.3 - Payment verification guard on Fulfilled transition
 */

/** The strict sequential order of allowed states */
const STATE_SEQUENCE: string[] = [
  'Created',
  'AddingItems',
  'ArrangingPayment',
  'PaymentSettled',
  'Fulfilled',
];

/**
 * Returns the index of a state in the allowed sequence, or -1 if not found.
 */
function getStateIndex(state: string): number {
  return STATE_SEQUENCE.indexOf(state);
}

/**
 * Determines whether a transition from one state to another is a valid
 * forward-only, single-step transition.
 *
 * @returns true if the transition moves exactly one step forward
 */
export function isValidForwardTransition(from: string, to: string): boolean {
  const fromIndex = getStateIndex(from);
  const toIndex = getStateIndex(to);

  // Both states must be in our sequence
  if (fromIndex === -1 || toIndex === -1) {
    return false;
  }

  // Must move exactly one step forward
  return toIndex === fromIndex + 1;
}

// Module-level variable to hold the injected connection
let connection: TransactionalConnection | undefined;

/**
 * Custom order process that enforces forward-only transitions and
 * payment verification before fulfillment.
 */
export const customOrderProcess: CustomOrderProcess<string> = {
  transitions: {
    Created: {
      to: ['AddingItems'],
    },
    AddingItems: {
      to: ['ArrangingPayment'],
    },
    ArrangingPayment: {
      to: ['PaymentSettled'],
    },
    PaymentSettled: {
      to: ['Fulfilled'],
    },
  },

  init(injector: Injector) {
    connection = injector.get(TransactionalConnection);
  },

  /**
   * Guard that runs before any state transition.
   * - Rejects backward transitions and state skipping (Req 10.2)
   * - Verifies payment before allowing Fulfilled transition (Req 10.3)
   *
   * Returns a string error message to reject the transition, or undefined to allow it.
   */
  async onTransitionStart(fromState, toState, data): Promise<string | void> {
    // Validate forward-only, single-step transition
    if (!isValidForwardTransition(fromState, toState)) {
      return `Invalid state transition: cannot move from "${fromState}" to "${toState}". Only sequential forward transitions are allowed.`;
    }

    // Payment verification guard for Fulfilled transition
    if (toState === 'Fulfilled') {
      const order = data.order;
      const orderTotal = order.totalWithTax;

      // Zero-value orders (free samples/promotional) are allowed without payment
      if (orderTotal === 0) {
        return undefined;
      }

      // Allow admin-initiated transitions to bypass payment verification
      // (e.g., manual fulfillment from Dashboard after verifying payment externally)
      if (data.ctx?.apiType === 'admin') {
        return undefined;
      }

      // Require a PAID TripayTransaction with matching amount
      if (!connection) {
        return `Payment verification failed: unable to access database connection.`;
      }

      // Read through the transaction-scoped repository. `data.ctx` carries the
      // active transaction of the transition, so this sees exactly the state
      // that will be committed. Using the raw connection here would run on a
      // different pool connection and observe a stale snapshot.
      const paidTransaction = await connection
        .getRepository(data.ctx, TripayTransaction)
        .findOne({
          where: {
            orderId: order.id,
            status: 'PAID',
            amount: orderTotal,
          },
        });

      if (!paidTransaction) {
        return `Payment verification failed: no PAID TripayTransaction with amount ${orderTotal} found for this order. Cannot transition to Fulfilled.`;
      }
    }

    return undefined;
  },

  /**
   * Runs after a successful state transition.
   * Sets orderPlacedAt when entering PaymentSettled (needed for Dashboard Insights metrics).
   */
  async onTransitionEnd(fromState, toState, data): Promise<void> {
    if (toState === 'PaymentSettled' && connection) {
      const order = data.order;
      if (!order.orderPlacedAt) {
        const placedAt = new Date();
        // MUST use the transaction-scoped repository.
        //
        // This hook runs *inside* the transition's transaction. Writing via
        // `connection.rawConnection` would target a different pool connection
        // and block on the row lock held by the very transaction that is
        // waiting for this hook to return — a self-deadlock that leaves the
        // order stuck in ArrangingPayment forever and wedges every later
        // webhook retry behind it.
        await connection.getRepository(data.ctx, Order).update(order.id, {
          orderPlacedAt: placedAt,
        });
        // Keep the in-memory entity consistent with what we just wrote.
        order.orderPlacedAt = placedAt;
      }
    }
  },
};
