# Homepage UX

Design decisions behind the storefront homepage (`frontend/pages/index.vue`), and
the rules that keep it honest.

---

## Architecture: search-first

Visitors arrive knowing roughly what they want ("a Laravel starter kit", "a
Docker ebook"), so search is the primary action rather than a secondary utility.

```
Hero (headline + search + category chips + trust signals)
  ↓
Payment method strip        ← removes "can I even pay?" doubt
  ↓
Categories (from real collections)
  ↓
Produk Terbaru (real products)
  ↓
Features → FAQ → Footer
```

Search goes to the **catalog results page** (`/products?search=`), so the result
is a shareable URL. The header's `Ctrl+K` command palette remains as a quick
jump from any page — two affordances with clearly different jobs, not duplicates.

---

## Data rules (non-negotiable)

These came out of real defects found on the previous homepage.

### 1. Never invent products

The homepage used to fall back to four hardcoded products with fabricated prices
(`SaaS Dashboard Template — Rp 1.350.000`, `Custom Corporate Website — Mulai
Rp 38.000.000`) whenever the catalog fetch returned nothing. Shoppers saw
products that did not exist.

**Now:** only real catalog data renders, and an empty catalog shows an honest
empty state with a support link. See `latestProducts` in `pages/index.vue`.

### 2. Never claim what the data cannot support

The section was titled "Digital Best-Sellers", but there is no sales data and no
`featured` flag. It is now **"Produk Terbaru"**, which the data does support.

Card badges show the product's category (its first assigned collection). Do not
reintroduce "Bestseller" / "Terlaris" badges without real order data behind them.

### 3. Hide test data from shoppers

`mockup-*` and `guest-test-*` products stay enabled so checkout can be tested,
but must never be presented as real catalog items. `utils/catalog.ts` holds
`isTestProduct()` / `excludeTestProducts()`; apply them to any new product list.
Test data is also left untagged in `setup-catalog.js`, so it stays out of
category collections.

### 4. Every card links to the product

Cards previously pointed at `/products` (the catalog), so clicking a product
never opened it. `ProductCard` links the thumbnail, title, and CTA to
`/products/{slug}`.

---

## Shared components

`components/ProductCard.vue` renders every product card — homepage and catalog
alike — so the two can never drift apart. Pass `:product="null"` to get the
loading skeleton.

Card internals (padding, type scale, mobile tweaks) live **inside** the
component. Page-level styles should only size the grid, not restyle the card.

---

## Quality requirements

Verified in the browser, not assumed.

| Requirement | Target | Notes |
|-------------|--------|-------|
| Text contrast | ≥ 4.5:1 (AA) | Measured light **and** dark; lowest observed 5.2:1 |
| Touch targets | ≥ 44×44 px | Chips, "Lihat Semua", card CTA, header buttons |
| Horizontal scroll | none at 375 px | `scrollWidth === clientWidth` |
| Input font size | ≥ 16 px | Prevents iOS zoom-on-focus |
| Reduced motion | respected | `prefers-reduced-motion` disables transforms/shimmer |
| Focus visibility | 2 px outline | `:focus-visible` on all interactive elements |
| Price figures | tabular | `font-variant-numeric: tabular-nums` so prices do not shift |

Brand stays green (`--primary: #1f7a4d`); the design system's suggested indigo
palette was rejected to preserve brand identity.

---

## Changing the homepage

1. New section? Add it to `pages/index.vue` using the existing `.section` /
   `.section-head` / `.section-eyebrow` / `.section-title` rhythm.
2. New product list? Use `useShop().fetchProducts()` and pass the result through
   `excludeTestProducts()`.
3. New category? Add it to `backend/scripts/setup-catalog.js` and re-run it —
   the homepage reads categories from Vendure, so no frontend change is needed.
4. Re-check the table above before shipping.
