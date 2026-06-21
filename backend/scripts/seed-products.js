/**
 * Seed script: Create dummy products for development testing.
 *
 * Prerequisites:
 * - Vendure dev server running on localhost:3000
 * - Superadmin credentials set in .env (default: superadmin/superadmin)
 *
 * Usage:
 *   node scripts/seed-products.js
 */

const http = require('http');
require('dotenv').config();

const ADMIN_API = 'http://localhost:3000/admin-api';
const SUPERADMIN_USER = process.env.SUPERADMIN_USERNAME || 'superadmin';
const SUPERADMIN_PASS = process.env.SUPERADMIN_PASSWORD || 'superadmin';

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

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      // Capture auth token from response header
      const responseToken = res.headers['vendure-auth-token'];
      if (responseToken) {
        authToken = responseToken;
      }
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
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const DUMMY_PRODUCTS = [
  {
    name: 'Laravel Starter Kit Pro',
    slug: 'laravel-starter-kit-pro',
    description: 'Boilerplate Laravel 11 lengkap dengan autentikasi, role management, API resources, dan Filament admin panel. Cocok untuk memulai proyek SaaS atau dashboard.',
    shortDescription: 'Boilerplate Laravel 11 + Filament admin panel siap pakai.',
    price: 149000,
    facetCode: 'one-time',
    customFields: {
      productType: 'Source Code',
      fileFormat: 'ZIP Archive',
      licenseType: 'Personal & Commercial',
      keyFeatures: 'Laravel 11 + PHP 8.3\nFilament Admin Panel\nRole & Permission Management\nAPI Authentication (Sanctum)\nDocker-ready deployment\nComprehensive documentation',
      deliveryInfo: 'Instant download setelah pembayaran',
    },
  },
  {
    name: 'Next.js E-Commerce Template',
    slug: 'nextjs-ecommerce-template',
    description: 'Template e-commerce modern dengan Next.js 14, Tailwind CSS, Stripe integration, dan Server Components. Responsive, SEO-friendly, dan production-ready.',
    shortDescription: 'Template toko online Next.js 14 + Tailwind CSS.',
    price: 199000,
    facetCode: 'one-time',
    customFields: {
      productType: 'Source Code',
      fileFormat: 'ZIP Archive',
      licenseType: 'Personal & Commercial',
      keyFeatures: 'Next.js 14 App Router\nTailwind CSS + shadcn/ui\nStripe Payment Integration\nServer Components & Streaming\nProduct search & filtering\nResponsive mobile-first design',
      deliveryInfo: 'Instant download setelah pembayaran',
    },
  },
  {
    name: 'Panduan Lengkap Docker & Kubernetes',
    slug: 'panduan-docker-kubernetes',
    description: 'Ebook komprehensif tentang containerization dan orchestration. Dari dasar Docker hingga deploy production dengan Kubernetes. Bahasa Indonesia, 250+ halaman.',
    shortDescription: 'Ebook Docker & Kubernetes dalam Bahasa Indonesia.',
    price: 89000,
    facetCode: 'one-time',
    customFields: {
      productType: 'Ebook',
      fileFormat: 'PDF',
      licenseType: 'Personal',
      keyFeatures: '250+ halaman konten\nBahasa Indonesia\nDocker dari nol hingga mahir\nKubernetes production deployment\nCI/CD pipeline examples\nBonus: cheat sheet & templates',
      deliveryInfo: 'Instant download setelah pembayaran',
    },
  },
  {
    name: 'Konsultasi Arsitektur Sistem',
    slug: 'konsultasi-arsitektur-sistem',
    description: 'Sesi konsultasi 1-on-1 selama 60 menit via Google Meet untuk membahas arsitektur sistem, tech stack selection, atau code review. Cocok untuk startup atau tim kecil.',
    shortDescription: 'Sesi konsultasi 60 menit via Google Meet.',
    price: 350000,
    facetCode: 'repeatable',
    customFields: {
      productType: 'Service',
      fileFormat: '',
      licenseType: '',
      keyFeatures: '60 menit sesi 1-on-1\nVia Google Meet\nArsitektur & design review\nTech stack recommendation\nScalability planning\nFollow-up notes via email',
      deliveryInfo: 'Jadwal ditentukan via WhatsApp setelah pembayaran',
    },
  },
  {
    name: 'Vue.js Dashboard Admin Template',
    slug: 'vuejs-dashboard-admin',
    description: 'Template dashboard admin modern dengan Vue 3, Vuetify 3, dan Pinia state management. Dilengkapi 50+ komponen siap pakai, dark mode, dan charts.',
    shortDescription: 'Dashboard admin Vue 3 + Vuetify dengan 50+ komponen.',
    price: 129000,
    facetCode: 'one-time',
    customFields: {
      productType: 'Source Code',
      fileFormat: 'ZIP Archive',
      licenseType: 'Personal & Commercial',
      keyFeatures: 'Vue 3 + Composition API\nVuetify 3 component library\n50+ pre-built components\nDark & light mode\nApexCharts integration\nRole-based access control',
      deliveryInfo: 'Instant download setelah pembayaran',
    },
  },
];

