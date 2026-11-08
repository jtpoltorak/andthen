import {
  MAX_CLOCK_SKEW_MS,
  deleteChange,
  putChange,
  type CheckIn,
  type Habit,
  type SyncChange,
  type SyncResponse,
} from '@andthen/core';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import type { Db } from '../db/client';
import { accounts, loginCodes } from '../db/schema';
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
const T = clock.getTime();

beforeAll(async () => {
  ({ db, close } = await testDb());
  app = await buildApp({
    db,
    allowedOrigins: ['https://andthenhabits.com'],
    mailer,
    now: () => clock,
    syncPageSize: 3,
  });
});

beforeEach(async () => {
  await db.delete(accounts);
  await db.delete(loginCodes);
});

afterAll(async () => {
  await app.close();
  await close();
});

let people = 0;

/** Each sign-in uses a fresh address, so the per-email sign-in limit never gets in the way. */
async function signIn(email = `person${++people}@example.com`): Promise<string> {
  await app.inject({ method: 'POST', url: '/v1/auth/email/start', payload: { email } });
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/email/verify',
    payload: { email, code: mailer.last },
  });
  return res.json().token;
}

/** One device: a token, an id and the cursor it remembers between syncs. */
function device(token: string, deviceId: string) {
  let cursor = 0;
  return {
    get cursor() {
      return cursor;
    },
    async sync(changes: SyncChange[] = []): Promise<SyncResponse> {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/sync',
        headers: { authorization: `Bearer ${token}` },
        payload: { deviceId, cursor, changes },
      });
      expect(res.statusCode, res.body).toBe(200);
      const body = res.json() as SyncResponse;
      cursor = body.cursor;
      return body;
    },
    /** Syncs until there's nothing more to pull, collecting every pulled change. */
    async pullAll(): Promise<SyncChange[]> {
      const all: SyncChange[] = [];
      let body: SyncResponse;
      do {
        body = await this.sync();
        all.push(...body.changes);
      } while (body.more);
      return all;
    },
  };
}

const habit: Habit = {
  id: 'h1',
  routineId: 'r1',
  name: 'Stretch',
  twoMinuteVersion: 'Touch toes',
  order: 0,
  createdOn: '2026-11-01',
};
const checkIn = (kind: CheckIn['kind']): CheckIn => ({ habitId: 'h1', date: '2026-11-03', kind });

