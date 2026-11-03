import { InjectionToken } from '@angular/core';
import type { CheckIn, DayKey, Habit, Reflection, Routine } from '@andthen/core';

export interface HabitSnapshot {
  routines: Routine[];
  habits: Habit[];
  checkIns: CheckIn[];
  reflections: Reflection[];
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
  /** Saves several habits in one go (used when reordering a chain). */
  putHabits(habits: readonly Habit[]): Promise<void>;
  putCheckIn(checkIn: CheckIn): Promise<void>;
  deleteCheckIn(habitId: string, date: DayKey): Promise<void>;
  /** Saves (or replaces) the reflection for its week. */
  putReflection(reflection: Reflection): Promise<void>;
  /** Replaces everything with a snapshot, all or nothing (used to restore a backup). */
  replaceAll(snapshot: HabitSnapshot): Promise<void>;
}

export const HABIT_REPOSITORY = new InjectionToken<HabitRepository>('HabitRepository');

/** Keeps everything in memory. Used by tests; handy for demos. */
export class InMemoryHabitRepository implements HabitRepository {
  private data: HabitSnapshot;

  constructor(seed: Partial<HabitSnapshot> = {}) {
    this.data = { routines: [], habits: [], checkIns: [], reflections: [], ...seed };
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

  async putHabits(habits: readonly Habit[]): Promise<void> {
    for (const habit of habits) await this.putHabit(habit);
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

  async putReflection(reflection: Reflection): Promise<void> {
    this.data.reflections = [
      ...this.data.reflections.filter((r) => r.week !== reflection.week),
      reflection,
    ];
  }

  async replaceAll(snapshot: HabitSnapshot): Promise<void> {
    this.data = structuredClone(snapshot);
  }
}
