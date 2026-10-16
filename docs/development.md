# Development Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clone and Setup](#clone-and-setup)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Troubleshooting: "backend mati setelah beberapa detik"](#troubleshooting-backend-mati-setelah-beberapa-detik)
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

**Terminal 1 — Backend (port 3010):**

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
| Backend API | `http://localhost:3010` | Vendure GraphQL server |
| Shop API | `http://localhost:3010/shop-api` | Customer-facing API |
| Admin API | `http://localhost:3010/admin-api` | Admin operations |
| Admin Dashboard | `http://localhost:3010/dashboard` | React admin UI |
| Frontend | `http://localhost:3001` | Nuxt 3 storefront |

> **Backend port is 3010**, set by `PORT` in `backend/.env`. The frontend reads
> the same value from `NUXT_PUBLIC_SHOP_API_URL` (see `frontend/.env.example`).
> If you change one, change the other — otherwise the storefront calls a port
> nothing is listening on.
>
> Port 3000 was the previous default; it collided with other local tooling.
> Production is unaffected: `docker-compose.yml` pins the container to 3000
> internally and Cloudflare Tunnel routes to it there.

### Admin Dashboard

The admin dashboard is served by Vendure at `/dashboard` (React-based).

**Development credentials:**

- Username: `superadmin`
- Password: `superadmin`

> These credentials are for local development only. Change them in production.

## Troubleshooting: "backend mati setelah beberapa detik"

### Gejala

Backend terlihat boot normal, lalu mati beberapa detik kemudian:

```
[Vendure Server]  Vendure server (v3.6.3) now running on port 3010
[Vendure Server]  Nest application successfully started
error  Error: listen EADDRINUSE: address already in use :::3010
```

### Penyebab

**Port backend sudah dipakai proses lain** — biasanya `npm run dev` yang kedua.

Vendure menginisialisasi dulu (±10 detik: koneksi DB, plugin, job queue) dan
**baru setelah itu** memanggil `listen()`. Kalau port sudah terpegang, gagal di
titik tersebut dan proses keluar. Karena itu terlihat seperti "boot lalu mati
sendiri", padahal sebenarnya kalah rebutan port. Tidak ada stack trace dan tidak
ada crash — Windows Event Log juga bersih.

Penyebab umum:

- `npm run dev` dijalankan dua kali (dua terminal/tab)
- `dev.bat` sudah menyalakan backend, lalu `npm run dev` dijalankan lagi
- jendela terminal ditutup tanpa mematikan proses anaknya, lalu dijalankan lagi
- dua orang/dua sesi mengerjakan repo yang sama

### Perbaikan (sudah terpasang)

`npm run dev` dan `npm start` menjalankan **preflight check** lebih dulu:

```
npm run preflight && ts-node --project tsconfig.json src/index.ts
```

Kalau port terpakai, proses berhenti dalam **~0,1 detik** dengan pesan yang
menyebutkan port, penyebab umum, dan perintah untuk membebaskannya:

```
============================================================
  PORT 3010 SUDAH DIPAKAI PROSES LAIN
============================================================

Kemungkinan penyebab:
  - `npm run dev` dijalankan dua kali (dua terminal/tab)
  ...

Cari prosesnya:
  netstat -ano | findstr :3010

Hentikan beserta seluruh proses anaknya (Windows):
  taskkill /PID <pid> /T /F

Atau pakai port lain:  PORT=3011 npm run dev
  (PowerShell:  $env:PORT=3011; npm run dev)
============================================================
```

Pengecekan harus berupa JavaScript biasa (`scripts/check-port.js`) dan berjalan
**sebelum** ts-node, karena:

| Tahap | Waktu |
|-------|-------|
| `node` biasa | ~0,07 s |
| `ts-node` kompilasi | ~4 s |
| import `vendure-config` (Vendure + NestJS + TypeORM + plugin) | ~6 s |

Tanpa precheck, konflik port baru terlihat setelah ~10 detik. Guard kedua ada di
`src/preflight.ts` (dijalankan di dalam aplikasi) untuk entry point yang melewati
npm script — misalnya `ts-node src/index.ts` atau `node dist/index.js` langsung.

### Membebaskan port secara manual

```powershell
# Siapa yang memakai port backend?
Get-NetTCPConnection -LocalPort 3010 -State Listen | Select-Object OwningProcess
netstat -ano | findstr :3010

# Hentikan BESERTA seluruh proses anaknya.
# Penting: rantainya npm -> cmd -> ts-node. Mematikan satu proses saja
# bisa menyisakan proses lain yang masih memegang port.
taskkill /PID <pid> /T /F
```

### Kalau port sudah bebas tapi backend tetap mati

Kalau tidak ada konflik port dan **log-nya kosong tanpa error**, berarti proses
dihentikan dari luar — bukan crash dan bukan `process.exit()`. Bedanya:

| Cara berakhir | Yang terlihat |
|---------------|---------------|
| Crash / exception | stack trace di stderr |
| `process.exit(N)` | `exit code=N` |
| Event loop habis | `beforeExit` lalu `exit` |
| **Dibunuh dari luar** | **tidak ada jejak sama sekali** |

Untuk kasus terakhir:

```bash
cd backend
npm run diagnose
```

Menjalankan server dengan preload diagnostik, lalu baca:

```
%TEMP%\ngopi-exit.log        (Windows)
$TMPDIR/ngopi-exit.log       (macOS / Linux)
```

Cara membaca log-nya:

- `beforeExit` lalu `exit` → event loop habis (tidak ada yang menahan proses)
- `exit code=N` tanpa `beforeExit` → ada `process.exit(N)` eksplisit
- `SIGTERM` / `SIGINT` → permintaan stop biasa
- **heartbeat berhenti tanpa baris penutup** → dibunuh dari luar

Kalau dibunuh dari luar, periksa berurutan:

1. Ada `npm run dev` / `dev.bat` kedua yang bersaing
2. Riwayat karantina security software
3. Skrip supervisor, task IDE, atau container yang me-reap proses
4. Windows: Event Viewer → Windows Logs → Application / System

> Kalau backend mati di port yang sama sementara proses Node biasa (mis.
> `node -e "setInterval(()=>{},1000)"`) bertahan, penyebabnya **di luar aplikasi**.

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
