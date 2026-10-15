'use strict';

/**
 * Seed MOCKUP products WITH real deliverable files.
 *
 *   node scripts/seed-mockup-products.js
 *
 * Unlike `seed-products.js` (catalog only), this script also generates the
 * downloadable artifact and uploads it through the real
 * `uploadDigitalProduct` Admin API mutation — the same path the dashboard uses.
 * That makes the full purchase → pay → download flow verifiable end-to-end.
 *
 * Deliverables are synthesised locally:
 *   - a real ZIP (deflate) containing a small project tree
 *   - a real PDF (minimal, valid, openable)
 *
 * Products are clearly prefixed "MOCKUP" so they are never mistaken for real
 * catalog items, and they are created with `enabled: true` so they are
 * purchasable. Delete them from the dashboard when done.
 *
 * Idempotent: an existing slug is reused instead of duplicated, and its file is
 * replaced.
 *
 * Prerequisites: Vendure running, and `scripts/setup-store.js` already run
 * (currency/tax/shipping). See docs/store-setup.md.
 */

const http = require('http');
const zlib = require('zlib');
require('dotenv').config();

const PORT = process.env.PORT || '3000';
const ADMIN_API = `http://localhost:${PORT}/admin-api`;
const SUPERADMIN_USER = process.env.SUPERADMIN_USERNAME || 'superadmin';
const SUPERADMIN_PASS = process.env.SUPERADMIN_PASSWORD || 'superadmin';

let authToken = '';

