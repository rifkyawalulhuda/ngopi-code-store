#!/usr/bin/env node
'use strict';

/**
 * Seed script: add a "Lisensi" (license) option group with Personal / Extended
 * variants to every real product.
 *
 * Why a script instead of config:
 *   Vendure has no config-declared option groups — option groups, options and
 *   variants are runtime data created via the Admin API. Declaring them in
 *   `vendure-config.ts` is not supported.
 *
 * What it does, per product:
 *   1. createProductOptionGroup('lisensi', [personal, extended])  (once, reused)
 *   2. addOptionGroupToProduct(product, group)
 *   3. updateProductVariant(existing)  -> optionIds:[personal], renamed "<name> - Personal"
 *   4. createProductVariants(Extended) -> price = personal x EXTENDED_MULTIPLIER
 *   5. reindex  (so the storefront's search price range is correct)
 *
 * Idempotent: re-running skips products that already carry the option group.
 *
 * IMPORTANT — this script does NOT create digital files. Each new Extended
 * variant has no DigitalProduct until a file is uploaded in
 * `/admin/upload`. Until then the storefront deliberately refuses to sell it
 * (see the missing-file guard), so an Extended purchase can never fulfil with
 * zero downloads.
 *
 * Prerequisites:
 *   - Vendure dev server running (PORT from backend/.env, default 3010)
 *   - Superadmin credentials in .env (default superadmin/superadmin)
 *
 * Usage:
 *   node scripts/seed-license-variants.js
 *   node scripts/seed-license-variants.js --dry-run
 */

const http = require('http');
require('dotenv').config();

const PORT = process.env.PORT || '3010';
const ADMIN_API = `http://localhost:${PORT}/admin-api`;
const SUPERADMIN_USER = process.env.SUPERADMIN_USERNAME || 'superadmin';
const SUPERADMIN_PASS = process.env.SUPERADMIN_PASSWORD || 'superadmin';

/** Extended license default price = Personal price x this. Change per variant in the dashboard. */
const EXTENDED_MULTIPLIER = Number(process.env.EXTENDED_MULTIPLIER || 3);

/** Products whose names start with this are test data and are skipped. */
const SKIP_PREFIX = 'MOCKUP:';

const OPTION_GROUP_CODE = 'lisensi';
const OPTION_GROUP_NAME = 'Lisensi';
const OPTION_PERSONAL = { code: 'personal', name: 'Personal' };
const OPTION_EXTENDED = { code: 'extended', name: 'Extended' };

const DRY_RUN = process.argv.includes('--dry-run');

let authToken = '';

function gql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const url = new URL(ADMIN_API);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    };
    if (authToken) {
      headers['authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers,
      },
      (res) => {
        let data = '';
        const responseToken = res.headers['vendure-auth-token'];
        if (responseToken) authToken = responseToken;
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.errors) {
              reject(new Error(JSON.stringify(parsed.errors, null, 2)));
            } else {
              resolve(parsed.data);
            }
          } catch {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      },
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function rupiah(n) {
  return `Rp ${Number(n).toLocaleString('id-ID')}`;
}

async function login() {
  await gql(
    `mutation Login($username: String!, $password: String!) {
      login(username: $username, password: $password) {
        __typename
        ... on CurrentUser { id identifier }
        ... on ErrorResult { errorCode message }
      }
    }`,
    { username: SUPERADMIN_USER, password: SUPERADMIN_PASS },
  );
  const me = await gql(`query { me { id identifier } }`);
  if (!me.me) throw new Error('Login failed — check SUPERADMIN_USERNAME / SUPERADMIN_PASSWORD');
  console.log(`   Logged in as ${me.me.identifier}`);
}

/** Find the shared option group, or create it. */
async function ensureOptionGroup() {
  // `productOptionGroups` takes no filter arg in this Vendure version.
  const existing = await gql(
    `query { productOptionGroups { items { id code name options { id code name } } } }`,
  );
  const found = existing.productOptionGroups.items.find((g) => g.code === OPTION_GROUP_CODE);
  if (found) {
    console.log(`   Option group "${OPTION_GROUP_CODE}" already exists (ID ${found.id})`);
    return found;
  }

  if (DRY_RUN) {
    console.log(`   [dry-run] would create option group "${OPTION_GROUP_CODE}"`);
    return null;
  }

  const created = await gql(
    `mutation CreateOptionGroup($input: CreateProductOptionGroupInput!) {
      createProductOptionGroup(input: $input) { id code name options { id code name } }
    }`,
    {
      input: {
        code: OPTION_GROUP_CODE,
        translations: [{ languageCode: 'en', name: OPTION_GROUP_NAME }],
        options: [
          { code: OPTION_PERSONAL.code, translations: [{ languageCode: 'en', name: OPTION_PERSONAL.name }] },
          { code: OPTION_EXTENDED.code, translations: [{ languageCode: 'en', name: OPTION_EXTENDED.name }] },
        ],
      },
    },
  );
  console.log(`   Created option group "${OPTION_GROUP_CODE}" (ID ${created.createProductOptionGroup.id})`);
  return created.createProductOptionGroup;
}

