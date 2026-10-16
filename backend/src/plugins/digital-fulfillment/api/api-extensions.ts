import gql from 'graphql-tag';
import { DocumentNode } from 'graphql';

export const adminApiExtensions: DocumentNode = gql`
  type DigitalProduct {
    id: ID!
    productVariantId: ID!
    fileName: String!
    originalFileName: String!
    fileSize: Float!
    mimeType: String!
    bucket: String!
    objectKey: String!
  }

  extend type Query {
    digitalProductByVariantId(variantId: ID!): DigitalProduct
  }

  extend type Mutation {
    uploadDigitalProduct(variantId: ID!, file: Upload!): DigitalProduct!
    deleteDigitalProduct(variantId: ID!): Boolean!
  }
`;

export const shopApiExtensions: DocumentNode = gql`
  type DownloadUrl {
    url: String!
    fileName: String!
  }

  """
  Public, non-sensitive metadata about a digital product's file.
  Exposed on the storefront so shoppers can see what they are buying
  (e.g. "ZIP Archive - 12 MB"). Never exposes the storage bucket or object key.
  """
  type DigitalProductInfo {
    fileSize: Float!
    mimeType: String!
    maxDownloadsPerOrder: Int!
    downloadExpiryHours: Int!
  }

  extend type ProductVariant {
    digitalProductInfo: DigitalProductInfo
  }

  type DigitalDownloadItem {
    id: ID!
    fileName: String!
    maxDownloads: Int!
    currentDownloads: Int!
    expiresAt: String!
    isActive: Boolean!
    downloadToken: String!
  }

  extend type Order {
    downloads: [DigitalDownloadItem!]!
  }

  extend type Mutation {
    generateDownloadUrl(productVariantId: ID!): DownloadUrl
    requestDownloadLink(downloadToken: String!): DownloadLinkResult
  }

  type DownloadLinkResult {
    url: String!
    expiresIn: Int!
    remainingDownloads: Int!
    fileName: String!
  }
`;
