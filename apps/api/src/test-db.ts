import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import type { Db } from './db/client';
import * as schema from './db/schema';

/**
 * A fresh, migrated Postgres for one test file. PGlite is real Postgres compiled
 * to WebAssembly, so tests need no database server, locally or in CI.
 */
export async function testDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  return { db: db as unknown as Db, close: () => client.close() };
}
