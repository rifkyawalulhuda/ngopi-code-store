import gql from 'graphql-tag'

export const GET_PRODUCTS = gql`
  query GetProducts($options: ProductListOptions) {
    products(options: $options) {
      items {
        id
        name
        slug
        description
        featuredAsset {
          id
          preview
        }
        variants {
          id
          name
          price
          currencyCode
        }
      }
      totalItems
    }
  }
`

export const GET_PRODUCT_BY_SLUG = gql`
  query GetProductBySlug($slug: String!) {
    product(slug: $slug) {
      id
      name
      slug
      description
      featuredAsset {
        id
        preview
      }
      assets {
        id
        preview
        source
        name
      }
      variants {
        id
        name
        price
        currencyCode
      }
      collections {
        id
        name
        slug
      }
      customFields {
        keyFeatures
        deliveryInfo
        productType
        fileFormat
        licenseType
      }
    }
  }
`

export const SEARCH_PRODUCTS = gql`
  query SearchProducts($input: SearchInput!) {
    search(input: $input) {
      items {
        productId
        productName
        slug
        description
        price {
          ... on SinglePrice {
            value
          }
          ... on PriceRange {
            min
            max
          }
        }
        productAsset {
          id
          preview
        }
        collectionIds
      }
      totalItems
    }
  }
`
