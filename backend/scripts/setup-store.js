'use strict';

/**
 * Idempotent store setup / repair for NgopiCode.
 *
 * Run against a running Vendure server:
 *   node scripts/setup-store.js
 *
 * What it guarantees:
 *  1. Channel currency is IDR (this project is IDR-only: IdrMoneyStrategy
 *     precision 0, Rupiah amounts, Rupiah price formatting).
 *  2. The channel has default tax + shipping zones.
 *  3. A "Digital Products" tax category and a 0% tax rate exist for that zone.
 *  4. Exactly one valid "digital-delivery" shipping method exists, and any
 *     shipping method with INCOMPLETE calculator/checker arguments is repaired.
 *
 * Why #4 matters: Vendure's ConfigurableOperation only assigns the arguments
 * that are actually present in the stored input — `defaultValue` is a UI hint,
 * NOT a runtime fallback. A shipping method saved without `taxRate` therefore
 * yields `taxRate === undefined`, which makes the shipping calculator return
 * `NaN` and blows up the whole `eligibleShippingMethods` query with
 * "Money cannot represent non numeric value: NaN". That single bad row breaks
 * checkout for every customer, so this script both repairs such rows and
 * prevents new ones.
 *
 * Safe to run repeatedly.
 */

const http = require('http');
require('dotenv').config();

const PORT = process.env.PORT || '3010';
const ADMIN_API = `http://localhost:${PORT}/admin-api`;
const SUPERADMIN_USER = process.env.SUPERADMIN_USERNAME || 'superadmin';
const SUPERADMIN_PASS = process.env.SUPERADMIN_PASSWORD || 'superadmin';

