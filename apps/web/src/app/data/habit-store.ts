import { Injectable, computed, inject, signal } from '@angular/core';
import {
  type CheckIn,
  type CheckInKind,
  type Habit,
  type Routine,
  buildDay,
  nextOrder,
  removeCheckIn,
  toDayKey,
  upsertCheckIn,
} from '@andthen/core';
import { HABIT_REPOSITORY } from './habit-repository';

export interface FirstChainInput {
  anchor: string;
  usualTime?: string;
  habitName: string;
  twoMinuteVersion: string;
}

const newId = () => crypto.randomUUID();

/**
 * App-wide state as signals. Screens read from here and call its methods;
 * every change is written to the repository first, then reflected in the signals.
 */
@Injectable({ providedIn: 'root' })
export class HabitStore {
  private readonly repo = inject(HABIT_REPOSITORY);
  private loading?: Promise<void>;

  readonly routines = signal<Routine[]>([]);
  readonly habits = signal<Habit[]>([]);
  readonly checkIns = signal<CheckIn[]>([]);
  readonly today = signal(toDayKey(new Date()));

  readonly hasRoutines = computed(() => this.routines().some((r) => !r.archivedOn));
  readonly chains = computed(() =>
    buildDay(this.routines(), this.habits(), this.checkIns(), this.today()),
  );

  /** Loads everything once; later calls reuse the same promise. */
  load(): Promise<void> {
    this.loading ??= this.repo.loadAll().then((snap) => {
      this.routines.set(snap.routines);
      this.habits.set(snap.habits);
      this.checkIns.set(snap.checkIns);
    });
    return this.loading;
  }

  /** Call when the app comes back to the foreground, so "today" rolls over at midnight. */
  refreshDay(now = new Date()): void {
    const day = toDayKey(now);
    if (day !== this.today()) this.today.set(day);
  }

  async createFirstChain(input: FirstChainInput): Promise<Routine> {
    const today = this.today();
    const routine: Routine = {
      id: newId(),
      anchor: input.anchor.trim(),
      usualTime: input.usualTime,
      order: nextOrder(this.routines()),
      createdOn: today,
    };
    await this.repo.putRoutine(routine);
    this.routines.update((list) => [...list, routine]);
    await this.addLink(routine.id, input.habitName, input.twoMinuteVersion);
    return routine;
  }

  async addLink(routineId: string, name: string, twoMinuteVersion: string): Promise<Habit> {
    const habit: Habit = {
      id: newId(),
      routineId,
      name: name.trim(),
      twoMinuteVersion: twoMinuteVersion.trim(),
      order: nextOrder(this.habits().filter((h) => h.routineId === routineId)),
      createdOn: this.today(),
    };
    await this.repo.putHabit(habit);
    this.habits.update((list) => [...list, habit]);
    return habit;
  }

  async checkIn(habitId: string, kind: CheckInKind): Promise<void> {
    const date = this.today();
    await this.repo.putCheckIn({ habitId, date, kind });
    this.checkIns.update((list) => upsertCheckIn(list, habitId, date, kind));
  }

  async undoCheckIn(habitId: string): Promise<void> {
    const date = this.today();
    await this.repo.deleteCheckIn(habitId, date);
    this.checkIns.update((list) => removeCheckIn(list, habitId, date));
  }
}
