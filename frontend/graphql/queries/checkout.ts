import gql from 'graphql-tag'

export const GET_ELIGIBLE_PAYMENT_METHODS = gql`
  query GetEligiblePaymentMethods {
    eligiblePaymentMethods {
      id
      name
      code
      description
      isEligible
      eligibilityMessage
    }
  }
`
