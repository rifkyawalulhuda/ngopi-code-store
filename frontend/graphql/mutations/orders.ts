import gql from 'graphql-tag'

/**
 * Cancel an order that is still awaiting payment (ArrangingPayment state).
 * Customer-initiated cancellation via the Tripay plugin's Shop API extension.
 */
export const CANCEL_MY_ORDER = gql`
  mutation CancelMyOrder($orderCode: String!) {
    cancelMyOrder(orderCode: $orderCode) {
      success
      message
    }
  }
`
