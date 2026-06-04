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

  extend type Mutation {
    generateDownloadUrl(productVariantId: ID!): DownloadUrl
  }
`;
