import { afterEach, describe, expect, it } from 'vitest';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import type { SyncRequest } from '@andthen/core';
import { AndThenDb } from './dexie-habit-repository';
import { SyncApiClient } from './sync-api';
import { SyncEngine, guessDeviceName, type SyncState } from './sync-engine';
import { SyncingHabitRepository } from './syncing-habit-repository';

let dbCount = 0;

/** Just enough of the server to sign in and sync, with no framework around the engine. */
function setup() {
  const db = new AndThenDb(`sync-engine-test-${++dbCount}`, { indexedDB, IDBKeyRange });
  const repo = new SyncingHabitRepository(db);
  const api = new SyncApiClient('https://api.test');
  const sent: SyncRequest[] = [];
  const names: unknown[] = [];
  api.fetch = (async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
    if (path === '/v1/auth/email/verify') {
      names.push(body.deviceName);
      return json({ token: 't1', account: { id: 'a1', email: body.email } });
    }
    if (path === '/v1/sync') {
      sent.push(body);
      return json({ cursor: 1, changes: [], more: false });
    }
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  const engine = new SyncEngine({ repo, api, pollMs: 0, deviceName: 'Chrome extension on Mac' });
  return { db, repo, engine, sent, names };
}

describe('SyncEngine', () => {
  let cleanup: (() => Promise<void>) | undefined;
  afterEach(async () => {
    await cleanup?.();
  });

  it('signs in, syncs and tells subscribers, with no framework', async () => {
    const { db, repo, engine, sent, names } = setup();
    cleanup = async () => {
      engine.stop();
      await db.delete();
    };
    const phases: SyncState['phase'][] = [];
    engine.subscribe((s) => phases.push(s.phase));
    await engine.start();
    expect(engine.state.phase).toBe('off');

    await engine.signIn(' sam@example.com ', '123456');

    expect(names).toEqual(['Chrome extension on Mac']);
    expect(engine.state).toMatchObject({ phase: 'idle', email: 'sam@example.com', problem: '' });
    expect(phases).toEqual(['idle', 'syncing', 'idle']);
    expect(sent).toHaveLength(1);
    expect((await repo.status()).enabled).toBe(true);

    await engine.turnOff();
    expect(engine.state.phase).toBe('off');
    expect((await repo.status()).enabled).toBe(false);
  });

  it('does nothing without an on-device database', async () => {
    const engine = new SyncEngine({ repo: null, api: new SyncApiClient(), pollMs: 0 });
    await engine.start();
    await engine.syncNow();
    expect(engine.state.phase).toBe('off');
  });
});

describe('guessDeviceName', () => {
  it('names the browser and system', () => {
    const chromeMac =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
    expect(guessDeviceName(chromeMac)).toBe('Chrome on Mac');
    expect(guessDeviceName('')).toBeUndefined();
  });
});