async function getTaxCategoryId() {
  const data = await gql(`query { taxCategories { items { id name } } }`);
  const cat = data.taxCategories.items[0];
  if (!cat) throw new Error('No tax category found — run scripts/setup-store.js first');
  return cat.id;
}

async function main() {
  console.log('============================================================');
  console.log('  Seed: Lisensi variants (Personal / Extended)');
  console.log(`  Multiplier: ${EXTENDED_MULTIPLIER}x${DRY_RUN ? '   [DRY RUN]' : ''}`);
  console.log('============================================================\n');

  await login();

  const group = await ensureOptionGroup();
  const personalOption = group?.options.find((o) => o.code === OPTION_PERSONAL.code);
  const extendedOption = group?.options.find((o) => o.code === OPTION_EXTENDED.code);

  const taxCategoryId = await getTaxCategoryId();

  const data = await gql(`query {
    products(options: { take: 100 }) {
      items {
        id
        name
        slug
        optionGroups { id code }
        variants { id name sku price options { id code } }
      }
    }
  }`);

  const targets = data.products.items.filter((p) => !p.name.startsWith(SKIP_PREFIX));
  const skipped = data.products.items.filter((p) => p.name.startsWith(SKIP_PREFIX));

  console.log(`\n   ${targets.length} real product(s) to process, ${skipped.length} mockup(s) skipped.\n`);

  const needsFile = [];

  for (const product of targets) {
    console.log(`- ${product.name}`);

    const alreadyHasGroup = product.optionGroups.some((g) => g.code === OPTION_GROUP_CODE);
    if (alreadyHasGroup) {
      console.log('    skipped: already has the lisensi option group');
      continue;
    }

    const base = product.variants[0];
    if (!base) {
      console.log('    skipped: product has no variant to base the tiers on');
      continue;
    }

    const extendedPrice = Math.round(base.price * EXTENDED_MULTIPLIER);

    if (DRY_RUN) {
      console.log(`    [dry-run] add group -> personal(${rupiah(base.price)}) / extended(${rupiah(extendedPrice)})`);
      continue;
    }

    try {
      // 1. attach the option group
      await gql(
        `mutation AddGroup($productId: ID!, $optionGroupId: ID!) {
          addOptionGroupToProduct(productId: $productId, optionGroupId: $optionGroupId) { id }
        }`,
        { productId: product.id, optionGroupId: group.id },
      );

      // 2. existing variant becomes the Personal tier (name + option)
      await gql(
        `mutation UpdateVariant($input: UpdateProductVariantInput!) {
          updateProductVariant(input: $input) { id name }
        }`,
        {
          input: {
            id: base.id,
            translations: [{ languageCode: 'en', name: `${product.name} - ${OPTION_PERSONAL.name}` }],
            optionIds: [personalOption.id],
          },
        },
      );

      // 3. create the Extended tier
      const created = await gql(
        `mutation CreateVariants($input: [CreateProductVariantInput!]!) {
          createProductVariants(input: $input) { id name price }
        }`,
        {
          input: [
            {
              productId: product.id,
              sku: `${product.slug}-extended`,
              translations: [{ languageCode: 'en', name: `${product.name} - ${OPTION_EXTENDED.name}` }],
              price: extendedPrice,
              taxCategoryId,
              stockOnHand: 9999,
              optionIds: [extendedOption.id],
            },
          ],
        },
      );

      const ext = created.createProductVariants[0];
      console.log(`    OK  Personal ${rupiah(base.price)}  |  Extended ${rupiah(ext.price)} (variant ${ext.id})`);
      needsFile.push(`${product.name} - ${OPTION_EXTENDED.name}`);
    } catch (err) {
      console.log(`    FAILED: ${String(err.message).substring(0, 300)}`);
    }
  }

  if (!DRY_RUN) {
    try {
      await gql(`mutation { reindex { id } }`);
      console.log('\n   Reindex queued (search price ranges will refresh).');
    } catch (err) {
      console.log(`\n   Reindex failed (non-fatal): ${String(err.message).substring(0, 200)}`);
    }
  }

  console.log('\n============================================================');
  console.log('  Done.');
  if (needsFile.length) {
    console.log('\n  ACTION REQUIRED — upload a digital file for each of these,');
    console.log('  otherwise the storefront will refuse to sell them:');
    for (const name of needsFile) console.log(`    - ${name}`);
    console.log('\n  Upload at: http://localhost:3001/admin/upload');
  }
  console.log('============================================================');
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
