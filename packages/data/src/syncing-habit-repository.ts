import {
  checkInKey,
  deleteChange,
  parseCheckInKey,
  putChange,
  replaceChanges,
  shouldApplyRemote,
  snapshotChanges,
  type CheckIn,
  type DayKey,
  type Habit,
  type RecordCollection,
  type Reflection,
  type Routine,
  type SyncChange,
} from '@andthen/core';
import type { Table } from 'dexie';
import { AndThenDb, DexieHabitRepository, type SyncStateRow } from './dexie-habit-repository';
import type { HabitSnapshot } from './habit-repository';

export interface SyncStatus {
  enabled: boolean;
  deviceId?: string;
  cursor: number;
  /** Changes waiting to be sent. */
  pending: number;
  /** The signed-in account's email, while sync is on. */
  email?: string;
}

/** The account this device is signed in to. */
export interface SyncAccount {
  email: string;
  token: string;
}

const STATE_KEY = 'state' as const;

/**
 * The on-device repository, plus sync bookkeeping. While sync is off it behaves
 * exactly like `DexieHabitRepository`. While it's on, every save also records
 * the change in the outbox, in the same transaction, so a change can never be
 * saved without being queued (or the other way round).
 *
 * The network side (sending the outbox, pulling changes) lives elsewhere and
 * uses `pendingChanges`, `acknowledge` and `applyRemote`.
 */
export class SyncingHabitRepository extends DexieHabitRepository {
  /** Called after a local edit was queued for sending. The sync engine uses it to sync soon. */
  onLocalChange?: () => void;

  constructor(
    db = new AndThenDb(),
    private readonly now: () => number = Date.now,
  ) {
    super(db);
  }

  override async putRoutine(routine: Routine): Promise<void> {
    await this.tracked(
      [this.db.routines],
      () => super.putRoutine(routine),
      (id) => [putChange('routines', routine, id, this.now())],
    );
  }

  override async putHabit(habit: Habit): Promise<void> {
    await this.tracked(
      [this.db.habits],
      () => super.putHabit(habit),
      (id) => [putChange('habits', habit, id, this.now())],
    );
  }

  override async putHabits(habits: readonly Habit[]): Promise<void> {
    await this.tracked(
      [this.db.habits],
      () => super.putHabits(habits),
      (id) => {
        const at = this.now();
        return habits.map((h) => putChange('habits', h, id, at));
      },
    );
  }

  override async putCheckIn(checkIn: CheckIn): Promise<void> {
    await this.tracked(
      [this.db.checkIns],
      () => super.putCheckIn(checkIn),
      (id) => [putChange('checkIns', checkIn, id, this.now())],
    );
  }

  /** Un-checking leaves a tombstone, or another device would send the check-in right back. */
  override async deleteCheckIn(habitId: string, date: DayKey): Promise<void> {
    await this.tracked(
      [this.db.checkIns],
      () => super.deleteCheckIn(habitId, date),
      (id) => [deleteChange('checkIns', checkInKey(habitId, date), id, this.now())],
    );
  }

  override async putReflection(reflection: Reflection): Promise<void> {
    await this.tracked(
      [this.db.reflections],
      () => super.putReflection(reflection),
      (id) => [putChange('reflections', reflection, id, this.now())],
    );
  }

  /** Restoring a backup syncs too: every restored record, and a tombstone for each one it removed. */
  override async replaceAll(snapshot: HabitSnapshot): Promise<void> {
    const { routines, habits, checkIns, reflections } = this.db;
    await this.db
      .transaction(
        'rw',
        [routines, habits, checkIns, reflections, this.db.outbox, this.db.syncState],
        async () => {
          const state = await this.enabledState();
          const before = state ? await this.loadAll() : undefined;
          await super.replaceAll(snapshot);
          if (state && before) {
            await this.enqueue(replaceChanges(before, snapshot, state.deviceId, this.now()));
          }
          return !!state;
        },
      )
      .then((queued) => queued && this.onLocalChange?.());
  }

  /** Where sync stands on this device. */
  async status(): Promise<SyncStatus> {
    const [state, pending] = await Promise.all([
      this.db.syncState.get(STATE_KEY),
      this.db.outbox.count(),
    ]);
    return {
      enabled: state?.enabled ?? false,
      deviceId: state?.deviceId,
      cursor: state?.cursor ?? 0,
      pending,
      ...(state?.enabled && state.email ? { email: state.email } : {}),
    };
  }

  /** The session token, while sync is on. */
  async token(): Promise<string | undefined> {
    return (await this.enabledState())?.token;
  }

