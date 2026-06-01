# NgopiCode Digital Store — Project Context for AI Agents

## Project Overview

NgopiCode Digital Store adalah platform e-commerce headless untuk menjual produk digital (source code, ebook, template) kepada developer Indonesia. Dibangun dengan pendekatan headless commerce menggunakan Vendure (NestJS + TypeScript) sebagai backend dan Nuxt 3 sebagai frontend. Deployment self-hosted pada hardware terbatas (8GB RAM) menggunakan Dokploy.

**Status:** Core implementation complete; now in local-development / refinement phase. Recent work: customer auth (register/login/email verification via Resend), migrated Admin UI from Angular to the new React Dashboard, WhatsApp contact button (per-channel custom field), command-palette product search (Ctrl+K), auth rate limiting, IDR zero-decimal pricing, light/dark theming, redesigned storefront.

**Known pending work:**
- Wire the Tripay webhook as an HTTP endpoint (`/payments/tripay/webhook`). The controller logic exists (`tripay-webhook.controller.ts`) but is not yet exposed as a NestJS route, so end-to-end payment confirmation is not live.
- Checkout flow (add-to-cart → payment redirect) not yet fully wired in the storefront UI.
- Google/GitHub social login (UI buttons present, backend not implemented).

---

## Tech Stack

| Layer | Teknologi | Keterangan |
|-------|-----------|------------|
| Backend | Vendure 3.6 (NestJS + TypeScript) | Headless commerce, GraphQL API |
| Frontend | Nuxt 3 (Vue 3 + TypeScript) | SSR, Apollo GraphQL client |
| Database | PostgreSQL 16 | Pool size 10, TypeORM |
| File Storage | MinIO | S3-compatible, private bucket |
| Payment | Tripay (custom plugin) | Bank transfer, e-wallet, QRIS. Credentials managed via Admin |
| Email | Resend | Transactional emails + account verification (direct Resend SDK) |
| Admin Dashboard | @vendure/dashboard (React) | New React dashboard at `/dashboard`. Angular Admin UI REMOVED |
| Search | DefaultSearchPlugin | DB-based catalog search (no Elasticsearch) |
| Job Queue | DefaultJobQueuePlugin | SQL-backed, inline worker (single process) |
| Lottie | @lottiefiles/dotlottie-wc | Hero animation (client-only web component) |
| Testing (Backend) | Jest + fast-check | Unit + property-based tests |
| Testing (Frontend) | Vitest + fast-check | Unit + property-based tests |
| State (Frontend) | Pinia 3 | SSR + Apollo compatible |
| Deployment | Docker Compose + Dokploy | Self-hosted, Cloudflare Tunnel |

---

## Project Structure

