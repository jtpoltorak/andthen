import Dexie, { type EntityTable } from 'dexie';
import type { CheckIn, DayKey, Habit, Reflection, Routine } from '@andthen/core';
import type { HabitRepository, HabitSnapshot } from './habit-repository';

/** The on-device database (IndexedDB), named `andthen`. */
class AndThenDb extends Dexie {
  routines!: EntityTable<Routine, 'id'>;
  habits!: EntityTable<Habit, 'id'>;
  checkIns!: Dexie.Table<CheckIn, [string, DayKey]>;
  reflections!: EntityTable<Reflection, 'week'>;

  constructor() {
    super('andthen');
    this.version(1).stores({
      routines: 'id, order',
      habits: 'id, routineId, order',
      // One check-in per habit per day: the compound key enforces it.
      checkIns: '[habitId+date], habitId, date',
    });
    // v2 adds weekly reflections, one per week. Existing tables carry over untouched.
    this.version(2).stores({ reflections: 'week' });
  }
}

export class DexieHabitRepository implements HabitRepository {
  private readonly db = new AndThenDb();

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
