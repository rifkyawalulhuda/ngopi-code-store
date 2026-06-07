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

  const res = await c.query(`
    UPDATE "order"
    SET "orderPlacedAt" = "updatedAt"
    WHERE "orderPlacedAt" IS NULL
      AND state IN ('PaymentSettled', 'Fulfilled', 'Delivered')
  `);

  console.log(`Fixed ${res.rowCount} orders with missing orderPlacedAt.`);
  await c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