```
ngopi-code-store/
├── dev.bat                           # Windows helper: starts backend + dashboard + frontend
├── backend/                          # Vendure Backend (NestJS)
│   ├── vite.config.mts               # Builds the React Dashboard (@vendure/dashboard/vite)
│   ├── tsconfig.dashboard.json       # TS config for dashboard extensions
│   ├── src/
│   │   ├── config/
│   │   │   ├── custom-order-process.ts       # Order state machine (incl. Created initial state)
│   │   │   ├── idr-money-strategy.ts          # Zero-decimal IDR (precision 0)
│   │   │   └── security.ts                   # Security controls config
│   │   ├── middleware/
│   │   │   ├── memory-guard.middleware.ts     # 1GB rejection threshold
│   │   │   ├── health-check.middleware.ts     # GET /health endpoint
│   │   │   ├── download-rate-limiter.middleware.ts  # 10 req/60s per customer
│   │   │   └── auth-rate-limiter.middleware.ts      # Login 5/15min, Register 3/15min per IP
│   │   ├── migrations/
│   │   │   ├── 1717000000000-CreateDigitalProduct.ts
│   │   │   ├── 1719000000000-CreateTripayTransaction.ts
│   │   │   ├── 1719000001000-CreateDigitalDownload.ts
│   │   │   └── 1719100000000-AddWhatsappNumberToGlobalSettings.ts  # (targets channel table)
│   │   ├── plugins/
│   │   │   ├── tripay-payment/        # Webhook, entity, service, signature verify, handler
│   │   │   ├── digital-fulfillment/   # DigitalProduct/DigitalDownload entities + services
│   │   │   ├── email/
│   │   │   │   ├── email-verification.handler.ts  # EmailVerificationPlugin: AccountRegistrationEvent → Resend
│   │   │   │   ├── services/email.service.ts
│   │   │   │   └── templates/
│   │   │   │       ├── order-confirmation.template.ts
│   │   │   │       └── email-verification.template.ts   # Account verification email HTML
│   │   │   └── integration/
│   │   ├── shared/types/
│   │   ├── data-source.ts            # Standalone TypeORM DataSource for CLI migrations
│   │   ├── index.ts                  # Bootstrap: dev auto-syncs schema, runs migrations, inline worker
│   │   └── vendure-config.ts         # Plugins: AssetServer, DefaultSearch, DefaultJobQueue, Tripay, EmailVerification, Dashboard
│   ├── Dockerfile
│   ├── .env / .env.example
│   └── package.json                  # scripts: dev, dev:dashboard, build (tsc + vite), build:dashboard
├── frontend/                         # Nuxt 3 Storefront (devServer port 3001)
│   ├── app.vue                      # Applies data-theme (light/dark) via cookie on SSR
│   ├── assets/css/theme.css         # Light + dark theme tokens (CSS variables)
│   ├── components/
│   │   ├── AppIcon.vue              # Inline SVG icon set (incl. whatsapp brand icon)
│   │   ├── LottiePlayer.client.vue
│   │   ├── SearchCommand.vue        # Command-palette search modal (Ctrl+K), debounced SEARCH_PRODUCTS
│   │   ├── TheHeader.vue            # Brand+theme toggle group, nav, search button, user→/auth, cart
│   │   └── TheFooter.vue
│   ├── composables/
│   │   ├── useShop.ts               # Product fetching (search query for category/price/sort)
│   │   ├── useProductFilters.ts
│   │   ├── useCart.ts
│   │   ├── useCheckout.ts
│   │   ├── useOrderConfirmation.ts
│   │   ├── useDownload.ts
│   │   ├── useTheme.ts              # Light/dark theme state (cookie-backed, SSR-safe)
│   │   ├── useWhatsapp.ts           # Fetches whatsappNumber from activeChannel, builds wa.me URL
│   │   └── useAuth.ts               # register / login / logout / verifyEmail / fetchActiveCustomer
│   ├── graphql/
│   │   ├── queries/
│   │   │   ├── products.ts          # GET_PRODUCTS, GET_PRODUCT_BY_SLUG (+assets[]+customFields), SEARCH_PRODUCTS
│   │   │   ├── order.ts, collections.ts, checkout.ts, downloads.ts
│   │   │   └── settings.ts          # GET_ACTIVE_CHANNEL (whatsappNumber custom field)
│   │   └── mutations/
│   │       ├── order.ts, downloads.ts
│   │       └── auth.ts              # REGISTER_CUSTOMER, LOGIN, LOGOUT, VERIFY_CUSTOMER, GET_ACTIVE_CUSTOMER
│   ├── pages/
│   │   ├── index.vue                # Homepage (Lottie hero, categories, best-sellers, features)
│   │   ├── products/index.vue       # Catalog (filters, search, price range, sort, grid)
│   │   ├── products/[slug].vue      # Product detail (gallery+lightbox, custom fields, WhatsApp link, related)
│   │   ├── auth/index.vue           # Login/Register (tab switcher, real Vendure mutations, social buttons)
│   │   ├── auth/verify.vue          # Email verification handler (/auth/verify?token=xxx)
│   │   ├── checkout.vue
│   │   ├── order/[code].vue
│   │   └── downloads/[orderCode].vue
│   ├── stores/cart.ts
│   ├── utils/format.ts, pagination.ts
│   ├── nuxt.config.ts               # devServer.port = 3001
│   └── package.json
├── deploy/                          # Cloudflare tunnel + Postgres tuning
├── docker-compose.yml
├── dokploy.yml
├── .env.example
└── docs/
    ├── Technical-Architecture.md
    └── context-project.md           # This file
```

