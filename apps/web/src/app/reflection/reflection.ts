import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  type DayKey,
  type DayStatus,
  type Habit,
  type HabitWeek,
  MAX_REFLECTION_LENGTH,
  addDays,
  dayStatus,
  fromDayKey,
  habitWeeks,
  indexCheckIns,
  previousReflection,
  reflectionFor,
  summarize,
} from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { PreferencesStore } from '../data/preferences';
import { ReflectionPrompt } from './reflection-prompt';
import { HelpLink } from '../help/help-link';

/** A one-tap change offered for a habit that had a hard week. */
interface Tweak {
  label: string;
  apply: () => Promise<void>;
}

interface HabitRow extends HabitWeek {
  dots: { date: DayKey; status: DayStatus }[];
  summary: string;
  tweaks: Tweak[];
}

const shortDate = (day: DayKey) =>
  fromDayKey(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The weekly reflection: how each habit went, a one-tap way to make a hard one
 * easier, and two optional notes. Everything here is optional; "Save" is enough.
 */
@Component({
  selector: 'app-reflection',
  imports: [RouterLink, HelpLink],
  templateUrl: './reflection.html',
  styleUrl: './reflection.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reflection {
  private readonly store = inject(HabitStore);
  private readonly router = inject(Router);
  private readonly prompt = inject(ReflectionPrompt);
  private readonly preferences = inject(PreferencesStore);
  private readonly weekStartsOn = computed(() => this.preferences.prefs().weekStartsOn);

  protected readonly maxLength = MAX_REFLECTION_LENGTH;
  protected readonly week = this.prompt.week;

  protected readonly rangeLabel = computed(() => {
    const { from, to } = this.week();
    return `${shortDate(from)} to ${shortDate(to)}`;
  });

  protected readonly summary = computed(() => {
    const { from, to } = this.week();
    const today = this.store.today();
    return summarize(this.store.checkIns(), from, to < today ? to : today);
  });

  private readonly saved = computed(() =>
    reflectionFor(this.store.reflections(), this.week().from),
  );
  /** Last time's "what to tweak", so this week can check in on it. */
  protected readonly lastTweak = computed(
    () => previousReflection(this.store.reflections(), this.week().from)?.tweak,
  );

  protected readonly wentWell = signal(this.saved()?.wentWell ?? '');
  protected readonly tweak = signal(this.saved()?.tweak ?? '');
  protected readonly alreadySaved = computed(() => !!this.saved());

  /** Habits changed here, by id, with how they were before (for Undo). */
  protected readonly changed = signal<ReadonlyMap<string, { before: Habit[]; note: string }>>(
    new Map(),
  );

  protected readonly rows = computed(() => {
    const today = this.store.today();
    const week = this.week();
    const index = indexCheckIns(this.store.checkIns());
    const routines = this.store.activeRoutines();
    const startsOn = this.weekStartsOn();
    return habitWeeks(routines, this.store.habits(), index, week, today, startsOn).map(
      (entry): HabitRow => {
        const dots = [];
        for (let d = week.from; d <= week.to; d = addDays(d, 1)) {
          dots.push({
            date: d,
            status: dayStatus(entry.habit, entry.routine, index, d, today, startsOn),
          });
        }
        return {
          ...entry,
          dots,
          summary: this.describe(entry),
          tweaks: entry.struggling ? this.tweaksFor(entry.habit, routines) : [],
        };
      },
    );
  });

  protected readonly bestRow = computed(() => {
    const best = [...this.rows()].sort((a, b) => b.done / b.days - a.done / a.days)[0];
    return best && best.done > 0 ? best : undefined;
  });

  protected readonly hasStruggles = computed(() => this.rows().some((r) => r.struggling));

  private describe(row: HabitWeek): string {
    if (row.target !== undefined) {
      return row.done >= row.target
        ? `Reached ${row.target} this week`
        : `${row.done} of ${row.target} this week`;
    }
    if (row.done === row.days) {
      const which = row.habit.schedule ? 'Every planned day' : 'Every day';
      return `${which} so far (${plural(row.done, 'day')})`;
    }
    const done = `${row.done} of ${row.days} days`;
    return row.mini ? `${done}, ${row.mini} as the 2-minute version` : done;
  }

  /** Ways to make a hard habit easier: a smaller step, or a different (or earlier) spot. */
  private tweaksFor(habit: Habit, routines: readonly { id: string; anchor: string }[]): Tweak[] {
    const tweaks: Tweak[] = [];
    if (!sameText(habit.name, habit.twoMinuteVersion)) {
      tweaks.push({
        label: `Shrink it to “${habit.twoMinuteVersion}”`,
        apply: () =>
          this.change(habit, `Now “${habit.twoMinuteVersion}”.`, () =>
            this.store.updateHabit(habit.id, { name: habit.twoMinuteVersion }),
          ),
      });
    }
    for (const r of routines.filter((r) => r.id !== habit.routineId)) {
      tweaks.push({
        label: `Move it to “${r.anchor}”`,
        apply: () =>
          this.change(habit, `Moved to “${r.anchor}”.`, () =>
            this.store.moveHabitToRoutine(habit.id, r.id),
          ),
      });
    }
    const position = this.store.habitsOf(habit.routineId).findIndex((h) => h.id === habit.id);
    if (position > 0) {
      tweaks.push({
        label: 'Do it first in its chain',
        apply: () =>
          this.change(habit, 'Now first in its chain.', () =>
            this.store.moveHabit(habit.id, -position),
          ),
      });
    }
    return tweaks;
  }

  private async change(habit: Habit, note: string, run: () => Promise<void>): Promise<void> {
    // Keep the whole chain as it was, so Undo also puts the order back.
    const before = this.store.habits().filter((h) => h.routineId === habit.routineId);
    await run();
    this.changed.update((map) => new Map(map).set(habit.id, { before, note }));
  }

  protected async undo(habitId: string): Promise<void> {
    const entry = this.changed().get(habitId);
    if (!entry) return;
    await this.store.restoreHabits(entry.before);
    this.changed.update((map) => {
      const next = new Map(map);
      next.delete(habitId);
      return next;
    });
  }

  protected async save(): Promise<void> {
    await this.store.saveReflection(this.week().from, {
      wentWell: this.wentWell(),
      tweak: this.tweak(),
    });
    await this.router.navigateByUrl('/today');
  }
}
