import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanUp } from './cleanup';
import type { Db } from './db/client';
import { accounts, loginCodes, records, sessions } from './db/schema';
import type { Mailer } from './mail';
import { testDb } from './test-db';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2028-11-03T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);

class FakeMailer implements Mailer {
  warned: { to: string; deleteOn: Date }[] = [];
  failFor = new Set<string>();
  async sendSignInCode() {}
  async sendInactiveWarning(to: string, deleteOn: Date) {
    if (this.failFor.has(to)) throw new Error('mail down');
    this.warned.push({ to, deleteOn });
  }
}

let db: Db;
let close: () => Promise<void>;
let mailer: FakeMailer;

beforeAll(async () => {
  ({ db, close } = await testDb());
});

beforeEach(async () => {
  await db.delete(accounts);
  await db.delete(loginCodes);
  mailer = new FakeMailer();
});

afterAll(async () => {
  await close();
});

async function account(
  email: string,
  lastSyncDaysAgo: number | null,
  warnedDaysAgo?: number,
  createdDaysAgo = 1000,
) {
  const [row] = await db
    .insert(accounts)
    .values({
      email,
      createdAt: daysAgo(createdDaysAgo),
      lastSyncAt: lastSyncDaysAgo === null ? null : daysAgo(lastSyncDaysAgo),
      inactiveWarnedAt: warnedDaysAgo === undefined ? null : daysAgo(warnedDaysAgo),
    })
    .returning();
  await db.insert(records).values({
    accountId: row.id,
    collection: 'routines',
    key: 'r1',
    data: { id: 'r1' },
    updatedAt: 1,
    deviceId: 'd',
  });
  return row;
}

const emails = async () => (await db.select().from(accounts)).map((a) => a.email).sort();
const run = () => cleanUp(db, mailer, 'https://andthenhabits.com', now);

describe('cleanUp', () => {
  it('leaves recently used accounts alone', async () => {
    await account('active@example.com', 10);
    await account('new@example.com', null, undefined, 5);
    expect(await run()).toEqual({ warned: 0, deleted: 0, failed: 0 });
    expect(mailer.warned).toEqual([]);
  });

  it('warns 30 days ahead, once', async () => {
    await account('quiet@example.com', 701);
    await account('never-synced@example.com', null, undefined, 705);
    expect(await run()).toMatchObject({ warned: 2, deleted: 0 });
    expect(mailer.warned.map((w) => w.to).sort()).toEqual([
      'never-synced@example.com',
      'quiet@example.com',
    ]);
    expect(mailer.warned[0].deleteOn).toEqual(new Date(now.getTime() + 30 * DAY));

    expect(await run()).toMatchObject({ warned: 0 });
    expect(await emails()).toEqual(['never-synced@example.com', 'quiet@example.com']);
  });

  it('deletes an account (and its records) only 30 days after its warning', async () => {
    const gone = await account('gone@example.com', 760, 31);
    await account('warned-recently@example.com', 760, 10);
    // Unused for over two years, but never warned (mail was down): warned now, not deleted.
    await account('unwarned@example.com', 900);

    expect(await run()).toEqual({ warned: 1, deleted: 1, failed: 0 });
    expect(await emails()).toEqual(['unwarned@example.com', 'warned-recently@example.com']);
    expect(await db.select().from(records).where(eq(records.accountId, gone.id))).toEqual([]);
  });

  it('keeps an account that was used again after its warning', async () => {
    // Syncing clears the warning, so it is no longer due for deletion.
    await account('back@example.com', 2);
    await db
      .update(accounts)
      .set({ inactiveWarnedAt: daysAgo(40) })
      .where(eq(accounts.email, 'back@example.com'));
    expect(await run()).toMatchObject({ deleted: 0 });
    expect(await emails()).toEqual(['back@example.com']);
  });

  it('tries again next time when the warning email fails', async () => {
    await account('flaky@example.com', 720);
    mailer.failFor.add('flaky@example.com');
    expect(await run()).toEqual({ warned: 0, deleted: 0, failed: 1 });
    mailer.failFor.clear();
    expect(await run()).toMatchObject({ warned: 1 });
  });

  it('clears out expired sessions and sign-in codes', async () => {
    const a = await account('a@example.com', 1);
    await db.insert(sessions).values([
      { accountId: a.id, tokenHash: 'old', expiresAt: daysAgo(1) },
      { accountId: a.id, tokenHash: 'live', expiresAt: daysAgo(-10) },
    ]);
    await db.insert(loginCodes).values([
      { email: 'x@example.com', codeHash: 'h', expiresAt: daysAgo(1) },
      { email: 'y@example.com', codeHash: 'h', expiresAt: daysAgo(-1) },
    ]);
    await run();
    expect((await db.select().from(sessions)).map((s) => s.tokenHash)).toEqual(['live']);
    expect((await db.select().from(loginCodes)).map((c) => c.email)).toEqual(['y@example.com']);
  });
});