> Note: `.kiro/steering/context-project.md` is a separate, concise steering version of this document (auto-included on demand via `#context-project`).

---

## Architecture Overview

```
Client (Browser) → Cloudflare Tunnel (HTTPS) → Nuxt 3 (Vercel)
                                              → Vendure Backend (Docker)
                                                  ├── Tripay Payment Plugin
                                                  ├── Digital Fulfillment Plugin
                                                  ├── Email Verification Plugin (Resend)
                                                  └── React Dashboard (/dashboard)
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

### 4. Customer Auth Flow (NEW)
```
Register (email + password) → registerCustomerAccount mutation (password stored in sessionStorage temp)
→ Vendure fires AccountRegistrationEvent → EmailVerificationPlugin queries NativeAuthenticationMethod
→ sends verification email via Resend (link → STOREFRONT_URL/auth/verify?token=xxx)
→ User clicks link → /auth/verify calls verifyCustomerAccount(token, password)
→ Account verified → user logs in (login mutation, requireVerification enforced)
```

---

## Key Design Decisions

1. **Forward-only order state machine**: Created → AddingItems → ArrangingPayment → PaymentSettled → Fulfilled. No backward transitions.
2. **Idempotent webhooks**: Duplicate PAID webhooks are no-ops (check transaction status before processing).
3. **Email failure doesn't rollback**: If email fails after fulfillment, order stays Fulfilled.
4. **Download record rollback**: Partial failures roll back all records for that order.
5. **Download rate limiting**: 10 requests per 60-second sliding window per customer (in-memory).
6. **Auth rate limiting** (NEW): `auth-rate-limiter.middleware.ts` on shop-api — login 5 attempts/15min, register 3/15min, per IP (supports `cf-connecting-ip`). Returns HTTP 429 with Retry-After.
7. **Security**: MinIO private bucket, UUID v4 tokens, pre-signed URLs (1h), HMAC SHA256 constant-time comparison, bcrypt password hashing (Vendure).
8. **Email verification required**: `authOptions.requireVerification: true`, `verificationTokenDuration: '7d'`. Customers must verify email before login.
9. **Memory constraints**: Vendure 900MB heap / 1GB rejection, PostgreSQL 1GB, MinIO 512MB.
10. **IDR zero-decimal currency**: `IdrMoneyStrategy` (precision 0). Rp 150.000 = `150000`. Frontend `formatPriceIDR` does NOT divide by 100.
11. **Dev bootstrap auto-sync**: dev uses `synchronize: true` then runs migrations; production keeps `synchronize: false`.
12. **Tripay credentials via Admin**: Managed through Settings → Payment methods (PaymentMethodHandler `configArgs`), not env vars.
13. **Theming via CSS variables**: Light/dark via `data-theme` on `<html>`, cookie-backed for SSR (no flash).
14. **Inline job queue worker**: `DefaultJobQueuePlugin` + `bootstrapWorker().startJobQueue()` in same process.
15. **Catalog uses `search` query**: All filtering via DefaultSearchPlugin `search`. Price filtering client-side. Products must be indexed.
16. **Collections must be public** (`isPrivate: false`) to appear in Shop API.
17. **Product custom fields**: keyFeatures, deliveryInfo, productType, fileFormat, licenseType — editable from Admin, frontend has fallback defaults.
18. **Channel custom field for WhatsApp** (NEW): `whatsappNumber` is a **Channel** custom field (`public: true`), queried via `activeChannel` in Shop API (NOT `globalSettings`, which is Admin-API-only). Owner sets it in Dashboard → Settings → Channels.
19. **React Dashboard migration** (NEW): Angular `@vendure/admin-ui-plugin` REMOVED. New `@vendure/dashboard` (React) served at `/dashboard` via `DashboardPlugin`. Built with Vite (`vite.config.mts`). `@vendure/email-plugin` also removed (unused — custom Resend handler used instead).
20. **Verification password workaround** (NEW): Vendure may not persist the password until verification completes. The register flow stores the password in `sessionStorage` and replays it to `verifyCustomerAccount`; `PasswordAlreadySetError` is treated as success for cross-device verification.
21. **Command-palette search** (NEW): Header search opens `SearchCommand.vue` modal (Ctrl+K / Cmd+K), 300ms debounce, keyboard nav (↑↓ Enter Esc), uses `SEARCH_PRODUCTS`.

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

### Custom Fields
- **Channel**: `whatsappNumber` (string, public)
- **Product**: `keyFeatures` (text), `deliveryInfo`, `productType`, `fileFormat`, `licenseType`

---

## Testing Strategy

- **Property-based tests** (fast-check): universal correctness properties
- **Unit tests**: specific examples and edge cases
- **Integration tests**: end-to-end flow with mocks

### Key Properties Tested
1. Payment Integrity · 2. Download Access Control · 3. Download Counter Monotonicity
4. Webhook Idempotency · 5. Signature Round-Trip · 6. Order State Forward-Only
7. PAID Webhook Full Fulfillment · 8. Non-PAID Webhook Isolation
9. Download Rate Limiting · 10. Category Filter Correctness · 11. Pagination Correctness

---

## Commands

### Quick start (Windows)
```bash
dev.bat   # Starts backend (3000), React dashboard dev (Vite), and frontend (3001) in separate terminals
```

### Backend (port 3000)
```bash
cd backend
npm install
npm run dev            # Vendure server (ts-node); first run auto-syncs schema + migrations
npm run dev:dashboard  # React Dashboard dev server (Vite, hot reload)
npm run build          # tsc + build:dashboard (full production build)
npm run build:dashboard # vite build → dist/dashboard
npm test               # Jest tests
npm run migration:run  # TypeORM migrations
```
- Dashboard (React): `http://localhost:3000/dashboard` (login: superadmin / superadmin)
- Shop API: `/shop-api` · Admin API: `/admin-api`