const CANONICAL_SHIPPING_CODE = 'digital-delivery';
const TAX_CATEGORY_NAME = 'Digital Products';

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
        const responseToken = res.headers['vendure-auth-token'];
        if (responseToken) authToken = responseToken;
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.errors) {
              reject(new Error(JSON.stringify(parsed.errors, null, 2)));
            } else {
              resolve(parsed.data);
            }
          } catch (e) {
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

const log = (msg) => console.log(msg);
const ok = (msg) => console.log(`   ✅ ${msg}`);
const info = (msg) => console.log(`   ℹ️  ${msg}`);
const warn = (msg) => console.log(`   ⚠️  ${msg}`);

async function login() {
  log('1. Login as superadmin');
  const data = await gql(
    `mutation($u: String!, $p: String!) {
       login(username: $u, password: $p) {
         ... on CurrentUser { id identifier }
         ... on ErrorResult { message }
       }
     }`,
    { u: SUPERADMIN_USER, p: SUPERADMIN_PASS },
  );
  if (!data.login.identifier) throw new Error(`Login failed: ${data.login.message}`);
  ok(`logged in as ${data.login.identifier}`);
}

/** Returns the zone to use for tax + shipping, creating one if necessary. */
async function ensureZone() {
  log('\n2. Zone');
  const data = await gql(`query { zones(options: { take: 50 }) { items { id name } } }`);
  const zones = data.zones.items;
  if (zones.length) {
    const preferred = zones.find((z) => z.name === 'Indonesia') || zones[0];
    ok(`using zone "${preferred.name}" (id ${preferred.id})`);
    return preferred.id;
  }

  info('no zone found — creating country ID + zone Indonesia');
  const country = await gql(
    `mutation { createCountry(input: { code: "ID", enabled: true, translations: [{ languageCode: en, name: "Indonesia" }] }) { id } }`,
  );
  const zone = await gql(
    `mutation($id: ID!) { createZone(input: { name: "Indonesia", memberIds: [$id] }) { id name } }`,
    { id: country.createCountry.id },
  );
  ok(`created zone "${zone.createZone.name}" (id ${zone.createZone.id})`);
  return zone.createZone.id;
}

async function ensureChannel(zoneId) {
  log('\n3. Channel currency + zones');
  const data = await gql(
    `query { channels { items { id code defaultCurrencyCode availableCurrencyCodes defaultTaxZone { id } defaultShippingZone { id } } } }`,
  );
  const channel =
    data.channels.items.find((c) => c.code === '__default_channel__') || data.channels.items[0];
  if (!channel) throw new Error('no channel found');

  const needsUpdate =
    channel.defaultCurrencyCode !== 'IDR' ||
    !(channel.availableCurrencyCodes || []).includes('IDR') ||
    String(channel.defaultTaxZone?.id) !== String(zoneId) ||
    String(channel.defaultShippingZone?.id) !== String(zoneId);

  if (!needsUpdate) {
    ok(`channel already correct (${channel.defaultCurrencyCode}, zones ${zoneId})`);
    return channel.id;
  }

  const result = await gql(
    `mutation($input: UpdateChannelInput!) {
       updateChannel(input: $input) { ... on Channel { id defaultCurrencyCode } ... on ErrorResult { message } }
     }`,
    {
      input: {
        id: channel.id,
        defaultCurrencyCode: 'IDR',
        availableCurrencyCodes: ['IDR'],
        defaultTaxZoneId: zoneId,
        defaultShippingZoneId: zoneId,
      },
    },
  );
  if (result.updateChannel.message) throw new Error(result.updateChannel.message);
  ok(
    `channel updated: currency ${channel.defaultCurrencyCode} → IDR, ` +
      `tax/shipping zone → ${zoneId}`,
  );
  return channel.id;
}

async function ensureTax(zoneId) {
  log('\n4. Tax category + rate');

  const cats = await gql(`query { taxCategories { items { id name isDefault } } }`);
  let category = cats.taxCategories.items.find((c) => c.name === TAX_CATEGORY_NAME);
  if (!category) {
    const created = await gql(
      `mutation { createTaxCategory(input: { name: "${TAX_CATEGORY_NAME}" }) { id name } }`,
    );
    category = created.createTaxCategory;
    ok(`created tax category "${category.name}" (id ${category.id})`);
  } else {
    ok(`tax category "${category.name}" (id ${category.id})`);
  }

  const rates = await gql(
    `query { taxRates(options: { take: 100 }) { items { id name value enabled category { id } zone { id } } } }`,
  );
  const existing = rates.taxRates.items.find(
    (r) => String(r.category?.id) === String(category.id) && String(r.zone?.id) === String(zoneId),
  );
  if (existing) {
    ok(`tax rate "${existing.name}" (${existing.value}%) already covers this category+zone`);
    return category.id;
  }

  const created = await gql(
    `mutation($input: CreateTaxRateInput!) { createTaxRate(input: $input) { id name value } }`,
    {
      input: {
        name: `${TAX_CATEGORY_NAME} 0%`,
        value: 0,
        enabled: true,
        categoryId: category.id,
        zoneId,
      },
    },
  );
  ok(`created tax rate "${created.createTaxRate.name}" (${created.createTaxRate.value}%)`);
  return category.id;
}

/**
 * Fetches the declared argument definitions for every shipping calculator and
 * eligibility checker, keyed by code.
 */
async function fetchArgDefinitions() {
  const data = await gql(`
    query {
      shippingCalculators { code args { name defaultValue } }
      shippingEligibilityCheckers { code args { name defaultValue } }
    }
  `);
  const map = new Map();
  for (const def of [...data.shippingCalculators, ...data.shippingEligibilityCheckers]) {
    map.set(def.code, def.args || []);
  }
  return map;
}

/** Names of declared args that are missing from a stored operation input. */
function missingArgs(operation, defs) {
  const declared = defs.get(operation.code);
  if (!declared) return [];
  const present = new Set((operation.args || []).map((a) => a.name));
  return declared.filter((a) => !present.has(a.name)).map((a) => a.name);
}

/** Builds a complete argument list, filling gaps from the declared defaults. */
function completeArgs(operation, defs) {
  const declared = defs.get(operation.code) || [];
  const present = new Map((operation.args || []).map((a) => [a.name, a.value]));
  return declared.map((a) => ({
    name: a.name,
    value: present.has(a.name) ? present.get(a.name) : String(a.defaultValue ?? ''),
  }));
}

async function ensureShipping(zoneId) {
  log('\n5. Shipping method');

  const defs = await fetchArgDefinitions();
  const data = await gql(
    `query { shippingMethods { items { id code calculator { code args { name value } } checker { code args { name value } } } } }`,
  );
  const methods = data.shippingMethods.items;

  // 5a. Repair incomplete methods — a single NaN-producing row breaks checkout.
  let repaired = 0;
  for (const method of methods) {
    const missingCalc = missingArgs(method.calculator, defs);
    const missingCheck = missingArgs(method.checker, defs);
    if (!missingCalc.length && !missingCheck.length) continue;

    await gql(
      `mutation($input: UpdateShippingMethodInput!) {
         updateShippingMethod(input: $input) { id code }
       }`,
      {
        input: {
          id: method.id,
          calculator: { code: method.calculator.code, arguments: completeArgs(method.calculator, defs) },
          checker: { code: method.checker.code, arguments: completeArgs(method.checker, defs) },
        },
      },
    );
    repaired += 1;
    warn(
      `repaired "${method.code}" — was missing calculator[${missingCalc.join(', ') || '-'}] ` +
        `checker[${missingCheck.join(', ') || '-'}]`,
    );
  }
  if (repaired) ok(`repaired ${repaired} shipping method(s)`);

  // 5b. Ensure the canonical method exists.
  const canonical = methods.find((m) => m.code === CANONICAL_SHIPPING_CODE);
  if (canonical) {
    ok(`canonical shipping method "${CANONICAL_SHIPPING_CODE}" already exists`);
    return;
  }

  await gql(
    `mutation($input: CreateShippingMethodInput!) {
       createShippingMethod(input: $input) { id code }
     }`,
    {
      input: {
        code: CANONICAL_SHIPPING_CODE,
        fulfillmentHandler: 'manual-fulfillment',
        checker: {
          code: 'default-shipping-eligibility-checker',
          arguments: [{ name: 'orderMinimum', value: '0' }],
        },
        calculator: {
          code: 'default-shipping-calculator',
          // ALL declared args must be present — see the file header.
          arguments: [
            { name: 'rate', value: '0' },
            { name: 'includesTax', value: 'auto' },
            { name: 'taxRate', value: '0' },
          ],
        },
        translations: [
          { languageCode: 'en', name: 'Pengiriman Digital', description: 'Instan, tanpa ongkir' },
        ],
      },
    },
  );
  ok(`created canonical shipping method "${CANONICAL_SHIPPING_CODE}"`);
}

async function main() {
  log('🛠  NgopiCode store setup / repair\n');
  await login();
  const zoneId = await ensureZone();
  await ensureChannel(zoneId);
  await ensureTax(zoneId);
  await ensureShipping(zoneId);
  log('\n🎉 Store setup complete.');
}

main().catch((e) => {
  console.error('\n❌ Setup failed:', e.message);
  process.exit(1);
});
