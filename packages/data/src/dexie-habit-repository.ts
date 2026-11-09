import Dexie, { type DexieOptions, type EntityTable } from 'dexie';
import type { CheckIn, DayKey, Habit, Reflection, Routine, SyncChange } from '@andthen/core';
import type { HabitRepository, HabitSnapshot } from './habit-repository';

/** Sync bookkeeping, one row per key. Only used once sync is set up. */
export interface SyncStateRow {
  key: 'state';
  /** A random id for this device, made the first time sync is turned on. */
  deviceId: string;
  enabled: boolean;
  /** The server cursor from the last successful sync. */
  cursor: number;
  /** The signed-in account's email, while sync is on. */
  email?: string;
  /** The session token from signing in, while sync is on. Sent as a Bearer token. */
  token?: string;
}

/** The on-device database (IndexedDB), named `andthen`. */
export class AndThenDb extends Dexie {
  routines!: EntityTable<Routine, 'id'>;
  habits!: EntityTable<Habit, 'id'>;
  checkIns!: Dexie.Table<CheckIn, [string, DayKey]>;
  reflections!: EntityTable<Reflection, 'week'>;
  /** Changes waiting to be sent, at most one per record (the latest). */
  outbox!: Dexie.Table<SyncChange, [string, string]>;
  syncState!: EntityTable<SyncStateRow, 'key'>;

  constructor(name = 'andthen', options?: DexieOptions) {
    super(name, options);
    this.version(1).stores({
      routines: 'id, order',
      habits: 'id, routineId, order',
      // One check-in per habit per day: the compound key enforces it.
      checkIns: '[habitId+date], habitId, date',
    });
    // v2 adds weekly reflections, one per week. Existing tables carry over untouched.
    this.version(2).stores({ reflections: 'week' });
    // v3 adds sync bookkeeping. Both tables stay empty until sync is turned on.
    this.version(3).stores({ outbox: '[collection+key]', syncState: 'key' });
  }
}

export class DexieHabitRepository implements HabitRepository {
  constructor(protected readonly db = new AndThenDb()) {}

  async loadAll(): Promise<HabitSnapshot> {
    const [routines, habits, checkIns, reflections] = await Promise.all([
      this.db.routines.toArray(),
      this.db.habits.toArray(),
      this.db.checkIns.toArray(),
      this.db.reflections.toArray(),
    ]);
    return { routines, habits, checkIns, reflections };
  }

  async putRoutine(routine: Routine): Promise<void> {
    await this.db.routines.put(routine);
  }

  async putHabit(habit: Habit): Promise<void> {
    await this.db.habits.put(habit);
  }

  async putHabits(habits: readonly Habit[]): Promise<void> {
    await this.db.habits.bulkPut([...habits]);
  }

  async putCheckIn(checkIn: CheckIn): Promise<void> {
    await this.db.checkIns.put(checkIn);
  }

  async deleteCheckIn(habitId: string, date: DayKey): Promise<void> {
    await this.db.checkIns.delete([habitId, date]);
  }

  async putReflection(reflection: Reflection): Promise<void> {
    await this.db.reflections.put(reflection);
  }

  async replaceAll(snapshot: HabitSnapshot): Promise<void> {
    const { routines, habits, checkIns, reflections } = this.db;
    // One transaction: if anything fails, the old data stays untouched.
    await this.db.transaction('rw', [routines, habits, checkIns, reflections], async () => {
      await Promise.all([routines.clear(), habits.clear(), checkIns.clear(), reflections.clear()]);
      await Promise.all([
        routines.bulkPut(snapshot.routines),
        habits.bulkPut(snapshot.habits),
        checkIns.bulkPut(snapshot.checkIns),
        reflections.bulkPut(snapshot.reflections),
      ]);
    });
  }
}