// ---------------------------------------------------------------------------
// Admin API helper
// ---------------------------------------------------------------------------

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
        const token = res.headers['vendure-auth-token'];
        if (token) authToken = token;
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.errors) reject(new Error(JSON.stringify(parsed.errors, null, 2)));
            else resolve(parsed.data);
          } catch {
            reject(new Error(`Failed to parse response: ${data.slice(0, 300)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// File generators
// ---------------------------------------------------------------------------

/**
 * Builds a valid ZIP archive (deflate, with correct CRC32 + central directory).
 * Uses zlib.crc32 / zlib.deflateRawSync (Node >= 22).
 *
 * @param {Array<{name: string, data: Buffer}>} entries
 * @returns {Buffer}
 */
function buildZip(entries) {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const crc = zlib.crc32(entry.data);
    const deflated = zlib.deflateRawSync(entry.data, { level: 9 });
    // Fall back to STORE when deflating does not help (tiny/incompressible).
    const useDeflate = deflated.length < entry.data.length;
    const method = useDeflate ? 8 : 0;
    const payload = useDeflate ? deflated : entry.data;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(method, 8); // compression method
    local.writeUInt16LE(0, 10); // last mod time
    local.writeUInt16LE(0x2821, 12); // last mod date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18); // compressed size
    local.writeUInt32LE(entry.data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra field length

    localChunks.push(local, nameBuf, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // central directory signature
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12); // time
    central.writeUInt16LE(0x2821, 14); // date
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk number start
    central.writeUInt16LE(0, 36); // internal attributes
    central.writeUInt32LE(0, 38); // external attributes
    central.writeUInt32LE(offset, 42); // local header offset

    centralChunks.push(central, nameBuf);

    offset += local.length + nameBuf.length + payload.length;
  }

  const centralBuf = Buffer.concat(centralChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // end of central directory signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with central directory
  eocd.writeUInt16LE(entries.length, 8); // entries on this disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(centralBuf.length, 12); // central directory size
  eocd.writeUInt32LE(offset, 16); // central directory offset
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localChunks, centralBuf, eocd]);
}

/**
 * Builds a minimal but valid single-page PDF.
 * Offsets in the xref table are computed from the real byte positions.
 *
 * @param {string[]} lines
 * @returns {Buffer}
 */
function buildPdf(lines) {
  const escape = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  // Text block: start at y=780, step down 24pt per line.
  const textOps = lines
    .map((line, i) => {
      const y = 780 - i * 24;
      const size = i === 0 ? 18 : 11;
      return `BT /F1 ${size} Tf 56 ${y} Td (${escape(line)}) Tj ET`;
    })
    .join('\n');

  const content = Buffer.from(textOps, 'latin1');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R ' +
      '/Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${textOps}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1');
  const parts = [header];
  const offsets = [];
  let cursor = header.length;

  objects.forEach((body, i) => {
    offsets[i] = cursor;
    const chunk = Buffer.from(`${i + 1} 0 obj\n${body}\nendobj\n`, 'latin1');
    parts.push(chunk);
    cursor += chunk.length;
  });

  const xrefStart = cursor;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  xref +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefStart}\n%%EOF\n`;
  parts.push(Buffer.from(xref, 'latin1'));

  return Buffer.concat(parts);
}

/** A small but real project tree, so the ZIP is meaningful when extracted. */
function buildStarterKitZip() {
  const readme = `# MOCKUP Starter Kit

Ini file contoh (mockup) untuk menguji alur pembelian & download NgopiCode.
File ini bukan produk nyata.

## Isi
- README.md
- package.json
- src/index.js
- src/config.js
- LICENSE

Dibuat otomatis oleh scripts/seed-mockup-products.js
`;

  const pkg = JSON.stringify(
    {
      name: 'mockup-starter-kit',
      version: '1.0.0',
      private: true,
      description: 'MOCKUP deliverable — not a real product',
      main: 'src/index.js',
      scripts: { start: 'node src/index.js' },
      license: 'MIT',
    },
    null,
    2,
  ) + '\n';

  const indexJs = `// MOCKUP deliverable — not a real product
const { greet } = require('./config');

console.log(greet('NgopiCode'));
`;

  const configJs = `// MOCKUP deliverable — not a real product
function greet(name) {
  return \`Halo \${name}! File ini hasil download mockup.\`;
}

module.exports = { greet };
`;

  const license = `MIT License (MOCKUP)

Copyright (c) ${new Date().getFullYear()} NgopiCode

File ini adalah contoh untuk pengujian, bukan produk berlisensi nyata.
`;

  return buildZip([
    { name: 'README.md', data: Buffer.from(readme, 'utf8') },
    { name: 'package.json', data: Buffer.from(pkg, 'utf8') },
    { name: 'src/index.js', data: Buffer.from(indexJs, 'utf8') },
    { name: 'src/config.js', data: Buffer.from(configJs, 'utf8') },
    { name: 'LICENSE', data: Buffer.from(license, 'utf8') },
  ]);
}

function buildEbookPdf() {
  return buildPdf([
    'MOCKUP: Panduan Deployment',
    '',
    'Dokumen ini adalah contoh (mockup) untuk menguji',
    'alur pembelian dan download produk digital NgopiCode.',
    '',
    'Bukan produk nyata dan tidak berisi materi asli.',
    '',
    'Langkah verifikasi:',
    '1. Selesaikan pembayaran',
    '2. Buka tautan akses dari email / WhatsApp',
    '3. Unduh file ini dari halaman download',
    '',
    `Dibuat: ${new Date().toISOString()}`,
  ]);
}

// ---------------------------------------------------------------------------
// Upload via multipart GraphQL (same shape as the dashboard uploader)
// ---------------------------------------------------------------------------

const UPLOAD_MUTATION = `mutation UploadDigitalProduct($variantId: ID!, $file: Upload!) {
  uploadDigitalProduct(variantId: $variantId, file: $file) {
    id
    originalFileName
    fileSize
    mimeType
    objectKey
  }
}`;

async function uploadDeliverable(variantId, filename, mimeType, buffer) {
  if (!authToken) {
    throw new Error('No admin auth token available — login must run first');
  }

  const form = new FormData();
  form.append(
    'operations',
    JSON.stringify({ query: UPLOAD_MUTATION, variables: { variantId, file: null } }),
  );
  form.append('map', JSON.stringify({ '0': ['variables.file'] }));
  form.append('0', new Blob([buffer], { type: mimeType }), filename);

  // NOTE: do not set Content-Type — fetch adds the multipart boundary.
  // Send the token as a Bearer header, matching how the Admin API is called
  // elsewhere in this repo.
  const res = await fetch(ADMIN_API, {
    method: 'POST',
    headers: { authorization: `Bearer ${authToken}` },
    body: form,
  });

  const token = res.headers.get('vendure-auth-token');
  if (token) authToken = token;

  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data.uploadDigitalProduct;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

const MOCKUPS = [
  {
    name: 'MOCKUP: Starter Kit Source Code',
    slug: 'mockup-starter-kit-source-code',
    description:
      'Produk contoh untuk menguji alur pembelian dan pengiriman digital. ' +
      'Berisi ZIP kecil (README, package.json, src/) sebagai file unduhan.',
    shortDescription: 'Produk mockup berisi ZIP contoh untuk pengujian.',
    price: 25000,
    filename: 'mockup-starter-kit.zip',
    mimeType: 'application/zip',
    build: buildStarterKitZip,
    productType: 'Source Code',
    fileFormat: 'ZIP Archive',
    licenseType: 'Personal & Commercial',
    keyFeatures: 'ZIP contoh berisi struktur proyek\nDipakai untuk uji alur download\nBukan produk nyata',
    deliveryInfo: 'Instant download setelah pembayaran',
  },
  {
    name: 'MOCKUP: Ebook Panduan Deployment (PDF)',
    slug: 'mockup-ebook-panduan-deployment',
    description:
      'Produk contoh berupa PDF satu halaman untuk menguji alur pembelian ' +
      'dan pengiriman digital.',
    shortDescription: 'Ebook mockup (PDF) untuk pengujian.',
    price: 15000,
    filename: 'mockup-panduan-deployment.pdf',
    mimeType: 'application/pdf',
    build: buildEbookPdf,
    productType: 'Ebook',
    fileFormat: 'PDF',
    licenseType: 'Personal',
    keyFeatures: 'PDF satu halaman\nDipakai untuk uji alur download\nBukan produk nyata',
    deliveryInfo: 'Instant download setelah pembayaran',
  },
];

// ---------------------------------------------------------------------------

async function login() {
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
  console.log(`   ✅ logged in as ${data.login.identifier}`);
  console.log(`   ℹ️  auth token: ${authToken ? `captured (${authToken.length} chars)` : 'MISSING'}`);
}

/** Returns the variant id for a slug, or null when the product does not exist. */
async function findVariantId(slug) {
  const data = await gql(
    `query($slug: String!) { product(slug: $slug) { id variants { id sku } } }`,
    { slug },
  );
  const product = data.product;
  return product?.variants?.[0]?.id ?? null;
}

async function ensureProduct(mockup) {
  const existingVariantId = await findVariantId(mockup.slug);
  if (existingVariantId) {
    console.log(`   ⏭️  "${mockup.name}" already exists (variant ${existingVariantId})`);
    return existingVariantId;
  }

  const created = await gql(
    `mutation($input: CreateProductInput!) { createProduct(input: $input) { id slug } }`,
    {
      input: {
        translations: [
          {
            languageCode: 'en',
            name: mockup.name,
            slug: mockup.slug,
            description: mockup.description,
          },
        ],
        customFields: {
          shortDescription: mockup.shortDescription,
          keyFeatures: mockup.keyFeatures,
          deliveryInfo: mockup.deliveryInfo,
          productType: mockup.productType,
          fileFormat: mockup.fileFormat,
          licenseType: mockup.licenseType,
        },
      },
    },
  );

  const variants = await gql(
    `mutation($input: [CreateProductVariantInput!]!) {
       createProductVariants(input: $input) { id sku price currencyCode }
     }`,
    {
      input: [
        {
          productId: created.createProduct.id,
          sku: mockup.slug,
          price: mockup.price,
          taxCategoryId: '1',
          // Digital goods: no inventory tracking, otherwise checkout reports
          // insufficient stock.
          trackInventory: 'FALSE',
          stockOnHand: 9999,
          translations: [{ languageCode: 'en', name: mockup.name }],
        },
      ],
    },
  );

  const variant = variants.createProductVariants[0];
  console.log(`   ✅ created "${mockup.name}" → variant ${variant.id} (${variant.currencyCode} ${variant.price})`);
  return variant.id;
}

async function main() {
  console.log('🎁 Seeding MOCKUP products with real files\n');
  console.log('1. Login');
  await login();

  for (const [i, mockup] of MOCKUPS.entries()) {
    console.log(`\n${i + 2}. ${mockup.name}`);
    const variantId = await ensureProduct(mockup);

    const buffer = mockup.build();
    console.log(`   ℹ️  generated ${mockup.filename} (${buffer.length} bytes)`);

    const uploaded = await uploadDeliverable(
      variantId,
      mockup.filename,
      mockup.mimeType,
      buffer,
    );
    console.log(
      `   ✅ uploaded → objectKey=${uploaded.objectKey} ` +
        `(${uploaded.fileSize} bytes, ${uploaded.mimeType})`,
    );
  }

  console.log('\n🎉 Mockup products ready.');
  console.log('   Buy them from the storefront to verify the full download flow.');
  console.log('   Delete them from the dashboard when no longer needed.');
}

main().catch((e) => {
  console.error('\n❌ Failed:', e.message);
  process.exitCode = 1;
});
