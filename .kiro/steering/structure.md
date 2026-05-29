# Project Structure

## Top-Level Layout

```
ngopi-code-store/
├── backend/          # Vendure backend (NestJS, GraphQL)
├── frontend/         # Nuxt 3 storefront (Vue 3, SSR)
├── deploy/           # Deployment configs (Cloudflare, Postgres tuning)
├── docs/             # Architecture documentation
├── docker-compose.yml
├── dokploy.yml       # Dokploy deployment metadata
└── .env.example      # Required environment variables
```

## Backend (`backend/src/`)

```
src/
├── index.ts                    # Vendure bootstrap entry point
├── vendure-config.ts           # Vendure configuration
├── config/                     # App-level config (order process, security)
├── middleware/                  # Express middleware (memory guard, rate limiter, health check)
├── migrations/                  # TypeORM migrations
├── plugins/                     # Vendure plugins (main business logic)
│   ├── tripay-payment/          # Payment gateway integration
│   │   ├── controllers/         # Webhook endpoint
│   │   ├── entities/            # TripayTransaction entity
│   │   ├── services/            # Tripay API service
│   │   └── utils/               # Signature verification
│   ├── digital-fulfillment/     # Download management
│   │   ├── entities/            # DigitalProduct, DigitalDownload entities
│   │   └── services/            # Fulfillment + access control logic
│   ├── email/                   # Transactional email (Resend)
│   │   ├── services/            # Email sending service
│   │   └── templates/           # Email templates
│   └── integration/             # End-to-end integration tests
└── shared/types/                # Shared TypeScript interfaces
```

## Frontend (`frontend/`)

```
frontend/
├── app.vue                      # Root component
├── pages/                       # File-based routing
│   ├── index.vue                # Homepage
│   ├── products/index.vue       # Product catalog (SSR)
│   ├── checkout.vue             # Guest checkout
│   ├── order/[code].vue         # Payment confirmation
│   └── downloads/[orderCode].vue # Download page
├── composables/                 # Vue composables (business logic)
│   ├── useShop.ts               # Product fetching
│   ├── useCart.ts               # Cart management
│   ├── useCheckout.ts           # Payment flow
│   └── useDownload.ts           # Download access
├── graphql/                     # GraphQL operations
│   ├── queries/                 # Read operations
│   └── mutations/               # Write operations
├── stores/                      # Pinia stores
│   └── cart.ts                  # Cart state
└── utils/                       # Pure utility functions
```

## Conventions

- **Plugin pattern**: Each backend feature is a self-contained Vendure plugin with its own entities, services, and controllers
- **Test co-location**: Test files live next to the source files they test
- **Naming**: kebab-case for files, PascalCase for classes/entities, camelCase for functions/variables
- **Entities**: TypeORM entities extend Vendure's `VendureEntity`
- **Services**: Injectable NestJS services, follow single-responsibility
- **Composables**: Frontend logic extracted into `use*` composables, pages stay thin
- **GraphQL**: Queries and mutations defined in dedicated files under `graphql/`
