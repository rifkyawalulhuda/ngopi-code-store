---
inclusion: manual
---

# Project Context — NgopiCode Digital Store

## Overview

Headless e-commerce platform for selling digital products (source code, ebooks, templates) to Indonesian developers. Tripay payment gateway, automated digital fulfillment, customer accounts with email verification.

## Metrics

- **Total files**: ~150 source files
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
| Admin | **@vendure/dashboard (React)** at `/dashboard` |
| Frontend | Nuxt 3 (Vue 3 + Apollo + Pinia, SSR) |
| Database | PostgreSQL 16 (TypeORM, pool 10) |
| Storage | MinIO (private bucket) |
| Payment | Tripay (custom plugin) |
| Email | Resend (direct SDK — verification, email-change, order confirmation) |

## Backend Key Files

| File | Purpose |
|------|---------|
| `backend/src/vendure-config.ts` | Main config (plugins, custom fields, auth requireVerification) |
| `backend/src/index.ts` | Bootstrap entry point |
| `backend/src/plugins/tripay-payment/` | Payment gateway (webhook, service, signature) |
| `backend/src/plugins/digital-fulfillment/` | Download management (entities, fulfillment, MinIO, Order.downloads resolver) |
| `backend/src/plugins/digital-fulfillment/api/api-extensions.ts` | GraphQL schema: DigitalDownloadItem, Order.downloads, requestDownloadLink, generateDownloadUrl |
| `backend/src/plugins/digital-fulfillment/api/digital-product-shop.resolver.ts` | Shop API: Order.downloads field resolver + download mutations |
| `backend/src/plugins/email/` | Transactional email via Resend (verification, email-change, order confirmation) |
| `backend/src/config/custom-order-process.ts` | Order state machine |
| `backend/src/config/idr-money-strategy.ts` | IDR zero-decimal currency |
| `backend/src/middleware/` | Memory guard, download rate limiter, auth rate limiter, health check |

## Frontend Key Files

| File | Purpose |
|------|---------|
| `frontend/nuxt.config.ts` | Nuxt config (Apollo, Pinia, SSR, devServer port 3001) |
| `frontend/assets/css/theme.css` | Design tokens (light/dark mode) |
| `frontend/components/TheHeader.vue` | Header (brand+theme toggle, nav: Home/Katalog/Blogs, search, user, cart) |
| `frontend/components/TheFooter.vue` | Footer (brand desc + social icons: WhatsApp/GitHub/email from activeChannel) |
| `frontend/components/AppIcon.vue` | SVG icons (Lucide-style + brand logos) |
| `frontend/pages/index.vue` | Homepage (hero, categories, bestsellers, features, FAQ accordion) |
| `frontend/pages/products/index.vue` | Catalog (SSR, filters via collections) |
| `frontend/pages/products/[slug].vue` | Product detail (Buy + ♡ + WA link) |
| `frontend/pages/auth/index.vue` | Login/Register |
| `frontend/pages/account/index.vue` | Customer dashboard (sidebar, library with search+category filter, orders, wishlist, settings) |
| `frontend/pages/order/[code].vue` | Payment confirmation (download CTA → /account, receipt CTA → /receipt/[code]) |
| `frontend/pages/receipt/[code].vue` | Transaction receipt (print/PDF, payment logo, dark mode print fix) |
| `frontend/pages/downloads/[orderCode].vue` | Legacy download page (token-based) |
| `frontend/composables/useAuth.ts` | Auth state (useState): register/login/logout/verify/updateProfile/changePassword/email-change |
| `frontend/composables/useWhatsapp.ts` | Channel contact (whatsappNumber, githubLink, ownerEmail) |
| `frontend/composables/useShop.ts` | Product fetching |
| `frontend/composables/useDownload.ts` | Download page composable |
| `frontend/graphql/queries/order.ts` | GET_ORDER_BY_CODE (full order with payments, customer, lines, collections, facetValues) |
| `frontend/graphql/queries/collections.ts` | GET_COLLECTIONS (catalog + account library filter) |
| `frontend/graphql/mutations/auth.ts` | Auth mutations + GET_ACTIVE_CUSTOMER_ORDERS (with product.collections) |
| `frontend/graphql/mutations/downloads.ts` | REQUEST_DOWNLOAD_LINK, GENERATE_DOWNLOAD_URL |

## Homepage (`/`)

- Hero with Lottie animation + CTA
- Category cards (Source Code, Ebooks, Web Services)
- Bestsellers grid (from API or fallback samples)
- Features section (3 cards: Instant delivery, Security, Support)
- **FAQ accordion** (Nuxt UI style, single-open, grid-template-rows animation)

## Account Page (`/account`)

- **Collapsible sidebar** persisted via cookie; off-canvas drawer on mobile
- **Tabs**: Pustaka Saya, Riwayat Pesanan, Wishlist, Pengaturan
- **Pustaka Saya**: search bar + category filter chips (from GET_COLLECTIONS, matched via product.collections[].slug)
- **Settings = accordion** (Profil, Ubah Email, Ubah Password)

## Order Page (`/order/[code]`)

- Payment status (Lunas/Menunggu)
- Download CTA → `/account` (Pustaka Saya)
- Receipt CTA → `/receipt/[code]` (outline button style)
- WhatsApp CTA for service orders

## Receipt Page (`/receipt/[code]`)

- Print/PDF via `window.print()` with forced light-mode print styles
- Brand header (same as TheHeader: terminal icon + NgopiCode)
- Meta: order code, date, status badge
- Buyer info, items table, totals
- Payment details with channel logo (SVG from `/img/payment/`)
- Footer with dynamic owner email from activeChannel
- Unscoped print styles to override dark mode on html/body/#__nuxt

## Digital Download Flow

```
Payment confirmed → Order Fulfilled → DigitalDownload records created
→ "Unduh Sekarang" on order page → /account (Pustaka Saya)
→ "Unduh" button on library card → generateDownloadUrl → MinIO pre-signed URL (5 min)
```

## Navigation

- **Header**: Home | Katalog | Blogs (external: ngopidulur.my.id/blog/)
- **Footer**: Brand + social icons (WhatsApp, GitHub, Email) — no link columns

## Custom Fields (Vendure)

### Channel (public)
- `whatsappNumber`, `githubLink`, `ownerEmail`

### Customer (public)
- `whatsappNumber` (optional)

### Product
- `keyFeatures`, `deliveryInfo`, `productType`, `fileFormat`, `licenseType`

## Design System

- **Primary**: `#1f7a4d` (green) · **Accent**: `#5cc98c`
- **Font**: Inter (400–800) · **Border radius**: 10–16px
- **Icons**: Custom SVG via AppIcon (Lucide-style stroke 1.8; brand logos for whatsapp/github)
- **Dark mode**: Full CSS variables + `[data-theme='dark']`
- **No Tailwind/shadcn** — vanilla CSS with design tokens

## Key Patterns

- **Plugin architecture**: each backend feature = self-contained Vendure plugin
- **Composable pattern**: frontend logic in `use*` composables
- **GraphQL**: queries/mutations in dedicated files under `graphql/`
- **Collections as categories**: used for catalog filtering AND account library filtering
- **IDR currency**: zero-decimal (Rp 150.000 = 150000)
- **Channel custom fields via activeChannel** (Shop API)

## Commands

```bash
dev.bat                              # Start all (backend + dashboard + frontend)
cd backend && npm run dev            # Vendure (port 3000, dashboard at /dashboard)
cd backend && npm run build          # tsc + build:dashboard
cd backend && npm test               # Jest
cd frontend && npm run dev           # Nuxt (port 3001)
cd frontend && npm run build         # Production build
```
