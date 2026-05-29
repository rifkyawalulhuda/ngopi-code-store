import gql from 'graphql-tag'

export const GET_ORDER_DOWNLOADS = gql`
  query GetOrderDownloads($orderCode: String!) {
    orderByCode(code: $orderCode) {
      id
      code
      state
      downloads {
        id
        fileName
        maxDownloads
        currentDownloads
        expiresAt
        isActive
        downloadToken
      }
    }
  }
`
