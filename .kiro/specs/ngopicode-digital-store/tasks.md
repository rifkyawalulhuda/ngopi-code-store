# Implementation Plan: NgopiCode Digital Store

## Overview

Implementasi platform e-commerce headless untuk produk digital menggunakan Vendure (NestJS + TypeScript) sebagai backend dengan custom plugins (Tripay payment, digital fulfillment, email notification) dan Nuxt 3 sebagai frontend. Deployment self-hosted pada hardware terbatas (8GB RAM) menggunakan Dokploy.

Pendekatan implementasi: setup project structure → backend plugins (Tripay, Digital Fulfillment, Email) → frontend storefront → integration & wiring.

## Tasks

- [x] 1. Set up project structure and core configuration
  - [x] 1.1 Initialize Vendure project with TypeScript configuration
    - Create Vendure project with `@vendure/create`
    - Configure TypeScript strict mode, path aliases
    - Set up PostgreSQL connection with pool size limited to 10 connections
    - Configure Vendure worker to run inline (disabled background worker for MVP)
    - Set memory limits (900MB normal, 1GB rejection threshold)
    - _Requirements: 12.1, 12.2, 12.4, 12.5_

  - [x] 1.2 Set up MinIO client configuration and connection
    - Install and configure `minio` npm package
    - Create MinIO client singleton with private bucket configuration
    - Set up bucket initialization (create `products` bucket if not exists)
    - _Requirements: 3.1, 13.1_

  - [x] 1.3 Create shared TypeScript interfaces and types
    - Define `TripayPluginOptions`, `TripayChannel`, `TripayCreateTransactionInput`, `TripayCreateTransactionResponse`, `TripayWebhookPayload` interfaces
    - Define `DigitalProductInput`, `DigitalDownloadRecord`, `DownloadLinkResponse` interfaces
    - Define `EmailPluginOptions`, `OrderConfirmationEmailData` interfaces
    - _Requirements: 1.1, 3.1, 6.2_

- [x] 2. Implement Tripay Payment Plugin
  - [x] 2.1 Create TripayTransaction entity and database migration
    - Implement `TripayTransaction` entity with TypeORM decorators
    - Add indexes on `orderId`, `merchantRef` (unique), `tripayReference`
    - Create database migration for the entity
    - _Requirements: 1.2_

  - [x] 2.2 Implement Tripay API service for transaction creation
    - Create `TripayService` with `createTransaction()` method
    - Implement 30-second timeout for Tripay API calls
    - Validate payment channel code against allowed channels list
    - Include all order line items (name, price, quantity) in request payload
    - Handle error responses from Tripay (timeout, API errors)
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7_

  - [x] 2.3 Implement Tripay payment handler integration with Vendure
    - Create custom `PaymentMethodHandler` for Vendure
    - Implement `createPayment()` that validates order state (ArrangingPayment with items)
    - Store TripayTransaction record on successful response
    - Return payment redirect URL to frontend
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.4 Write property test for Tripay transaction payload completeness
    - **Property 10: Tripay Transaction Payload Completeness**
    - Generate random orders with varying line items, verify payload always contains correct total, customer details, channel, and all items with name/price/quantity
    - **Validates: Requirements 1.1, 1.5**

  - [x] 2.5 Implement webhook signature verification
    - Implement `verifyTripaySignature()` using HMAC SHA256
    - Use constant-time comparison (`crypto.timingSafeEqual`)
    - Reject requests without signature header (HTTP 400)
    - Log security warning on invalid signatures
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 2.6 Write property test for webhook signature round-trip
    - **Property 5: Webhook Signature Round-Trip**
    - For any random payload and key, verify(sign(payload, key), payload, key) === true; verify with different payload/key === false
    - **Validates: Requirements 2.1, 2.2, 11.1, 11.3**

  - [x] 2.7 Implement webhook controller and processing logic
    - Create `TripayWebhookController` with POST endpoint at `/payments/tripay/webhook`
    - Process PAID webhooks: update transaction → transition order to PaymentSettled → Fulfilled
    - Process EXPIRED/FAILED webhooks: update transaction status only
    - Handle duplicate webhooks (idempotency: return 200 if not UNPAID)
    - Handle missing transaction records (HTTP 400 + log warning)
    - Handle order state mismatch (update transaction, log warning, skip order transition)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 2.8 Write property test for webhook idempotency
    - **Property 4: Webhook Idempotency**
    - Process same webhook payload twice, verify second invocation is a no-op (no duplicate fulfillments)
    - **Validates: Requirements 2.6**

  - [x] 2.9 Write property test for non-PAID webhook isolation
    - **Property 8: Non-PAID Webhook Does Not Trigger Fulfillment**
    - For any EXPIRED/FAILED webhook, verify only transaction status changes, order state unchanged, no Download_Records created
    - **Validates: Requirements 2.5**

