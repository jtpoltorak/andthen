import { EnvironmentInjector, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { isNewer, type Routine, type SyncChange, type SyncRequest } from '@andthen/core';
import { AndThenDb } from '../data/dexie-habit-repository';
import { HABIT_REPOSITORY } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { SyncingHabitRepository } from '../data/syncing-habit-repository';
import { SyncApi } from './sync-api';
import { SyncService } from './sync.service';

const CODE = '123456';

/** Just enough of the sync API, kept in memory, to run real syncs against. */
class FakeServer {
  online = true;
  pageSize = 1000;
  calls: string[] = [];
  private seq = 0;
  private sessions = 0;
  readonly tokens = new Set<string>();
  readonly records = new Map<string, { change: SyncChange; seq: number }>();

  readonly fetch = (async (url: string, init: RequestInit) => {
    if (!this.online) throw new TypeError('Failed to fetch');
    const path = new URL(url).pathname;
    this.calls.push(path);
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    const token = (init.headers as Record<string, string>)['authorization']?.slice(7);
    switch (path) {
      case '/v1/auth/email/start':
        return reply(204);
      case '/v1/auth/email/verify': {
        if (body.code !== CODE) return reply(400, { error: 'wrong_code' });
        const t = `token-${++this.sessions}`;
        this.tokens.add(t);
        return reply(200, { token: t, account: { id: 'acc', email: body.email.toLowerCase() } });
      }
      case '/v1/auth/logout':
        this.tokens.delete(token!);
        return reply(204);
      case '/v1/export':
        if (!token || !this.tokens.has(token)) return reply(401, { error: 'signed_out' });
        return reply(200, {
          app: 'andthen',
          version: 1,
          exportedAt: '2026-11-03T00:00:00.000Z',
          data: { routines: [...this.records.values()].map((r) => r.change.data) },
        });
      case '/v1/me':
        if (!token || !this.tokens.has(token)) return reply(401, { error: 'signed_out' });
        if (init.method === 'GET') {
          return reply(200, {
            id: 'acc',
            email: 'sam@example.com',
            sessions: [...this.tokens].map((t) => ({
              id: t,
              deviceName: null,
              createdAt: '2026-11-01T00:00:00.000Z',
              lastSeenAt: `2026-11-0${t.slice(-1)}T00:00:00.000Z`,
              current: t === token,
            })),
          });
        }
        this.tokens.clear();
        this.records.clear();
        return reply(204);
      case '/v1/sync':
        if (!token || !this.tokens.has(token)) return reply(401, { error: 'signed_out' });
        return reply(200, this.sync(body));
    }
    if (path.startsWith('/v1/me/sessions/') && init.method === 'DELETE') {
      if (!token || !this.tokens.has(token)) return reply(401, { error: 'signed_out' });
      const id = decodeURIComponent(path.split('/').pop()!);
      return reply(this.tokens.delete(id) ? 204 : 404);
    }
    return reply(404, { error: 'not_found' });
  }) as unknown as typeof fetch;

  private sync(req: SyncRequest) {
    const written = new Set<number>();
    for (const change of req.changes) {
      const id = `${change.collection}/${change.key}`;
      const seen = this.records.get(id);
      if (!seen || isNewer(change, seen.change)) {
        const seq = ++this.seq;
        this.records.set(id, { change, seq });
        written.add(seq);
      }
    }
    const newer = [...this.records.values()]
      .filter((r) => r.seq > req.cursor)
      .sort((a, b) => a.seq - b.seq);
    const page = newer.slice(0, this.pageSize);
    return {
      cursor: page.length ? page[page.length - 1].seq : req.cursor,
      changes: page.filter((r) => !written.has(r.seq)).map((r) => r.change),
      more: newer.length > page.length,
    };
  }
}

function reply(status: number, json?: unknown): Response {
  return { status, ok: status < 400, json: async () => json } as Response;
}

let dbCount = 0;

/** One device: its own database, store and sync engine, talking to the shared fake server. */
function device(server: FakeServer) {
  const db = new AndThenDb(`sync-service-test-${++dbCount}`, { indexedDB, IDBKeyRange });
  const repo = new SyncingHabitRepository(db);
  const api = new SyncApi();
  api.fetch = server.fetch;
  const injector = Injector.create({
    parent: TestBed.inject(EnvironmentInjector),
    providers: [
      { provide: SyncingHabitRepository, useValue: repo },
      { provide: HABIT_REPOSITORY, useValue: repo },
      { provide: SyncApi, useValue: api },
      { provide: HabitStore, useClass: HabitStore },
      { provide: SyncService, useClass: SyncService },
    ],
  });
  return { db, repo, store: injector.get(HabitStore), sync: injector.get(SyncService) };
}

describe('SyncService', () => {
  let server: FakeServer;
  let devices: ReturnType<typeof device>[];
  const make = () => {
    const d = device(server);
    devices.push(d);
    return d;
  };

  beforeEach(() => {
    server = new FakeServer();
    devices = [];
  });

  afterEach(async () => {
    for (const d of devices) {
      d.sync.stop();
      await d.db.delete();
    }
  });

  it('signs in, turns sync on and sends what is already on the device', async () => {
    const phone = make();
    await phone.store.load();
    await phone.store.createChain({
      anchor: 'After coffee',
      habitName: 'Stretch',
      twoMinuteVersion: 'Touch toes',
    });

    await phone.sync.signIn('Sam@Example.com ', CODE);

    expect(phone.sync.phase()).toBe('idle');
    expect(phone.sync.email()).toBe('sam@example.com');
    expect(phone.sync.lastSyncedAt()).toBeDefined();
    expect([...server.records.keys()].map((k) => k.split('/')[0]).sort()).toEqual([
      'habits',
      'routines',
    ]);
    expect((await phone.repo.status()).pending).toBe(0);
  });

  it('a wrong code leaves sync off', async () => {
    const phone = make();
    await expect(phone.sync.signIn('sam@example.com', '000000')).rejects.toMatchObject({
      code: 'wrong_code',
    });
    expect(phone.sync.enabled()).toBe(false);
    expect((await phone.repo.status()).enabled).toBe(false);
  });

  it('brings two devices into step, both ways', async () => {
    const phone = make();
    const laptop = make();
    await phone.store.load();
    await laptop.store.load();
    const routine = await phone.store.createChain({
      anchor: 'After coffee',
      habitName: 'Stretch',
      twoMinuteVersion: 'Touch toes',
    });
    await phone.sync.signIn('sam@example.com', CODE);

    // A new device gets everything when it signs in, and the screens update.
    await laptop.sync.signIn('sam@example.com', CODE);
    expect(laptop.store.routines().map((r) => r.anchor)).toEqual(['After coffee']);
    const habitId = laptop.store.habitsOf(routine.id)[0].id;

    // A check-in on the laptop reaches the phone on its next sync.
    await laptop.store.checkIn(habitId, 'mini');
    await laptop.sync.syncNow();
    await phone.sync.syncNow();
    expect(phone.store.checkIns()).toEqual([{ habitId, date: phone.store.today(), kind: 'mini' }]);

    // So does un-checking it.
    await phone.store.undoCheckIn(habitId);
    await phone.sync.syncNow();
    await laptop.sync.syncNow();
    expect(laptop.store.checkIns()).toEqual([]);
  });

  it('keeps pulling until it has every page', async () => {
    const phone = make();
    const laptop = make();
    await phone.store.load();
    for (const anchor of ['One', 'Two', 'Three']) {
      await phone.store.createChain({ anchor, habitName: 'A', twoMinuteVersion: 'B' });
    }
    await phone.sync.signIn('sam@example.com', CODE);

    server.pageSize = 2;
    await laptop.store.load();
    await laptop.sync.signIn('sam@example.com', CODE);
    expect(laptop.store.routines()).toHaveLength(3);
    expect(laptop.store.habits()).toHaveLength(3);
  });

  it("turning sync back on after a break doesn't overwrite newer edits from elsewhere", async () => {
    const phone = make();
    const laptop = make();
    await phone.store.load();
    const routine = await phone.store.createChain({
      anchor: 'After coffee',
      habitName: 'Stretch',
      twoMinuteVersion: 'Touch toes',
    });
    await phone.sync.signIn('sam@example.com', CODE);
    await laptop.sync.signIn('sam@example.com', CODE);

    // The laptop stops syncing; meanwhile the phone renames the routine.
    await laptop.sync.turnOff();
    await phone.store.updateRoutine(routine.id, { anchor: 'After tea' });
    await phone.sync.syncNow();

    // Back on: the laptop's old copy loses to the newer edit.
    await laptop.sync.signIn('sam@example.com', CODE);
    expect(laptop.store.routine(routine.id)?.anchor).toBe('After tea');
    expect(server.records.get(`routines/${routine.id}`)?.change.data).toMatchObject({
      anchor: 'After tea',
    } satisfies Partial<Routine>);
  });

  it('keeps changes queued while offline and sends them later', async () => {
    const phone = make();
    await phone.store.load();
    await phone.sync.signIn('sam@example.com', CODE);

    server.online = false;
    await phone.store.createChain({
      anchor: 'After lunch',
      habitName: 'Walk',
      twoMinuteVersion: 'Shoes on',
    });
    await phone.sync.syncNow();
    expect(phone.sync.phase()).toBe('offline');
    expect((await phone.repo.status()).pending).toBe(2);

    server.online = true;
    await phone.sync.syncNow();
    expect(phone.sync.phase()).toBe('idle');
    expect((await phone.repo.status()).pending).toBe(0);
    expect(server.records.size).toBe(2);
  });

  it('turns sync off and says so when the server has signed the device out', async () => {
    const phone = make();
    await phone.sync.signIn('sam@example.com', CODE);
    server.tokens.clear();

    await phone.sync.syncNow();
    expect(phone.sync.enabled()).toBe(false);
    expect(phone.sync.signedOutNotice()).toBe(true);
    expect((await phone.repo.status()).enabled).toBe(false);
  });

  it('turning off signs out on the server and keeps the data', async () => {
    const phone = make();
    await phone.store.load();
    await phone.store.createChain({
      anchor: 'After coffee',
      habitName: 'Stretch',
      twoMinuteVersion: 'Touch toes',
    });
    await phone.sync.signIn('sam@example.com', CODE);

    await phone.sync.turnOff();
    expect(server.tokens.size).toBe(0);
    expect(phone.sync.phase()).toBe('off');
    expect(await phone.repo.token()).toBeUndefined();
    expect(phone.store.routines()).toHaveLength(1);
  });

  it('picks up where it left off when the app starts, and syncs soon after an edit', async () => {
    const first = make();
    await first.sync.signIn('sam@example.com', CODE);
    first.sync.stop();

    // The app opens again: a fresh engine over the same database.
    const sameDb = new SyncingHabitRepository(first.db);
    const injector = Injector.create({
      parent: TestBed.inject(EnvironmentInjector),
      providers: [
        { provide: SyncingHabitRepository, useValue: sameDb },
        { provide: HABIT_REPOSITORY, useValue: sameDb },
        { provide: SyncApi, useValue: Object.assign(new SyncApi(), { fetch: server.fetch }) },
        { provide: HabitStore, useClass: HabitStore },
        { provide: SyncService, useClass: SyncService },
      ],
    });
    const sync = injector.get(SyncService);
    const calls = server.calls.length;
    await sync.start();
    expect(sync.email()).toBe('sam@example.com');
    expect(server.calls.slice(calls)).toEqual(['/v1/sync']);

    const soon = vi.spyOn(sync, 'syncSoon');
    await injector
      .get(HabitStore)
      .createChain({ anchor: 'X', habitName: 'Y', twoMinuteVersion: 'Z' });
    expect(soon).toHaveBeenCalled();
    sync.stop();
  });

  it('downloads what the account holds', async () => {
    const phone = make();
    await phone.store.load();
    await phone.store.createChain({
      anchor: 'After coffee',
      habitName: 'Stretch',
      twoMinuteVersion: 'Touch toes',
    });
    await phone.sync.signIn('sam@example.com', CODE);
    const file = await phone.sync.exportAccount();
    expect(file.app).toBe('andthen');
    expect(server.calls.at(-1)).toBe('/v1/export');
  });

  it('deleting the account turns sync off and keeps the data on the device', async () => {
    const phone = make();
    await phone.store.load();
    await phone.store.createChain({
      anchor: 'After coffee',
      habitName: 'Stretch',
      twoMinuteVersion: 'Touch toes',
    });
    await phone.sync.signIn('sam@example.com', CODE);

    await phone.sync.deleteAccount();
    expect(server.records.size).toBe(0);
    expect(phone.sync.enabled()).toBe(false);
    expect(phone.sync.accountDeleted()).toBe(true);
    expect((await phone.repo.status()).enabled).toBe(false);
    expect((await phone.repo.loadAll()).routines).toHaveLength(1);
  });

  it('keeps sync on when deleting the account fails', async () => {
    const phone = make();
    await phone.sync.signIn('sam@example.com', CODE);
    server.online = false;
    await expect(phone.sync.deleteAccount()).rejects.toThrow();
    expect(phone.sync.enabled()).toBe(true);
  });

  it('lists the signed-in devices, this one first, and signs another one out', async () => {
    const phone = make();
    const laptop = make();
    const tablet = make();
    await phone.sync.signIn('sam@example.com', CODE); // token-1
    await laptop.sync.signIn('sam@example.com', CODE); // token-2
    await tablet.sync.signIn('sam@example.com', CODE); // token-3

    const list = await laptop.sync.devices();
    expect(list.map((d) => [d.id, d.current])).toEqual([
      ['token-2', true],
      ['token-3', false],
      ['token-1', false],
    ]);

    await laptop.sync.signOutDevice('token-1');
    // Already gone counts as done.
    await laptop.sync.signOutDevice('token-1');
    expect((await laptop.sync.devices()).map((d) => d.id)).toEqual(['token-2', 'token-3']);

    await phone.sync.syncNow();
    expect(phone.sync.enabled()).toBe(false);
    expect(phone.sync.signedOutNotice()).toBe(true);
  });

  it('turns sync off when listing devices finds this one signed out', async () => {
    const phone = make();
    await phone.sync.signIn('sam@example.com', CODE);
    server.tokens.clear();

    await expect(phone.sync.devices()).rejects.toMatchObject({ status: 401 });
    expect(phone.sync.enabled()).toBe(false);
    expect(phone.sync.signedOutNotice()).toBe(true);
  });
});
