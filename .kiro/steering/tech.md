---
inclusion: always
---

# Tech Stack & Build System

Two independent npm packages: `backend/` (Vendure) and `frontend/` (Nuxt). Never mix their
dependencies or module systems. Run commands from inside the relevant package directory.

## Backend

| Component | Technology |
|-----------|-----------|
| Framework | Vendure 3.6 (NestJS + TypeScript) |
| API | GraphQL (Shop API + Admin API) |
| Database | PostgreSQL 16 via TypeORM |
| File Storage | MinIO (S3-compatible, private bucket) |
| Payment | Tripay (custom Vendure plugin) |
| Email | Resend |
| Runtime | Node.js, CommonJS modules, ES2021 target |

### Backend Commands (run from `backend/`)

```bash
npm install                 # Install dependencies
npm run dev                 # Start dev server (ts-node)
npm run build               # Compile TypeScript → dist/
npm start                   # Run compiled output
npm test                    # Run all tests (Jest)
npm run test:watch          # Watch mode
npm run test:pbt            # Run only property-based tests
npm run migration:run       # Run TypeORM migrations
npm run migration:generate  # Generate a new migration from schema diff
```

## Frontend

| Component | Technology |
|-----------|-----------|
| Framework | Nuxt 3 (Vue 3 + TypeScript) |
| GraphQL Client | Apollo (@nuxtjs/apollo) |
| State | Pinia |
| Rendering | SSR enabled |
| Module system | ESM |

### Frontend Commands (run from `frontend/`)

```bash
npm install          # Install dependencies
npm run dev          # Start Nuxt dev server
npm run build        # Production build
npm run generate     # Static generation
npm run test         # Run all tests (Vitest, single run)
npm run test:watch   # Watch mode
```

> Do not launch long-running dev servers or watch tasks on the user's behalf — recommend
> the command and let the user run it. Use single-run test commands (no watch) for verification.

## Testing

| Layer | Runner | PBT Library |
|-------|--------|-------------|
| Backend | Jest + ts-jest | fast-check 3.x |
| Frontend | Vitest | fast-check 4.x |

- Unit tests: `*.spec.ts` (backend), `*.test.ts` (frontend).
- Property-based tests: `*.pbt.spec.ts` (both layers).
- Co-locate every test next to the source file it covers.
- When adding new logic, write a property-based test (`*.pbt.spec.ts`) alongside the unit test.
- Use `fast-check` arbitraries to generate inputs; avoid hand-crafting large fixture sets.
- Note the fast-check major-version split (backend 3.x vs frontend 4.x); do not copy
  arbitrary/API usage between layers without checking the version's API.

## TypeScript Rules

- **Module systems are split and must never be mixed.**
  - Backend uses **CommonJS** (`require`/`module.exports`). Do NOT use ESM syntax
    (`import`/`export`) in backend source files unless inside a `.d.ts`.
  - Frontend uses **ESM**. Nuxt auto-imports composables and components — add explicit
    imports only for external packages and GraphQL documents.
- Both layers run in strict mode.
- Backend: `experimentalDecorators: true`, `emitDecoratorMetadata: true` (required for
  NestJS/TypeORM decorators).
- Frontend: `typeCheck` disabled in nuxt config.
- Path aliases (backend): `@plugins/*`, `@config/*`, `@shared/*` — use these instead of
  relative paths that traverse more than two levels.
- Path aliases (frontend): `~/` prefix (Nuxt convention).

## Dependency & Import Guidelines

- Prefer existing dependencies. Check the relevant `package.json` before adding a library.
- Pin exact versions when adding a dependency (`npm install --save-exact`).
- Backend NestJS services are `@Injectable()` — inject via the constructor, never
  instantiate manually.
- Vendure entities extend `VendureEntity` and use TypeORM decorators (`@Entity`, `@Column`,
  `@ManyToOne`, etc.).
- `gql/` files are generated — do not edit them by hand.
- Migrations are generated against the running DB schema (`migration:generate`), never
  hand-written from scratch.

## Deployment (run from repo root)

```bash
docker compose up -d        # Start all services
docker compose down         # Stop all services
docker compose logs <svc>   # View service logs
```

Services: `vendure` (backend), `postgres`, `minio`, `cloudflare-tunnel`.

### Memory Budget (self-hosted, 8 GB RAM)

Be mindful of memory — avoid unbounded in-memory collections.

| Service | Limit |
|---------|-------|
| Vendure heap (max) | 900 MB |
| PostgreSQL | 1 GB |
| MinIO | 512 MB |