- [x] 3. Checkpoint - Tripay plugin tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Digital Fulfillment Plugin
  - [x] 4.1 Create DigitalProduct entity and database migration
    - Implement `DigitalProduct` entity with TypeORM decorators
    - Add relation to `ProductVariant`
    - Add validation constraints (maxDownloadsPerOrder: 1-10, downloadExpiryHours: 1-168)
    - Create database migration
    - _Requirements: 3.2_

  - [x] 4.2 Create DigitalDownload entity and database migration
    - Implement `DigitalDownload` entity with TypeORM decorators
    - Add indexes on `orderId`, `downloadToken` (unique)
    - Add validation constraints (currentDownloads <= maxDownloads)
    - Create database migration
    - _Requirements: 4.2, 4.3, 4.4_

  - [x] 4.3 Implement file upload service with streaming and validation
    - Create `DigitalFulfillmentService.uploadProductFile()` method
    - Implement streaming upload to MinIO (max 8MB in-memory buffer)
    - Validate MIME type (allow only: application/zip, application/pdf, application/epub+zip)
    - Validate file size (max 500MB)
    - Check filename uniqueness within bucket
    - Implement rollback: delete stored file if DigitalProduct record creation fails
    - Handle MinIO unreachable errors
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 12.3_

  - [x] 4.4 Write property test for MIME type validation
    - **Property 11: MIME Type Validation**
    - For any MIME type string, verify acceptance if and only if it's in the allowed list
    - **Validates: Requirements 3.3**

  - [x] 4.5 Implement download record creation on order fulfillment
    - Listen to Vendure order state transition event (→ Fulfilled)
    - Create DigitalDownload records for each line item with associated DigitalProduct
    - Skip line items without DigitalProduct association
    - Generate UUID v4 download tokens
    - Set expiry based on DigitalProduct.downloadExpiryHours
    - Set maxDownloads based on DigitalProduct.maxDownloadsPerOrder
    - Implement rollback on partial failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.6 Write property test for download record creation correctness
    - **Property 9: Download Record Creation Correctness**
    - For any fulfilled order with N digital items, verify exactly N records created with unique UUID v4 tokens, correct expiry, and correct maxDownloads
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 13.3**

  - [x] 4.7 Implement secure download link generation
    - Create `generateDownloadLink()` method
    - Validate customer ownership (HTTP 403 if not owner)
    - Validate record is active, not expired (HTTP 410), not at limit (HTTP 403)
    - Validate token exists (HTTP 404)
    - Generate MinIO pre-signed URL with 1-hour expiry
    - Atomically increment download counter
    - Deactivate record when limit reached
    - Handle MinIO unreachable (no counter increment)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

  - [x] 4.8 Write property test for download access control
    - **Property 2: Download Access Control**
    - For any download token and customer ID, verify access granted iff customerId matches, record active, not expired, and count < max
    - **Validates: Requirements 5.1, 5.2, 5.6, 5.7, 5.8**

  - [x] 4.9 Write property test for download counter monotonicity
    - **Property 3: Download Counter Monotonicity and Deactivation**
    - For any sequence of download operations, verify counter is monotonically non-decreasing, never exceeds max, and record deactivates at max
    - **Validates: Requirements 5.4, 5.5**

  - [x] 4.10 Implement rate limiting for download requests
    - Add sliding window rate limiter (10 requests per 60 seconds per customer)
    - Return HTTP 429 with Retry-After header when limit exceeded
    - _Requirements: 13.2, 13.3_

  - [x] 4.11 Write property test for rate limiting
    - **Property 15: Rate Limiting**
    - For any customer, verify at most 10 requests allowed per minute, 11th request rejected
    - **Validates: Requirements 13.2**

