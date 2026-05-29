# NgopiCode Digital Store — Project Context for AI Agents

## Project Overview

NgopiCode Digital Store adalah platform e-commerce headless untuk menjual produk digital (source code, ebook, template) kepada developer Indonesia. Dibangun dengan pendekatan headless commerce menggunakan Vendure (NestJS + TypeScript) sebagai backend dan Nuxt 3 sebagai frontend. Deployment self-hosted pada hardware terbatas (8GB RAM) menggunakan Dokploy.

**Status:** Core implementation complete; now in local-development / refinement phase. Recent work: IDR zero-decimal pricing, light/dark theming, redesigned storefront homepage, Admin UI enabled, Tripay credentials moved to Admin UI.

**Known pending work:**
- Wire the Tripay webhook as an HTTP endpoint (`/payments/tripay/webhook`). The controller logic exists (`tripay-webhook.controller.ts`) but is not yet exposed as a NestJS route, so end-to-end payment confirmation is not live.

---

## Tech Stack

| Layer | Teknologi | Keterangan |
|-------|-----------|------------|
| Backend | Vendure (NestJS + TypeScript) | Headless commerce, GraphQL API |
| Frontend | Nuxt 3 (Vue 3 + TypeScript) | SSR, Apollo GraphQL client |
| Database | PostgreSQL 16 | Pool size 10, TypeORM |
| File Storage | MinIO | S3-compatible, private bucket |
| Payment | Tripay (custom plugin) | Bank transfer, e-wallet, QRIS. Credentials managed via Admin UI |
| Email | Resend | Transactional emails |
| Admin UI | @vendure/admin-ui-plugin | Prebuilt Angular dashboard at `/admin` |
| Search | DefaultSearchPlugin | DB-based catalog search (no Elasticsearch) |
| Testing (Backend) | Jest + fast-check | Unit + property-based tests |
| Testing (Frontend) | Vitest + fast-check | Unit + property-based tests |
| State (Frontend) | Pinia 3 | Upgraded from v2 (SSR + Apollo fix) |
| Deployment | Docker Compose + Dokploy | Self-hosted, Cloudflare Tunnel |

---

## Project Structure

```
ngopi-code-store/
├── backend/                          # Vendure Backend (NestJS)
│   ├── src/
│   │   ├── config/
│   │   │   ├── custom-order-process.ts       # Order state machine (incl. Created initial state)
│   │   │   ├── custom-order-process.spec.ts
│   │   │   ├── custom-order-process.pbt.spec.ts
│   │   │   ├── paid-webhook-fulfillment.pbt.spec.ts
│   │   │   ├── idr-money-strategy.ts          # Zero-decimal IDR (precision 0)
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
│   │   │   │   │   ├── tripay-webhook.controller.ts          # Webhook logic (HTTP route not yet wired)
│   │   │   │   │   ├── tripay-webhook.controller.pbt.spec.ts  # Idempotency
│   │   │   │   │   └── tripay-webhook.pbt.spec.ts             # Non-PAID isolation
│   │   │   │   ├── entities/
│   │   │   │   │   └── tripay-transaction.entity.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── tripay.service.ts
│   │   │   │   ├── utils/
│   │   │   │   │   └── verify-signature.ts   # HMAC SHA256 constant-time
│   │   │   │   ├── tripay-payment-method.handler.ts  # PaymentMethodHandler (Admin UI configArgs)
│   │   │   │   └── tripay-payment.plugin.ts          # VendurePlugin registration
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
│   │   ├── data-source.ts            # Standalone TypeORM DataSource for CLI migrations
│   │   ├── index.ts                  # Bootstrap: dev auto-syncs schema then runs migrations
│   │   └── vendure-config.ts
│   ├── Dockerfile                    # Multi-stage, 900MB heap limit
│   ├── .env.example
│   ├── jest.config.js
│   ├── tsconfig.json
│   └── package.json
├── frontend/                         # Nuxt 3 Storefront
│   ├── app.vue                      # Applies data-theme (light/dark) via cookie on SSR
│   ├── assets/css/
│   │   └── theme.css                # Light + dark theme tokens (CSS variables)
│   ├── components/
│   │   ├── AppIcon.vue              # Inline SVG icon set
│   │   ├── TheHeader.vue            # Sticky header, responsive nav, theme toggle, cart badge
│   │   └── TheFooter.vue            # Responsive footer
│   ├── composables/
│   │   ├── useShop.ts               # Product fetching
│   │   ├── useProductFilters.ts     # Category/search/pagination
│   │   ├── useCart.ts               # Shopping cart (Vendure active order)
│   │   ├── useCheckout.ts           # Payment initiation + validation
│   │   ├── useOrderConfirmation.ts  # Payment return handling
│   │   ├── useDownload.ts           # Download page + link requests
│   │   └── useTheme.ts              # Light/dark theme state (cookie-backed, SSR-safe)
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
│   │   ├── index.vue                # Homepage (hero, categories, best-sellers, features, newsletter)
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

1. **Forward-only order state machine**: Created → AddingItems → ArrangingPayment → PaymentSettled → Fulfilled. No backward transitions. (`Created` is the required Vendure 3.x initial state.)
2. **Idempotent webhooks**: Duplicate PAID webhooks are no-ops (check transaction status before processing).
3. **Email failure doesn't rollback**: If email fails after fulfillment, order stays Fulfilled. Email retries 3x.
4. **Download record rollback**: If creating download records fails partially, all records for that order are rolled back.
5. **Rate limiting**: 10 download requests per 60-second sliding window per customer (in-memory).
6. **Security**: MinIO private bucket, UUID v4 tokens (122-bit entropy), pre-signed URLs (1h), HMAC SHA256 constant-time comparison.
7. **Memory constraints**: Vendure 900MB heap / 1GB rejection, PostgreSQL 1GB, MinIO 512MB. Total ~2.6GB on 8GB hardware.
8. **Frontend on Vercel**: Reduces server load. Backend self-hosted via Dokploy.
9. **IDR zero-decimal currency**: `IdrMoneyStrategy` (precision 0) stores prices as the actual Rupiah amount (Rp 150.000 = `150000`, not `15000000`). Default channel currency is IDR; channel requires a default tax zone (Indonesia) for pricing to work.
10. **Dev bootstrap auto-sync**: In development, `index.ts` bootstraps Vendure with `synchronize: true` to create core schema, then runs custom migrations. In production `synchronize` stays false (run migrations after deploy).
11. **Tripay credentials via Admin UI**: Managed through Settings → Payment methods (PaymentMethodHandler `configArgs`), not env vars. No custom Admin UI build required.
12. **Theming via CSS variables**: Light/dark mode driven by `data-theme` on `<html>`, backed by a cookie for SSR-safe rendering (no flash). Layout is identical across modes; only color tokens change.

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

### Local Development (recommended workflow)
```bash
# 1. Start infra (from repo root)
docker compose up -d postgres minio minio-init

