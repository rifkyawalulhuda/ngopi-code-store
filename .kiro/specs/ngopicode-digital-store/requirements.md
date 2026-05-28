# Requirements Document

## Introduction

NgopiCode Digital Store adalah platform e-commerce headless untuk menjual produk digital (source code, ebook, template) kepada developer Indonesia. Platform ini menggunakan Vendure (NestJS + TypeScript) sebagai backend dengan custom plugins untuk Tripay payment gateway, digital fulfillment, dan email notification. Frontend menggunakan Nuxt 3 dengan GraphQL. Sistem di-deploy self-hosted pada hardware terbatas (8GB RAM) menggunakan Dokploy.

Dokumen ini mendefinisikan requirements fungsional dan non-fungsional yang diturunkan dari design document, mencakup: integrasi payment gateway Tripay, manajemen produk digital dengan secure download, notifikasi email transaksional, dan storefront frontend.

## Glossary

- **Vendure_Backend**: Server backend e-commerce berbasis NestJS yang menyediakan Shop API dan Admin API via GraphQL
- **Tripay_Plugin**: Custom Vendure plugin yang mengintegrasikan Tripay payment gateway untuk memproses pembayaran
- **Digital_Fulfillment_Plugin**: Custom Vendure plugin yang mengelola upload, penyimpanan, dan distribusi file produk digital
- **Email_Plugin**: Custom Vendure plugin yang mengirim notifikasi email transaksional via Resend
- **Nuxt_Storefront**: Frontend aplikasi berbasis Nuxt 3 yang menampilkan katalog produk dan menangani checkout flow
- **Tripay_Gateway**: Payment gateway pihak ketiga yang menyediakan metode pembayaran lokal Indonesia (bank transfer, e-wallet, QRIS)
- **MinIO**: Object storage self-hosted yang menyimpan file produk digital dalam private bucket
- **Download_Record**: Entitas yang merepresentasikan hak akses download customer terhadap produk digital yang dibeli
- **Pre-signed_URL**: URL sementara yang memberikan akses langsung ke file di MinIO tanpa autentikasi tambahan
- **Webhook**: HTTP callback dari Tripay yang memberitahu status pembayaran
- **Order_State_Machine**: State machine Vendure yang mengatur transisi status order (AddingItems → ArrangingPayment → PaymentSettled → Fulfilled)

## Requirements

### Requirement 1: Tripay Payment Transaction Creation

**User Story:** As a customer, I want to pay for digital products using Indonesian payment methods (bank transfer, e-wallet, QRIS), so that I can complete purchases using familiar local payment options.

#### Acceptance Criteria

1. WHEN a customer selects a payment method and confirms checkout, THE Tripay_Plugin SHALL verify the order is in ArrangingPayment state with at least one line item, then create a transaction at Tripay_Gateway with the order amount, customer name, customer email, and selected payment channel code; IF the order is not in ArrangingPayment state, THEN THE Tripay_Plugin SHALL reject the checkout action entirely and return an error indicating the order is not ready for payment
2. WHEN Tripay_Gateway returns a successful transaction response, THE Tripay_Plugin SHALL store a TripayTransaction record with the Tripay reference, merchant reference (order code), payment method, amount, status UNPAID, the payment URL, and expiry time
3. WHEN Tripay_Gateway returns a successful transaction response, THE Tripay_Plugin SHALL return the payment redirect URL to the Nuxt_Storefront
4. IF Tripay_Gateway does not respond within 30 seconds, THEN THE Tripay_Plugin SHALL return an error indicating payment service unavailability without creating any transaction record
5. WHEN creating a transaction, THE Tripay_Plugin SHALL include all order line items with name, price, and quantity in the Tripay request
6. IF Tripay_Gateway returns an error response indicating transaction creation failure, THEN THE Tripay_Plugin SHALL return an error indicating the payment could not be initiated without creating any transaction record
7. IF the selected payment channel code is not in the configured list of allowed channels, THEN THE Tripay_Plugin SHALL reject the request with an error indicating invalid payment method without calling Tripay_Gateway

### Requirement 2: Tripay Webhook Processing

**User Story:** As a system operator, I want payment status updates from Tripay to be processed automatically, so that orders are fulfilled without manual intervention.

#### Acceptance Criteria

