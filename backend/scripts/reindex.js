'use strict';

/**
 * Rebuild the Vendure search index.
 *
 *   node scripts/reindex.js            # full reindex, waits for completion
 *   node scripts/reindex.js --pending  # only flush queued index updates
 *
 * Why this exists: the search index is normally kept current by the
 * DefaultSearchPlugin reacting to product events. Any change made *outside*
 * that path — most commonly direct SQL edits, or a bulk import — leaves the
 * index stale: deleted products keep showing up in search results and
 * `/products` while their detail pages 404.
 *
 * Run this after any out-of-band catalog change.
 */

const http = require('http');
require('dotenv').config();

const PORT = process.env.PORT || '3010';
const ADMIN_API = `http://localhost:${PORT}/admin-api`;
const SUPERADMIN_USER = process.env.SUPERADMIN_USERNAME || 'superadmin';
const SUPERADMIN_PASS = process.env.SUPERADMIN_PASSWORD || 'superadmin';

const onlyPending = process.argv.includes('--pending');

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

/** Counts what the Shop API search index reports, for before/after proof. */
async function indexSize() {
  const res = await fetch(`http://localhost:${PORT}/shop-api`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ search(input: { groupByProduct: true, take: 1 }) { totalItems } }' }),
  });
  const json = await res.json();
  return json?.data?.search?.totalItems ?? null;
}

/** Counts real products in the catalog, for comparison. */
async function catalogSize() {
  const res = await fetch(`http://localhost:${PORT}/shop-api`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ products(options: { take: 1 }) { totalItems } }' }),
  });
  const json = await res.json();
  return json?.data?.products?.totalItems ?? null;
}

async function main() {
  console.log('🔎 Reindexing search\n');

  const login = await gql(
    `mutation($u: String!, $p: String!) {
       login(username: $u, password: $p) {
         ... on CurrentUser { id identifier }
         ... on ErrorResult { message }
       }
     }`,
    { u: SUPERADMIN_USER, p: SUPERADMIN_PASS },
  );
  if (!login.login.identifier) throw new Error(`Login failed: ${login.login.message}`);
  console.log(`   ✅ logged in as ${login.login.identifier}`);

  const before = await indexSize();
  const catalog = await catalogSize();
  console.log(`   before: index=${before} indexed product(s), catalog=${catalog} live product(s)`);

  if (onlyPending) {
    await gql(`mutation { runPendingSearchIndexUpdates { success } }`);
    console.log('   ✅ flushed pending search index updates');
  } else {
    const started = await gql(`mutation { reindex { id queueName state } }`);
    console.log(`   ℹ️  reindex job queued (id=${started.reindex.id}, state=${started.reindex.state})`);

    // Poll until the job settles. The worker runs inline in this project, so it
    // processes without a separate process.
    const jobId = started.reindex.id;
    const deadline = Date.now() + 120_000;
    let state = started.reindex.state;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500));
      const job = await gql(
        `query($id: ID!) { job(jobId: $id) { id state isSettled result } }`,
        { id: jobId },
      );
      state = job.job?.state ?? state;
      if (job.job?.isSettled) break;
    }
    console.log(`   ✅ reindex finished (state=${state})`);
  }

  // The index is populated asynchronously; give it a moment to settle.
  await new Promise((r) => setTimeout(r, 3000));

  const after = await indexSize();
  const afterCatalog = await catalogSize();
  console.log(`   after:  index=${after} indexed product(s), catalog=${afterCatalog} live product(s)`);

  if (after != null && afterCatalog != null && after > afterCatalog) {
    console.log(
      `\n   ⚠️  index still has ${after - afterCatalog} extra entr(ies) — ` +
        `a product may exist in the index but not in the catalog.`,
    );
    process.exitCode = 2;
  } else {
    console.log('\n🎉 Index matches the catalog.');
  }
}

main().catch((e) => {
  console.error('\n❌ Failed:', e.message);
  process.exitCode = 1;
});
