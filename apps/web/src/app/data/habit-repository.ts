import { InjectionToken } from '@angular/core';
import type { CheckIn, DayKey, Habit, Routine } from '@andthen/core';

export interface HabitSnapshot {
  routines: Routine[];
  habits: Habit[];
  checkIns: CheckIn[];
}

/**
 * Where habit data lives. The app talks only to this interface, so the
 * on-device store can later be joined (or replaced) by a sync-backed one
 * without touching any screen.
 */
export interface HabitRepository {
  loadAll(): Promise<HabitSnapshot>;
  putRoutine(routine: Routine): Promise<void>;
  putHabit(habit: Habit): Promise<void>;
  putCheckIn(checkIn: CheckIn): Promise<void>;
  deleteCheckIn(habitId: string, date: DayKey): Promise<void>;
}

export const HABIT_REPOSITORY = new InjectionToken<HabitRepository>('HabitRepository');

/** Keeps everything in memory. Used by tests; handy for demos. */
export class InMemoryHabitRepository implements HabitRepository {
  private data: HabitSnapshot;

  constructor(seed: Partial<HabitSnapshot> = {}) {
    this.data = { routines: [], habits: [], checkIns: [], ...seed };
  }

  async loadAll(): Promise<HabitSnapshot> {
    return structuredClone(this.data);
  }

  async putRoutine(routine: Routine): Promise<void> {
    this.data.routines = [...this.data.routines.filter((r) => r.id !== routine.id), routine];
  }

  async putHabit(habit: Habit): Promise<void> {
    this.data.habits = [...this.data.habits.filter((h) => h.id !== habit.id), habit];
  }

  async putCheckIn(checkIn: CheckIn): Promise<void> {
    await this.deleteCheckIn(checkIn.habitId, checkIn.date);
    this.data.checkIns = [...this.data.checkIns, checkIn];
  }

  async deleteCheckIn(habitId: string, date: DayKey): Promise<void> {
    this.data.checkIns = this.data.checkIns.filter(
      (c) => !(c.habitId === habitId && c.date === date),
    );
  }
}