1. WHEN a webhook is received from Tripay_Gateway, THE Tripay_Plugin SHALL verify the HMAC SHA256 signature using the configured private key before processing
2. IF the webhook signature is invalid, THEN THE Tripay_Plugin SHALL reject the request with HTTP 400 and log a security warning
3. WHEN a webhook with status PAID is received and signature is valid, THE Tripay_Plugin SHALL update the TripayTransaction status to PAID, record the paid timestamp, and return HTTP 200
4. WHEN a webhook with status PAID is received and the associated order is in ArrangingPayment state, THE Tripay_Plugin SHALL transition the order from ArrangingPayment to PaymentSettled and then to Fulfilled
5. WHEN a webhook with status EXPIRED or FAILED is received, THE Tripay_Plugin SHALL update only the TripayTransaction status without modifying the order state and return HTTP 200
6. WHEN a duplicate webhook is received for a transaction that is no longer UNPAID, THE Tripay_Plugin SHALL return HTTP 200 without performing any state changes
7. IF no TripayTransaction record exists for the webhook merchant_ref, THEN THE Tripay_Plugin SHALL reject the request with HTTP 400 and log a warning
8. IF the associated order is not in ArrangingPayment state when a PAID webhook is received for an UNPAID transaction, THEN THE Tripay_Plugin SHALL update the TripayTransaction status to PAID but not attempt the order state transition, and SHALL log a warning indicating the order state mismatch

### Requirement 3: Digital Product File Management

**User Story:** As a store administrator, I want to upload and manage digital product files, so that purchased products can be delivered to customers automatically.

#### Acceptance Criteria

1. WHEN an administrator uploads a digital product file, THE Digital_Fulfillment_Plugin SHALL store the file in the MinIO private bucket using streaming upload and associate it with the specified product variant; both file storage and DigitalProduct record creation must succeed for the upload to be considered successful
2. WHEN a file is uploaded successfully, THE Digital_Fulfillment_Plugin SHALL create a DigitalProduct record with the original filename, file size, MIME type, bucket name, object key, maximum downloads per order (default 5, range 1–10), and download expiry hours (default 72, range 1–168); IF file storage succeeds but record creation fails, THEN THE Digital_Fulfillment_Plugin SHALL delete the stored file and return an error
3. IF the uploaded file's MIME type is not in the allowed list (application/zip, application/pdf, application/epub+zip), THEN THE Digital_Fulfillment_Plugin SHALL reject the upload and return an error indicating the disallowed MIME type
4. IF the uploaded file exceeds 500MB in size, THEN THE Digital_Fulfillment_Plugin SHALL reject the upload and return an error indicating the file size limit has been exceeded
5. IF a file with the same name already exists within the same bucket, THEN THE Digital_Fulfillment_Plugin SHALL reject the upload and return an error indicating a filename conflict
6. IF the MinIO storage service is unreachable or the upload fails, THEN THE Digital_Fulfillment_Plugin SHALL return an error indicating storage unavailability without creating a DigitalProduct record

### Requirement 4: Digital Download Record Creation

**User Story:** As a customer who has paid for digital products, I want download access to be created automatically after payment, so that I can access my purchases immediately.

#### Acceptance Criteria

1. WHEN an order transitions to Fulfilled state, THE Digital_Fulfillment_Plugin SHALL create a Download_Record for each line item in the order that has an associated DigitalProduct, skipping any line items without a DigitalProduct association
2. WHEN creating a Download_Record, THE Digital_Fulfillment_Plugin SHALL generate a unique UUID v4 download token and set the initial download count to 0 and the active status to true
3. WHEN creating a Download_Record, THE Digital_Fulfillment_Plugin SHALL set the expiry time to the current timestamp plus the DigitalProduct's configured downloadExpiryHours value (default 72 hours, valid range: 1 to 168 hours)
4. WHEN creating a Download_Record, THE Digital_Fulfillment_Plugin SHALL set the maximum download count based on the DigitalProduct's configured maxDownloadsPerOrder value (default 5, valid range: 1 to 10)
5. IF creation of any Download_Record fails during order fulfillment, THEN THE Digital_Fulfillment_Plugin SHALL roll back all Download_Records created for that order and report a fulfillment error

### Requirement 5: Secure Download Link Generation

**User Story:** As a customer, I want to download my purchased digital products securely, so that I can access the files I paid for while the system prevents unauthorized access.

#### Acceptance Criteria

1. WHEN a customer requests a download link using a download token, THE Digital_Fulfillment_Plugin SHALL verify that the requesting authenticated customer owns the Download_Record associated with that token
2. WHEN a customer requests a download link, THE Digital_Fulfillment_Plugin SHALL verify that the Download_Record is active, not expired, and has a current download count less than the maximum allowed downloads
3. WHEN all access validations pass, THE Digital_Fulfillment_Plugin SHALL generate a Pre-signed_URL from MinIO with a 1-hour expiry and return it along with the file name and remaining download count
4. WHEN a Pre-signed_URL is generated successfully, THE Digital_Fulfillment_Plugin SHALL atomically increment the download counter on the Download_Record by 1
5. WHEN the download counter reaches the maximum allowed downloads after incrementing, THE Digital_Fulfillment_Plugin SHALL set the Download_Record isActive field to false
6. IF the requesting customer does not own the Download_Record, THEN THE Digital_Fulfillment_Plugin SHALL reject the request with HTTP 403
7. IF the Download_Record has expired, THEN THE Digital_Fulfillment_Plugin SHALL reject the request with HTTP 410
8. IF the download limit has been reached, THEN THE Digital_Fulfillment_Plugin SHALL reject the request with HTTP 403 indicating download limit reached
9. IF the download token does not match any existing Download_Record, THEN THE Digital_Fulfillment_Plugin SHALL reject the request with HTTP 404
10. IF MinIO is unreachable or fails to generate a Pre-signed_URL, THEN THE Digital_Fulfillment_Plugin SHALL return an error indicating storage service unavailability without incrementing the download counter

