'use strict';

/**
 * Idempotent catalog taxonomy setup.
 *
 *   node scripts/setup-catalog.js
 *
 * Creates the storefront's category navigation as REAL Vendure data:
 *
 *   facet `product-type`            collections (filter-based)
 *   ├─ source-code  ──────────────► source-code
 *   ├─ ebook        ──────────────► ebooks
 *   └─ service      ──────────────► services
 *
 * Why filter-based collections: a new product lands in the right category
 * automatically once its `productType` is set — no manual re-tagging in the
 * dashboard. The homepage previously linked to `/products?category=source-code`
 * etc. while NO collections existed, so every category link was a dead end.
 *
 * Facet values are derived from the existing `productType` custom field, so the
 * admin keeps filling in one field and the taxonomy follows.
 *
 * TEST DATA IS EXCLUDED. Products whose slug starts with `mockup-` or
 * `guest-test-` are deliberately NOT tagged, which keeps them out of every
 * collection even though they remain purchasable for checkout testing.
 *
 * Safe to run repeatedly. Requires the Vendure server to be running.
 */

const http = require('http');
require('dotenv').config();

const PORT = process.env.PORT || '3010';
const ADMIN_API = `http://localhost:${PORT}/admin-api`;
const SUPERADMIN_USER = process.env.SUPERADMIN_USERNAME || 'superadmin';
const SUPERADMIN_PASS = process.env.SUPERADMIN_PASSWORD || 'superadmin';

const FACET_CODE = 'product-type';

/** productType custom-field value → facet value code. */
const TYPE_TO_FACET = {
  'Source Code': 'source-code',
  Ebook: 'ebook',
  Service: 'service',
};

/** Collections to create, keyed by facet value code. */
const COLLECTIONS = [
  { facetCode: 'source-code', slug: 'source-code', name: 'Source Code', description: 'Source code & template siap pakai untuk mempercepat proyek Anda.' },
  { facetCode: 'ebook', slug: 'ebooks', name: 'Ebooks', description: 'Materi teknis mendalam untuk meningkatkan keahlian Anda.' },
  { facetCode: 'service', slug: 'services', name: 'Web Services', description: 'Layanan pengembangan web sesuai kebutuhan bisnis Anda.' },
];

/** Slug prefixes treated as test data — never tagged into collections. */
const TEST_SLUG_PREFIXES = ['mockup-', 'guest-test-'];

let authToken = '';

