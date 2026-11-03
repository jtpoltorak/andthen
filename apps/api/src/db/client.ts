import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import pg from 'pg';
import * as schema from './schema';

/** Any Drizzle Postgres database with our schema: node-postgres in production, PGlite in tests. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export function connect(databaseUrl: string): { db: Db; close: () => Promise<void> } {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  return { db: drizzlePg(pool, { schema }), close: () => pool.end() };
}
