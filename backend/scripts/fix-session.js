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

  // Clear activeOrderId from all sessions that reference fulfilled/completed orders
  const res = await c.query(`
    UPDATE "session" s
    SET "activeOrderId" = NULL
    FROM "order" o
    WHERE s."activeOrderId" = o.id
      AND o.state IN ('Fulfilled', 'Delivered', 'PaymentSettled', 'Cancelled')
  `);

  console.log(`Cleared ${res.rowCount} sessions with completed orders.`);
  await c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
