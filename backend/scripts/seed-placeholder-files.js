#!/usr/bin/env node
'use strict';

/**
 * Seed script: upload PLACEHOLDER digital files for every real product variant
 * that has no file.
 *
 * Why this exists:
 *   The storefront refuses to sell a variant with no uploaded file (a paid order
 *   with no file can never be delivered). The real catalogue currently has NO
 *   files at all, which would make every product unbuyable. This uploads obvious
 *   placeholders so the store stays testable until real files are provided.
 *
 * These are NOT real deliverables. Replace them via /admin/upload.
 *
 * Prerequisites:
 *   - Vendure dev server running (PORT from backend/.env, default 3010)
 *   - Superadmin credentials in .env
 *
 * Usage:
 *   node scripts/seed-placeholder-files.js
 *   node scripts/seed-placeholder-files.js --dry-run
 */

require('dotenv').config();

const PORT = process.env.PORT || '3010';
const ADMIN_API = `http://localhost:${PORT}/admin-api`;
const SUPERADMIN_USER = process.env.SUPERADMIN_USERNAME || 'superadmin';
const SUPERADMIN_PASS = process.env.SUPERADMIN_PASSWORD || 'superadmin';

const SKIP_PREFIX = 'MOCKUP:';
const DRY_RUN = process.argv.includes('--dry-run');

/** Products delivered as a PDF rather than an archive. */
const PDF_SLUGS = ['panduan-docker-kubernetes', 'konsultasi-arsitektur-sistem'];

let authToken = '';

async function gql(query, variables = {}) {
  const res = await fetch(ADMIN_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const token = res.headers.get('vendure-auth-token');
  if (token) authToken = token;
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

/**
 * Minimal valid ZIP (empty archive) — 22-byte end-of-central-directory record.
 * Real enough that OS archive tools open it without complaining.
 */
function makeZip() {
  return Buffer.from([
    0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
}

/** Minimal valid single-page PDF. */
function makePdf(label) {
  const content = `BT /F1 16 Tf 72 700 Td (${label}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

async function uploadFile(variantId, filename, buffer, mimeType) {
  const form = new FormData();
  form.append(
    'operations',
    JSON.stringify({
      query: `mutation Upload($variantId: ID!, $file: Upload!) {
        uploadDigitalProduct(variantId: $variantId, file: $file) {
          id originalFileName fileSize mimeType
        }
      }`,
      variables: { variantId, file: null },
    }),
  );
  form.append('map', JSON.stringify({ '0': ['variables.file'] }));
  form.append('0', new Blob([buffer], { type: mimeType }), filename);

  const res = await fetch(ADMIN_API, {
    method: 'POST',
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: form,
  });
  const token = res.headers.get('vendure-auth-token');
  if (token) authToken = token;

  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'upload failed');
  return json.data.uploadDigitalProduct;
}

async function main() {
  console.log('============================================================');
  console.log('  Seed: placeholder digital files');
  console.log(`  ${DRY_RUN ? '[DRY RUN]' : 'This uploads PLACEHOLDER files.'}`);
  console.log('============================================================\n');

  await gql(
    `mutation Login($username: String!, $password: String!) {
      login(username: $username, password: $password) {
        __typename ... on CurrentUser { id identifier } ... on ErrorResult { message }
      }
    }`,
    { username: SUPERADMIN_USER, password: SUPERADMIN_PASS },
  );
  console.log('   Logged in.\n');

  const data = await gql(`query {
    products(options: { take: 100 }) {
      items { id name slug variants { id name sku } }
    }
  }`);

  const targets = data.products.items.filter((p) => !p.name.startsWith(SKIP_PREFIX));
  let uploaded = 0;

  for (const product of targets) {
    const usePdf = PDF_SLUGS.includes(product.slug);
    for (const variant of product.variants) {
      const check = await gql(
        `query { digitalProductByVariantId(variantId: "${variant.id}") { id originalFileName } }`,
      );
      if (check.digitalProductByVariantId) {
        console.log(`- ${variant.name}\n    has file already, skipped`);
        continue;
      }

      const ext = usePdf ? 'pdf' : 'zip';
      const mime = usePdf ? 'application/pdf' : 'application/zip';
      const filename = `PLACEHOLDER-${variant.sku}.${ext}`;
      const buffer = usePdf
        ? makePdf(`PLACEHOLDER - ${variant.name}`)
        : makeZip();

      if (DRY_RUN) {
        console.log(`- ${variant.name}\n    [dry-run] would upload ${filename} (${buffer.length} bytes)`);
        continue;
      }

      try {
        const res = await uploadFile(variant.id, filename, buffer, mime);
        console.log(`- ${variant.name}\n    OK  ${res.originalFileName} (${res.fileSize} bytes, ${res.mimeType})`);
        uploaded += 1;
      } catch (err) {
        console.log(`- ${variant.name}\n    FAILED: ${String(err.message).substring(0, 200)}`);
      }
    }
  }

  console.log('\n============================================================');
  console.log(`  Done. ${uploaded} placeholder file(s) uploaded.`);
  console.log('  Replace them with real deliverables at /admin/upload');
  console.log('============================================================');
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
