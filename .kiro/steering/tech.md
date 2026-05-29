# Tech Stack & Build System

## Backend

| Component | Technology |
|-----------|-----------|
| Framework | Vendure 3.6 (NestJS + TypeScript) |
| API | GraphQL (Shop API + Admin API) |
| Database | PostgreSQL 16 via TypeORM |
| File Storage | MinIO (S3-compatible, private bucket) |
| Payment | Tripay (custom Vendure plugin) |
| Email | Resend |
| Runtime | Node.js, CommonJS modules |
| Target | ES2021 |

### Backend Commands

```bash
cd backend
npm install              # Install dependencies
npm run dev              # Start dev server (ts-node)
npm run build            # Compile TypeScript → dist/
npm start                # Run compiled output
npm test                 # Run all tests (Jest)
npm run test:watch       # Run tests in watch mode
npm run test:pbt         # Run only property-based tests
npm run migration:run    # Run TypeORM migrations
npm run migration:generate  # Generate new migration
```

## Frontend

| Component | Technology |
|-----------|-----------|
| Framework | Nuxt 3 (Vue 3 + TypeScript) |
| GraphQL Client | Apollo (@nuxtjs/apollo) |
| State | Pinia |
| Rendering | SSR enabled |
| Module system | ESM |

### Frontend Commands

```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Start Nuxt dev server
npm run build            # Production build
npm run generate         # Static generation
npm run test             # Run all tests (Vitest, single run)
npm run test:watch       # Run tests in watch mode
```

## Testing

| Layer | Runner | PBT Library |
|-------|--------|-------------|
| Backend | Jest + ts-jest | fast-check 3.x |
| Frontend | Vitest | fast-check 4.x |

- Unit tests: `*.spec.ts` (backend), `*.test.ts` (frontend)
- Property-based tests: `*.pbt.spec.ts` (both)

## Deployment

```bash
docker compose up -d       # Start all services
docker compose down        # Stop all services
docker compose logs <svc>  # View service logs
```

Services: vendure (backend), postgres, minio, cloudflare-tunnel.

## TypeScript Configuration

- Backend: strict mode, experimentalDecorators, emitDecoratorMetadata
- Frontend: strict mode, typeCheck disabled in nuxt config
- Path aliases (backend): `@plugins/*`, `@config/*`, `@shared/*`
- Path aliases (frontend): `~/` (Nuxt auto-imports)
