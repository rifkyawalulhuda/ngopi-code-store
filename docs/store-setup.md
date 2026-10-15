# Store Setup & Repair

Operational guide for the NgopiCode store configuration. Run these whenever you
set up a fresh environment or checkout is behaving strangely.

```bash
# from backend/
node scripts/setup-store.js
```

The script is **idempotent** — safe to run repeatedly, and it reports what it
changed. It requires the Vendure server to be running.

---

## What the script guarantees

| # | Item | Detail |
|---|------|--------|
| 1 | **Channel currency = IDR** | `defaultCurrencyCode` and `availableCurrencyCodes` |
| 2 | **Default zones** | Tax zone + shipping zone on the channel |
| 3 | **Tax** | "Digital Products" category + a 0% rate for the zone |
| 4 | **Shipping** | Exactly one valid `digital-delivery` method, and any method with **incomplete** arguments is repaired |

---

## Why IDR

This project is IDR-only by design:

- `IdrMoneyStrategy` uses `precision = 0`, so "Rp 149.000" is stored as the
  integer `149000` — there are no minor units.
- The storefront formats prices verbatim (`formatPriceIDR`, and every
  `currencyCode ?? 'IDR'` fallback).
- `scripts/seed-products.js` seeds Rupiah amounts.

Vendure's default channel currency is **USD**. If the channel is left on USD:

- prices are mislabelled in the Admin API/UI;
- `product_variant_price` rows carry `currencyCode = 'USD'` while holding Rupiah
  amounts;
- Tripay still charges the raw integer, so amounts *look* correct — which hides
  the inconsistency until something compares currencies.

The migration `FixStoreCurrencyToIdr` corrects this for existing data (channel +
variant prices). It changes only the currency **code**, never the numeric amount.

---

## The shipping-method trap (causes checkout to fail for everyone)

**Symptom**

```
Money cannot represent non numeric value: NaN
```
thrown from `eligibleShippingMethods` / `setOrderShippingMethod`. Every customer
is blocked at the shipping step, guest or registered.

**Cause**

Vendure's `ConfigurableOperation` only assigns the arguments that are **present
in the stored input**:

```js
for (const arg of input) {
  output[arg.name] = coerceValueToType(arg.value, this.args[arg.name].type, …);
}
```

`defaultValue` is a **UI hint only** — it is *not* applied at runtime. So a
shipping method saved without `taxRate` yields `args.taxRate === undefined`, the
calculator returns `taxRate: undefined`, and `grossPriceOf(price, undefined)`
produces `NaN`.

**Amplifier:** a single malformed row breaks the *whole*
`eligibleShippingMethods` response, so one bad shipping method takes down
checkout entirely.

**Fix:** the script detects any declared argument missing from a stored
calculator/checker and fills it from the declared default. The canonical method
it creates always supplies all three:

```js
calculator: {
  code: 'default-shipping-calculator',
  arguments: [
    { name: 'rate',        value: '0' },
    { name: 'includesTax', value: 'auto' },
    { name: 'taxRate',     value: '0' },   // ← omitting this is the bug
  ],
}
```

> **Rule:** when creating or editing a shipping method (via the Admin UI or the
> API), make sure *every* declared argument is present — including ones that
> have a default value.

---

## Products need an uploaded file

Seeding a product does **not** upload its digital deliverable. A variant with no
`digital_product` row will fulfil (order → `Fulfilled`, email + WhatsApp sent)
but produce **0 download records**, so the customer's magic link leads to an
empty download page.

Upload the file for each sellable variant via the Admin dashboard, or verify:

```sql
SELECT pv.id, pv.sku,
       (SELECT count(*) FROM digital_product dp WHERE dp."productVariantId" = pv.id) AS uploaded_files
FROM product_variant pv
WHERE pv."deletedAt" IS NULL
ORDER BY pv.id;
```

Any row with `uploaded_files = 0` is not deliverable.

### Mockup products (for testing)

To test the whole flow without real files:

```bash
node scripts/seed-mockup-products.js
```

This creates two clearly-labelled `MOCKUP:` products **and uploads real
deliverables** through the same `uploadDigitalProduct` Admin API mutation the
dashboard uses:

| Product | Deliverable |
|---------|-------------|
| `MOCKUP: Starter Kit Source Code` | a real ZIP (deflate) containing `README.md`, `package.json`, `src/index.js`, `src/config.js`, `LICENSE` |
| `MOCKUP: Ebook Panduan Deployment (PDF)` | a real one-page PDF |