- [x] 5. Checkpoint - Digital fulfillment plugin tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Order State Machine and Payment Integrity
  - [x] 6.1 Configure Vendure order state machine with custom transitions
    - Define custom order process with forward-only transitions: AddingItems → ArrangingPayment → PaymentSettled → Fulfilled
    - Reject backward transitions and state skipping
    - Add payment verification guard on Fulfilled transition (require PAID TripayTransaction with matching amount, except zero-value orders)
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 6.2 Write property test for order state machine forward-only transitions
    - **Property 6: Order State Machine Forward-Only Transitions**
    - For any order state, verify only forward transitions permitted, backward transitions rejected
    - **Validates: Requirements 10.1, 10.2**

  - [x] 6.3 Write property test for payment integrity
    - **Property 1: Payment Integrity**
    - For any fulfilled order with total > 0, verify a PAID TripayTransaction with matching amount exists; zero-value orders allowed without
    - **Validates: Requirements 10.3**

  - [x] 6.4 Write property test for PAID webhook triggers full fulfillment
    - **Property 7: PAID Webhook Triggers Full Fulfillment**
    - For any valid PAID webhook on UNPAID transaction, verify transaction → PAID, order → Fulfilled, Download_Records created for all digital items
    - **Validates: Requirements 2.3, 2.4, 4.1**

- [x] 7. Implement Email Plugin
  - [x] 7.1 Create email plugin with Resend integration
    - Set up Email plugin with Resend API client
    - Create `sendOrderConfirmation()` method
    - Include order code, product names, prices, total, payment method, download page URL in email data
    - Implement retry mechanism (3 retries, 30-second intervals)
    - Log failure with order code and customer email after all retries exhausted
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.2 Write property test for email content completeness
    - **Property 12: Email Content Completeness**
    - For any fulfilled order, verify email data contains order code, all product names, all prices, total, payment method, and download page URL
    - **Validates: Requirements 6.2**

  - [x] 7.3 Create email template for order confirmation
    - Design responsive HTML email template
    - Include order details, product list with prices, total amount, payment method
    - Include download page URL (not individual file URLs)
    - _Requirements: 6.2_

- [x] 8. Checkpoint - All backend plugins tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Nuxt 3 Storefront - Product Catalog
  - [x] 9.1 Initialize Nuxt 3 project with GraphQL client
    - Create Nuxt 3 project with TypeScript
    - Configure Apollo/GraphQL client to connect to Vendure Shop API
    - Set up Pinia for state management
    - Configure SSR for product pages
    - _Requirements: 7.1_

  - [x] 9.2 Implement product catalog page with SSR
    - Create product listing page with server-side rendering
    - Fetch products from Vendure Shop API (default page size: 12)
    - Display product name, description (truncated 150 chars), price (IDR format), preview image
    - Implement pagination (default 12, max 48)
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 9.3 Implement category filter and search functionality
    - Add category filter that shows only products in selected category
    - Add search input (minimum 2 characters) filtering by name/description
    - Reset pagination to first page on filter/search change
    - Display empty state message when no products found
    - Preserve filters when navigating between pages
    - _Requirements: 7.3, 7.4, 7.6, 7.7_

  - [x] 9.4 Write property test for category filter correctness
    - **Property 13: Category Filter Correctness**
    - For any category filter, verify all returned products belong to selected category, no products from other categories included
    - **Validates: Requirements 7.3**

  - [x] 9.5 Write property test for pagination correctness
    - **Property 14: Pagination Correctness**
    - For any total count T and page size M, verify page P returns at most M items at correct offset, last page has correct remainder
    - **Validates: Requirements 7.5**

