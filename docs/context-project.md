---
inclusion: manual
---

# Project Context — NgopiCode Digital Store

## Overview

Headless e-commerce platform for selling digital products (source code, ebooks, templates) to Indonesian developers. Guest checkout, Tripay payment gateway (Virtual Account, E-Wallet, QRIS), automated digital fulfillment, customer accounts with email verification + Google/GitHub OAuth, wishlist, and order tracking.

## Metrics

- **Total files**: ~165 source files
- **Languages**: TypeScript, Vue 3 (SFC), CSS

## Architecture

```
ngopi-code-store/
├── backend/          # Vendure 3.6 (NestJS + TypeScript + PostgreSQL)
├── frontend/         # Nuxt 3 (Vue 3 + Apollo + Pinia, SSR, port 3001)
├── deploy/           # Cloudflare tunnel config
├── docs/             # Architecture docs (context-project.md = full version)
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
| Payment | Tripay (VA, E-Wallet, QRIS — custom plugin) |
| Email | Resend (verification, email-change, order confirmation) |
| OAuth | Google (google-auth-library) + GitHub (code exchange) |

## Backend Key Files

| File | Purpose |
|------|---------|
| `backend/src/vendure-config.ts` | Main config (plugins, custom fields, auth, IDR money strategy) |
| `backend/src/index.ts` | Bootstrap entry (dotenv loaded BEFORE config import) |
| `backend/src/plugins/tripay-payment/` | Payment gateway (handler stores payCode/instructions/expiry in metadata) |
| `backend/src/plugins/digital-fulfillment/` | Download management |
| `backend/src/plugins/google-auth/` | Google OAuth (verifies ID token → create/find customer) |
| `backend/src/plugins/github-auth/` | GitHub OAuth (code exchange → fetch user → create/find customer) |
| `backend/src/plugins/email/` | Transactional email via Resend |
| `backend/src/config/custom-order-process.ts` | Order state machine (forward-only, admin bypass for Fulfilled) |
| `backend/src/config/idr-money-strategy.ts` | IDR zero-decimal currency (precision 0) |
| `backend/src/middleware/` | Memory guard, download rate limiter, auth rate limiter, health check |

## Frontend Key Files

| File | Purpose |
|------|---------|
| `frontend/nuxt.config.ts` | Nuxt config (Apollo, Pinia, SSR, Google Identity Services) |
| `frontend/components/TheHeader.vue` | Header (nav, search, user icon with pending badge, cart badge) |
| `frontend/components/OrderSummaryItems.vue` | Reusable order line items component |
| `frontend/pages/auth/index.vue` | Login/Register (Google + GitHub OAuth buttons) |
| `frontend/pages/auth/github/callback.vue` | GitHub OAuth callback |
| `frontend/pages/account/index.vue` | Dashboard (Pustaka, Riwayat, Wishlist, Pengaturan, logout modal) |
| `frontend/pages/buy/[slug].vue` | Checkout page (billing + Tripay payment channel selector) |
| `frontend/pages/order/[code].vue` | Order confirmation (VA number, instructions, refresh status) |
| `frontend/pages/products/[slug].vue` | Product detail (Buy + Wishlist heart) |
| `frontend/composables/useAuth.ts` | Auth state: login/register/Google/GitHub/logout + wishlist sync |
| `frontend/composables/useWishlist.ts` | Wishlist (localStorage + server sync via Customer custom field) |
| `frontend/composables/useOrderConfirmation.ts` | Order page state + payment metadata extraction |
| `frontend/composables/usePendingOrders.ts` | Shared state for pending order badge in header |
| `frontend/graphql/mutations/auth.ts` | All auth mutations + AUTHENTICATE_WITH_GOOGLE/GITHUB |

## Purchase Flow

```
Product Page → "Beli Sekarang" (guest → /auth, logged in → /buy/[slug])
→ Select payment channel (BRIVA, BNIVA, OVO, DANA, QRIS, etc.)
→ "Lanjutkan Pembayaran"
→ addItemToOrder → setShippingAddress → setShippingMethod
→ transition(ArrangingPayment) → addPayment(tripay, channelCode)
→ Redirect to Tripay payment page
→ User pays → "Kembali ke Merchant" → /order/[code]
→ Order page shows: VA number + copy, instructions, expiry, refresh button
→ Webhook confirms → order transitions to PaymentSettled → Fulfilled
```

## Customer Auth Flow

```
# Email/Password
Register → verification email → /auth/verify?token= → login

# Google OAuth
Click "Google" → popup → ID token → authenticate mutation → logged in

# GitHub OAuth
Click "GitHub" → redirect → /auth/github/callback?code= → authenticate → logged in
```

## Account Dashboard Features

- **Pustaka Saya**: Products from paid orders (download links)
- **Riwayat Pesanan**: Order list with pending badge indicator
- **Wishlist**: Server-synced (Customer custom field), localStorage fallback
- **Pengaturan**: Profile, Email change, Password change (accordion)
- **Pending Warning Card**: Yellow alert shown on all tabs when orders pending
- **Logout Confirmation**: Modal dialog with danger styling
- **Stats Cards**: Total Pesanan, Produk Dimiliki, Wishlist count, Status Akun

## Notification System

- **Header user badge**: Green numbered badge when user has pending orders (same style as cart)
- **Sidebar badge**: Red dot on "Riwayat Pesanan" tab when orders pending
- **Warning card**: Yellow alert card in account dashboard (all tabs)

## Custom Fields (Vendure)

### Customer
- `whatsappNumber` — optional contact
- `wishlistProductIds` — JSON array of product IDs (server-synced wishlist)

### Channel
- `whatsappNumber`, `githubLink`, `ownerEmail` — owner contact info

### Product
- `keyFeatures`, `deliveryInfo`, `productType`, `fileFormat`, `licenseType`

## Environment Variables

### Backend (`backend/.env`)
```
DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD, COOKIE_SECRET
MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET_NAME
TRIPAY_API_KEY, TRIPAY_PRIVATE_KEY, TRIPAY_MERCHANT_CODE, TRIPAY_SANDBOX
TRIPAY_CALLBACK_URL, TRIPAY_RETURN_URL (base: http://localhost:3001/order)
RESEND_API_KEY, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME
GOOGLE_CLIENT_ID
GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET
STOREFRONT_URL
```

### Frontend (`frontend/.env`)
```
NUXT_PUBLIC_SHOP_API_URL (default: http://localhost:3000/shop-api)
NUXT_PUBLIC_GOOGLE_CLIENT_ID
NUXT_PUBLIC_GITHUB_CLIENT_ID
```

## Design System

- **Primary**: `#1f7a4d` (green) · **Accent**: `#5cc98c`
- **Font**: Inter (400–800) · **Border radius**: 10–16px
- **Icons**: Custom SVG via AppIcon (Lucide-style stroke 1.8)
- **Dark mode**: Full support via CSS variables + `[data-theme='dark']`
- **Badges**: Numbered (green circle, same as cart) for pending notifications

## Commands

```bash
dev.bat                              # Start all 3 servers (Windows)
cd backend && npm run dev            # Backend (port 3000)
cd backend && npm run dev:dashboard  # React dashboard (Vite HMR)
cd frontend && npm run dev           # Frontend (port 3001)
```
