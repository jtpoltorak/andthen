import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { readConfig } from './config';

/**
 * Brings the database schema up to date. Railway runs this before each deploy
 * (the pre-deploy command), so a failing migration stops the deploy before new
 * code takes traffic.
 */
const pool = new pg.Pool({ connectionString: readConfig().databaseUrl, max: 1 });
const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
await migrate(drizzle(pool), { migrationsFolder });
await pool.end();
console.log('Database is up to date.');
