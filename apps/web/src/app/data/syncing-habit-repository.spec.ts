import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { putChange, deleteChange, type Habit, type Routine } from '@andthen/core';
import { AndThenDb } from './dexie-habit-repository';
import { SyncingHabitRepository } from './syncing-habit-repository';

const routine: Routine = { id: 'r1', anchor: 'After coffee', order: 0, createdOn: '2026-11-01' };
const habit: Habit = {
  id: 'h1',
  routineId: 'r1',
  name: 'Stretch',
  twoMinuteVersion: 'Touch toes',
  order: 0,
  createdOn: '2026-11-01',
};

let dbCount = 0;

describe('SyncingHabitRepository', () => {
  let db: AndThenDb;
  let clock: number;
  let repo: SyncingHabitRepository;

  beforeEach(() => {
    db = new AndThenDb(`andthen-test-${++dbCount}`, { indexedDB, IDBKeyRange });
    clock = 1000;
    repo = new SyncingHabitRepository(db, () => clock);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('saves normally and queues nothing while sync is off', async () => {
    await repo.putRoutine(routine);
    await repo.putHabit(habit);
    await repo.putCheckIn({ habitId: 'h1', date: '2026-11-03', kind: 'full' });
    await repo.deleteCheckIn('h1', '2026-11-03');

    const saved = await repo.loadAll();
    expect(saved.routines).toEqual([routine]);
    expect(saved.habits).toEqual([habit]);
    expect(await repo.status()).toEqual({
      enabled: false,
      deviceId: undefined,
      cursor: 0,
      pending: 0,
    });
  });

  it('queues every existing record when sync is turned on', async () => {
    await repo.putRoutine(routine);
    await repo.putHabit(habit);
    await repo.enable();

    const status = await repo.status();
    expect(status.enabled).toBe(true);
    expect(status.deviceId).toBeTruthy();
    expect((await repo.pendingChanges()).map((c) => `${c.collection}/${c.key}`).sort()).toEqual([
      'habits/h1',
      'routines/r1',
    ]);
  });

  it('keeps only the latest change per record, and a tombstone for an un-check', async () => {
    await repo.enable();
    await repo.putCheckIn({ habitId: 'h1', date: '2026-11-03', kind: 'full' });
    clock = 2000;
    await repo.putCheckIn({ habitId: 'h1', date: '2026-11-03', kind: 'mini' });
    clock = 3000;
    await repo.deleteCheckIn('h1', '2026-11-03');

    const pending = await repo.pendingChanges();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ key: 'h1|2026-11-03', deleted: true, updatedAt: 3000 });
  });

  it('acknowledges sent changes, but keeps an edit made while the request was in flight', async () => {
    await repo.enable();
    await repo.putHabit(habit);
    await repo.putRoutine(routine);
    const sent = await repo.pendingChanges();

    clock = 2000;
    await repo.putHabit({ ...habit, name: 'Stretch longer' });
    await repo.acknowledge(sent);

    const left = await repo.pendingChanges();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ key: 'h1', updatedAt: 2000 });
  });

  it('applies remote changes and moves the cursor', async () => {
    await repo.enable();
    const { deviceId } = await repo.status();
    const applied = await repo.applyRemote(
      [
        putChange('routines', routine, 'laptop', 500),
        putChange('habits', habit, 'laptop', 500),
        putChange('checkIns', { habitId: 'h1', date: '2026-11-02', kind: 'skip' }, 'laptop', 500),
      ],
      42,
    );

    expect(applied).toBe(3);
    const saved = await repo.loadAll();
    expect(saved.checkIns).toEqual([{ habitId: 'h1', date: '2026-11-02', kind: 'skip' }]);
    expect(await repo.status()).toMatchObject({ enabled: true, deviceId, cursor: 42, pending: 0 });
    // Remote writes are not echoed back to the server.
    expect(await repo.pendingChanges()).toEqual([]);
  });

  it('applies a remote tombstone', async () => {
    await repo.putCheckIn({ habitId: 'h1', date: '2026-11-02', kind: 'full' });
    await repo.enable();
    await repo.acknowledge(await repo.pendingChanges());

    await repo.applyRemote([deleteChange('checkIns', 'h1|2026-11-02', 'laptop', 5000)], 7);
    expect((await repo.loadAll()).checkIns).toEqual([]);
  });

  it('newest edit wins when a remote change meets a pending local one', async () => {
    await repo.enable();
    clock = 2000;
    await repo.putCheckIn({ habitId: 'h1', date: '2026-11-03', kind: 'full' });

    // Older remote edit loses: local stays and is still queued.
    await repo.applyRemote(
      [putChange('checkIns', { habitId: 'h1', date: '2026-11-03', kind: 'skip' }, 'laptop', 1500)],
      1,
    );
    expect((await repo.loadAll()).checkIns[0].kind).toBe('full');
    expect(await repo.pendingChanges()).toHaveLength(1);

    // Newer remote edit wins: it's written and the local edit is dropped.
    await repo.applyRemote(
      [putChange('checkIns', { habitId: 'h1', date: '2026-11-03', kind: 'mini' }, 'laptop', 2500)],
      2,
    );
    expect((await repo.loadAll()).checkIns[0].kind).toBe('mini');
    expect(await repo.pendingChanges()).toEqual([]);
  });

  it('queues a restore as puts plus tombstones for what it removed', async () => {
    await repo.putRoutine(routine);
    await repo.putHabit(habit);
    await repo.putCheckIn({ habitId: 'h1', date: '2026-11-02', kind: 'full' });
    await repo.enable();
    await repo.acknowledge(await repo.pendingChanges());

    await repo.replaceAll({ routines: [routine], habits: [habit], checkIns: [], reflections: [] });
    const pending = await repo.pendingChanges();
    expect(pending.filter((c) => c.deleted).map((c) => c.key)).toEqual(['h1|2026-11-02']);
    expect(pending.filter((c) => !c.deleted)).toHaveLength(2);
  });

  it('turning sync off keeps local data and drops the queue', async () => {
    await repo.enable();
    await repo.putRoutine(routine);
    await repo.disable();

    expect((await repo.loadAll()).routines).toEqual([routine]);
    expect(await repo.status()).toMatchObject({ enabled: false, cursor: 0, pending: 0 });
    await repo.putHabit(habit);
    expect(await repo.pendingChanges()).toEqual([]);
  });
});