function gql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const url = new URL(ADMIN_API);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    };
    if (authToken) headers['authorization'] = `Bearer ${authToken}`;

    const req = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST', headers },
      (res) => {
        const t = res.headers['vendure-auth-token'];
        if (t) authToken = t;
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            const p = JSON.parse(d);
            if (p.errors) reject(new Error(JSON.stringify(p.errors, null, 2)));
            else resolve(p.data);
          } catch {
            reject(new Error(`Bad response: ${d.slice(0, 300)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const log = (m) => console.log(m);
const ok = (m) => console.log(`   ✅ ${m}`);
const info = (m) => console.log(`   ℹ️  ${m}`);
const skip = (m) => console.log(`   ⏭️  ${m}`);
const warn = (m) => console.log(`   ⚠️  ${m}`);

async function login() {
  log('1. Login');
  const d = await gql(
    `mutation($u: String!, $p: String!) {
       login(username: $u, password: $p) {
         ... on CurrentUser { id identifier }
         ... on ErrorResult { message }
       }
     }`,
    { u: SUPERADMIN_USER, p: SUPERADMIN_PASS },
  );
  if (!d.login.identifier) throw new Error(`Login failed: ${d.login.message}`);
  ok(`logged in as ${d.login.identifier}`);
}

/** Creates the facet + its values if missing. Returns a code → facetValueId map. */
async function ensureFacet() {
  log('\n2. Facet "product-type"');

  const existing = await gql(
    `query($code: String!) { facets(options: { filter: { code: { eq: $code } } }) { items { id code values { id code name } } } }`,
    { code: FACET_CODE },
  );

  let facet = existing.facets.items[0];

  if (!facet) {
    const created = await gql(
      `mutation($input: CreateFacetInput!) {
         createFacet(input: $input) { id code values { id code name } }
       }`,
      {
        input: {
          code: FACET_CODE,
          isPrivate: false,
          translations: [{ languageCode: 'en', name: 'Product Type' }],
          values: [
            { code: 'source-code', translations: [{ languageCode: 'en', name: 'Source Code' }] },
            { code: 'ebook', translations: [{ languageCode: 'en', name: 'Ebook' }] },
            { code: 'service', translations: [{ languageCode: 'en', name: 'Service' }] },
          ],
        },
      },
    );
    facet = created.createFacet;
    ok(`created facet "${FACET_CODE}" with ${facet.values.length} values`);
  } else {
    ok(`facet "${FACET_CODE}" already exists`);
    // Backfill any value that is missing.
    for (const [typeValue, code] of Object.entries(TYPE_TO_FACET)) {
      if (!facet.values.some((v) => v.code === code)) {
        const added = await gql(
          `mutation($input: CreateFacetValueInput!) {
             createFacetValue(input: $input) { id code name }
           }`,
          {
            input: {
              facetId: facet.id,
              code,
              translations: [{ languageCode: 'en', name: typeValue === 'Ebook' ? 'Ebook' : typeValue }],
            },
          },
        );
        facet.values.push(added.createFacetValue);
        warn(`added missing facet value "${code}"`);
      }
    }
  }

  const byCode = {};
  for (const v of facet.values) byCode[v.code] = v.id;
  return byCode;
}

/** Tags each non-test product with the facet value matching its productType. */
async function assignFacetValues(facetValueIds) {
  log('\n3. Tag products by productType');

  const d = await gql(
    `query { products(options: { take: 200 }) {
       items { id name slug facetValues { id code } customFields { productType } }
     } }`,
  );

  let tagged = 0;
  let excluded = 0;

  for (const p of d.products.items) {
    if (TEST_SLUG_PREFIXES.some((prefix) => p.slug.startsWith(prefix))) {
      info(`skipped test data: ${p.slug}`);
      excluded += 1;
      continue;
    }

    const type = p.customFields?.productType;
    const facetCode = type ? TYPE_TO_FACET[type] : undefined;
    if (!facetCode) {
      warn(`"${p.slug}" has productType="${type ?? ''}" — no matching facet value, left untagged`);
      continue;
    }

    const targetId = facetValueIds[facetCode];
    const already = (p.facetValues || []).some((fv) => fv.code === facetCode);
    if (already) {
      skip(`${p.slug} already tagged ${facetCode}`);
      continue;
    }

    await gql(
      `mutation($input: UpdateProductInput!) { updateProduct(input: $input) { id } }`,
      { input: { id: p.id, facetValueIds: [targetId] } },
    );
    ok(`${p.slug} → ${facetCode}`);
    tagged += 1;
  }

  log(`   ${tagged} tagged, ${excluded} test product(s) excluded`);
}

/** Creates the filter-based collections if missing. */
async function ensureCollections(facetValueIds) {
  log('\n4. Collections');

  const existing = await gql(`query { collections { items { id slug filters { code args { name value } } } } }`);
  const bySlug = new Map(existing.collections.items.map((c) => [c.slug, c]));

  for (const def of COLLECTIONS) {
    const facetValueId = facetValueIds[def.facetCode];
    if (!facetValueId) {
      warn(`no facet value id for ${def.facetCode}; skipping collection ${def.slug}`);
      continue;
    }

    if (bySlug.has(def.slug)) {
      skip(`collection "${def.slug}" already exists`);
      continue;
    }

    await gql(
      `mutation($input: CreateCollectionInput!) { createCollection(input: $input) { id slug } }`,
      {
        input: {
          isPrivate: false,
          translations: [
            { languageCode: 'en', name: def.name, slug: def.slug, description: def.description },
          ],
          filters: [
            {
              code: 'facet-value-filter',
              arguments: [
                // List argument → JSON-encoded array string.
                { name: 'facetValueIds', value: JSON.stringify([facetValueId]) },
                { name: 'containsAny', value: 'true' },
                { name: 'combineWithAnd', value: 'true' },
              ],
            },
          ],
        },
      },
    );
    ok(`created collection "${def.slug}" (${def.name})`);
  }
}

/** Reports what each collection now resolves to, so the result is verifiable. */
async function report() {
  log('\n5. Verification');

  // Give the catalog a moment to settle before counting.
  await new Promise((r) => setTimeout(r, 1500));

  const shopApi = `http://localhost:${PORT}/shop-api`;
  const query = `query($slug: String!) {
    collection(slug: $slug) { name slug productVariantCount }
  }`;

  let empty = 0;
  for (const def of COLLECTIONS) {
    let body;
    try {
      const res = await fetch(shopApi, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables: { slug: def.slug } }),
      });
      body = await res.json();
    } catch (e) {
      warn(`could not query ${def.slug}: ${e.message}`);
      continue;
    }
    const c = body?.data?.collection;
    if (!c) {
      warn(`collection "${def.slug}" not found via Shop API`);
      continue;
    }
    const count = c.productVariantCount ?? 0;
    if (count === 0) {
      warn(`${def.slug}: 0 produk — cek apakah produk sudah punya facet "product-type"`);
      empty += 1;
    } else {
      ok(`${def.slug}: ${count} produk`);
    }
  }

  if (empty > 0) {
    warn(
      `${empty} collection kosong. Kategori akan tampak kosong di storefront. ` +
        `Pastikan setiap produk punya custom field productType (Source Code / Ebook / Service).`,
    );
  }
}

async function main() {
  log('🗂  Catalog taxonomy setup\n');
  await login();
  const facetValueIds = await ensureFacet();
  await assignFacetValues(facetValueIds);
  await ensureCollections(facetValueIds);
  await report();
  log('\n🎉 Catalog taxonomy ready.');
}

main().catch((e) => {
  console.error('\n❌ Failed:', e.message);
  process.exitCode = 1;
});
