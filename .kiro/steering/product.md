# Product Overview

NgopiCode Digital Store is a headless e-commerce platform for selling digital products (source code, ebooks, templates) to Indonesian developers.

## Core Business

- Sell digital products with instant delivery after payment
- Guest checkout (no account required to purchase)
- Payment via Indonesian payment gateway (Tripay): bank transfer, e-wallet, QRIS
- Automated fulfillment: payment confirmed → download links generated → email sent
- Download access controlled by token, expiry time, and download count limits

## Key Flows

1. **Purchase**: Browse → Cart → Checkout (guest) → Pay via Tripay → Webhook confirms → Order fulfilled → Email with download links
2. **Download**: Customer visits download page → Validates ownership + limits → Generates pre-signed MinIO URL → Increments counter
3. **Webhook**: Tripay POST → HMAC signature verification → Idempotent processing → State transitions

## Target Market

Indonesian developers. Currency is IDR (stored in minor units). Locale is id-ID.

## Deployment Constraints

Self-hosted on 8GB RAM hardware via Docker Compose + Dokploy. Vendure limited to 900MB heap. PostgreSQL 1GB, MinIO 512MB. Frontend deployed to Vercel to reduce server load.
