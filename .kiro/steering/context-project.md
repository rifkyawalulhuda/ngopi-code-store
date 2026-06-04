---
inclusion: manual
---

# Project Context — NgopiCode Digital Store

## Overview

Headless e-commerce platform for selling digital products (source code, ebooks, templates) to Indonesian developers. Guest checkout, Tripay payment gateway, automated digital fulfillment, customer accounts with email verification.

## Metrics

- **Total files**: ~145 source files
- **Languages**: TypeScript, Vue 3 (SFC), CSS

## Architecture

```
ngopi-code-store/
├── backend/          # Vendure 3.6 (NestJS + TypeScript + PostgreSQL)
├── frontend/         # Nuxt 3 (Vue 3 + Apollo + Pinia, SSR, port 3001)
├── deploy/           # Cloudflare tunnel config
├── docs/             # Architecture docs
├── docker-compose.yml
├── dev.bat           # Auto-start backend + dashboard + frontend dev servers
└── .kiro/            # Specs, steering, settings
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Vendure 3.6 (NestJS + TypeScript) |
| Admin | **@vendure/dashboard (React)** at `/dashboard` — Angular AdminUI REMOVED |
| Frontend | Nuxt 3 (Vue 3 + Apollo + Pinia, SSR) |
| Database | PostgreSQL 16 (TypeORM, pool 10) |
| Storage | MinIO (private bucket) |
| Payment | Tripay (custom plugin) |
| Email | Resend (direct SDK — verification, email-change, order confirmation) |

## Backend Key Files

| File | Purpose |
|------|---------|
| `backend/src/vendure-config.ts` | Main config (plugins, custom fields, auth requireVerification) |
| `backend/vite.config.mts` | Builds the React Dashboard |
| `backend/src/index.ts` | Bootstrap entry point |
| `backend/src/plugins/tripay-payment/` | Payment gateway (webhook, service, signature) |
| `backend/src/plugins/digital-fulfillment/` | Download management (entities, fulfillment, MinIO, Order.downloads resolver) |
| `backend/src/plugins/digital-fulfillment/api/api-extensions.ts` | GraphQL schema: DigitalDownloadItem, Order.downloads, requestDownloadLink, generateDownloadUrl |
| `backend/src/plugins/digital-fulfillment/api/digital-product-shop.resolver.ts` | Shop API: Order.downloads field resolver + download mutations |
| `backend/src/plugins/email/email-verification.handler.ts` | EmailVerificationPlugin: handles AccountRegistrationEvent + IdentifierChangeRequestEvent → Resend |
| `backend/src/plugins/email/templates/` | order-confirmation, email-verification, email-change templates |
| `backend/src/config/custom-order-process.ts` | Order state machine |
| `backend/src/config/idr-money-strategy.ts` | IDR zero-decimal currency |
| `backend/src/middleware/` | Memory guard, download rate limiter, auth rate limiter, health check |
| `backend/src/migrations/` | DigitalProduct, TripayTransaction, DigitalDownload, WhatsApp(channel), Customer whatsapp, Owner links(github/email) |

## Frontend Key Files

| File | Purpose |
|------|---------|
| `frontend/nuxt.config.ts` | Nuxt config (Apollo, Pinia, SSR, devServer port 3001) |
| `frontend/assets/css/theme.css` | Design tokens (light/dark mode) |
| `frontend/components/TheHeader.vue` | Header (brand+theme toggle, nav, search, smart user→/account or /auth + active state, cart) |
| `frontend/components/TheFooter.vue` | Footer (dynamic social: WhatsApp + GitHub + email from activeChannel) |
| `frontend/components/SearchCommand.vue` | Command palette search (Ctrl+K) |
| `frontend/components/AppIcon.vue` | SVG icons (incl. whatsapp + github brand logos) |
| `frontend/pages/index.vue` | Homepage |
| `frontend/pages/products/index.vue` | Catalog (SSR, filters via collections) |
| `frontend/pages/products/[slug].vue` | Product detail (Buy + ♡ + WA link) |
| `frontend/pages/auth/index.vue` | Login/Register (tabs, confirm-password, redirects logged-in → /account) |
| `frontend/pages/auth/verify.vue` | Account email verification (?token=) |
| `frontend/pages/auth/verify-email.vue` | Email-CHANGE confirmation (?token=) |
| `frontend/pages/account/index.vue` | Customer dashboard (sidebar, library with search+category filter, orders, wishlist, settings) |
| `frontend/pages/checkout.vue` | Guest checkout |
| `frontend/pages/order/[code].vue` | Payment confirmation → "Unduh Sekarang" redirects to /account (Pustaka) |
| `frontend/pages/downloads/[orderCode].vue` | Legacy download page (token-based downloads) |
| `frontend/composables/useAuth.ts` | Shared auth state (useState): register/login/logout/verify/updateProfile/changePassword/email-change |
| `frontend/composables/useWhatsapp.ts` | Channel contact (whatsappNumber, githubLink, ownerEmail) |
| `frontend/composables/useShop.ts` | Product fetching |
| `frontend/composables/useDownload.ts` | Download page composable (fetchDownloads, requestDownloadLink) |
| `frontend/composables/useCart.ts`, `useCheckout.ts`, `useTheme.ts`, `useProductFilters.ts` | Feature composables |
| `frontend/graphql/queries/products.ts` | GET_PRODUCT_BY_SLUG, SEARCH_PRODUCTS |
| `frontend/graphql/queries/collections.ts` | GET_COLLECTIONS (used in catalog + account library filter) |
| `frontend/graphql/queries/downloads.ts` | GET_ORDER_DOWNLOADS (orderByCode → downloads) |
| `frontend/graphql/queries/settings.ts` | GET_ACTIVE_CHANNEL (whatsappNumber, githubLink, ownerEmail) |
| `frontend/graphql/mutations/auth.ts` | REGISTER, LOGIN, LOGOUT, VERIFY_CUSTOMER, UPDATE_CUSTOMER, UPDATE_CUSTOMER_PASSWORD, REQUEST_UPDATE_EMAIL, UPDATE_EMAIL_ADDRESS, GET_ACTIVE_CUSTOMER(_ORDERS) |
| `frontend/graphql/mutations/downloads.ts` | REQUEST_DOWNLOAD_LINK, GENERATE_DOWNLOAD_URL |

## Customer Auth Flow

```
Register (email+password, confirm password) → registerCustomerAccount
→ AccountRegistrationEvent → Resend verification email → /auth/verify?token=
→ verifyCustomerAccount(token) WITHOUT password (password set at register) → login
```
- `requireVerification: true`, token valid 7 days
- Login redirects to `/account`; `/auth` redirects logged-in users to `/account`
- Auth rate limiting: login 5/15min, register 3/15min per IP

## Account Page (`/account`)

- **Collapsible sidebar** (Nuxt Dashboard style): collapse toggle (icon-only) persisted via cookie; off-canvas drawer on mobile
- **Tabs**: Pustaka Saya (owned products from paid orders), Riwayat Pesanan, Wishlist, Pengaturan
- **Pustaka Saya**: search bar + category filter chips (fetched from GET_COLLECTIONS, same as catalog). Products matched via `product.collections[].slug`.
- **Settings = accordion** (one section open at a time): Profil (name + WhatsApp), Ubah Email, Ubah Password
- Stats cards hidden on mobile except on Library tab
- Header user icon shows active state on /account

## Digital Download Flow

```
Payment confirmed → Order Fulfilled → DigitalDownload records created (per order line)
→ User clicks "Unduh Sekarang" on order page → redirected to /account (Pustaka Saya)
→ User clicks "Unduh" button on library card → generateDownloadUrl mutation → MinIO pre-signed URL (5 min)
```
- Alternative: `/downloads/[orderCode]` page uses `orderByCode` → `Order.downloads` field resolver
- `requestDownloadLink` mutation: validates ownership, increments counter, returns pre-signed URL
- Download limits: configurable per DigitalProduct (default 5, max 10)
- Expiry: configurable hours (default 72h, max 168h)

## Settings Rules

- **Name**: editable anytime (updateCustomer)
- **WhatsApp**: optional Customer custom field
- **Email change**: requires current password → verification sent to NEW email → email changes only after /auth/verify-email
- **Password change**: requires old password + new password entered twice (must match)

## Custom Fields (Vendure)

### Channel (public, set in Dashboard → Settings → Channels)
- `whatsappNumber` — Owner WhatsApp (product page contact + footer)
- `githubLink` — Owner GitHub URL (footer)
- `ownerEmail` — Owner contact email (footer)

### Customer (public)
- `whatsappNumber` — Customer WhatsApp (optional, editable in account settings)

### Product
- `keyFeatures` (text), `deliveryInfo`, `productType`, `fileFormat`, `licenseType`

## Design System

- **Primary**: `#1f7a4d` (green) · **Accent**: `#5cc98c`
- **Font**: Inter (400–800) · **Border radius**: 10–16px
- **Icons**: Custom SVG via AppIcon (Lucide-style stroke 1.8; brand logos for whatsapp/github)
- **Dark mode**: Full support via CSS variables + `[data-theme='dark']`

