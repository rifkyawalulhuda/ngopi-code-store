---
inclusion: always
---

# Project Structure & Architecture Patterns

## Top-Level Layout

```
ngopi-code-store/
├── backend/           # Vendure 3.6 backend (NestJS, GraphQL, TypeORM)
├── frontend/          # Nuxt 3 storefront (Vue 3, SSR, Apollo)
├── deploy/            # Deployment configs (Cloudflare, Postgres tuning)
├── docs/              # Architecture documentation
├── docker-compose.yml # Local dev: vendure, postgres, minio, cloudflare-tunnel
├── dokploy.yml        # Production deployment metadata
└── .env.example       # Required environment variables template
```

## Backend (`backend/src/`)

```
src/
├── index.ts              # Vendure bootstrap entry point
├── vendure-config.ts     # Central Vendure configuration (plugins, middleware, DB)
├── data-source.ts        # TypeORM DataSource for migrations CLI
├── config/               # App-level config (custom order process, security, IDR money strategy)
├── middleware/            # Express middleware (memory guard, rate limiter, health check)
├── migrations/            # TypeORM migrations (timestamp-prefixed)
├── gql/                   # Generated GraphQL types
├── plugins/               # Vendure plugins — primary business logic
│   ├── tripay-payment/    # Payment gateway (webhook controller, Tripay API service, signature utils)
│   ├── digital-fulfillment/ # Download management (entities, fulfillment service, MinIO service, access control)
│   ├── email/             # Transactional email via Resend (handlers, templates)
│   └── integration/       # End-to-end integration tests
└── shared/types/          # Shared TypeScript interfaces
```

## Frontend (`frontend/`)

```
frontend/
├── app.vue              # Root component
├── pages/               # File-based routing (SSR for catalog, CSR for account/checkout)
├── composables/         # Vue composables — all business logic lives here
├── components/          # Reusable Vue components
├── graphql/             # GraphQL operations (queries/ and mutations/ subdirs)
├── stores/              # Pinia stores (cart state)
└── utils/               # Pure utility functions
```

## Architecture Patterns

### Backend Plugin Pattern

Each feature is a self-contained Vendure plugin with this structure:

```
plugins/{feature-name}/
├── {feature-name}.plugin.ts   # Plugin class (NestJS module definition)
├── api/                        # GraphQL resolvers and schema extensions
│   ├── api-extensions.ts       # SDL type definitions
│   ├── *-admin.resolver.ts     # Admin API resolvers
│   └── *-shop.resolver.ts      # Shop API resolvers
├── controllers/                # REST endpoints (webhooks)
├── entities/                   # TypeORM entities (extend VendureEntity)
├── services/                   # Injectable NestJS services
└── utils/                      # Plugin-specific utilities
```

When creating a new plugin, register it in `vendure-config.ts`.

### Frontend Composable Pattern

Pages stay thin — extract logic into `composables/use*.ts`. Each composable encapsulates a single domain concern (cart, checkout, downloads, etc.) and returns reactive state + methods.

### GraphQL Separation

- `graphql/queries/` — read operations (products, orders, customer data)
- `graphql/mutations/` — write operations (add to cart, place order, login)
- Import and use via Apollo composables in page/component code

## Code Conventions

| Rule | Example |
|------|---------|
| File naming | `kebab-case.ts`, `kebab-case.vue` |
| Classes/Entities | `PascalCase` (e.g., `DigitalProduct`, `TripayTransaction`) |
| Functions/Variables | `camelCase` |
| Test co-location | `foo.spec.ts` next to `foo.ts` |
| Property-based tests | `foo.pbt.spec.ts` next to `foo.ts` |
| Migrations | `{timestamp}-{PascalDescription}.ts` |
| Plugin file | `{plugin-name}.plugin.ts` |

## Key Architectural Rules

- Entities extend `VendureEntity` and use TypeORM decorators with `experimentalDecorators` enabled.
- Services are `@Injectable()` NestJS providers — one responsibility per service.
- Webhook controllers must verify signatures before processing (HMAC for Tripay).
- Middleware is registered in `vendure-config.ts` via `apiOptions.middleware`.
- Migrations are generated against the running DB schema, never hand-written from scratch.
- Path aliases: `@plugins/*`, `@config/*`, `@shared/*` (backend only). Frontend uses Nuxt auto-imports and `~/` prefix.
- All backend modules use CommonJS. Frontend uses ESM.
