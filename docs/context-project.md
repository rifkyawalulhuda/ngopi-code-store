---
inclusion: manual
---

# Project Context — NgopiCode Digital Store

## Overview

Headless e-commerce platform for selling digital products (source code, ebooks, templates) and services to Indonesian developers. Tripay payment gateway (VA, E-Wallet, QRIS), automated digital fulfillment via MinIO, customer accounts with email verification + Google/GitHub OAuth, wishlist, and order tracking.

## Architecture

```
ngopi-code-store/
├── backend/          # Vendure 3.6 (NestJS + TypeScript + PostgreSQL)
├── frontend/         # Nuxt 3 (Vue 3 + Apollo + Pinia, SSR, port 3001)
├── deploy/           # Cloudflare tunnel config
├── docs/             # Architecture docs + payment logos
├── docker-compose.yml
├── dev.bat           # Auto-start backend + dashboard + frontend dev servers
└── .kiro/            # Specs, steering, settings
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Vendure 3.6 (NestJS + TypeScript) |
| Admin | @vendure/dashboard (React) at `/dashboard` |
| Frontend | Nuxt 3 (Vue 3 + Apollo + Pinia, SSR) |
| Database | PostgreSQL 16 (TypeORM, pool 10) |
| Storage | MinIO (private bucket `products`) |
| Payment | Tripay (VA: BRI/BNI/Mandiri/BCA, E-Wallet: OVO/DANA/ShopeePay, QRIS) |
| Email | Resend |
| OAuth | Google (google-auth-library) + GitHub (code exchange) |

## Backend Key Plugins

| Plugin | Purpose |
|--------|---------|
| `tripay-payment/` | Payment handler (stores payCode/instructions/expiry in metadata, customer_phone for e-wallet) |
| `digital-fulfillment/` | DigitalProduct entity + download management |
| `google-auth/` | Google OAuth strategy |
| `github-auth/` | GitHub OAuth strategy |
| `email/` | Transactional email via Resend |

## Frontend Key Pages

| Page | Purpose |
|------|---------|
| `/products/[slug]` | Product detail (Buy/Owned banner, Wishlist, WhatsApp) |
| `/buy/[slug]` | Checkout (billing + Tripay payment channel selector with logos) |
| `/order/[code]` | Order confirmation (VA number/instructions/QRIS, WhatsApp for services) |
| `/auth` | Login/Register (Google + GitHub OAuth) |
| `/auth/github/callback` | GitHub OAuth callback |
| `/account` | Dashboard (Pustaka, Riwayat, Wishlist, Pengaturan) with tab query param |

## Purchase Flow

```
Product Page → "Beli Sekarang" (guest→/auth, logged in→/buy/[slug])
→ Select payment channel → "Lanjutkan Pembayaran"
→ addItemToOrder → setShippingAddress → setShippingMethod
→ transition(ArrangingPayment) → addPayment(tripay, channelCode)
→ Redirect to Tripay → User pays → /order/[code]
→ Digital: "Unduh Sekarang" | Service: "Hubungi via WhatsApp"
```

## Product Types (via Facets)

| Facet | Values | Behavior |
|-------|--------|----------|
| Purchase Rule | `one-time` | Block re-purchase, show in Pustaka |
| Purchase Rule | `repeatable` | Allow re-purchase, NOT in Pustaka, WhatsApp CTA after payment |
| Product Type | (dynamic) | Source Code, Ebook, Template, Service, etc. |

## Download Flow (NEXT TO IMPLEMENT - Option B)

```
Admin uploads file via custom Admin API endpoint → MinIO bucket "products"
→ DigitalProduct record created (fileName, objectKey, variantId)
→ User in Pustaka clicks "Unduh" → Shop API generateDownloadUrl(variantId)
→ Backend validates: auth + ownership + order paid
→ Generate MinIO pre-signed URL (5 min expiry) → auto-download
→ No download limit, no expiry, link cannot be shared (short-lived URL)
```

## Key Features Implemented

- Google + GitHub OAuth login
- Wishlist (localStorage + server sync via Customer custom field)
- Tripay payment (VA + E-Wallet + QRIS) with payment logos
- E-Wallet phone validation (requires WhatsApp number)
- Order confirmation with VA number, instructions, copy button
- Repeatable products (services) with WhatsApp contact after payment
- Duplicate purchase prevention (one-time products)
- Pending order notifications (header badge + sidebar badge + warning card)
- Logout confirmation modal
- Mobile responsive (Profile + Cart in mobile menu drawer)
- Card-based order list in Riwayat Pesanan
- Custom order process (forward-only, admin bypass, auto-set orderPlacedAt)

## Environment Variables

### Backend
```
DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET_NAME
TRIPAY_API_KEY, TRIPAY_PRIVATE_KEY, TRIPAY_MERCHANT_CODE, TRIPAY_SANDBOX
TRIPAY_CALLBACK_URL, TRIPAY_RETURN_URL (base: http://localhost:3001/order)
GOOGLE_CLIENT_ID, GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET
RESEND_API_KEY, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME, STOREFRONT_URL
```

### Frontend
```
NUXT_PUBLIC_SHOP_API_URL, NUXT_PUBLIC_GOOGLE_CLIENT_ID, NUXT_PUBLIC_GITHUB_CLIENT_ID
```

## Commands

```bash
dev.bat                              # Start all 3 servers (Windows)
cd backend && npm run dev            # Backend (port 3000)
cd frontend && npm run dev           # Frontend (port 3001)
```