## Key Patterns

- **Plugin architecture**: each backend feature is a self-contained Vendure plugin
- **Composable pattern**: frontend logic in `use*` composables; `useAuth` uses shared `useState`
- **GraphQL**: queries/mutations in dedicated files under `graphql/`
- **Collections as categories**: Products belong to collections (Source Code, Ebooks, etc.) — used for catalog filtering AND account library filtering
- **Test co-location**: `*.spec.ts`, `*.test.ts`, `*.pbt.spec.ts`
- **IDR currency**: zero-decimal, stored as actual Rupiah (Rp 150.000 = 150000)
- **Channel custom fields via activeChannel** (Shop API), NOT globalSettings (Admin-only)

## Commands

```bash
# Quick start (Windows) — backend + React dashboard + frontend
dev.bat

# Backend (port 3000; dashboard at /dashboard, login superadmin/superadmin)
cd backend && npm run dev            # Vendure server
cd backend && npm run dev:dashboard  # React dashboard dev (Vite hot reload)
cd backend && npm run build          # tsc + build:dashboard
cd backend && npm run migration:run  # Run migrations
cd backend && npm test               # Jest

# Frontend (port 3001)
cd frontend && npm run dev
cd frontend && npm run build
cd frontend && npx vitest run

# Env (backend/.env): RESEND_API_KEY, EMAIL_FROM_ADDRESS=noreply@info.ngopidulur.my.id,
#                     EMAIL_FROM_NAME, STOREFRONT_URL=http://localhost:3001
```