### Requirement 6: Order Confirmation Email

**User Story:** As a customer, I want to receive an email confirmation after payment with download links, so that I have a record of my purchase and can access my products from email.

#### Acceptance Criteria

1. WHEN an order transitions to Fulfilled state after successful payment, THE Email_Plugin SHALL send an order confirmation email to the customer email address within 60 seconds of fulfillment
2. WHEN sending an order confirmation email, THE Email_Plugin SHALL include the order code, product names, individual prices, total amount, payment method, and the order-specific download page URL
3. IF email delivery fails, THEN THE Email_Plugin SHALL retry delivery up to 3 times with a 30-second interval between attempts
4. IF all 3 retry attempts fail, THEN THE Email_Plugin SHALL log the failure with the order code and customer email, and the order SHALL remain in Fulfilled state without rollback

### Requirement 7: Product Catalog Display

**User Story:** As a visitor, I want to browse digital products with categories and search, so that I can find relevant source code, ebooks, or templates for my development needs.

#### Acceptance Criteria

1. WHEN a visitor accesses the product catalog page, THE Nuxt_Storefront SHALL fetch and display products from the Vendure_Backend Shop API using server-side rendering with a default page size of 12 products
2. WHEN displaying products, THE Nuxt_Storefront SHALL show product name, description (truncated to 150 characters), price in IDR currency format, and preview image for each item; the system MAY display a subset of these fields depending on layout context while ensuring at minimum the product name and price are always shown
3. WHEN a visitor filters by category, THE Nuxt_Storefront SHALL display only products belonging to the selected category and reset pagination to the first page
4. WHEN a visitor enters a search query of at least 2 characters, THE Nuxt_Storefront SHALL return products whose name or description contains the search term and reset pagination to the first page
5. WHEN displaying product listings, THE Nuxt_Storefront SHALL support pagination with a default page size of 12 and a maximum page size of 48
6. IF a category filter or search query returns no products, THEN THE Nuxt_Storefront SHALL display an empty state message indicating no products were found
7. WHEN a visitor navigates between pages, THE Nuxt_Storefront SHALL update the displayed products to reflect the requested page while preserving the active category filter and search query

### Requirement 8: Checkout Flow

**User Story:** As a customer, I want a streamlined checkout process, so that I can purchase digital products quickly and be redirected to my preferred payment method.

#### Acceptance Criteria

1. WHEN a customer adds a product to cart, THE Nuxt_Storefront SHALL create or update the active order via the Vendure_Backend Shop API with the customer-specified quantity (minimum 1)
2. IF the customer is not authenticated, THEN WHEN the customer proceeds to checkout, THE Nuxt_Storefront SHALL collect and validate customer email (valid email format, maximum 254 characters) and name (1 to 100 characters) before allowing payment selection
3. WHEN a customer proceeds to checkout, THE Nuxt_Storefront SHALL display the available payment methods retrieved from the Vendure_Backend
4. WHEN a customer selects a payment method and confirms, THE Nuxt_Storefront SHALL request a payment redirect URL from the Vendure_Backend
5. IF the Vendure_Backend returns an error instead of a payment redirect URL, THEN THE Nuxt_Storefront SHALL display an error message indicating payment initiation failed and allow the customer to retry or select a different payment method
6. WHEN a payment redirect URL is received, THE Nuxt_Storefront SHALL redirect the customer to the Tripay_Gateway payment page within 3 seconds
7. WHEN a customer returns from payment with a successful status, THE Nuxt_Storefront SHALL display the order confirmation page with download links
8. WHEN a customer returns from payment with a failed or expired status, THE Nuxt_Storefront SHALL display a message indicating payment was not completed and provide an option to retry checkout

### Requirement 9: Download Page

**User Story:** As a customer who has completed payment, I want a dedicated download page, so that I can access all my purchased files with remaining download information.

#### Acceptance Criteria