async function main() {
  console.log('🌱 Seeding dummy products...\n');

  // Step 1: Login
  console.log('1. Logging in as superadmin...');
  try {
    const loginData = await gql(`
      mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          ... on CurrentUser {
            id
            identifier
          }
          ... on InvalidCredentialsError {
            message
          }
        }
      }
    `, { username: SUPERADMIN_USER, password: SUPERADMIN_PASS });

    if (loginData.login.message) {
      throw new Error(loginData.login.message);
    }
    console.log(`   ✅ Logged in as: ${loginData.login.identifier} (token: ${authToken ? 'yes' : 'no'})\n`);
  } catch (err) {
    console.error('   ❌ Login failed:', err.message);
    process.exit(1);
  }

  // Step 2: Verify auth works
  console.log('2. Verifying admin access...');
  try {
    const me = await gql(`query { me { id identifier } }`);
    console.log(`   ✅ Verified: ${me.me.identifier}\n`);
  } catch (err) {
    console.error('   ❌ Auth verification failed:', err.message.substring(0, 200));
    console.error('   Token value:', authToken || '(empty)');
    process.exit(1);
  }

  // Step 3: Create "Purchase Rule" facet
  console.log('3. Creating "Purchase Rule" facet...');
  let facetValueMap = {};
  try {
    // First check if facet already exists
    const existing = await gql(`
      query {
        facets(options: { filter: { code: { eq: "purchase-rule" } } }) {
          items { id values { id code } }
        }
      }
    `);

    if (existing.facets.items.length > 0) {
      existing.facets.items[0].values.forEach(v => { facetValueMap[v.code] = v.id; });
      console.log('   ⏭️  Already exists:', Object.keys(facetValueMap).join(', '));
    } else {
      const facetData = await gql(`
        mutation {
          createFacet(input: {
            code: "purchase-rule"
            isPrivate: false
            translations: [{ languageCode: en, name: "Purchase Rule" }]
            values: [
              { code: "one-time", translations: [{ languageCode: en, name: "One Time" }] }
              { code: "repeatable", translations: [{ languageCode: en, name: "Repeatable" }] }
            ]
          }) {
            id
            values { id code }
          }
        }
      `);
      facetData.createFacet.values.forEach(v => { facetValueMap[v.code] = v.id; });
      console.log('   ✅ Created:', Object.keys(facetValueMap).join(', '));
    }
  } catch (err) {
    console.log('   ⚠️  Facet issue:', err.message.substring(0, 150));
  }

  // Step 4: Setup Tax Zone, Tax Category, and Tax Rate
  console.log('\n4. Setting up tax configuration...');
  let taxCategoryId = '1';
  let zoneId = '';

  // 4a: Create or get Zone
  try {
    const zones = await gql(`query { zones(options: { take: 10 }) { items { id name } } }`);
    if (zones.zones.items.length > 0) {
      zoneId = zones.zones.items[0].id;
      console.log(`   ✅ Zone exists: ${zones.zones.items[0].name} (ID: ${zoneId})`);
    } else {
      // Create a country first
      const country = await gql(`
        mutation {
          createCountry(input: {
            code: "ID"
            translations: [{ languageCode: en, name: "Indonesia" }]
            enabled: true
          }) { id code }
        }
      `);
      console.log(`   ✅ Country created: Indonesia`);

      // Create zone with the country
      const zone = await gql(`
        mutation {
          createZone(input: {
            name: "Indonesia"
            memberIds: ["${country.createCountry.id}"]
          }) { id name }
        }
      `);
      zoneId = zone.createZone.id;
      console.log(`   ✅ Zone created: Indonesia (ID: ${zoneId})`);
    }
  } catch (err) {
    console.log('   ⚠️  Zone issue:', err.message.substring(0, 150));
  }

  // 4b: Set the zone as default tax zone on the channel
  if (zoneId) {
    try {
      const channels = await gql(`query { channels { items { id code } } }`);
      const defaultChannel = channels.channels.items.find(c => c.code === '__default_channel__') || channels.channels.items[0];
      if (defaultChannel) {
        await gql(`
          mutation UpdateChannel($input: UpdateChannelInput!) {
            updateChannel(input: $input) {
              ... on Channel { id }
            }
          }
        `, {
          input: {
            id: defaultChannel.id,
            defaultTaxZoneId: zoneId,
            defaultShippingZoneId: zoneId,
          }
        });
        console.log(`   ✅ Default tax zone set on channel`);
      }
    } catch (err) {
      console.log('   ⚠️  Channel update issue:', err.message.substring(0, 150));
    }
  }

  // 4c: Get or create TaxCategory
  try {
    const taxData = await gql(`query { taxCategories { items { id name } } }`);
    if (taxData.taxCategories.items.length > 0) {
      taxCategoryId = taxData.taxCategories.items[0].id;
      console.log(`   ✅ Tax category: ${taxData.taxCategories.items[0].name} (ID: ${taxCategoryId})`);
    } else {
      const newTax = await gql(`
        mutation {
          createTaxCategory(input: { name: "Digital Products" }) { id name }
        }
      `);
      taxCategoryId = newTax.createTaxCategory.id;
      console.log(`   ✅ Tax category created: Digital Products (ID: ${taxCategoryId})`);
    }
  } catch (err) {
    console.log('   ⚠️  Tax category issue:', err.message.substring(0, 100));
  }

  // 4d: Create TaxRate (0% for digital products in Indonesia)
  if (zoneId && taxCategoryId) {
    try {
      const rates = await gql(`query { taxRates(options: { take: 10 }) { items { id name } } }`);
      if (rates.taxRates.items.length === 0) {
        await gql(`
          mutation {
            createTaxRate(input: {
              name: "Digital Products 0%"
              rate: 0
              enabled: true
              categoryId: "${taxCategoryId}"
              zoneId: "${zoneId}"
            }) { id name }
          }
        `);
        console.log(`   ✅ Tax rate created: 0% for digital products`);
      } else {
        console.log(`   ✅ Tax rate exists: ${rates.taxRates.items[0].name}`);
      }
    } catch (err) {
      console.log('   ⚠️  Tax rate issue:', err.message.substring(0, 150));
    }
  }

  // Step 5: Create products
  console.log('\n5. Creating products...\n');
  for (const product of DUMMY_PRODUCTS) {
    try {
      const facetValueIds = [];
      if (facetValueMap[product.facetCode]) {
        facetValueIds.push(facetValueMap[product.facetCode]);
      }

      const data = await gql(`
        mutation CreateProduct($input: CreateProductInput!) {
          createProduct(input: $input) {
            id
            name
            slug
          }
        }
      `, {
        input: {
          translations: [{
            languageCode: 'en',
            name: product.name,
            slug: product.slug,
            description: product.description,
          }],
          facetValueIds,
          customFields: {
            shortDescription: product.shortDescription,
            keyFeatures: product.customFields.keyFeatures,
            deliveryInfo: product.customFields.deliveryInfo,
            productType: product.customFields.productType,
            fileFormat: product.customFields.fileFormat,
            licenseType: product.customFields.licenseType,
          },
        },
      });

      const productId = data.createProduct.id;
      console.log(`   ✅ Product: ${product.name} (ID: ${productId})`);

      // Create variant
      const variantData = await gql(`
        mutation CreateVariant($input: [CreateProductVariantInput!]!) {
          createProductVariants(input: $input) {
            id
            name
            price
          }
        }
      `, {
        input: [{
          productId,
          sku: product.slug,
          translations: [{
            languageCode: 'en',
            name: product.name,
          }],
          price: product.price,
          taxCategoryId,
          stockOnHand: 9999,
          facetValueIds,
        }],
      });

      if (variantData.createProductVariants[0]) {
        console.log(`      💰 Variant: Rp ${product.price.toLocaleString('id-ID')}`);
      }
    } catch (err) {
      console.log(`   ❌ Failed: ${product.name} - ${err.message.substring(0, 200)}`);
    }
  }

  console.log('\n🎉 Seeding complete!');
  console.log('   Open http://localhost:3000/dashboard to manage products.');
}

main().catch(console.error);
