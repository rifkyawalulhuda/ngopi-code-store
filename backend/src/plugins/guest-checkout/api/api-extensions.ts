import gql from 'graphql-tag';
import { DocumentNode } from 'graphql';

export const guestCheckoutShopApiExtensions: DocumentNode = gql`
  type RequestOrderAccessLinkResult {
    success: Boolean!
    message: String!
  }

  type OrderAccessAuthResult {
    success: Boolean!
    message: String!
    orderCode: String
  }

  type SetGuestPasswordResult {
    success: Boolean!
    message: String!
  }

  extend type Mutation {
    """
    Guest order lookup. Given an order code and the email used at purchase,
    sends a fresh magic access link to that email. Always responds neutrally so
    it cannot be used to enumerate orders or customers.
    """
    requestOrderAccessLink(
      orderCode: String!
      emailAddress: String!
    ): RequestOrderAccessLinkResult!

    """
    Exchange a magic order-access link for a real Vendure session token.
    """
    authenticateWithOrderLink(token: String!): OrderAccessAuthResult!

    """
    Set a password for the currently authenticated guest account, claiming it as
    a normal account. No current password is required (the guest never had one).
    """
    setPasswordForGuest(newPassword: String!): SetGuestPasswordResult!
  }
`;
