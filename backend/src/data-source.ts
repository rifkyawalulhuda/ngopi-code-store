import { DataSource } from 'typeorm';
import path from 'path';
import 'dotenv/config';

/**
 * Standalone DataSource for TypeORM CLI (migrations).
 * Mirrors dbConnectionOptions from vendure-config.ts.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'ngopicode',
  schema: process.env.DB_SCHEMA || 'public',
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
});