describe('POST /v1/sync', () => {
  it('needs a signed-in device', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/sync',
      payload: { deviceId: 'd', cursor: 0, changes: [] },
    });
    expect(res.statusCode).toBe(401);
  });

  it("sends one device's changes to the other, without echoing them back", async () => {
    const token = await signIn();
    const phone = device(token, 'phone');
    const laptop = device(token, 'laptop');

    const pushed = await phone.sync([
      putChange('habits', habit, 'phone', T),
      putChange('checkIns', checkIn('full'), 'phone', T),
    ]);
    expect(pushed.changes).toEqual([]);
    expect(pushed.cursor).toBeGreaterThan(0);

    const pulled = await laptop.sync();
    expect(pulled.changes.map((c) => `${c.collection}/${c.key}`)).toEqual([
      'habits/h1',
      'checkIns/h1|2026-11-03',
    ]);
    expect(pulled.changes[1]).toMatchObject({ deviceId: 'phone', data: checkIn('full') });

    // Nothing new since: an empty pull, and the cursor stays put.
    const again = await laptop.sync();
    expect(again).toEqual({ cursor: pulled.cursor, changes: [], more: false });
  });

  it("carries a check-in's tiny journal and time to the other device", async () => {
    const token = await signIn();
    const phone = device(token, 'phone');
    const laptop = device(token, 'laptop');
    const noted: CheckIn = { ...checkIn('full'), mood: 'good', note: 'Before work', at: '07:25' };

    await phone.sync([putChange('checkIns', noted, 'phone', T)]);
    const pulled = await laptop.sync();
    expect(pulled.changes[0]).toMatchObject({ data: noted });
  });

  it('the newest edit wins, whichever device syncs first', async () => {
    const token = await signIn();
    const phone = device(token, 'phone');
    const laptop = device(token, 'laptop');

    // Both edited the same check-in offline. The laptop's tap was later, but the laptop syncs first.
    await laptop.sync([putChange('checkIns', checkIn('skip'), 'laptop', T - 1000)]);
    const phoneSync = await phone.sync([putChange('checkIns', checkIn('full'), 'phone', T - 5000)]);
    // The phone's older edit lost, so the phone is told about the laptop's.
    expect(phoneSync.changes).toEqual([putChange('checkIns', checkIn('skip'), 'laptop', T - 1000)]);
    expect((await laptop.sync()).changes).toEqual([]);
  });

  it('breaks a timestamp tie by device id', async () => {
    const token = await signIn();
    const a = device(token, 'device-a');
    const b = device(token, 'device-b');
    await b.sync([putChange('checkIns', checkIn('mini'), 'device-b', T)]);
    const res = await a.sync([putChange('checkIns', checkIn('full'), 'device-a', T)]);
    expect(res.changes[0]).toMatchObject({ deviceId: 'device-b', data: { kind: 'mini' } });
  });

  it('passes on a tombstone, and a later edit brings the record back', async () => {
    const token = await signIn();
    const phone = device(token, 'phone');
    const laptop = device(token, 'laptop');
    await phone.sync([putChange('checkIns', checkIn('full'), 'phone', T - 3000)]);
    await laptop.sync();

    await phone.sync([deleteChange('checkIns', 'h1|2026-11-03', 'phone', T - 2000)]);
    const gone = await laptop.sync();
    expect(gone.changes).toEqual([deleteChange('checkIns', 'h1|2026-11-03', 'phone', T - 2000)]);
    expect(gone.changes[0]).not.toHaveProperty('data');

    await laptop.sync([putChange('checkIns', checkIn('mini'), 'laptop', T - 1000)]);
    expect((await phone.sync()).changes[0]).toMatchObject({
      deleted: false,
      data: { kind: 'mini' },
    });
  });

  it('pages through a big pull', async () => {
    const token = await signIn();
    const phone = device(token, 'phone');
    const days = ['01', '02', '03', '04', '05', '06', '07'];
    await phone.sync(
      days.map((d) =>
        putChange('checkIns', { habitId: 'h1', date: `2026-11-${d}`, kind: 'full' }, 'phone', T),
      ),
    );

    const laptop = device(token, 'laptop');
    const first = await laptop.sync();
    expect(first.changes).toHaveLength(3);
    expect(first.more).toBe(true);
    const rest = await laptop.pullAll();
    expect([...first.changes, ...rest].map((c) => c.key)).toEqual(
      days.map((d) => `h1|2026-11-${d}`),
    );
  });

  it('first syncs from two devices merge instead of overwriting', async () => {
    const token = await signIn();
    const phone = device(token, 'phone');
    const laptop = device(token, 'laptop');
    const morning = { id: 'r-phone', anchor: 'After coffee', order: 0, createdOn: '2026-11-01' };
    const evening = { id: 'r-laptop', anchor: 'After dinner', order: 0, createdOn: '2026-11-02' };

    await phone.sync([putChange('routines', morning, 'phone', T)]);
    await laptop.sync([putChange('routines', evening, 'laptop', T)]);
    const pulled = await phone.pullAll();
    expect(pulled.map((c) => c.key)).toEqual(['r-laptop']);
  });

  it("keeps each account's records to itself", async () => {
    const sam = device(await signIn('sam@example.com'), 'phone');
    const alex = device(await signIn('alex@example.com'), 'phone');
    await sam.sync([putChange('habits', habit, 'phone', T)]);
    expect(await alex.pullAll()).toEqual([]);
  });

  it('refuses a bad change and stores nothing from that request', async () => {
    const token = await signIn();
    const phone = device(token, 'phone');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/sync',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        deviceId: 'phone',
        cursor: 0,
        changes: [
          putChange('habits', habit, 'phone', T),
          putChange('checkIns', checkIn('full'), 'phone', T + MAX_CLOCK_SKEW_MS + 1),
        ],
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'bad_change', index: 1 });
    expect(await device(token, 'laptop').pullAll()).toEqual([]);
    expect(phone.cursor).toBe(0);
  });

  it('records when the account last synced', async () => {
    const token = await signIn();
    await device(token, 'phone').sync();
    const [row] = await db.select().from(accounts);
    expect(row.lastSyncAt).toEqual(clock);
  });
});
