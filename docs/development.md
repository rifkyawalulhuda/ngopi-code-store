# Development Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clone and Setup](#clone-and-setup)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Database Setup](#database-setup)
- [MinIO Setup](#minio-setup)
- [Code Conventions](#code-conventions)
- [Path Aliases](#path-aliases)

## Prerequisites

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | Runtime |
| PostgreSQL | 16 | Database |
| MinIO | Latest | File storage (S3-compatible) |
| Docker & Docker Compose | Latest | Container orchestration |

## Clone and Setup

```bash
# Clone the repository
git clone <repo-url> ngopi-code-store
cd ngopi-code-store

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Environment Variables

Environment variables are defined in `.env.example` (root) and `backend/.env.example`. Copy them and fill in your local values:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Key variables include:

| Variable | Description |
|----------|-------------|
| `DB_HOST`, `DB_PORT`, `DB_NAME` | PostgreSQL connection |
| `DB_USERNAME`, `DB_PASSWORD` | Database credentials |
| `MINIO_ENDPOINT`, `MINIO_PORT` | MinIO connection |
| `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | MinIO credentials |
| `TRIPAY_API_KEY`, `TRIPAY_PRIVATE_KEY` | Tripay payment gateway |
| `TRIPAY_MERCHANT_CODE` | Tripay merchant identifier |
| `TRIPAY_SANDBOX` | `true` for development |
| `RESEND_API_KEY` | Email service |
| `SUPERADMIN_STRATEGY` | Admin auth strategy |

> **Never commit real credentials.** Use `.env.example` as a template only.

## Running the Project

### Option 1: `dev.bat` (Windows — Recommended)

The `dev.bat` script starts all services (backend, admin dashboard, frontend) in one go:

```bash
dev.bat
```

### Option 2: Manual Start

**Terminal 1 — Backend (port 3000):**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend (port 3001):**

```bash
cd frontend
npm run dev
```

### Services

| Service | URL | Description |
|---------|-----|-------------|
| Backend API | `http://localhost:3000` | Vendure GraphQL server |
| Shop API | `http://localhost:3000/shop-api` | Customer-facing API |
| Admin API | `http://localhost:3000/admin-api` | Admin operations |
| Admin Dashboard | `http://localhost:3000/dashboard` | React admin UI |
| Frontend | `http://localhost:3001` | Nuxt 3 storefront |

### Admin Dashboard

The admin dashboard is served by Vendure at `/dashboard` (React-based).

**Development credentials:**

- Username: `superadmin`
- Password: `superadmin`

> These credentials are for local development only. Change them in production.

## Database Setup

### Start PostgreSQL

```bash
docker compose up -d postgres
```

### Run Migrations

```bash
cd backend
npm run migration:run
```

### Generate a New Migration

After modifying entities:

```bash
cd backend
npm run migration:generate
```

Migrations are stored in `backend/src/migrations/` with timestamp prefixes.

## MinIO Setup

### Start MinIO

```bash
docker compose up -d minio
```

### Configuration

MinIO runs as an S3-compatible object store for digital product files.

- **Bucket name**: `products`
- **Access policy**: Private (pre-signed URLs for downloads)
- **Console**: `http://localhost:9001` (default MinIO console)

The bucket is created automatically by the application on first start. Files uploaded via the Admin API are stored in this bucket.

### Pre-signed URLs

Downloads use pre-signed URLs with a 5-minute expiry. The `digital-fulfillment` plugin handles URL generation.

## Code Conventions

### Module Systems

| Layer | Module System | Notes |
|-------|--------------|-------|
| Backend | CommonJS | `require`/`module.exports`, strict mode |
| Frontend | ESM | Nuxt auto-imports composables and components |

### TypeScript Configuration

**Backend:**
- `strict: true`
- `experimentalDecorators: true`
- `emitDecoratorMetadata: true`
- Target: ES2021

**Frontend:**
- `strict: true`
- `typeCheck` disabled in nuxt config
- Nuxt auto-imports (no explicit imports for composables/components)

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `digital-fulfillment.service.ts` |
| Classes/Entities | PascalCase | `DigitalProduct`, `TripayTransaction` |
| Functions/Variables | camelCase | `generateDownloadUrl` |
| Migrations | Timestamp + PascalCase | `1719000000000-CreateTripayTransaction.ts` |
| Plugins | kebab-case directory | `tripay-payment/` |

### Test Co-location

Tests live next to the source files they cover:

```
services/
├── digital-fulfillment.service.ts
├── digital-fulfillment.service.spec.ts      # Unit test
└── digital-fulfillment.service.pbt.spec.ts  # Property-based test
```

## Path Aliases

### Backend

| Alias | Maps to |
|-------|---------|
| `@plugins/*` | `src/plugins/*` |
| `@config/*` | `src/config/*` |
| `@shared/*` | `src/shared/*` |

Use these instead of relative paths that traverse more than two levels.

### Frontend

| Alias | Maps to |
|-------|---------|
| `~/` | Project root (Nuxt convention) |

Nuxt auto-imports composables and components — explicit imports are only needed for external packages and GraphQL documents.
