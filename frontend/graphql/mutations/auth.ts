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
      customFields {
        whatsappNumber
        wishlistProductIds
      }
    }
  }
`

export const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      id
      firstName
      lastName
      emailAddress
      customFields {
        whatsappNumber
      }
    }
  }
`

export const UPDATE_CUSTOMER_PASSWORD = gql`
  mutation UpdateCustomerPassword($currentPassword: String!, $newPassword: String!) {
    updateCustomerPassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      ... on Success {
        success
      }
      ... on InvalidCredentialsError {
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

export const REQUEST_UPDATE_EMAIL = gql`
  mutation RequestUpdateEmail($password: String!, $newEmailAddress: String!) {
    requestUpdateCustomerEmailAddress(password: $password, newEmailAddress: $newEmailAddress) {
      ... on Success {
        success
      }
      ... on InvalidCredentialsError {
        message
      }
      ... on EmailAddressConflictError {
        message
      }
      ... on NativeAuthStrategyError {
        message
      }
    }
  }
`

export const UPDATE_EMAIL_ADDRESS = gql`
  mutation UpdateEmailAddress($token: String!) {
    updateCustomerEmailAddress(token: $token) {
      ... on Success {
        success
      }
      ... on IdentifierChangeTokenInvalidError {
        message
      }
      ... on IdentifierChangeTokenExpiredError {
        message
      }
      ... on NativeAuthStrategyError {
        message
      }
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
      customFields {
        whatsappNumber
      }
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
              product {
                id
                collections {
                  id
                  slug
                  name
                }
                facetValues {
                  id
                  code
                  name
                  facet {
                    code
                    name
                  }
                }
              }
            }
            featuredAsset {
              preview
            }
          }
          payments {
            id
            method
            metadata
          }
        }
      }
    }
  }
`

export const AUTHENTICATE_WITH_GOOGLE = gql`
  mutation AuthenticateWithGoogle($token: String!) {
    authenticate(input: { google: { token: $token } }) {
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
    }
  }
`

export const AUTHENTICATE_WITH_GITHUB = gql`
  mutation AuthenticateWithGitHub($code: String!, $state: String!) {
    authenticate(input: { github: { code: $code, state: $state } }) {
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
    }
  }
`
