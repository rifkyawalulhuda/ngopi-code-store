import gql from 'graphql-tag'

export const GENERATE_DOWNLOAD_URL = gql`
  mutation GenerateDownloadUrl($productVariantId: ID!) {
    generateDownloadUrl(productVariantId: $productVariantId) {
      url
      fileName
    }
  }
`
