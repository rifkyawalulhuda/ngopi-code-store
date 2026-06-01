import gql from 'graphql-tag'

export const REGISTER_CUSTOMER = gql`
  mutation RegisterCustomer($input: RegisterCustomerInput!) {
    registerCustomerAccount(input: $input) {
      ... on Success {
        success
      }
      ... on MissingPasswordError {
        message
      }
      ... on PasswordValidationError {
        message
        validationErrorMessage
      }
      ... on NativeAuthStrategyError {
        message
      }
    }
  }
`

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!, $rememberMe: Boolean) {
    login(username: $email, password: $password, rememberMe: $rememberMe) {
      ... on CurrentUser {
        id
        identifier
      }
      ... on InvalidCredentialsError {
        message
        authenticationError
      }
      ... on NotVerifiedError {
        message
      }
      ... on NativeAuthStrategyError {
        message
      }
    }
  }
`

export const LOGOUT = gql`
  mutation Logout {
    logout {
      success
    }
  }
`

export const VERIFY_CUSTOMER = gql`
  mutation VerifyCustomer($token: String!, $password: String) {
    verifyCustomerAccount(token: $token, password: $password) {
      ... on CurrentUser {
        id
        identifier
      }
      ... on VerificationTokenInvalidError {
        message
      }
      ... on VerificationTokenExpiredError {
        message
      }
      ... on MissingPasswordError {
        message
      }
      ... on PasswordAlreadySetError {
        message
      }
      ... on NativeAuthStrategyError {
        message
      }
    }
  }
`

export const GET_ACTIVE_CUSTOMER = gql`
  query GetActiveCustomer {
    activeCustomer {
      id
      firstName
      lastName
      emailAddress
    }
  }
`

export const GET_ACTIVE_CUSTOMER_ORDERS = gql`
  query GetActiveCustomerOrders {
    activeCustomer {
      id
      firstName
      lastName
      emailAddress
      orders(options: { sort: { createdAt: DESC } }) {
        totalItems
        items {
          id
          code
          state
          orderPlacedAt
          totalWithTax
          currencyCode
          lines {
            id
            quantity
            productVariant {
              id
              name
            }
            featuredAsset {
              preview
            }
          }
        }
      }
    }
  }
`
