import gql from 'graphql-tag'

export const GET_ACTIVE_ORDER = gql`
  query GetActiveOrder {
    activeOrder {
      id
      code
      state
      totalQuantity
      subTotal
      total
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
  }
`

export const GET_ORDER_BY_CODE = gql`
  query GetOrderByCode($code: String!) {
    orderByCode(code: $code) {
      id
      code
      state
      totalQuantity
      subTotal
      total
      createdAt
      updatedAt
      lines {
        id
        productVariant {
          id
          name
          product {
            id
            facetValues {
              id
              code
              facet {
                code
              }
            }
          }
        }
        quantity
        unitPrice
        linePrice
      }
      payments {
        id
        method
        state
        amount
        metadata
      }
      customer {
        id
        emailAddress
        firstName
        lastName
        customFields {
          whatsappNumber
        }
      }
    }
  }
`