1. WHEN a customer accesses the download page with a valid order code, THE Nuxt_Storefront SHALL fetch and display all downloadable items for that order, showing items within 3 seconds of page load
2. WHEN displaying download items, THE Nuxt_Storefront SHALL show the file name, remaining download count (e.g., "3 of 5 remaining"), and expiry date with a visual indicator distinguishing active items from expired items for each Download_Record; file names SHALL always be displayed regardless of item status (active or expired)
3. WHEN a customer clicks download on an active item with remaining downloads, THE Nuxt_Storefront SHALL request a secure download link from the Vendure_Backend and redirect to the Pre-signed_URL; IF the redirect fails or is blocked by the browser, THEN THE Nuxt_Storefront SHALL display a user-friendly error message with a fallback option to copy the download link manually
4. IF the order code does not correspond to an existing fulfilled order, THEN THE Nuxt_Storefront SHALL display an error message indicating the order was not found without revealing whether the code exists in the system
5. IF the Vendure_Backend returns an error when requesting a download link (expired, download limit reached, or unauthorized), THEN THE Nuxt_Storefront SHALL display an error message indicating the specific reason the download is unavailable and keep the customer on the download page
6. WHEN a download item has reached its maximum download count or has passed its expiry date, THE Nuxt_Storefront SHALL disable the download action for that item and display the reason it is unavailable

### Requirement 10: Order State Machine Integrity

**User Story:** As a system operator, I want order state transitions to follow a strict sequence, so that orders cannot reach invalid states and payment integrity is maintained.

#### Acceptance Criteria

1. THE Order_State_Machine SHALL only allow sequential forward transitions: AddingItems → ArrangingPayment → PaymentSettled → Fulfilled, where each transition moves exactly one step forward in the sequence
2. IF an attempt is made to transition an order backward to a previous state or to skip one or more intermediate states, THEN THE Order_State_Machine SHALL reject the transition by returning an error indicating the invalid state transition and leaving the order in its current state unchanged
3. IF an order attempts to transition to Fulfilled state and no corresponding TripayTransaction with status PAID and an amount exactly equal to the order total exists, THEN THE Vendure_Backend SHALL block the transition and return an error indicating payment verification failure; zero-value orders (free samples or promotional items) SHALL be allowed to transition to Fulfilled without a PAID TripayTransaction

### Requirement 11: Webhook Signature Verification

**User Story:** As a system operator, I want webhook requests to be cryptographically verified, so that the system is protected against forged payment notifications.

#### Acceptance Criteria

1. WHEN verifying a webhook signature, THE Tripay_Plugin SHALL compute HMAC SHA256 of the JSON-encoded request body using the configured private key and produce a hex-encoded digest
2. WHEN comparing the computed signature against the provided signature header, THE Tripay_Plugin SHALL use constant-time comparison to prevent timing attacks
3. IF a webhook request does not include a signature header, THEN THE Tripay_Plugin SHALL immediately reject the request with HTTP 400 without computing the HMAC digest or processing the payload
4. IF a webhook request includes a signature header that does not match the computed HMAC SHA256 digest, THEN THE Tripay_Plugin SHALL reject the request with HTTP 400 and log a security warning
5. WHEN a webhook signature verification succeeds, THE Tripay_Plugin SHALL proceed to process the webhook payload

### Requirement 12: Resource-Efficient Deployment

**User Story:** As a system operator deploying on limited hardware (8GB RAM), I want the system to operate within resource constraints, so that all services run reliably on the available hardware.

#### Acceptance Criteria

1. THE Vendure_Backend SHALL not exceed 900MB of resident memory (RSS) during normal operation including handling up to 10 concurrent requests, with 1GB as the absolute rejection threshold
2. THE Vendure_Backend SHALL limit the database connection pool to 10 connections
3. WHEN uploading files, THE Digital_Fulfillment_Plugin SHALL use streaming upload to MinIO with a maximum in-memory buffer size of 8MB per upload operation
4. THE Vendure_Backend SHALL disable the background worker process and execute jobs inline in MVP
5. IF the Vendure_Backend memory usage exceeds 1GB, THEN THE Vendure_Backend SHALL reject new incoming requests with an error indicating service overload until memory usage returns below the limit

### Requirement 13: Security Controls

**User Story:** As a system operator, I want comprehensive security controls, so that customer data and digital products are protected from unauthorized access.

#### Acceptance Criteria

1. THE Digital_Fulfillment_Plugin SHALL store all product files in MinIO private buckets accessible only via Pre-signed_URL
2. THE Vendure_Backend SHALL enforce rate limiting of 10 download requests per sliding 60-second window per authenticated customer
3. IF a customer exceeds the rate limit of 10 download requests per minute, THEN THE Vendure_Backend SHALL reject subsequent requests with HTTP 429 and include a response header indicating the number of seconds until the next request is allowed
4. THE Digital_Fulfillment_Plugin SHALL generate download tokens using UUID v4 providing 122 bits of entropy
5. THE Nuxt_Storefront SHALL enforce HTTPS for all communications via Cloudflare Tunnel
6. THE Vendure_Backend SHALL use parameterized queries for all database operations to prevent SQL injection
