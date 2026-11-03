import { Injectable, computed, inject, signal } from '@angular/core';
import {
  type BackupData,
  type BackupFile,
  type CheckIn,
  type CheckInKind,
  type DayKey,
  type Habit,
  type Reflection,
  type Routine,
  type RoutineTemplate,
  buildDay,
  cleanNote,
  createBackup,
  chainHabits,
  moveItem,
  nextOrder,
  removeCheckIn,
  toDayKey,
  upsertCheckIn,
} from '@andthen/core';
import { HABIT_REPOSITORY } from './habit-repository';

export type RoutineEdit = Partial<Pick<Routine, 'anchor' | 'usualTime' | 'name'>>;
export type HabitEdit = Partial<
  Pick<Habit, 'name' | 'twoMinuteVersion' | 'makeItEasier' | 'obstacle'>
>;

export interface ChainInput {
  anchor: string;
  usualTime?: string;
  habitName: string;
  twoMinuteVersion: string;
}

const newId = () => crypto.randomUUID();

/** Trims every string field of an edit, leaving other values as they are. */
function trimmed<T extends object>(edit: T): T {
  return Object.fromEntries(
    Object.entries(edit).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
  ) as T;
}

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
  readonly reflections = signal<Reflection[]>([]);
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
      this.reflections.set(snap.reflections);
    });
    return this.loading;
  }

  /** Call when the app comes back to the foreground, so "today" rolls over at midnight. */
  refreshDay(now = new Date()): void {
    const day = toDayKey(now);
    if (day !== this.today()) this.today.set(day);
  }

  /** Active routines in display order. */
  readonly activeRoutines = computed(() => {
    const day = this.today();
    return this.routines()
      .filter((r) => r.createdOn <= day && (!r.archivedOn || r.archivedOn > day))
      .sort((a, b) => a.order - b.order);
  });

  routine(id: string): Routine | undefined {
    return this.routines().find((r) => r.id === id);
  }

  /** The habits in a routine's chain today, in order. */
  habitsOf(routineId: string): Habit[] {
    return chainHabits(routineId, this.habits(), this.today());
  }

  /** Starts a new routine with its anchor and first habit. */
  async createChain(input: ChainInput): Promise<Routine> {
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

  /**
   * Starts a routine from a template: its anchor, name, and every habit in the chain.
   * The result is an ordinary routine, so the person can edit it like any other.
   */
  async createFromTemplate(template: RoutineTemplate): Promise<Routine> {
    const today = this.today();
    const routine: Routine = {
      id: newId(),
      name: template.name,
      anchor: template.anchor,
      usualTime: template.usualTime,
      order: nextOrder(this.routines()),
      createdOn: today,
    };
    const habits: Habit[] = template.habits.map((h, order) => ({
      id: newId(),
      routineId: routine.id,
      name: h.name,
      twoMinuteVersion: h.twoMinuteVersion,
      ...(h.makeItEasier ? { makeItEasier: h.makeItEasier } : {}),
      order,
      createdOn: today,
    }));
    await this.repo.putRoutine(routine);
    await this.repo.putHabits(habits);
    this.routines.update((list) => [...list, routine]);
    this.habits.update((list) => [...list, ...habits]);
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

  async updateRoutine(id: string, edit: RoutineEdit): Promise<void> {
    const current = this.routine(id);
    if (!current) return;
    const next: Routine = { ...current, ...trimmed(edit) };
    if (!next.anchor) return; // A chain always needs an anchor.
    if (!next.usualTime) delete next.usualTime;
    await this.repo.putRoutine(next);
    this.routines.update((list) => list.map((r) => (r.id === id ? next : r)));
  }

  /** Removes a routine from today on. Its habits and past check-ins are kept for history. */
  async archiveRoutine(id: string): Promise<void> {
    const current = this.routine(id);
    if (!current) return;
    const next: Routine = { ...current, archivedOn: this.today() };
    await this.repo.putRoutine(next);
    this.routines.update((list) => list.map((r) => (r.id === id ? next : r)));
  }

  async updateHabit(id: string, edit: HabitEdit): Promise<void> {
    const current = this.habits().find((h) => h.id === id);
    if (!current) return;
    const next: Habit = { ...current, ...trimmed(edit) };
    if (!next.name || !next.twoMinuteVersion) return;
    // The optional notes are cleared by leaving them blank.
    if (!next.makeItEasier) delete next.makeItEasier;
    if (!next.obstacle) delete next.obstacle;
    await this.repo.putHabit(next);
    this.habits.update((list) => list.map((h) => (h.id === id ? next : h)));
  }

  /** Takes a habit out of its chain from today on. Past check-ins are kept. */
  async archiveHabit(id: string): Promise<void> {
    const current = this.habits().find((h) => h.id === id);
    if (!current) return;
    const next: Habit = { ...current, archivedOn: this.today() };
    await this.repo.putHabit(next);
    this.habits.update((list) => list.map((h) => (h.id === id ? next : h)));
  }

  /** Moves a habit up (-1) or down (+1) in its chain. */
  async moveHabit(id: string, by: number): Promise<void> {
    const habit = this.habits().find((h) => h.id === id);
    if (!habit) return;
    const chain = this.habitsOf(habit.routineId);
    const from = chain.findIndex((h) => h.id === id);
    const changed = moveItem(chain, from, from + by);
    if (!changed.length) return;
    await this.repo.putHabits(changed);
    const byId = new Map(changed.map((h) => [h.id, h]));
    this.habits.update((list) => list.map((h) => byId.get(h.id) ?? h));
  }

  /**
   * Moves a habit to the end of another routine's chain (a new anchor).
   * Its check-ins go with it, so its history and chain carry on.
   */
  async moveHabitToRoutine(id: string, routineId: string): Promise<void> {
    const current = this.habits().find((h) => h.id === id);
    if (!current || current.routineId === routineId || !this.routine(routineId)) return;
    const next: Habit = {
      ...current,
      routineId,
      order: nextOrder(this.habits().filter((h) => h.routineId === routineId)),
    };
    await this.repo.putHabit(next);
    this.habits.update((list) => list.map((h) => (h.id === id ? next : h)));
  }

  /** Puts habits back exactly as they were (used to undo a quick change). */
  async restoreHabits(habits: readonly Habit[]): Promise<void> {
    if (!habits.length) return;
    await this.repo.putHabits(habits);
    const byId = new Map(habits.map((h) => [h.id, h]));
    this.habits.update((list) => list.map((h) => byId.get(h.id) ?? h));
  }

  /** Saves the reflection for a week, replacing any earlier one for that week. */
  async saveReflection(week: DayKey, notes: { wentWell?: string; tweak?: string }): Promise<void> {
    const reflection: Reflection = { week, savedOn: this.today() };
    const wentWell = cleanNote(notes.wentWell);
    const tweak = cleanNote(notes.tweak);
    if (wentWell) reflection.wentWell = wentWell;
    if (tweak) reflection.tweak = tweak;
    await this.repo.putReflection(reflection);
    this.reflections.update((list) => [...list.filter((r) => r.week !== week), reflection]);
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

  /** Everything on this device, wrapped as a backup file. */
  backup(now = new Date()): BackupFile {
    return createBackup(
      {
        routines: this.routines(),
        habits: this.habits(),
        checkIns: this.checkIns(),
        reflections: this.reflections(),
      },
      now,
    );
  }

  /** Replaces everything on this device with validated backup data. */
  async restore(data: BackupData): Promise<void> {
    const snapshot = structuredClone(data);
    await this.repo.replaceAll(snapshot);
    this.routines.set(snapshot.routines);
    this.habits.set(snapshot.habits);
    this.checkIns.set(snapshot.checkIns);
    this.reflections.set(snapshot.reflections);
    this.loading = Promise.resolve();
  }

  /** Deletes every routine, habit, check-in and reflection on this device, all or nothing. */
  async resetAll(): Promise<void> {
    await this.repo.replaceAll({ routines: [], habits: [], checkIns: [], reflections: [] });
    this.routines.set([]);
    this.habits.set([]);
    this.checkIns.set([]);
    this.reflections.set([]);
    this.loading = Promise.resolve();
  }
}
