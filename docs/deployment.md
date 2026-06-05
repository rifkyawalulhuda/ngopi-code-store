# Deployment Guide

## Table of Contents

- [Infrastructure Overview](#infrastructure-overview)
- [Docker Compose Setup](#docker-compose-setup)
- [Production Environment](#production-environment)
- [Environment Variables](#environment-variables)
- [Cloudflare Tunnel](#cloudflare-tunnel)
- [Database Backups](#database-backups)
- [Monitoring](#monitoring)

## Infrastructure Overview

```
┌──────────────────────────────────────────────────────────┐
│              Self-Hosted Server (8 GB RAM)                │
│              Managed via Dokploy                          │
│                                                          │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │   Vendure    │  │PostgreSQL│  │      MinIO       │  │
│  │  (Backend)   │  │    16    │  │    (Storage)     │  │
│  │  900 MB heap │  │   1 GB   │  │     512 MB      │  │
│  │  Port 3000   │  │Port 5432 │  │  Port 9000/9001 │  │
│  └──────┬───────┘  └──────────┘  └──────────────────┘  │
│         │                                                │
│  ┌──────▼────────────────────────────────────────────┐  │
│  │            Cloudflare Tunnel (HTTPS)               │  │
│  └───────────────────────┬───────────────────────────┘  │
└──────────────────────────┼───────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Internet   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
      ┌──────────────┐         ┌──────────────┐
      │   Vercel     │         │   Customers  │
      │  (Frontend)  │         │  (Browsers)  │
      └──────────────┘         └──────────────┘
```

| Component | Host | Memory |
|-----------|------|--------|
| Vendure (backend + admin) | Self-hosted (Dokploy) | 900 MB heap max |
| PostgreSQL 16 | Self-hosted | 1 GB |
| MinIO | Self-hosted | 512 MB |
| Cloudflare Tunnel | Self-hosted | Minimal |
| Nuxt 3 (frontend) | Vercel | Managed |

## Docker Compose Setup

### Services

The `docker-compose.yml` defines four services:

| Service | Image | Purpose |
|---------|-------|---------|
| `vendure` | Custom (Dockerfile) | Backend API + Admin Dashboard |
| `postgres` | postgres:16 | Database |
| `minio` | minio/minio | S3-compatible file storage |
| `cloudflare-tunnel` | cloudflare/cloudflared | HTTPS tunnel |

### Commands

```bash
# Start all services in background
docker compose up -d

# Stop all services
docker compose down

# View logs for a specific service
docker compose logs vendure
docker compose logs postgres
docker compose logs minio
docker compose logs cloudflare-tunnel

# Rebuild after code changes
docker compose up -d --build vendure

# Restart a single service
docker compose restart vendure

# View resource usage
docker compose stats
```

### Building the Backend Image

The backend `Dockerfile` handles:

1. Install dependencies (`npm ci`)
2. Build TypeScript (`npm run build`)
3. Run migrations on start
4. Start Vendure server

```bash
# Build manually
cd backend
docker build -t ngopi-vendure .
```

## Production Environment

### Memory Allocation (8 GB Server)

| Service | Allocated | Notes |
|---------|-----------|-------|
| Vendure | 900 MB | `--max-old-space-size=900` |
| PostgreSQL | 1 GB | `shared_buffers`, `work_mem` tuning |
| MinIO | 512 MB | Object storage |
| OS + overhead | ~5.5 GB | Docker, Dokploy, tunnel |

### Backend Production Config

```bash
# Node.js heap limit
NODE_OPTIONS="--max-old-space-size=900"

# Production mode
NODE_ENV=production
```

### Frontend (Vercel)

The frontend is deployed separately to Vercel:

```bash
cd frontend
npm run build
# Deploy via Vercel CLI or Git integration
```

Vercel configuration:
- Framework: Nuxt 3
- Build command: `npm run build`
- Output directory: `.output`
- Node.js version: 18.x

## Environment Variables

### Production Backend Variables

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=ngopi_store
DB_USERNAME=<production-user>
DB_PASSWORD=<production-password>

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=<production-key>
MINIO_SECRET_KEY=<production-secret>
MINIO_BUCKET=products
MINIO_USE_SSL=false

# Tripay (Production)
TRIPAY_API_KEY=<production-api-key>
TRIPAY_PRIVATE_KEY=<production-private-key>
TRIPAY_MERCHANT_CODE=<merchant-code>
TRIPAY_SANDBOX=false

# Email
RESEND_API_KEY=<production-resend-key>

# App
APP_URL=https://your-domain.com
COOKIE_SECRET=<random-secret>
SUPERADMIN_STRATEGY=native
```

### Production Frontend Variables

```bash
# API endpoint
NUXT_PUBLIC_API_URL=https://api.your-domain.com
NUXT_PUBLIC_SHOP_API_URL=https://api.your-domain.com/shop-api
```

## Cloudflare Tunnel

The Cloudflare Tunnel provides HTTPS access to the self-hosted backend without exposing ports publicly.

### Setup

1. Create a tunnel in the Cloudflare Zero Trust dashboard
2. Obtain the tunnel token
3. Configure in `docker-compose.yml`:

```yaml
cloudflare-tunnel:
  image: cloudflare/cloudflared:latest
  command: tunnel --no-autoupdate run
  environment:
    - TUNNEL_TOKEN=<your-tunnel-token>
  depends_on:
    - vendure
```

4. Configure DNS routes in Cloudflare dashboard to point to the `vendure` service on port 3000.

### Configuration Files

Tunnel configuration lives in `deploy/` directory with route mappings for:
- API domain → `vendure:3000`
- Admin dashboard → `vendure:3000/dashboard`

## Database Backups

### Manual Backup

```bash
# Create a database dump
docker compose exec postgres pg_dump -U <username> <dbname> > backup_$(date +%Y%m%d).sql

# Compressed backup
docker compose exec postgres pg_dump -U <username> <dbname> | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore from Backup

```bash
# Restore from SQL dump
cat backup_20240101.sql | docker compose exec -T postgres psql -U <username> <dbname>

# Restore from compressed
gunzip -c backup_20240101.sql.gz | docker compose exec -T postgres psql -U <username> <dbname>
```

### Automated Backups

Set up a cron job on the host:

```bash
# Add to crontab (daily at 2 AM)
0 2 * * * docker compose -f /path/to/docker-compose.yml exec -T postgres pg_dump -U user dbname | gzip > /backups/ngopi_$(date +\%Y\%m\%d).sql.gz
```

## Monitoring

### Health Check Endpoint

The backend exposes a health check at:

```
GET /health
```

Response (healthy):
```json
{
  "status": "ok",
  "uptime": 12345,
  "memory": {
    "heapUsed": 450000000,
    "heapTotal": 900000000
  }
}
```

### Memory Guard Middleware

The `memory-guard` middleware monitors heap usage and returns HTTP 503 when memory pressure exceeds thresholds. This prevents OOM crashes on the constrained server.

### Docker Health Checks

```yaml
# In docker-compose.yml
vendure:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### Log Monitoring

```bash
# Follow backend logs
docker compose logs -f vendure

# Last 100 lines
docker compose logs --tail=100 vendure

# All service logs
docker compose logs -f
```
