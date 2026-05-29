# NgopiCode Digital Store — Project Context for AI Agents

## Project Overview

NgopiCode Digital Store adalah platform e-commerce headless untuk menjual produk digital (source code, ebook, template) kepada developer Indonesia. Dibangun dengan pendekatan headless commerce menggunakan Vendure (NestJS + TypeScript) sebagai backend dan Nuxt 3 sebagai frontend. Deployment self-hosted pada hardware terbatas (8GB RAM) menggunakan Dokploy.

**Status:** Implementasi selesai (59/59 tasks completed), 416 tests passing.

---

## Tech Stack

| Layer | Teknologi | Keterangan |
|-------|-----------|------------|
| Backend | Vendure (NestJS + TypeScript) | Headless commerce, GraphQL API |
| Frontend | Nuxt 3 (Vue 3 + TypeScript) | SSR, Apollo GraphQL client |
| Database | PostgreSQL 16 | Pool size 10, TypeORM |
| File Storage | MinIO | S3-compatible, private bucket |
| Payment | Tripay (custom plugin) | Bank transfer, e-wallet, QRIS |
| Email | Resend | Transactional emails |
| Testing (Backend) | Jest + fast-check | Unit + property-based tests |
| Testing (Frontend) | Vitest + fast-check | Unit + property-based tests |
| Deployment | Docker Compose + Dokploy | Self-hosted, Cloudflare Tunnel |

---

## Project Structure

```
ngopi-code-store/
├── backend/                          # Vendure Backend (NestJS)
│   ├── src/
│   │   ├── config/
│   │   │   ├── custom-order-process.ts       # Order state machine (forward-only)
│   │   │   ├── custom-order-process.spec.ts
│   │   │   ├── custom-order-process.pbt.spec.ts
│   │   │   ├── paid-webhook-fulfillment.pbt.spec.ts
│   │   │   ├── security.ts                   # Security controls config
│   │   │   └── security.spec.ts
│   │   ├── middleware/
│   │   │   ├── memory-guard.middleware.ts     # 1GB rejection threshold
│   │   │   ├── memory-guard.middleware.spec.ts
│   │   │   ├── health-check.middleware.ts     # GET /health endpoint
│   │   │   ├── download-rate-limiter.middleware.ts  # 10 req/60s per customer
│   │   │   ├── download-rate-limiter.middleware.spec.ts
│   │   │   └── download-rate-limiter.pbt.spec.ts
│   │   ├── migrations/
│   │   │   ├── 1717000000000-CreateDigitalProduct.ts
│   │   │   ├── 1719000000000-CreateTripayTransaction.ts
│   │   │   └── 1719000001000-CreateDigitalDownload.ts
│   │   ├── plugins/
│   │   │   ├── tripay-payment/
│   │   │   │   ├── controllers/
│   │   │   │   │   ├── tripay-webhook.controller.ts
│   │   │   │   │   ├── tripay-webhook.controller.pbt.spec.ts  # Idempotency
│   │   │   │   │   └── tripay-webhook.pbt.spec.ts             # Non-PAID isolation
│   │   │   │   ├── entities/
│   │   │   │   │   └── tripay-transaction.entity.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── tripay.service.ts
│   │   │   │   └── utils/
│   │   │   │       └── verify-signature.ts   # HMAC SHA256 constant-time
│   │   │   ├── digital-fulfillment/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── digital-product.entity.ts
│   │   │   │   │   └── digital-download.entity.ts
│   │   │   │   └── services/
│   │   │   │       ├── digital-fulfillment.service.ts
│   │   │   │       ├── order-fulfillment.service.ts  # End-to-end wiring
│   │   │   │       ├── download-access-control.pbt.spec.ts
│   │   │   │       └── digital-download-counter.pbt.spec.ts
│   │   │   ├── email/
│   │   │   │   ├── services/
│   │   │   │   │   ├── email.service.ts
│   │   │   │   │   └── email.service.pbt.spec.ts
│   │   │   │   └── templates/
│   │   │   │       ├── order-confirmation.template.ts
│   │   │   │       └── order-confirmation.template.spec.ts
│   │   │   └── integration/
│   │   │       └── end-to-end-fulfillment.spec.ts
│   │   ├── shared/types/
│   │   │   ├── tripay.types.ts
│   │   │   ├── digital-fulfillment.types.ts
│   │   │   ├── email.types.ts
│   │   │   └── index.ts
│   │   ├── index.ts
│   │   └── vendure-config.ts
│   ├── Dockerfile                    # Multi-stage, 900MB heap limit
│   ├── .env.example
│   ├── jest.config.js
│   ├── tsconfig.json
│   └── package.json
├── frontend/                         # Nuxt 3 Storefront
│   ├── composables/
│   │   ├── useShop.ts               # Product fetching
│   │   ├── useProductFilters.ts     # Category/search/pagination
│   │   ├── useCart.ts               # Shopping cart (Vendure active order)
│   │   ├── useCheckout.ts           # Payment initiation + validation
│   │   ├── useOrderConfirmation.ts  # Payment return handling
│   │   └── useDownload.ts           # Download page + link requests
│   ├── graphql/
│   │   ├── queries/
│   │   │   ├── order.ts             # GET_ACTIVE_ORDER, GET_ORDER_BY_CODE
│   │   │   ├── collections.ts       # GET_COLLECTIONS
│   │   │   ├── checkout.ts          # GET_ELIGIBLE_PAYMENT_METHODS
│   │   │   └── downloads.ts         # GET_ORDER_DOWNLOADS
│   │   └── mutations/
│   │       ├── order.ts             # ADD_ITEM, ADJUST_LINE, REMOVE_LINE, ADD_PAYMENT
│   │       └── downloads.ts         # REQUEST_DOWNLOAD_LINK
│   ├── pages/
│   │   ├── index.vue
│   │   ├── products/index.vue       # Product catalog with SSR
│   │   ├── checkout.vue             # Guest checkout + payment methods
│   │   ├── order/[code].vue         # Payment return confirmation
│   │   └── downloads/[orderCode].vue # Download page
│   ├── stores/
│   │   └── cart.ts                  # Pinia cart store
│   ├── utils/
│   │   ├── format.ts               # formatPriceIDR, truncateDescription
│   │   └── pagination.ts           # clampPageSize, computeSkip, computeTotalPages
│   ├── nuxt.config.ts
│   ├── vitest.config.ts
│   └── package.json
├── deploy/
│   ├── cloudflare/config.yml        # Tunnel routing config
│   └── postgres/postgresql.conf     # Optimized for 1GB container
├── docker-compose.yml               # All services with memory limits
├── dokploy.yml                      # Dokploy deployment metadata
├── .env.example                     # All required env vars
└── docs/
    ├── Technical-Architecture.md
    └── context-project.md           # This file
```

