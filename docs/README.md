# NgopiCode Digital Store

Headless e-commerce platform for selling digital products (source code, ebooks, templates) to Indonesian developers. Built with Vendure 3.6 backend and Nuxt 3 storefront, featuring automated digital fulfillment via Tripay payment gateway.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Vendure 3.6 (NestJS + TypeScript) |
| Admin Dashboard | @vendure/dashboard (React) at `/dashboard` |
| Frontend | Nuxt 3 (Vue 3 + Apollo + Pinia, SSR) |
| Database | PostgreSQL 16 (TypeORM) |
| File Storage | MinIO (S3-compatible, private bucket) |
| Payment | Tripay gateway (VA, E-Wallet, QRIS) |
| Email | Resend SDK |
| Deployment | Docker Compose + Dokploy (backend), Vercel (frontend) |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└───────┬───────────────────────────────────┬─────────────────────┘
        │                                   │
        ▼                                   ▼
┌───────────────┐                  ┌─────────────────┐
│  Vercel CDN   │                  │ Cloudflare Tunnel│
│  (Frontend)   │                  │   (Backend)      │
└───────┬───────┘                  └────────┬────────┘
        │                                   │
        ▼                                   ▼
┌───────────────┐    GraphQL       ┌─────────────────┐
│   Nuxt 3      │◄────────────────►│   Vendure 3.6   │
│   (SSR/CSR)   │   Shop API       │   (NestJS)      │
│   Port 3001   │                  │   Port 3000     │
└───────────────┘                  └──┬──────┬───┬───┘
                                      │      │   │
                          ┌───────────┘      │   └───────────┐
                          ▼                  ▼               ▼
                   ┌────────────┐    ┌────────────┐   ┌──────────┐
                   │ PostgreSQL │    │   MinIO    │   │  Tripay  │
                   │    16      │    │  (Storage) │   │ (Payment)│
                   └────────────┘    └────────────┘   └──────────┘
```

## Quick Links

| Document | Description |
|----------|-------------|
| [Development Guide](./development.md) | Setup, prerequisites, running locally |
| [Architecture](./architecture.md) | System design, plugins, patterns |
| [Deployment](./deployment.md) | Docker, production, monitoring |
| [API Reference](./api.md) | GraphQL endpoints, webhooks, custom fields |
| [Features](./features.md) | Product catalog, payments, downloads |
| [Testing](./testing.md) | Jest, Vitest, property-based tests |

## Project Structure

```
ngopi-code-store/
├── backend/           # Vendure 3.6 backend (NestJS, GraphQL, TypeORM)
├── frontend/          # Nuxt 3 storefront (Vue 3, SSR, Apollo)
├── deploy/            # Deployment configs (Cloudflare, Postgres tuning)
├── docs/              # Project documentation
├── docker-compose.yml # Local dev: vendure, postgres, minio, cloudflare-tunnel
├── dev.bat            # Auto-start all dev servers (Windows)
├── dokploy.yml        # Production deployment metadata
└── .env.example       # Required environment variables template
```

## Quick Start

```bash
# Clone the repository
git clone <repo-url> ngopi-code-store
cd ngopi-code-store

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Start services (PostgreSQL, MinIO)
docker compose up -d postgres minio

# Backend setup
cd backend
npm install
npm run migration:run
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

Or on Windows, simply run `dev.bat` to start everything at once.
