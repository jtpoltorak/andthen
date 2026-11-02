import Dexie, { type EntityTable } from 'dexie';
import type { CheckIn, DayKey, Habit, Routine } from '@andthen/core';
import type { HabitRepository, HabitSnapshot } from './habit-repository';

/** The on-device database (IndexedDB), named `andthen`. */
class AndThenDb extends Dexie {
  routines!: EntityTable<Routine, 'id'>;
  habits!: EntityTable<Habit, 'id'>;
  checkIns!: Dexie.Table<CheckIn, [string, DayKey]>;

  constructor() {
    super('andthen');
    this.version(1).stores({
      routines: 'id, order',
      habits: 'id, routineId, order',
      // One check-in per habit per day: the compound key enforces it.
      checkIns: '[habitId+date], habitId, date',
    });
  }
}

export class DexieHabitRepository implements HabitRepository {
  private readonly db = new AndThenDb();

  async loadAll(): Promise<HabitSnapshot> {
    const [routines, habits, checkIns] = await Promise.all([
      this.db.routines.toArray(),
      this.db.habits.toArray(),
      this.db.checkIns.toArray(),
    ]);
    return { routines, habits, checkIns };
  }

  async putRoutine(routine: Routine): Promise<void> {
    await this.db.routines.put(routine);
  }

  async putHabit(habit: Habit): Promise<void> {
    await this.db.habits.put(habit);
  }

  async putCheckIn(checkIn: CheckIn): Promise<void> {
    await this.db.checkIns.put(checkIn);
  }

  async deleteCheckIn(habitId: string, date: DayKey): Promise<void> {
    await this.db.checkIns.delete([habitId, date]);
  }
}
