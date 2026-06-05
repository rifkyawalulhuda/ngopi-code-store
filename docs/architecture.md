# Architecture & Design

## Table of Contents

- [System Architecture](#system-architecture)
- [Backend Structure](#backend-structure)
- [Frontend Structure](#frontend-structure)
- [Database](#database)
- [File Storage](#file-storage)
- [Payment Integration](#payment-integration)
- [Email System](#email-system)

## System Architecture

NgopiCode Digital Store follows a headless commerce architecture with clear separation between the storefront (Nuxt 3) and the commerce engine (Vendure 3.6).

```
┌─────────────────────────────────────────────────────────────┐
│                      Nuxt 3 Frontend                         │
│  (SSR for catalog, CSR for account/checkout)                │
│  Pages → Composables → GraphQL → Apollo Client              │
└─────────────────────────┬───────────────────────────────────┘
                          │ GraphQL (Shop API)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vendure 3.6 Backend                        │
│  ┌──────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Shop API │  │    Admin API     │  │  REST Webhooks   │  │
│  └────┬─────┘  └────────┬─────────┘  └────────┬─────────┘  │
│       │                  │                     │             │
│  ┌────▼──────────────────▼─────────────────────▼──────────┐ │
│  │                    Plugin Layer                          │ │
│  │  tripay-payment | digital-fulfillment | email           │ │
│  └────┬──────────────────┬─────────────────────┬──────────┘ │
│       │                  │                     │             │
│  ┌────▼─────┐     ┌─────▼─────┐        ┌─────▼─────┐      │
│  │PostgreSQL│     │   MinIO   │        │  Tripay   │      │
│  │ (TypeORM)│     │ (Storage) │        │  (API)    │      │
│  └──────────┘     └───────────┘        └───────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Backend Structure

### Directory Layout

```
backend/src/
├── index.ts              # Vendure bootstrap entry point
├── vendure-config.ts     # Central config (plugins, middleware, DB, custom fields)
├── data-source.ts        # TypeORM DataSource for migrations CLI
├── config/
│   ├── custom-order-process.ts   # Forward-only order state machine
│   ├── idr-money-strategy.ts     # IDR zero-decimal currency handling
│   └── security.ts               # Security configuration
├── middleware/
│   ├── memory-guard.middleware.ts       # Memory usage monitoring
│   ├── auth-rate-limiter.middleware.ts  # Auth endpoint rate limiting
│   ├── download-rate-limiter.middleware.ts  # Download rate limiting
│   └── health-check.middleware.ts       # Health check endpoint
├── migrations/           # TypeORM migrations (timestamp-prefixed)
├── gql/                  # Generated GraphQL types
├── plugins/
│   ├── tripay-payment/       # Payment gateway integration
│   ├── digital-fulfillment/  # Download management + MinIO
│   ├── email/                # Transactional email (Resend)
│   └── integration/          # Integration tests
└── shared/types/         # Shared TypeScript interfaces
```

### Plugin Pattern

Each feature is a self-contained Vendure plugin following this structure:

```
plugins/{feature-name}/
├── {feature-name}.plugin.ts   # Plugin class (NestJS module)
├── api/
│   ├── api-extensions.ts       # GraphQL SDL type definitions
│   ├── *-admin.resolver.ts     # Admin API resolvers
│   └── *-shop.resolver.ts      # Shop API resolvers
├── controllers/                # REST endpoints (webhooks)
├── entities/                   # TypeORM entities (extend VendureEntity)
├── services/                   # Injectable NestJS services
└── utils/                      # Plugin-specific utilities
```

Plugins are registered in `vendure-config.ts`.

### Plugins Overview

| Plugin | Responsibility |
|--------|---------------|
| `tripay-payment` | Tripay API integration, webhook handling, HMAC signature verification, payment channel management |
| `digital-fulfillment` | Digital product CRUD, MinIO file upload/download, pre-signed URL generation, order fulfillment automation |
| `email` | Transactional emails via Resend SDK (verification, order confirmation, email change) |
| `integration` | End-to-end integration tests |

### Middleware

| Middleware | Purpose |
|-----------|---------|
| `memory-guard` | Monitors heap usage, returns 503 when memory pressure is high |
| `auth-rate-limiter` | Rate limits authentication endpoints |
| `download-rate-limiter` | Rate limits download requests per user |
| `health-check` | Exposes `/health` endpoint for monitoring |

### Custom Order Process

The order state machine is **forward-only** — customers cannot transition backwards. Admin users can bypass states.

```
AddingItems → ArrangingPayment → PaymentAuthorized → PaymentSettled → Delivered
                                                                         │
                                                                         ▼
                                                                     Completed
```

Tripay webhook triggers the `PaymentSettled → Delivered` transition, which activates digital fulfillment.

### IDR Money Strategy

Currency is IDR with zero-decimal handling:

- Stored as integers (e.g., `150000` = Rp 150.000)
- No fractional units (sen) in practice
- Display formatted with `id-ID` locale

## Frontend Structure

### Directory Layout

```
frontend/
├── app.vue              # Root component
├── nuxt.config.ts       # Nuxt config (Apollo, Pinia, SSR, port 3001)
├── pages/               # File-based routing
├── composables/         # Vue composables (business logic)
├── components/          # Reusable Vue components
├── graphql/
│   ├── queries/         # GraphQL read operations
│   └── mutations/       # GraphQL write operations
├── stores/              # Pinia stores (cart)
├── assets/css/          # Design tokens, theme (light/dark)
└── utils/               # Pure utility functions
```

### Rendering Strategy

| Route Pattern | Rendering | Reason |
|--------------|-----------|--------|
| `/`, `/products/**` | SSR | SEO for catalog pages |
| `/account/**`, `/buy/**` | CSR | Authenticated user content |
| `/order/**`, `/receipt/**` | CSR | Dynamic order data |

### Composable Pattern

Pages stay thin — business logic lives in `composables/use*.ts`:

| Composable | Domain |
|-----------|--------|
| `useAuth` | Authentication (register, login, logout, verify, profile) |
| `useShop` | Product fetching and catalog |
| `useDownload` | Download link generation |
| `useWhatsapp` | Channel contact info (WhatsApp, GitHub, email) |

### GraphQL Organization

- `graphql/queries/` — Read operations (products, orders, collections, customer)
- `graphql/mutations/` — Write operations (auth, cart, downloads)
- Consumed via Apollo composables (`useQuery`, `useMutation`)

## Database

- **Engine**: PostgreSQL 16
- **ORM**: TypeORM (via Vendure)
- **Connection pool**: 10 connections
- **Migrations**: Timestamp-prefixed, generated against running schema
- **Entities**: Extend `VendureEntity`, use TypeORM decorators

Key custom entities:

| Entity | Table | Purpose |
|--------|-------|---------|
| `DigitalProduct` | `digital_product` | File metadata linked to product variants |
| `DigitalDownload` | `digital_download` | Download records per order line |
| `TripayTransaction` | `tripay_transaction` | Payment transaction tracking |

## File Storage

- **Service**: MinIO (S3-compatible)
- **Bucket**: `products` (private access)
- **Access**: Pre-signed URLs with 5-minute expiry
- **Upload**: Admin API endpoint (`uploadDigitalProduct`)
- **Download**: Shop API generates pre-signed URL on demand

Files are stored with paths like: `products/{variantId}/{filename}`

## Payment Integration

### Tripay Gateway

| Channel Type | Providers |
|-------------|-----------|
| Virtual Account | BRI, BNI, Mandiri, BCA |
| E-Wallet | OVO, DANA, ShopeePay |
| QRIS | Universal QRIS |

### Payment Flow

```
1. Customer selects payment channel
2. Backend creates Tripay transaction (API call)
3. Customer receives payment instructions (VA number / QR code)
4. Customer pays via their bank/e-wallet
5. Tripay sends webhook (POST /payments/tripay/webhook)
6. Backend verifies HMAC signature
7. Order transitions to PaymentSettled → Delivered
8. Digital fulfillment creates download records
```

### Webhook Security

- HMAC signature verification on every callback
- Idempotent processing (duplicate callbacks are safe)
- Sandbox/production flag via `TRIPAY_SANDBOX` env var

## Email System

Uses Resend SDK directly (no Vendure email plugin):

| Email Type | Trigger |
|-----------|---------|
| Verification | Customer registration |
| Order Confirmation | Payment settled |
| Email Change | Customer requests email update |
