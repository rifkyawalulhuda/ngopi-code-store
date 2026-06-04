---
inclusion: always
---

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
- Property-based tests: `*.pbt.spec.ts` (both layers)
- Co-locate tests next to the source file they cover.
- When adding new logic, write a property-based test (`*.pbt.spec.ts`) alongside the unit test.
- Use `fast-check` arbitraries to generate inputs; avoid hand-crafting large fixture sets.

## TypeScript Rules

- Backend uses **CommonJS** (`require`/`module.exports`). Do NOT use ESM syntax (`import`/`export`) in backend source files unless inside a `.d.ts`.
- Frontend uses **ESM**. Nuxt auto-imports composables and components — explicit imports are only needed for external packages and GraphQL documents.
- Backend: strict mode, `experimentalDecorators: true`, `emitDecoratorMetadata: true`.
- Frontend: strict mode, `typeCheck` disabled in nuxt config.
- Path aliases (backend): `@plugins/*`, `@config/*`, `@shared/*` — use these instead of relative paths traversing more than two levels.
- Path aliases (frontend): `~/` prefix (Nuxt convention).

## Dependency & Import Guidelines

- Prefer existing dependencies. Check `package.json` before introducing a new library.
- Pin exact versions when adding a dependency (`npm install --save-exact`).
- Backend NestJS services are `@Injectable()` — inject via constructor, never instantiate manually.
- Vendure entities extend `VendureEntity` and use TypeORM decorators (`@Entity`, `@Column`, `@ManyToOne`, etc.).

## Deployment

```bash
docker compose up -d       # Start all services
docker compose down        # Stop all services
docker compose logs <svc>  # View service logs
```

Services: `vendure` (backend), `postgres`, `minio`, `cloudflare-tunnel`.

- Self-hosted on 8 GB RAM. Be mindful of memory — avoid unbounded in-memory collections.
- Vendure heap max: 900 MB. PostgreSQL: 1 GB. MinIO: 512 MB.