Both are purchasable, so you can run the full **buy → pay → magic link →
download** path and confirm the file bytes arrive intact. Delete them from the
dashboard when you no longer need them.

---

## MinIO

Two settings decide whether downloads actually work.

### The bucket must exist

Uploads fail with a bare `The specified bucket does not exist` — easy to misread
as bad credentials. `MinioService.ensureBucket()` now creates the bucket on
startup if missing (private, as MinIO defaults), so a fresh environment works.
The `minio-init` compose service does the same for Docker deployments.

### `MINIO_PUBLIC_URL` must point at the same MinIO you upload to

This is the host used to **sign** download URLs. It must be:

- reachable by the **customer's browser**, and
- the **same MinIO instance** the backend uploads to.

| Environment | Value |
|-------------|-------|
| Local dev | `http://localhost:9000` |
| Production | the public host, e.g. `https://storage.ngopicode.com` |

If it points at a different MinIO than the one receiving uploads, every download
returns **`404 NoSuchKey`** even though the upload succeeded and the file is
visible in the Admin dashboard. Symptom to watch for: the presigned URL in the
error/network tab has a host you did not upload to.

Quick check — confirm the object really exists in the MinIO you are using:

```bash
docker exec ngopicode-minio sh -c \
  "mc alias set local http://localhost:9000 minioadmin minioadmin >/dev/null; mc ls local/products/digital/"
```

Then confirm the presigned URL resolves. If it returns `NoSuchKey`, the signing
host and the upload host are different MinIO instances.

---

## The maxDownloads constraint trap (causes fulfillment to fail silently)

**Symptom**

A paid order reaches `Fulfilled`, the confirmation email and WhatsApp both go
out, but the customer's magic link opens an **empty download page** — and the
server log shows:

```
new row for relation "digital_download" violates check constraint
"CHK_digital_download_max_range"
```

**Cause**

Two values disagreed:

| Source | `maxDownloads` |
|--------|----------------|
| `uploadDigitalProduct` (dashboard uploader) | `999` — the "unlimited" sentinel |
| `CreateDigitalDownload` migration CHECK | `>= 1 AND <= 10` |

`OrderFulfillmentRunner` copies `digital_product.maxDownloadsPerOrder` into each
`digital_download` row, so every dashboard-uploaded product produced a
constraint violation.

**Why local dev never caught it:** development boots with `synchronize: true`,
and TypeORM `synchronize` reconciles the database to match **entity metadata**.
`@Max(10)` is a *class-validator* decorator, not a DB constraint, so no CHECK was
ever created locally. Only a database built from migrations had it.

**Fix:** the CHECK now allows up to **1000** (migration
`WidenDigitalDownloadMaxRange`), matching the sentinel while still rejecting
absurd values. The entity decorator was widened to `@Max(1000)` to match.

> **Rule:** `999` means "unlimited" for `maxDownloadsPerOrder`. If you touch that
> constraint, keep the upper bound at 1000 or higher.

Verify the constraint:

```bash
docker exec ngopicode-postgres psql -U postgres -d ngopicode -c \
  "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'digital_download'::regclass AND contype = 'c';"
```

Expected: `CHECK ((("maxDownloads" >= 1) AND ("maxDownloads" <= 1000)))`

### `synchronize` silently drops migration-added constraints in dev

This is the deeper reason the bug above stayed invisible, and it affects **any**
DB-level constraint a migration adds:

1. Dev boots with `synchronize: true` → TypeORM drops constraints it cannot
   express in entity metadata (CHECK constraints in particular).
2. The migration is already recorded in `migrations`, so `migration:run` reports
   *"No migrations are pending"* and does **not** re-add it.

Consequences:

- **Dev can never enforce migration-only constraints.** A constraint violation
  that would stop fulfillment in production passes locally every time.
- Re-adding it locally requires clearing the record first:

  ```bash
  docker exec ngopicode-postgres psql -U postgres -d ngopicode \
    -c "DELETE FROM migrations WHERE name='WidenDigitalDownloadMaxRange1720000000000';"
  cd backend && npm run migration:run
  ```

  (Run it *after* the dev server has booted, since booting re-drops it.)

- **Never trust a green local run for schema-level behaviour.** When a change
  touches a CHECK/constraint, verify it against a database built from
  migrations — that is the production shape.

---

