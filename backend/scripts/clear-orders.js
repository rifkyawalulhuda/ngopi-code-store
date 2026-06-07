'use strict';
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'ngopicode',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  await c.connect();
  console.log('Connected to database.');

  // Delete in order of foreign key dependencies
  const tables = [
    'digital_download',
    'tripay_transaction',
    'payment',
    'surcharge',
    'order_modification',
    'shipping_line',
    'order_line',
  ];

  for (const table of tables) {
    try {
      const res = await c.query(`DELETE FROM "${table}"`);
      console.log(`  ${table}: ${res.rowCount} rows deleted`);
    } catch (e) {
      // Table might not exist, skip
      console.log(`  ${table}: skipped (${e.message.split('\n')[0]})`);
    }
  }

  // Finally delete orders (clear session FK first)
  try {
    await c.query('UPDATE "session" SET "activeOrderId" = NULL WHERE "activeOrderId" IS NOT NULL');
    console.log('  session: activeOrderId cleared');
  } catch (e) {
    console.log(`  session: skipped (${e.message.split('\n')[0]})`);
  }

  const orderRes = await c.query('DELETE FROM "order"');
  console.log(`  order: ${orderRes.rowCount} rows deleted`);

  console.log('\nAll orders cleared successfully.');
  await c.end();
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