### Frontend (port 3001)
```bash
cd frontend
npm install
npm run dev            # Nuxt dev server (devServer.port = 3001 in nuxt.config.ts)
npm run build
npx vitest run         # Vitest tests
```

### Deployment
```bash
docker compose up -d
docker compose logs vendure
docker compose down
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
| `RESEND_API_KEY` | Email | Email delivery (verification + order confirmation) |
| `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME` | Email | Sender identity (e.g. `noreply@info.ngopidulur.my.id`) |
| `STOREFRONT_URL` | Email/Downloads | Frontend URL for email links (e.g. http://localhost:3001) |
| `COOKIE_SECRET` | Vendure | Session encryption (change in production) |
| `CLOUDFLARE_TUNNEL_TOKEN` | Cloudflare | HTTPS tunnel (production only) |
| `NUXT_PUBLIC_SHOP_API_URL` | Frontend | Vendure Shop API endpoint |

> Tripay credentials configured via Dashboard (Settings → Payment methods → Tripay handler), not env vars.
> Email sender domain `info.ngopidulur.my.id` is DNS-verified in Resend.

---

## Conventions

- **Language**: TypeScript throughout (strict mode)
- **Backend test files**: `*.spec.ts` (unit), `*.pbt.spec.ts` (property-based)
- **Frontend test files**: `*.test.ts` (unit), `*.pbt.spec.ts` (property-based)
- **Path aliases**: `@shared/`, `@plugins/`, `@config/` (backend), `~/` (frontend/Nuxt)
- **Currency**: IDR zero-decimal — stored as actual Rupiah (precision 0). `formatPriceIDR` does NOT divide by 100.
- **Locale**: Indonesian (id-ID) for dates, currency, UI copy
- **API**: GraphQL (Vendure Shop API + Admin API)
- **State management**: Pinia 3 (frontend)
- **Styling**: Scoped styles in Vue SFC (no CSS framework). Colors use CSS variables from `assets/css/theme.css`.
- **Design tokens**: Primary `#1f7a4d` (green), accent `#5cc98c`, Inter font, border-radius 10–16px, SVG icons via AppIcon.
- **Components**: Shared UI in `components/`; page logic extracted into `use*` composables.