## Categories (facet + collections)

```bash
node scripts/setup-catalog.js
```

The storefront's category navigation is real Vendure data, not hardcoded links:

| `productType` value | facet value | collection |
|---------------------|-------------|------------|
| `Source Code` | `source-code` | `/products?category=source-code` |
| `Ebook` | `ebook` | `/products?category=ebooks` |
| `Service` | `service` | `/products?category=services` |

**Filter-based, not manual.** Each collection carries a `facet-value-filter` on
its facet value, so a new product lands in the right category as soon as its
`productType` is filled in — no drag-and-drop in the dashboard. `productType` is
the single field an admin already fills; the taxonomy follows it.

> **Why this exists:** the homepage previously linked to
> `/products?category=source-code` while **zero collections existed**, so every
> category link led to an empty result. If you add a new product type, add the
> facet value and collection in `scripts/setup-catalog.js` and re-run it.

**Test data is excluded by slug.** Products whose slug starts with `mockup-` or
`guest-test-` are deliberately left untagged, which keeps them out of every
collection even though they stay purchasable for checkout testing.

Verify:

```bash
curl -s -X POST http://localhost:3000/shop-api \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ collections { items { slug productVariantCount } } }"}'
```

A collection with `productVariantCount: 0` means no product has that
`productType` yet — the category will look empty in the storefront.

---

## Search index

```bash
node scripts/reindex.js            # full rebuild, waits for completion
node scripts/reindex.js --pending  # only flush queued index updates
```

The index is normally kept current by the DefaultSearchPlugin reacting to
product events. **Changes made outside that path — direct SQL, bulk imports,
database restores — leave it stale**: deleted products keep appearing in search
and on the catalog page while their detail pages 404. That is exactly what
happened before the search-first homepage shipped (16 indexed products vs 7 real
ones).

The script prints index size vs catalog size and exits non-zero when they
disagree, so it works as a check as well as a repair.

A periodic rebuild runs automatically as a safety net
(`SearchMaintenancePlugin`); see `SEARCH_REINDEX_*` in the env reference. Turn it
off if you prefer to reindex manually.

> **Rule:** after any out-of-band catalog change, run `node scripts/reindex.js`.

---

## Verification checklist

After running the script, confirm:

```bash
# 1. Channel + prices are IDR
docker exec ngopicode-postgres psql -U postgres -d ngopicode -c \
  'SELECT "defaultCurrencyCode", "availableCurrencyCodes" FROM channel;'
docker exec ngopicode-postgres psql -U postgres -d ngopicode -c \
  'SELECT "currencyCode", count(*) FROM product_variant_price GROUP BY 1;'

# 2. Shipping method has complete arguments
docker exec ngopicode-postgres psql -U postgres -d ngopicode -c \
  'SELECT code, calculator FROM shipping_method;'

# 3. digital_download CHECK allows the 999 "unlimited" sentinel
docker exec ngopicode-postgres psql -U postgres -d ngopicode -c \
  "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'digital_download'::regclass AND contype = 'c';"

# 4. Every sellable variant actually has a file
docker exec ngopicode-postgres psql -U postgres -d ngopicode -c \
  'SELECT pv.sku, count(dp.id) AS files FROM product_variant pv
   LEFT JOIN digital_product dp ON dp."productVariantId" = pv.id
   WHERE pv."deletedAt" IS NULL GROUP BY pv.sku ORDER BY pv.sku;'
```

Then run a real checkout through the storefront and confirm you reach the payment
page.

---

## Related scripts

| Script | Purpose |
|--------|---------|
| `scripts/setup-store.js` | This guide — currency, tax, shipping (idempotent) |
| `scripts/setup-catalog.js` | Categories: `product-type` facet + filter-based collections (idempotent) |
| `scripts/reindex.js` | Rebuild the search index; `--pending` flushes queued updates only |
| `scripts/seed-products.js` | Seeds the demo catalog (no files) |
| `scripts/seed-mockup-products.js` | Seeds `MOCKUP:` products **with real files** uploaded |
| `scripts/clear-orders.js` | Deletes orders and their dependent rows |
| `scripts/fix-*.js` | Ad-hoc repairs (sessions, order dates, active orders) |

> **Two setup commands, not one.** `setup-store.js` configures the *store*
> (money, tax, delivery). `setup-catalog.js` configures the *catalog taxonomy*
> (categories). Both are idempotent — run both on a fresh environment.
