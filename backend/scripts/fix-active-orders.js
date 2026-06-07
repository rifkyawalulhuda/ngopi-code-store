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

  // Mark completed orders as inactive
  const res = await c.query(`
    UPDATE "order"
    SET active = false
    WHERE active = true
      AND state IN ('PaymentSettled', 'Fulfilled', 'Delivered', 'Cancelled')
  `);
  console.log(`Marked ${res.rowCount} completed orders as inactive.`);

  // Clear session references to those orders
  const sessRes = await c.query(`
    UPDATE "session" s
    SET "activeOrderId" = NULL
    FROM "order" o
    WHERE s."activeOrderId" = o.id
      AND o.active = false
  `);
  console.log(`Cleared ${sessRes.rowCount} session references.`);

  await c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
