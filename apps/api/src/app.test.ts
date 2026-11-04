import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { readConfig } from './config';
import type { Db } from './db/client';
import { accounts, records, sessions } from './db/schema';
import { NoMailer } from './mail';
import { testDb } from './test-db';

let db: Db;
let close: () => Promise<void>;
let app: FastifyInstance;

beforeAll(async () => {
  ({ db, close } = await testDb());
  app = await buildApp({
    db,
    allowedOrigins: ['https://andthenhabits.com'],
    mailer: new NoMailer(),
  });
});

afterAll(async () => {
  await app.close();
  await close();
});

describe('GET /health', () => {
  it('answers ok when the database does', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, version: 'dev' });
  });

  it('answers 503 when the database is unreachable', async () => {
    const broken = {
      execute: async () => {
        throw new Error('connection refused');
      },
    } as unknown as Db;
    const down = await buildApp({ db: broken, allowedOrigins: [], mailer: new NoMailer() });
    const res = await down.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    await down.close();
  });
});

describe('CORS', () => {
  it('lets the app origin call the API', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: { origin: 'https://andthenhabits.com', 'access-control-request-method': 'POST' },
    });
    expect(res.headers['access-control-allow-origin']).toBe('https://andthenhabits.com');
  });

  it('gives other sites no CORS permission', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://example.com' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('schema', () => {
  it('numbers every stored change in order, and deleting an account removes everything', async () => {
    const [account] = await db.insert(accounts).values({ email: 'a@example.com' }).returning();
    expect(account.plan).toBe('free');
    await db.insert(sessions).values({
      accountId: account.id,
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 1000),
    });
    const base = { accountId: account.id, updatedAt: 1, deviceId: 'd1' };
    const rows = await db
      .insert(records)
      .values([
        { ...base, collection: 'routines', key: 'r1', data: { id: 'r1' } },
        { ...base, collection: 'checkIns', key: 'h1|2026-11-03', deleted: true },
      ])
      .returning({ seq: records.seq });
    expect(rows[1].seq).toBeGreaterThan(rows[0].seq);

    await db.delete(accounts).where(eq(accounts.id, account.id));
    const left = await db.execute(
      sql`select (select count(*) from records) + (select count(*) from sessions) as n`,
    );
    expect(Number((left as unknown as { rows: { n: number }[] }).rows[0].n)).toBe(0);
  });
});

describe('readConfig', () => {
  it('needs a database URL and splits allowed origins', () => {
    expect(() => readConfig({})).toThrow('DATABASE_URL');
    expect(
      readConfig({
        DATABASE_URL: 'postgres://x',
        APP_ORIGIN: 'https://a.com, http://localhost:4200',
      }),
    ).toEqual({
      port: 3000,
      databaseUrl: 'postgres://x',
      allowedOrigins: ['https://a.com', 'http://localhost:4200'],
      resendApiKey: undefined,
      mailFrom: 'AndThen <hello@andthenhabits.com>',
      production: false,
    });
  });
});
