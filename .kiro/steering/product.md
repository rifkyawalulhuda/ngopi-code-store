---
inclusion: always
---

# Product Context

NgopiCode Digital Store — headless e-commerce platform selling digital products (source code, ebooks, templates) and services to Indonesian developers.

## Business Rules

- Currency: IDR, stored in minor units (sen). Display with `id-ID` locale formatting.
- Authentication required for purchase. OAuth login via Google and GitHub.
- Payment channels: Tripay gateway — Virtual Account (BRI/BNI/Mandiri/BCA), E-Wallet (OVO/DANA/ShopeePay with phone validation), QRIS.
- Fulfillment is automated: Tripay webhook confirms payment → order transitions to Delivered → download links available.
- Downloads use MinIO pre-signed URLs (5 min expiry). No download count limit. Links are short-lived and non-shareable.

## Product Types (Facet-Driven)

| Purchase Rule | Behavior |
|---------------|----------|
| `one-time` | Block re-purchase after first buy. Appears in user's Pustaka (library). Download CTA. |
| `repeatable` | Allow multiple purchases. Does NOT appear in Pustaka. WhatsApp CTA after payment (for services). |

When implementing product-related features, always check the Purchase Rule facet to determine behavior.

## Key Flows

1. **Purchase**: Product page → Login (if unauthenticated) → `/buy/[slug]` → Select payment channel → Create order + add payment → Redirect to Tripay → User pays → `/order/[code]` shows confirmation.
2. **Download (digital)**: User in Pustaka → clicks "Unduh" → Backend validates auth + ownership + paid order → Generates MinIO pre-signed URL → Auto-download.
3. **Webhook**: Tripay POST → HMAC signature verification → Idempotent processing → Order state transition (forward-only).
4. **Service fulfillment**: After payment confirmed → WhatsApp CTA linking to store owner.

## Architecture Decisions

- Vendure's custom order process is forward-only. Admin can bypass states but customers cannot go backwards.
- Tripay stores `payCode`, `instructions`, and `expiry` in order metadata. E-Wallet channels also store `customer_phone`.
- Duplicate purchase prevention is enforced at checkout for `one-time` products.
- Pending orders show notification badges in the frontend header and sidebar.
- Frontend uses SSR for product catalog pages (SEO). Client-side for account/checkout.

## Deployment Constraints

- Self-hosted on 8GB RAM via Docker Compose + Dokploy.
- Vendure: 900MB heap max. PostgreSQL: 1GB. MinIO: 512MB.
- Frontend deployed to Vercel (separate from backend infra).
- Backend serves Admin dashboard at `/dashboard` (React, Vendure built-in).

## Conventions for AI Assistants

- All user-facing text is in Bahasa Indonesia (button labels, error messages, page titles).
- API responses and code comments remain in English.
- When adding payment-related features, always handle the sandbox/production flag (`TRIPAY_SANDBOX`).
- Webhook handlers must be idempotent — duplicate callbacks from Tripay are expected.
- File uploads go to MinIO bucket `products` via the custom Admin API endpoint.
- Environment variables follow the pattern in `.env.example`. Never hardcode secrets.
