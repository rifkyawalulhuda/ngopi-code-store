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
      subTotalWithTax
      total
      totalWithTax
      shippingWithTax
      orderPlacedAt
      createdAt
      updatedAt
      currencyCode
      lines {
        id
        productVariant {
          id
          name
          sku
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
        unitPriceWithTax
        linePrice
        linePriceWithTax
      }
      payments {
        id
        method
        state
        amount
        transactionId
        metadata
        createdAt
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
