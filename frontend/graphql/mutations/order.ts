import gql from 'graphql-tag'

export const ADD_ITEM_TO_ORDER = gql`
  mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ... on Order {
        id
        code
        totalQuantity
        subTotal
        lines {
          id
          productVariant {
            id
            name
          }
          quantity
          unitPrice
          linePrice
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`

export const SET_CUSTOMER_FOR_ORDER = gql`
  mutation SetCustomerForOrder($input: CreateCustomerInput!) {
    setCustomerForOrder(input: $input) {
      ... on Order {
        id
        customer {
          id
          emailAddress
          firstName
          lastName
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`

export const ADD_PAYMENT_TO_ORDER = gql`
  mutation AddPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ... on Order {
        id
        state
        payments {
          id
          method
          state
          metadata
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`
