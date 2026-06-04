import gql from 'graphql-tag'

export const REQUEST_DOWNLOAD_LINK = gql`
  mutation RequestDownloadLink($downloadToken: String!) {
    requestDownloadLink(downloadToken: $downloadToken) {
      url
      expiresIn
      remainingDownloads
      fileName
    }
  }
`
