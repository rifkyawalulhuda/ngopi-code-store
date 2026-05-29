import gql from 'graphql-tag'

export const GET_COLLECTIONS = gql`
  query GetCollections {
    collections {
      items {
        id
        name
        slug
        description
        featuredAsset {
          id
          preview
        }
        parent {
          id
          name
        }
      }
      totalItems
    }
  }
`