---

## Architecture Overview

```
Client (Browser) → Cloudflare Tunnel (HTTPS) → Nuxt 3 (Vercel)
                                              → Vendure Backend (Docker)
                                                  ├── Tripay Payment Plugin
                                                  ├── Digital Fulfillment Plugin
                                                  └── Email Plugin (Resend)
                                              → PostgreSQL (Docker, 1GB)
                                              → MinIO (Docker, 512MB)
```

---

## Core Business Flows

### 1. Purchase Flow
```
Browse Products → Add to Cart → Checkout (guest email/name) → Select Payment Method
→ Redirect to Tripay → Customer pays → Tripay sends PAID webhook
→ Order → PaymentSettled → Fulfilled → Download records created → Email sent
```

### 2. Download Flow
```
Customer visits /downloads/{orderCode} → Sees file list with remaining counts
→ Clicks Download → Backend validates (ownership, active, not expired, under limit)
→ Generates MinIO pre-signed URL (1h expiry) → Increments counter → Redirect to URL
```

### 3. Webhook Processing
```
Tripay POST /payments/tripay/webhook → Verify HMAC SHA256 signature
→ Find transaction by merchant_ref → Check idempotency (skip if not UNPAID)
→ PAID: update transaction + transition order + create downloads + send email
→ EXPIRED/FAILED: update transaction status only
```

---

## Key Design Decisions

