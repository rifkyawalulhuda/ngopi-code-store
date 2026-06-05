# Feature Documentation

## Table of Contents

- [Product Catalog](#product-catalog)
- [Customer Authentication](#customer-authentication)
- [Purchase Flow](#purchase-flow)
- [Digital Download](#digital-download)
- [Account Dashboard](#account-dashboard)
- [Transaction Receipt](#transaction-receipt)
- [Payment Methods](#payment-methods)
- [Theme System](#theme-system)
- [FAQ Section](#faq-section)
- [Navigation](#navigation)

## Product Catalog

### Overview

Products are organized using Vendure's **collections as categories** system. The catalog page is server-side rendered (SSR) for SEO.

### Categories

| Collection | Products |
|-----------|----------|
| Source Code | Full project source code packages |
| Ebooks | Technical ebooks and guides |
| Web Services | Custom development services |

### Product Display

Each product card shows:
- Product image
- Name and price (IDR formatting)
- Product type badge
- Key features summary

### Product Detail Page (`/products/[slug]`)

- Full description
- Key features list
- Delivery info, file format, license type
- Price with IDR formatting
- Buy button (→ checkout)
- Wishlist (♡) button
- WhatsApp contact link

### Product Types (Facet-Driven)

| Purchase Rule | Behavior |
|---------------|----------|
| `one-time` | Block re-purchase after first buy. Appears in Pustaka (library). Download CTA. |
| `repeatable` | Allow multiple purchases. Does NOT appear in Pustaka. WhatsApp CTA after payment. |

## Customer Authentication

### Registration Flow

```
Register form → Submit (email + password + name)
    → Account created (unverified)
    → Verification email sent (Resend)
    → Customer clicks verification link
    → Account verified → Can login
```

### Login

- Email + password authentication
- Session-based with bearer token
- Required for purchase, account access

### Account Actions

| Action | Description |
|--------|-------------|
| Register | Create account with email verification |
| Login | Email + password |
| Logout | Clear session |
| Verify Email | Confirm registration via email link |
| Update Profile | Change name, WhatsApp number |
| Change Password | Current + new password |
| Change Email | Request → verify new email |

## Purchase Flow

### End-to-End Flow

```
1. Product page (/products/[slug])
   └→ Click "Beli Sekarang" (Buy Now)

2. Login check
   └→ If not authenticated → redirect to /auth

3. Checkout page (/buy/[slug])
   └→ Select payment channel (VA / E-Wallet / QRIS)
   └→ E-Wallet: enter phone number

4. Order creation
   └→ Backend creates Vendure order
   └→ Backend calls Tripay API → get payment instructions
   └→ Store payCode, instructions, expiry in order metadata

5. Payment page (Tripay hosted or instructions)
   └→ Customer pays via bank/e-wallet/QRIS

6. Webhook callback
   └→ Tripay POST → /payments/tripay/webhook
   └→ Verify signature → transition order → fulfill

7. Confirmation page (/order/[code])
   └→ Shows payment status (Lunas/Menunggu)
   └→ Download CTA → /account (Pustaka)
   └→ Receipt CTA → /receipt/[code]
```

### Duplicate Purchase Prevention

For `one-time` products, the system checks if the customer already owns a paid order containing the same product and blocks re-purchase.

## Digital Download

### Fulfillment Flow

```
Payment confirmed (webhook)
    → Order transitions to Delivered
    → DigitalDownload records created (one per order line)
    → Customer sees "Unduh Sekarang" on order page
    → Navigate to /account (Pustaka Saya)
    → Click "Unduh" on library card
    → Backend: validate auth + ownership + paid status
    → Generate MinIO pre-signed URL (5 min expiry)
    → Browser auto-downloads file
```

### Security

- Pre-signed URLs expire after 5 minutes
- Requires authenticated customer
- Ownership validation (customer must own the order)
- Order must be in paid/delivered state
- Rate limiting on download endpoints

### Download Limits

Currently no hard download count limit — URLs are short-lived and non-shareable.

## Account Dashboard

### Layout

- **Desktop**: Collapsible sidebar (persisted via cookie) + content area
- **Mobile**: Off-canvas drawer navigation

### Tabs

| Tab | Indonesian Label | Content |
|-----|-----------------|---------|
| Library | Pustaka Saya | Owned digital products with download buttons |
| Orders | Riwayat Pesanan | Order history with status badges |
| Wishlist | Wishlist | Saved products |
| Settings | Pengaturan | Profile, email, password management |

### Pustaka Saya (Library)

- Shows only `one-time` purchased products (not services)
- Search bar for filtering by product name
- Category filter chips (from collections via `GET_COLLECTIONS`)
- Each card shows: product image, name, category, "Unduh" (download) button
- Categories matched via `product.collections[].slug`

### Settings (Accordion)

| Section | Content |
|---------|---------|
| Profil | Name, WhatsApp number |
| Ubah Email | Request email change (verification flow) |
| Ubah Password | Current + new password |

## Transaction Receipt

### Page: `/receipt/[code]`

A printable transaction receipt with:

- **Header**: Brand logo (terminal icon + NgopiCode)
- **Order meta**: Code, date, status badge
- **Buyer info**: Name, email
- **Items table**: Product name, quantity, price
- **Totals**: Subtotal, shipping (Rp 0), total
- **Payment details**: Method name + channel logo (SVG)
- **Footer**: Store owner email (from `activeChannel.customFields.ownerEmail`)

### Print Support

- Print via `window.print()` or "Cetak" button
- Forced light-mode styles for print (overrides dark theme)
- Unscoped print CSS on `html`, `body`, `#__nuxt`
- Payment channel logos from `/img/payment/` directory

## Payment Methods

### Virtual Account (Bank Transfer)

| Bank | Code | Logo |
|------|------|------|
| BRI | `BRIVA` | ✓ |
| BNI | `BNIVA` | ✓ |
| Mandiri | `MANDIRIVA` | ✓ |
| BCA | `BCAVA` | ✓ |

### E-Wallet

| Provider | Code | Notes |
|----------|------|-------|
| OVO | `OVO` | Requires phone number |
| DANA | `DANA` | Requires phone number |
| ShopeePay | `SHOPEEPAY` | Requires phone number |

### QRIS

| Provider | Code | Notes |
|----------|------|-------|
| QRIS | `QRIS` | Universal QR code payment |

### Payment Channel Selection

During checkout, customers see available channels grouped by type. E-Wallet channels require phone number input with validation.

## Theme System

### Dark/Light Mode

- Toggle in header (sun/moon icon)
- CSS variables via `[data-theme='dark']` attribute
- Design tokens in `assets/css/theme.css`
- Persisted in localStorage

### Design Tokens

| Token | Light | Dark |
|-------|-------|------|
| Primary | `#1f7a4d` (green) | `#1f7a4d` |
| Accent | `#5cc98c` | `#5cc98c` |
| Background | `#ffffff` | `#1a1a2e` |
| Surface | `#f8f9fa` | `#16213e` |
| Text | `#1a1a2e` | `#e8e8e8` |

### Typography

- Font: Inter (weights 400–800)
- Border radius: 10–16px
- Icons: Custom SVG via `AppIcon` component (Lucide-style, stroke 1.8)

## FAQ Section

Located on the homepage (`/`), implemented as an accordion:

- Nuxt UI-style single-open behavior
- `grid-template-rows` CSS animation for smooth expand/collapse
- Common questions about purchasing, downloading, and payments

## Navigation

### Header

| Link | Destination | Notes |
|------|-------------|-------|
| Home | `/` | Homepage |
| Katalog | `/products` | Product catalog |
| Blogs | External | `ngopidulur.my.id/blog/` |

Additional header elements:
- Search icon
- Theme toggle (sun/moon)
- User menu (login / account)
- Cart icon with badge

### Footer

- Brand description
- Social icons: WhatsApp, GitHub, Email
- Links populated from `activeChannel.customFields` (whatsappNumber, githubLink, ownerEmail)
