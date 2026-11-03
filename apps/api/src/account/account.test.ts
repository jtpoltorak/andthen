import { putChange, deleteChange, parseBackup, type Routine } from '@andthen/core';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import type { Db } from '../db/client';
import { accounts, loginCodes, records, sessions } from '../db/schema';
import type { Mailer } from '../mail';
import { testDb } from '../test-db';

class FakeMailer implements Mailer {
  last = '';
  async sendSignInCode(_to: string, code: string) {
    this.last = code;
  }
  async sendInactiveWarning() {}
}

let db: Db;
let close: () => Promise<void>;
let app: FastifyInstance;
const mailer = new FakeMailer();
const clock = new Date('2026-11-03T12:00:00Z');
let people = 0;

beforeAll(async () => {
  ({ db, close } = await testDb());
  app = await buildApp({
    db,
    allowedOrigins: ['https://andthenhabits.com'],
    mailer,
    now: () => clock,
  });
});

afterAll(async () => {
  await app.close();
  await close();
});

async function signIn(email = `person${++people}@example.com`) {
  await app.inject({ method: 'POST', url: '/v1/auth/email/start', payload: { email } });
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/email/verify',
    payload: { email, code: mailer.last },
  });
  return { token: res.json().token as string, email };
}

const authed = (token: string) => ({ authorization: `Bearer ${token}` });
const routine = (id: string, anchor: string): Routine => ({
  id,
  anchor,
  order: 0,
  createdOn: '2026-11-01',
});

describe('GET /v1/export', () => {
  it('returns the account’s live records as a backup file the app can restore', async () => {
    const { token } = await signIn();
    const other = await signIn();
    const T = clock.getTime();
    const push = (t: string, changes: unknown[]) =>
      app.inject({
        method: 'POST',
        url: '/v1/sync',
        headers: authed(t),
        payload: { deviceId: 'd', cursor: 0, changes },
      });
    await push(token, [
      putChange('routines', routine('r1', 'After coffee'), 'd', T),
      putChange(
        'habits',
        {
          id: 'h1',
          routineId: 'r1',
          name: 'Stretch',
          twoMinuteVersion: 'Touch toes',
          order: 0,
          createdOn: '2026-11-01',
        },
        'd',
        T,
      ),
      putChange('checkIns', { habitId: 'h1', date: '2026-11-02', kind: 'full' }, 'd', T),
      // A check-in for a habit that isn't there is left out, so the file still restores.
      putChange('checkIns', { habitId: 'gone', date: '2026-11-02', kind: 'full' }, 'd', T),
      deleteChange('checkIns', 'h1|2026-11-01', 'd', T),
    ]);
    await push(other.token, [putChange('routines', routine('r9', 'Not mine'), 'd', T)]);

    const res = await app.inject({ method: 'GET', url: '/v1/export', headers: authed(token) });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="andthen-account-2026-11-03.json"',
    );
    const parsed = parseBackup(res.json());
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.data.routines.map((r) => r.id)).toEqual(['r1']);
    expect(parsed.data.checkIns).toEqual([{ habitId: 'h1', date: '2026-11-02', kind: 'full' }]);
  });

  it('needs a signed-in device', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/export' });
    expect(res.statusCode).toBe(401);
  });
});

describe('DELETE /v1/me', () => {
  it('deletes the account, its records and every signed-in device', async () => {
    const { token, email } = await signIn();
    const second = await app.inject({
      method: 'POST',
      url: '/v1/auth/email/start',
      payload: { email },
    });
    expect(second.statusCode).toBe(204);
    const laptop = (
      await app.inject({
        method: 'POST',
        url: '/v1/auth/email/verify',
        payload: { email, code: mailer.last },
      })
    ).json().token as string;
    await app.inject({
      method: 'POST',
      url: '/v1/sync',
      headers: authed(token),
      payload: {
        deviceId: 'd',
        cursor: 0,
        changes: [putChange('routines', routine('r1', 'After coffee'), 'd', clock.getTime())],
      },
    });
    // A code someone asked for but never used goes too.
    await app.inject({ method: 'POST', url: '/v1/auth/email/start', payload: { email } });
    const [account] = await db.select().from(accounts).where(eq(accounts.email, email));

    const res = await app.inject({ method: 'DELETE', url: '/v1/me', headers: authed(token) });
    expect(res.statusCode).toBe(204);

    expect(await db.select().from(accounts).where(eq(accounts.email, email))).toEqual([]);
    expect(await db.select().from(records).where(eq(records.accountId, account.id))).toEqual([]);
    expect(await db.select().from(sessions).where(eq(sessions.accountId, account.id))).toEqual([]);
    expect(await db.select().from(loginCodes).where(eq(loginCodes.email, email))).toEqual([]);
    const after = await app.inject({ method: 'GET', url: '/v1/me', headers: authed(laptop) });
    expect(after.statusCode).toBe(401);
  });
});
