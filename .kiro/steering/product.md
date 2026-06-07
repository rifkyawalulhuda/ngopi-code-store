---
inclusion: always
---

# Product Context

NgopiCode Digital Store — a headless e-commerce platform selling digital products (source code, ebooks, templates) and services to Indonesian developers. Backend is Vendure (NestJS/GraphQL); frontend is Nuxt 3 (SSR).

## Business Rules

- **Currency**: IDR only. Store amounts as integer minor units (sen) — never floats. Format for display with the `id-ID` locale.
- **Authentication**: Required before purchase. OAuth login via Google and GitHub only.
- **Payment**: Tripay gateway only. Supported channels:
  - Virtual Account — BRI, BNI, Mandiri, BCA
  - E-Wallet — OVO, DANA, ShopeePay (require phone-number validation)
  - QRIS
- **Fulfillment**: Fully automated. Tripay webhook confirms payment → order transitions to `Fulfilled` → download links become available.
- **Downloads**: Serve via MinIO pre-signed URLs with a 5-minute expiry. No download count limit. Never expose the underlying bucket path or a permanent URL — links must stay short-lived and non-shareable.

## Product Types (Facet-Driven)

Behavior is driven by the **Purchase Rule** facet. Always read this facet before implementing any product-related logic.

| Purchase Rule | Behavior |
|---------------|----------|
| `one-time`   | Block re-purchase after first buy. Appears in the user's Pustaka (library). Shows a Download CTA. |
| `repeatable` | Allow multiple purchases. Does NOT appear in Pustaka. Shows a WhatsApp CTA after payment (used for services). |

## Key Flows

1. **Purchase**: Product page → Login (if unauthenticated) → `/buy/[slug]` → select payment channel → create order + add payment → redirect to Tripay → user pays → `/order/[code]` confirmation.
2. **Download (digital)**: Pustaka → click "Unduh" → backend validates auth + ownership + paid order → generate MinIO pre-signed URL → auto-download.
3. **Webhook**: Tripay POST → HMAC signature verification → idempotent processing → forward-only order state transition.
4. **Service fulfillment**: Payment confirmed → show WhatsApp CTA linking to the store owner.

## Architecture Decisions

- The Vendure custom order process is **forward-only**: admins may bypass states, customers can never move backwards.
- Tripay stores `payCode`, `instructions`, and `expiry` in order metadata. E-Wallet channels additionally store `customer_phone`.
- Duplicate-purchase prevention for `one-time` products is enforced at checkout.
- Pending orders surface notification badges in the frontend header and sidebar.
- Catalog and product pages use SSR (for SEO); account and checkout flows are client-side rendered.

## Deployment Constraints

- Self-hosted on 8 GB RAM via Docker Compose + Dokploy. Avoid unbounded in-memory collections.
- Memory limits: Vendure 900 MB heap, PostgreSQL 1 GB, MinIO 512 MB.
- Frontend deploys to Vercel, separate from backend infra.
- Backend serves the Admin dashboard at `/dashboard` (Vendure's built-in React app).

## Conventions for AI Assistants

- **User-facing text** (button labels, error messages, page titles) is in **Bahasa Indonesia**. **Code, comments, and API responses** stay in **English**.
- Always handle the sandbox/production flag (`TRIPAY_SANDBOX`) in payment features.
- **Webhook handlers must be idempotent** — Tripay sends duplicate callbacks; processing the same payment twice must never double-fulfill or corrupt state.
- **Always verify the HMAC signature** before processing any webhook payload.
- File uploads go to the MinIO `products` bucket via the custom Admin API endpoint.
- Environment variables follow `.env.example`. Never hardcode secrets or commit credentials.
