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

  const txRes = await c.query('SELECT id, "merchantRef", "orderId", status FROM tripay_transaction');
  console.log(`Tripay transactions: ${txRes.rowCount}`);
  txRes.rows.forEach(r => console.log(' ', r));

  const orderRes = await c.query('SELECT id, code, state FROM "order"');
  console.log(`\nOrders: ${orderRes.rowCount}`);
  orderRes.rows.forEach(r => console.log(' ', r));

  await c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