1. **Forward-only order state machine**: AddingItems → ArrangingPayment → PaymentSettled → Fulfilled. No backward transitions.
2. **Idempotent webhooks**: Duplicate PAID webhooks are no-ops (check transaction status before processing).
3. **Email failure doesn't rollback**: If email fails after fulfillment, order stays Fulfilled. Email retries 3x.
4. **Download record rollback**: If creating download records fails partially, all records for that order are rolled back.
5. **Rate limiting**: 10 download requests per 60-second sliding window per customer (in-memory).
6. **Security**: MinIO private bucket, UUID v4 tokens (122-bit entropy), pre-signed URLs (1h), HMAC SHA256 constant-time comparison.
7. **Memory constraints**: Vendure 900MB heap / 1GB rejection, PostgreSQL 1GB, MinIO 512MB. Total ~2.6GB on 8GB hardware.
8. **Frontend on Vercel**: Reduces server load. Backend self-hosted via Dokploy.

---

## Data Models

### TripayTransaction
- `orderId`, `merchantRef` (unique), `tripayReference`, `paymentMethod`
- `amount`, `feeMerchant`, `feeCustomer`, `status` (UNPAID|PAID|EXPIRED|FAILED)
- `paymentUrl`, `expiredAt`, `paidAt`

### DigitalProduct
- `productVariantId`, `fileName`, `originalFileName`, `fileSize`, `mimeType`
- `bucket`, `objectKey`, `maxDownloadsPerOrder` (1-10), `downloadExpiryHours` (1-168)

### DigitalDownload
- `orderId`, `customerId`, `productVariantId`, `downloadToken` (UUID v4, unique)
- `maxDownloads`, `currentDownloads`, `expiresAt`, `lastDownloadedAt`, `isActive`

---

## Testing Strategy

- **Property-based tests** (fast-check): Verify universal correctness properties
- **Unit tests**: Specific examples and edge cases
- **Integration tests**: End-to-end flow verification with mocks

### Key Properties Tested
1. Payment Integrity (fulfilled order must have matching PAID transaction)
2. Download Access Control (access iff owner + active + not expired + under limit)
3. Download Counter Monotonicity (never decreases, never exceeds max, deactivates at max)
4. Webhook Idempotency (same webhook twice = no duplicate side effects)
5. Webhook Signature Round-Trip (sign then verify = true)
6. Order State Machine Forward-Only (no backward transitions)
7. PAID Webhook Full Fulfillment (transaction PAID + order Fulfilled + downloads created)
8. Non-PAID Webhook Isolation (only transaction status changes)
9. Rate Limiting (max 10 per minute per customer)
10. Category Filter Correctness (only matching products returned)
11. Pagination Correctness (correct offset, remainder on last page)

---

## Commands

### Backend
```bash
cd backend
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm test             # Run all Jest tests (23 suites, 243 tests)
npm run migration:run  # Run database migrations
```

### Frontend
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npx vitest run       # Run all Vitest tests (10 suites, 173 tests)
```

### Deployment
```bash
docker compose up -d          # Start all services
docker compose logs vendure   # View backend logs
docker compose down           # Stop all services
```

---

## Environment Variables (Key)

| Variable | Service | Purpose |
|----------|---------|---------|
| `DB_PASSWORD` | PostgreSQL | Database password |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | MinIO | Object storage credentials |
| `TRIPAY_API_KEY` / `TRIPAY_PRIVATE_KEY` | Tripay | Payment gateway auth |
| `TRIPAY_MERCHANT_CODE` | Tripay | Merchant identifier |
| `RESEND_API_KEY` | Email | Email delivery |
| `CLOUDFLARE_TUNNEL_TOKEN` | Cloudflare | HTTPS tunnel |
| `STOREFRONT_URL` | Email/Downloads | Frontend URL for links |
| `COOKIE_SECRET` | Vendure | Session encryption |

---

## Conventions

- **Language**: TypeScript throughout (strict mode)
- **Backend test files**: `*.spec.ts` (unit), `*.pbt.spec.ts` (property-based)
- **Frontend test files**: `*.test.ts` (unit), `*.pbt.spec.ts` (property-based)
- **Path aliases**: `@shared/`, `@plugins/` (backend), `~/` (frontend/Nuxt)
- **Currency**: IDR (Indonesian Rupiah), stored in minor units (cents)
- **Locale**: Indonesian (id-ID) for dates and currency formatting
- **API**: GraphQL (Vendure Shop API + Admin API)
- **State management**: Pinia (frontend)
- **CSS**: Scoped styles in Vue SFC (no CSS framework)
