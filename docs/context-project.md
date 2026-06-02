---
inclusion: manual
---

# Project Context — NgopiCode Digital Store

## Overview

Headless e-commerce platform for selling digital products (source code, ebooks, templates) to Indonesian developers. Guest checkout, Tripay payment gateway, automated digital fulfillment, customer accounts with email verification + Google/GitHub OAuth.

## Metrics

- **Total files**: ~155 source files
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
| Admin | **@vendure/dashboard (React)** at `/dashboard` — Angular AdminUI REMOVED |
| Frontend | Nuxt 3 (Vue 3 + Apollo + Pinia, SSR) |
| Database | PostgreSQL 16 (TypeORM, pool 10) |
| Storage | MinIO (private bucket) |
| Payment | Tripay (custom plugin) |
| Email | Resend (direct SDK — verification, email-change, order confirmation) |
| OAuth | Google (google-auth-library) + GitHub (code exchange flow) |

## Backend Key Files

| File | Purpose |
|------|---------|
| `backend/src/vendure-config.ts` | Main config (plugins, custom fields, auth requireVerification) |
| `backend/vite.config.mts` | Builds the React Dashboard |
| `backend/src/index.ts` | Bootstrap entry point (dotenv loaded BEFORE config import) |
| `backend/src/plugins/tripay-payment/` | Payment gateway (webhook, service, signature) |
| `backend/src/plugins/digital-fulfillment/` | Download management |
| `backend/src/plugins/google-auth/` | Google OAuth (verifies ID token → create/find customer) |
| `backend/src/plugins/github-auth/` | GitHub OAuth (code exchange → fetch user → create/find customer) |
| `backend/src/plugins/email/email-verification.handler.ts` | EmailVerificationPlugin: handles AccountRegistrationEvent + IdentifierChangeRequestEvent → Resend |
| `backend/src/plugins/email/templates/` | order-confirmation, email-verification, email-change templates |
| `backend/src/config/custom-order-process.ts` | Order state machine |
| `backend/src/config/idr-money-strategy.ts` | IDR zero-decimal currency |
| `backend/src/middleware/` | Memory guard, download rate limiter, auth rate limiter, health check |
| `backend/src/migrations/` | DigitalProduct, TripayTransaction, DigitalDownload, WhatsApp(channel), Customer whatsapp, Owner links(github/email) |

## Frontend Key Files

| File | Purpose |
|------|---------|
| `frontend/nuxt.config.ts` | Nuxt config (Apollo, Pinia, SSR, Google Identity Services script, devServer port 3001) |
| `frontend/assets/css/theme.css` | Design tokens (light/dark mode) |
| `frontend/components/TheHeader.vue` | Header (brand+theme toggle, nav, search, smart user→/account or /auth + active state, cart) |
| `frontend/components/TheFooter.vue` | Footer (dynamic social: WhatsApp + GitHub + email from activeChannel) |
| `frontend/components/SearchCommand.vue` | Command palette search (Ctrl+K) |
| `frontend/components/AppIcon.vue` | SVG icons (incl. whatsapp + github brand logos) |
| `frontend/pages/index.vue` | Homepage |
| `frontend/pages/products/index.vue` | Catalog (SSR, filters) |
| `frontend/pages/products/[slug].vue` | Product detail (Buy + ♡ + WA link) |
| `frontend/pages/auth/index.vue` | Login/Register (tabs, confirm-password, Google + GitHub OAuth buttons) |
| `frontend/pages/auth/github/callback.vue` | GitHub OAuth callback (receives code+state, authenticates with Vendure) |
| `frontend/pages/auth/verify.vue` | Account email verification (?token=) |
| `frontend/pages/auth/verify-email.vue` | Email-CHANGE confirmation (?token=) |
| `frontend/pages/account/index.vue` | Customer dashboard (sidebar, library/orders/settings, logout confirmation modal) |
| `frontend/pages/checkout.vue` | Guest checkout |
| `frontend/pages/order/[code].vue` | Payment confirmation |
| `frontend/pages/downloads/[orderCode].vue` | Download page |
| `frontend/composables/useAuth.ts` | Shared auth state: register/login/loginWithGoogle/loginWithGitHub/logout/verify/updateProfile/changePassword/email-change |
| `frontend/composables/useWhatsapp.ts` | Channel contact (whatsappNumber, githubLink, ownerEmail) |
| `frontend/composables/useShop.ts` | Product fetching |
| `frontend/composables/useCart.ts`, `useCheckout.ts`, `useDownload.ts`, `useTheme.ts`, `useProductFilters.ts` | Feature composables |
| `frontend/graphql/queries/products.ts` | GET_PRODUCT_BY_SLUG, SEARCH_PRODUCTS |
| `frontend/graphql/queries/settings.ts` | GET_ACTIVE_CHANNEL (whatsappNumber, githubLink, ownerEmail) |
| `frontend/graphql/mutations/auth.ts` | REGISTER, LOGIN, LOGOUT, VERIFY_CUSTOMER, UPDATE_CUSTOMER, UPDATE_CUSTOMER_PASSWORD, REQUEST_UPDATE_EMAIL, UPDATE_EMAIL_ADDRESS, GET_ACTIVE_CUSTOMER(_ORDERS), AUTHENTICATE_WITH_GOOGLE, AUTHENTICATE_WITH_GITHUB |

## Customer Auth Flow

```
# Email/Password (native)
Register (email+password, confirm password) → registerCustomerAccount
→ AccountRegistrationEvent → Resend verification email → /auth/verify?token=
→ verifyCustomerAccount(token) WITHOUT password (password set at register) → login

# Google OAuth
Click "Google" → Google Identity Services popup → ID token
→ authenticate(input: { google: { token } }) → backend verifies with google-auth-library
→ findCustomerUser or createCustomerAndUser → logged in (auto-verified)

# GitHub OAuth
Click "GitHub" → redirect to github.com/login/oauth/authorize
→ user authorizes → redirect to /auth/github/callback?code=...&state=...
→ authenticate(input: { github: { code, state } }) → backend exchanges code for token
→ fetch user profile + email → findCustomerUser or createCustomerAndUser → logged in (auto-verified)
```
- `requireVerification: true`, token valid 7 days (native auth only)
- OAuth users auto-verified based on provider's verification status
- Login redirects to `/account`; `/auth` redirects logged-in users to `/account`
- Auth rate limiting: login 5/15min, register 3/15min per IP
- Logout shows confirmation modal before proceeding

## Account Page (`/account`)

- **Collapsible sidebar** (Nuxt Dashboard style): collapse toggle (icon-only) persisted via cookie; off-canvas drawer on mobile
- **Tabs**: Pustaka Saya (owned products from paid orders), Riwayat Pesanan, Pengaturan
- **Settings = accordion** (one section open at a time): Profil (name + WhatsApp), Ubah Email, Ubah Password
- Stats cards hidden on mobile except on Library tab
- Header user icon shows active state on /account
- **Logout confirmation**: Modal dialog with backdrop+blur, danger button styling, escape/cancel dismiss

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
- **Test co-location**: `*.spec.ts`, `*.test.ts`, `*.pbt.spec.ts`
- **IDR currency**: zero-decimal, stored as actual Rupiah (Rp 150.000 = 150000)
- **Channel custom fields via activeChannel** (Shop API), NOT globalSettings (Admin-only)

## Environment Variables

### Backend (`backend/.env`)
```
DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD, COOKIE_SECRET
MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET_NAME
TRIPAY_API_KEY, TRIPAY_PRIVATE_KEY, TRIPAY_MERCHANT_CODE, TRIPAY_SANDBOX
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
```
