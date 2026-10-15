import gql from 'graphql-tag'

export const REQUEST_ORDER_ACCESS_LINK = gql`
  mutation RequestOrderAccessLink($orderCode: String!, $emailAddress: String!) {
    requestOrderAccessLink(orderCode: $orderCode, emailAddress: $emailAddress) {
      success
      message
    }
  }
`

export const AUTHENTICATE_WITH_ORDER_LINK = gql`
  mutation AuthenticateWithOrderLink($token: String!) {
    authenticateWithOrderLink(token: $token) {
      success
      message
      orderCode
    }
  }
`

export const SET_PASSWORD_FOR_GUEST = gql`
  mutation SetPasswordForGuest($newPassword: String!) {
    setPasswordForGuest(newPassword: $newPassword) {
      success
      message
    }
  }
`