  /**
   * Turns sync on and queues every record on the device, so the first sync
   * merges this device's data with the account's instead of overwriting either.
   *
   * The records are stamped as the oldest possible edit (time 0). Records the
   * account doesn't have yet are added, but where the account already has a
   * copy, the account's copy wins. That matters when sync is turned back on
   * after a break: this device's older copies must not overwrite edits made
   * on other devices in the meantime.
   */
  async enable(account?: SyncAccount): Promise<void> {
    const { routines, habits, checkIns, reflections, outbox, syncState } = this.db;
    await this.db.transaction(
      'rw',
      [routines, habits, checkIns, reflections, outbox, syncState],
      async () => {
        const existing = await syncState.get(STATE_KEY);
        const state: SyncStateRow = {
          key: STATE_KEY,
          deviceId: existing?.deviceId ?? crypto.randomUUID(),
          enabled: true,
          cursor: 0,
          ...account,
        };
        await syncState.put(state);
        await outbox.clear();
        await this.enqueue(snapshotChanges(await this.loadAll(), state.deviceId, 0));
      },
    );
  }

  /**
   * Turns sync off on this device and forgets the account. Local data stays;
   * anything not yet sent is dropped. The device id is kept.
   */
  async disable(): Promise<void> {
    await this.db.transaction('rw', [this.db.outbox, this.db.syncState], async () => {
      await this.db.outbox.clear();
      const state = await this.db.syncState.get(STATE_KEY);
      if (state) {
        await this.db.syncState.put({
          key: STATE_KEY,
          deviceId: state.deviceId,
          enabled: false,
          cursor: 0,
        });
      }
    });
  }

  /** Changes waiting to be sent. */
  async pendingChanges(): Promise<SyncChange[]> {
    return this.db.outbox.toArray();
  }

  /**
   * The server stored these changes. Each leaves the outbox, unless the record
   * was edited again while the request was in flight: that newer edit still
   * needs to go.
   */
  async acknowledge(sent: readonly SyncChange[]): Promise<void> {
    await this.db.transaction('rw', this.db.outbox, async () => {
      for (const change of sent) {
        const waiting = await this.db.outbox.get([change.collection, change.key]);
        if (
          waiting &&
          waiting.updatedAt === change.updatedAt &&
          waiting.deviceId === change.deviceId
        ) {
          await this.db.outbox.delete([change.collection, change.key]);
        }
      }
    });
  }

  /**
   * Writes changes pulled from the server and moves the cursor, all at once.
   * A change is skipped when this device has a later edit of the same record
   * still waiting to be sent; when the remote change wins, the losing local
   * edit leaves the outbox.
   *
   * @returns how many changes were written.
   */
  async applyRemote(changes: readonly SyncChange[], cursor: number): Promise<number> {
    const { routines, habits, checkIns, reflections, outbox, syncState } = this.db;
    let applied = 0;
    await this.db.transaction(
      'rw',
      [routines, habits, checkIns, reflections, outbox, syncState],
      async () => {
        for (const change of changes) {
          const pending = await outbox.get([change.collection, change.key]);
          if (!shouldApplyRemote(change, pending)) continue;
          if (pending) await outbox.delete([change.collection, change.key]);
          await this.write(change);
          applied++;
        }
        const state = await syncState.get(STATE_KEY);
        if (state) await syncState.put({ ...state, cursor });
      },
    );
    return applied;
  }

  /** Runs a save; when sync is on, queues its changes in the same transaction. */
  private async tracked(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tables: Table<any, any>[],
    save: () => Promise<void>,
    changes: (deviceId: string) => SyncChange[],
  ): Promise<void> {
    const queued = await this.db.transaction(
      'rw',
      [...tables, this.db.outbox, this.db.syncState],
      async () => {
        await save();
        const state = await this.enabledState();
        if (state) await this.enqueue(changes(state.deviceId));
        return !!state;
      },
    );
    if (queued) this.onLocalChange?.();
  }

  private async enabledState(): Promise<SyncStateRow | undefined> {
    const state = await this.db.syncState.get(STATE_KEY);
    return state?.enabled ? state : undefined;
  }

  /** The outbox keeps one entry per record, so a newer edit replaces an older one. */
  private async enqueue(changes: readonly SyncChange[]): Promise<void> {
    if (changes.length) await this.db.outbox.bulkPut([...changes]);
  }

  private async write(change: SyncChange): Promise<void> {
    const table = this.table(change.collection);
    if (!change.deleted && change.data) {
      await (table as { put(r: unknown): Promise<unknown> }).put(change.data);
      return;
    }
    if (change.collection === 'checkIns') {
      const { habitId, date } = parseCheckInKey(change.key);
      await this.db.checkIns.delete([habitId, date]);
    } else {
      await (table as { delete(k: string): Promise<void> }).delete(change.key);
    }
  }

  private table(collection: RecordCollection) {
    return this.db[collection];
  }
}
