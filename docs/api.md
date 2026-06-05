# API Reference

## Table of Contents

- [GraphQL Endpoints](#graphql-endpoints)
- [Shop API Extensions](#shop-api-extensions)
- [Admin API Extensions](#admin-api-extensions)
- [Webhook](#webhook)
- [Custom Fields](#custom-fields)

## GraphQL Endpoints

| Endpoint | URL | Auth | Purpose |
|----------|-----|------|---------|
| Shop API | `http://localhost:3000/shop-api` | Customer token (optional) | Customer-facing operations |
| Admin API | `http://localhost:3000/admin-api` | Admin bearer token | Store management |

### Authentication

**Shop API**: Uses session-based auth with bearer token. Login via `login` mutation returns a token in the response header.

**Admin API**: Requires admin credentials. Authenticate via the `authenticate` mutation.

```graphql
# Shop API login
mutation {
  login(username: "customer@email.com", password: "password") {
    ... on CurrentUser {
      id
      identifier
    }
    ... on InvalidCredentialsError {
      message
    }
  }
}
```

## Shop API Extensions

### `generateDownloadUrl`

Generates a pre-signed MinIO URL for downloading a digital product.

```graphql
mutation GenerateDownloadUrl($productVariantId: ID!) {
  generateDownloadUrl(productVariantId: $productVariantId) {
    url
    expiresAt
  }
}
```

**Requirements:**
- Customer must be authenticated
- Customer must own a paid order containing this variant
- URL expires after 5 minutes

**Response:**
```json
{
  "data": {
    "generateDownloadUrl": {
      "url": "https://minio.example.com/products/...",
      "expiresAt": "2024-01-01T12:05:00Z"
    }
  }
}
```

### `requestDownloadLink`

Requests a download via token (legacy flow with download counter).

```graphql
mutation RequestDownloadLink($downloadToken: String!) {
  requestDownloadLink(downloadToken: $downloadToken) {
    url
    remainingDownloads
  }
}
```

### `Order.downloads` Field

Extended `Order` type includes digital download items:

```graphql
query GetOrderByCode($code: String!) {
  orderByCode(code: $code) {
    code
    state
    downloads {
      id
      productVariantId
      productName
      fileName
      downloadCount
      createdAt
    }
  }
}
```

**Type definition:**

```graphql
type DigitalDownloadItem {
  id: ID!
  productVariantId: ID!
  productName: String!
  fileName: String!
  fileSize: Int!
  downloadCount: Int!
  createdAt: DateTime!
}

extend type Order {
  downloads: [DigitalDownloadItem!]!
}
```

## Admin API Extensions

### `uploadDigitalProduct`

Upload a digital product file for a specific variant.

```graphql
mutation UploadDigitalProduct($variantId: ID!, $file: Upload!) {
  uploadDigitalProduct(variantId: $variantId, file: $file) {
    id
    variantId
    fileName
    fileSize
    mimeType
    createdAt
  }
}
```

**Requirements:**
- Admin authentication required
- File is stored in MinIO bucket `products`
- Overwrites existing file for the variant if present

### `deleteDigitalProduct`

Remove a digital product file from a variant.

```graphql
mutation DeleteDigitalProduct($variantId: ID!) {
  deleteDigitalProduct(variantId: $variantId) {
    success
    message
  }
}
```

### `digitalProductByVariantId`

Query digital product file info for a variant.

```graphql
query DigitalProductByVariantId($variantId: ID!) {
  digitalProductByVariantId(variantId: $variantId) {
    id
    variantId
    fileName
    fileSize
    mimeType
    storagePath
    createdAt
    updatedAt
  }
}
```

## Webhook

### Tripay Payment Webhook

**Endpoint:** `POST /payments/tripay/webhook`

Tripay sends payment status callbacks to this endpoint when a customer completes payment.

### Request Format

```json
{
  "merchant_ref": "ORDER-CODE-001",
  "reference": "T123456789",
  "status": "PAID",
  "amount": 150000,
  "paid_at": "2024-01-01 12:00:00",
  "signature": "hmac_sha256_signature"
}
```

### Signature Verification

The webhook verifies the HMAC-SHA256 signature using the `TRIPAY_PRIVATE_KEY`:

```
signature = HMAC-SHA256(privateKey, merchantRef + merchantCode + amount)
```

### Processing Flow

1. Verify HMAC signature → reject if invalid (401)
2. Find order by `merchant_ref`
3. Check idempotency (skip if already processed)
4. Transition order: `PaymentAuthorized → PaymentSettled → Delivered`
5. Trigger digital fulfillment (create download records)
6. Return 200 OK

### Response

```json
{
  "success": true
}
```

### Error Responses

| Status | Reason |
|--------|--------|
| 401 | Invalid signature |
| 404 | Order not found |
| 200 | Already processed (idempotent) |

## Custom Fields

### Channel (Public)

Available via Shop API's `activeChannel` query.

| Field | Type | Description |
|-------|------|-------------|
| `whatsappNumber` | `String` | Store WhatsApp contact number |
| `githubLink` | `String` | Store GitHub profile URL |
| `ownerEmail` | `String` | Store owner email address |

```graphql
query {
  activeChannel {
    customFields {
      whatsappNumber
      githubLink
      ownerEmail
    }
  }
}
```

### Customer (Public)

| Field | Type | Description |
|-------|------|-------------|
| `whatsappNumber` | `String` | Customer WhatsApp number (optional) |

```graphql
query {
  activeCustomer {
    customFields {
      whatsappNumber
    }
  }
}
```

### Product

| Field | Type | Description |
|-------|------|-------------|
| `keyFeatures` | `String` | Comma-separated key features |
| `deliveryInfo` | `String` | Delivery method description |
| `productType` | `String` | Product category type |
| `fileFormat` | `String` | File format (e.g., ZIP, PDF) |
| `licenseType` | `String` | License type (e.g., MIT, Personal) |

```graphql
query GetProduct($slug: String!) {
  product(slug: $slug) {
    name
    description
    customFields {
      keyFeatures
      deliveryInfo
      productType
      fileFormat
      licenseType
    }
  }
}
```