# 2. Backend (terminal 1) → http://localhost:3000 (Admin UI at /admin)
cd backend && npm install && npm run dev

# 3. Frontend (terminal 2) → http://localhost:3001
cd frontend && npm install && npm run dev -- --port 3001
```
Backend and frontend both default to port 3000, so run the storefront with an explicit `--port 3001` to avoid a conflict. The Vendure Admin UI is served at `http://localhost:3000/admin` (login: superadmin / superadmin), NOT on a separate port.

### Backend
```bash
cd backend
npm install          # Install dependencies
npm run dev          # Dev server (ts-node); first run auto-syncs schema + migrations
npm run build        # Compile TypeScript
npm test             # Run all Jest tests
npm run migration:run  # Run TypeORM migrations (uses src/data-source.ts via -d flag)
```

### Frontend
```bash
cd frontend
npm install          # Install dependencies
npm run dev -- --port 3001   # Start dev server on 3001
npm run build        # Build for production
npx vitest run       # Run all Vitest tests
```

### Deployment
```bash
docker compose up -d          # Start all services
docker compose logs vendure   # View backend logs
docker compose down           # Stop all services
```

### Troubleshooting (Windows)
```powershell
# Free port 3000 if a previous backend process is stuck
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess | Stop-Process -Force
```

---

## Environment Variables (Key)

| Variable | Service | Purpose |
|----------|---------|---------|
| `DB_PASSWORD` | PostgreSQL | Database password |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | MinIO | Object storage credentials |
| `RESEND_API_KEY` | Email | Email delivery |
| `CLOUDFLARE_TUNNEL_TOKEN` | Cloudflare | HTTPS tunnel (production only) |
| `STOREFRONT_URL` | Email/Downloads | Frontend URL for links |
| `COOKIE_SECRET` | Vendure | Session encryption |
| `NUXT_PUBLIC_SHOP_API_URL` | Frontend | Vendure Shop API endpoint |

> Note: Tripay credentials (`TRIPAY_API_KEY`, `TRIPAY_PRIVATE_KEY`, `TRIPAY_MERCHANT_CODE`, sandbox, callback/return URLs) are now configured via the Admin UI (Settings → Payment methods → Tripay handler), not env vars. The legacy env vars remain in `.env.example` as reference/fallback.

> Local dev: copy `.env.example` → `.env` at the repo root (for docker-compose), and `frontend/.env.example` → `frontend/.env`. Dev-friendly defaults: DB `postgres/postgres`, MinIO `minioadmin/minioadmin`.

---

## Conventions

- **Language**: TypeScript throughout (strict mode)
- **Backend test files**: `*.spec.ts` (unit), `*.pbt.spec.ts` (property-based)
- **Frontend test files**: `*.test.ts` (unit), `*.pbt.spec.ts` (property-based)
- **Path aliases**: `@shared/`, `@plugins/`, `@config/` (backend), `~/` (frontend/Nuxt)
- **Currency**: IDR (Indonesian Rupiah), zero-decimal — stored as actual Rupiah amount (precision 0 via `IdrMoneyStrategy`). Frontend `formatPriceIDR` does NOT divide by 100.
- **Locale**: Indonesian (id-ID) for dates, currency, and UI copy
- **API**: GraphQL (Vendure Shop API + Admin API)
- **State management**: Pinia 3 (frontend)
- **Styling**: Scoped styles in Vue SFC (no CSS framework). Colors use CSS variables from `assets/css/theme.css` for light/dark theming.
- **Components**: Shared UI in `components/` (`AppIcon`, `TheHeader`, `TheFooter`); page logic extracted into `use*` composables.
