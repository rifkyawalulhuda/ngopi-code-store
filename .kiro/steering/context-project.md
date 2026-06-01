---
inclusion: manual
---

# Project Context — NgopiCode Digital Store

## Overview

Headless e-commerce platform for selling digital products (source code, ebooks, templates) to Indonesian developers. Guest checkout, Tripay payment gateway, automated digital fulfillment.

## Metrics

- **Total files**: 135 source files
- **Total tokens**: ~102K
- **Languages**: TypeScript, Vue 3 (SFC), CSS

## Architecture

```
ngopi-code-store/
├── backend/          # Vendure 3.6 (NestJS + TypeScript + PostgreSQL)
├── frontend/         # Nuxt 3 (Vue 3 + Apollo + Pinia, SSR)
├── deploy/           # Cloudflare tunnel config
├── docs/             # Architecture docs
├── docker-compose.yml
└── .kiro/            # Specs, steering, settings
```

## Backend Key Files

| File | Purpose |
|------|---------|
| `backend/src/vendure-config.ts` | Main Vendure config (plugins, custom fields, DB) |
| `backend/src/index.ts` | Bootstrap entry point |
| `backend/src/plugins/tripay-payment/` | Payment gateway (webhook, service, signature verification) |
| `backend/src/plugins/digital-fulfillment/` | Download management (entities, services) |
| `backend/src/plugins/email/` | Transactional email via Resend |
| `backend/src/config/custom-order-process.ts` | Order state machine |
| `backend/src/config/idr-money-strategy.ts` | IDR zero-decimal currency |
| `backend/src/middleware/` | Memory guard, rate limiter, health check |

## Frontend Key Files

| File | Purpose |
|------|---------|
| `frontend/nuxt.config.ts` | Nuxt config (Apollo, Pinia, SSR) |
| `frontend/assets/css/theme.css` | Design tokens (light/dark mode) |
| `frontend/components/TheHeader.vue` | Site header with nav + search |
| `frontend/components/TheFooter.vue` | Site footer |
| `frontend/components/SearchCommand.vue` | Command palette search (Ctrl+K) |
| `frontend/components/AppIcon.vue` | SVG icon system |
| `frontend/pages/index.vue` | Homepage |
| `frontend/pages/products/index.vue` | Product catalog (SSR, filters) |
| `frontend/pages/products/[slug].vue` | Product detail page |
| `frontend/pages/auth.vue` | Login/Register page |
| `frontend/pages/checkout.vue` | Guest checkout |
| `frontend/pages/order/[code].vue` | Payment confirmation |
| `frontend/pages/downloads/[orderCode].vue` | Download page |
| `frontend/composables/useShop.ts` | Product fetching (search, slug) |
| `frontend/composables/useCart.ts` | Cart management |
| `frontend/composables/useCheckout.ts` | Payment flow |
| `frontend/composables/useDownload.ts` | Download access |
| `frontend/composables/useWhatsapp.ts` | WhatsApp contact button |
| `frontend/composables/useTheme.ts` | Dark/light mode toggle |
| `frontend/composables/useProductFilters.ts` | Catalog filtering |
| `frontend/graphql/queries/products.ts` | Product queries (GET_PRODUCT_BY_SLUG, SEARCH_PRODUCTS) |
| `frontend/graphql/queries/settings.ts` | Channel settings (WhatsApp number) |
| `frontend/stores/cart.ts` | Pinia cart store |
| `frontend/utils/format.ts` | Price formatting (IDR) |

## Custom Fields (Vendure)

### Channel
- `whatsappNumber` (string, public) — Owner WhatsApp for product page contact button

### Product
- `keyFeatures` (text) — Bullet features list
- `deliveryInfo` (string) — Digital delivery description
- `productType` (string) — Badge label (Source Code, Ebook, etc.)
- `fileFormat` (string) — ZIP, PDF, etc.
- `licenseType` (string) — Personal & Commercial, etc.

## Design System

- **Primary**: `#1f7a4d` (green)
- **Accent**: `#5cc98c`
- **Font**: Inter (400–800)
- **Border radius**: 10–16px
- **Icons**: Custom SVG via AppIcon component (Lucide-style, stroke 1.8)
- **Dark mode**: Full support via CSS variables + `[data-theme='dark']`

## Key Patterns

- **Plugin architecture**: Each backend feature is a self-contained Vendure plugin
- **Composable pattern**: Frontend logic in `use*` composables, pages stay thin
- **GraphQL**: Queries/mutations in dedicated files under `graphql/`
- **Test co-location**: Tests live next to source (`*.spec.ts`, `*.test.ts`, `*.pbt.spec.ts`)
- **IDR currency**: Stored in minor units (Rp 150.000 = 150000)

## Commands

```bash
# Backend
cd backend && npm run dev          # Dev server
cd backend && npm test             # Jest tests
cd backend && npm run migration:run # Run migrations

# Frontend
cd frontend && npm run dev         # Nuxt dev
cd frontend && npm run test        # Vitest (single run)
cd frontend && npm run build       # Production build
```
