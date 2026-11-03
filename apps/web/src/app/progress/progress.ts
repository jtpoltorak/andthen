import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  type DayKey,
  type DayStatus,
  type Habit,
  type HabitStats,
  type Routine,
  addDays,
  chainHabits,
  dayStatus,
  describeSchedule,
  fromDayKey,
  habitSpan,
  habitStats,
  indexCheckIns,
  summarize,
  weekGrid,
  weekStart,
  weekdayLabels,
} from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { PreferencesStore } from '../data/preferences';

/** How many weeks the dot grid shows. */
const WEEKS = 8;

interface Dot {
  date: DayKey;
  status: DayStatus;
  title: string;
}

interface HabitRow {
  habit: Habit;
  /** Weeks, oldest first; each is Monday to Sunday. */
  weeks: Dot[][];
  stats: HabitStats;
  /** Set when the habit (or its routine) has been retired. */
  retiredOn?: DayKey;
  gridLabel: string;
  /** Started in the last week, so most of the grid is still blank. */
  isNew: boolean;
  /** "Weekdays", "3 times a week"... Empty for every day. */
  schedule: string;
}

interface RoutineSection {
  routine: Routine;
  habits: HabitRow[];
  retiredHabits: HabitRow[];
}

const STATUS_WORDS: Record<DayStatus, string> = {
  full: 'done',
  mini: 'did the 2-minute version',
  skip: 'skipped',
  missed: 'not checked in',
  open: 'not checked in yet',
  rest: 'rest day',
  off: 'not in a routine',
};

const shortDate = (day: DayKey) =>
  fromDayKey(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Progress: a weekly recap, then an 8-week dot grid and a forgiving chain count per habit. */
@Component({
  selector: 'app-progress',
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './progress.html',
  styleUrl: './progress.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress {
  private readonly store = inject(HabitStore);

  private readonly preferences = inject(PreferencesStore);
  private readonly weekStartsOn = computed(() => this.preferences.prefs().weekStartsOn);

  protected readonly weekdayLabels = computed(() => weekdayLabels(this.weekStartsOn()));
  protected readonly shortDate = shortDate;

  private readonly index = computed(() => indexCheckIns(this.store.checkIns()));

  protected readonly week = computed(() =>
    summarize(
      this.store.checkIns(),
      weekStart(this.store.today(), this.weekStartsOn()),
      this.store.today(),
    ),
  );

  /** Saved weekly reflections that have a note, newest first. */
  protected readonly reflections = computed(() =>
    [...this.store.reflections()]
      .filter((r) => r.wentWell || r.tweak)
      .sort((a, b) => b.week.localeCompare(a.week)),
  );

  /** Shows "Rest day" in the legend once any habit has a schedule. */
  protected readonly hasSchedules = computed(() => this.store.habits().some((h) => h.schedule));

  protected readonly sections = computed(() => {
    const today = this.store.today();
    return this.store.activeRoutines().map((routine): RoutineSection => {
      const current = chainHabits(routine.id, this.store.habits(), today);
      const retired = this.store
        .habits()
        .filter((h) => h.routineId === routine.id && !current.includes(h))
        .filter((h) => this.hasHistory(h, routine))
        .sort(byRetiredDesc(routine));
      return {
        routine,
        habits: current.map((h) => this.row(h, routine)),
        retiredHabits: retired.map((h) => this.row(h, routine)),
      };
    });
  });

  /** Routines that were removed, newest first, with any habit that ever had a day in a chain. */
  protected readonly retiredSections = computed(() => {
    const today = this.store.today();
    return this.store
      .routines()
      .filter((r) => r.archivedOn && r.archivedOn <= today)
      .sort((a, b) => (b.archivedOn ?? '').localeCompare(a.archivedOn ?? ''))
      .map((routine): RoutineSection => ({
        routine,
        habits: this.store
          .habits()
          .filter((h) => h.routineId === routine.id && this.hasHistory(h, routine))
          .sort((a, b) => a.order - b.order)
          .map((h) => this.row(h, routine)),
        retiredHabits: [],
      }))
      .filter((s) => s.habits.length > 0);
  });

  protected chainLabel(row: HabitRow): string {
    const { currentChain, bestChain, unit } = row.stats;
    if (row.retiredOn) return bestChain ? `Best chain: ${plural(bestChain, unit)}` : 'Retired';
    if (currentChain) return plural(currentChain, unit);
    return bestChain ? 'Pick it back up today' : 'Starts with one check-in';
  }

  /** True when a habit was part of a chain for at least one day, or has any check-in. */
  private hasHistory(habit: Habit, routine: Routine): boolean {
    const { from, until } = habitSpan(habit, routine);
    if (!until || from < until) return true;
    return this.store.checkIns().some((c) => c.habitId === habit.id);
  }

  private row(habit: Habit, routine: Routine): HabitRow {
    const today = this.store.today();
    const index = this.index();
    const { from, until } = habitSpan(habit, routine);
    const retiredOn = until && until <= today ? until : undefined;
    // A retired habit's grid ends on its last day, so old history stays visible.
    const lastDay = retiredOn ? addDays(retiredOn, -1) : today;
    const weeks = weekGrid(lastDay < today ? lastDay : today, WEEKS, this.weekStartsOn()).map(
      (week) =>
        week.map((date): Dot => {
          const status = dayStatus(habit, routine, index, date, today, this.weekStartsOn());
          return { date, status, title: `${shortDate(date)}: ${STATUS_WORDS[status]}` };
        }),
    );
    const counts = { full: 0, mini: 0, skip: 0 };
    for (const dot of weeks.flat()) {
      if (dot.status === 'full' || dot.status === 'mini' || dot.status === 'skip') {
        counts[dot.status]++;
      }
    }
    const gridLabel =
      `Last ${WEEKS} weeks: ${plural(counts.full, 'day')} done, ` +
      `${counts.mini} with the 2-minute version, ${counts.skip} skipped`;
    const isNew = !retiredOn && from > addDays(today, -7);
    return {
      habit,
      weeks,
      stats: habitStats(habit, routine, index, today, this.weekStartsOn()),
      retiredOn,
      gridLabel,
      isNew,
      schedule: habit.schedule ? describeSchedule(habit.schedule) : '',
    };
  }
}

/** Most recently retired first. */
function byRetiredDesc(routine: Routine) {
  return (a: Habit, b: Habit) =>
    (habitSpan(b, routine).until ?? '').localeCompare(habitSpan(a, routine).until ?? '');
}