- [x] 10. Implement Nuxt 3 Storefront - Checkout Flow
  - [x] 10.1 Implement shopping cart functionality
    - Create `useCart` composable
    - Implement add to cart (create/update active order via Shop API)
    - Handle customer-specified quantity (minimum 1)
    - Display cart summary
    - _Requirements: 8.1_

  - [x] 10.2 Implement checkout page with guest checkout support
    - Create checkout page
    - Collect and validate customer email (valid format, max 254 chars) and name (1-100 chars) for unauthenticated users
    - Display available payment methods from Vendure backend
    - _Requirements: 8.2, 8.3_

  - [x] 10.3 Implement payment initiation and redirect
    - Create `useCheckout` composable with `createPayment()` method
    - Request payment redirect URL from Vendure backend
    - Redirect to Tripay payment page within 3 seconds on success
    - Display error message on failure with retry/change method options
    - _Requirements: 8.4, 8.5, 8.6_

  - [x] 10.4 Implement payment return handling
    - Create order confirmation page for successful payment return
    - Display download links on success
    - Display failure message with retry option for failed/expired payments
    - _Requirements: 8.7, 8.8_

- [x] 11. Implement Nuxt 3 Storefront - Download Page
  - [x] 11.1 Implement download page with order lookup
    - Create download page accessible by order code
    - Fetch downloadable items from Vendure backend (within 3 seconds)
    - Display file name, remaining download count (e.g., "3 of 5 remaining"), expiry date
    - Visual indicator distinguishing active vs expired items
    - Display error for invalid/non-existent order codes (without revealing existence)
    - _Requirements: 9.1, 9.2, 9.4_

  - [x] 11.2 Implement download action and error handling
    - Request secure download link from backend on click
    - Redirect to pre-signed URL
    - Provide fallback option to copy link manually if redirect fails
    - Display specific error messages (expired, limit reached, unauthorized)
    - Disable download action for maxed-out or expired items with reason
    - _Requirements: 9.3, 9.5, 9.6_

- [x] 12. Checkpoint - Frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Integration wiring and security hardening
  - [x] 13.1 Wire Tripay plugin with Digital Fulfillment plugin for end-to-end flow
    - Ensure webhook processing triggers download record creation
    - Ensure webhook processing triggers email notification
    - Verify full flow: payment → order transition → fulfillment → email
    - _Requirements: 2.3, 2.4, 4.1, 6.1_

  - [x] 13.2 Configure security controls
    - Verify MinIO private bucket configuration (no public access)
    - Ensure UUID v4 token generation (122 bits entropy)
    - Verify parameterized queries (TypeORM default)
    - Configure HTTPS enforcement via Cloudflare Tunnel
    - _Requirements: 13.1, 13.4, 13.5, 13.6_

  - [x] 13.3 Create Dokploy deployment configuration
    - Create Docker Compose / Dokploy configuration for all services
    - Set memory limits per container (Vendure: 1GB, PostgreSQL: 1GB, MinIO: 512MB)
    - Configure environment variables for all services
    - Set up Cloudflare Tunnel for HTTPS
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 13.4 Write integration tests for end-to-end payment flow
    - Test full flow: create order → checkout → simulate webhook → verify fulfillment → verify download access
    - Test error scenarios: timeout, invalid signature, duplicate webhook
    - _Requirements: 1.1, 2.1, 2.3, 4.1, 5.3_

- [x] 14. Final checkpoint - All tests pass and system is deployment-ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout (Vendure/NestJS backend + Nuxt 3 frontend)
- Testing framework: Jest for backend, Vitest for frontend, fast-check for property-based tests
- Frontend is deployed on Vercel (separate from self-hosted backend) to reduce server load

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "4.1", "4.2", "9.1"] },
    { "id": 2, "tasks": ["2.2", "2.5", "4.3", "6.1"] },
    { "id": 3, "tasks": ["2.3", "2.4", "4.4", "4.5", "6.2", "6.3"] },
    { "id": 4, "tasks": ["2.6", "2.7", "4.6", "4.7", "7.1"] },
    { "id": 5, "tasks": ["2.8", "2.9", "4.8", "4.9", "4.10", "6.4", "7.2", "7.3"] },
    { "id": 6, "tasks": ["4.11", "9.2", "9.3"] },
    { "id": 7, "tasks": ["9.4", "9.5", "10.1"] },
    { "id": 8, "tasks": ["10.2", "10.3"] },
    { "id": 9, "tasks": ["10.4", "11.1"] },
    { "id": 10, "tasks": ["11.2"] },
    { "id": 11, "tasks": ["13.1", "13.2", "13.3"] },
    { "id": 12, "tasks": ["13.4"] }
  ]
}
```
