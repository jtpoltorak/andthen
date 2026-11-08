import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  type DayKey,
  type YearDay,
  fromDayKey,
  indexCheckIns,
  weekdayLabels,
  yearView,
} from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { PreferencesStore } from '../data/preferences';
import { HelpLink } from '../help/help-link';

const monthName = (first: DayKey, month: 'short' | 'long' = 'long') =>
  fromDayKey(first).toLocaleDateString(undefined, { month });

const LEVEL_WORDS = ['nothing done', 'some done', 'most done', 'all done'];

/**
 * The last 12 months at a glance: one small calendar per month, each day shaded by how
 * much of what it asked for got done. Skips, rest days and pauses are never shaded as misses.
 */
@Component({
  selector: 'app-year-view',
  imports: [RouterLink, HelpLink],
  templateUrl: './year-view.html',
  styleUrl: './year-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YearView {
  private readonly store = inject(HabitStore);
  private readonly preferences = inject(PreferencesStore);

  /** The routine to show, or undefined for all of them. */
  protected readonly routineId = signal<string | undefined>(undefined);

  /** Every routine with any history, current ones first, for the filter. */
  protected readonly routines = computed(() => {
    const withHabits = new Set(this.store.habits().map((h) => h.routineId));
    return [...this.store.routines()]
      .filter((r) => withHabits.has(r.id))
      .sort((a, b) => Number(!!a.archivedOn) - Number(!!b.archivedOn) || a.order - b.order);
  });

  protected readonly dayLabels = computed(() =>
    weekdayLabels(this.preferences.prefs().weekStartsOn),
  );

  protected readonly view = computed(() => {
    const id = this.routineId();
    const habits = this.store.habits().filter((h) => !id || h.routineId === id);
    return yearView(
      this.store.routines(),
      habits,
      indexCheckIns(this.store.checkIns()),
      this.store.today(),
      this.preferences.prefs().weekStartsOn,
    );
  });

  protected readonly months = computed(() =>
    this.view().months.map((m) => ({
      ...m,
      name: monthName(m.first, 'short'),
      year: m.first.slice(0, 4),
      blanks: Array.from({ length: m.lead }),
      summary:
        m.daysAsked || m.showedUp
          ? `${monthName(m.first)} ${m.first.slice(0, 4)}: showed up ${m.showedUp} of ${m.daysAsked} ${m.daysAsked === 1 ? 'day' : 'days'}`
          : `${monthName(m.first)} ${m.first.slice(0, 4)}: nothing to show yet`,
    })),
  );

  /** "Dec 2025 – Nov 2026" */
  protected readonly range = computed(() => {
    const months = this.view().months;
    const label = (first: DayKey) =>
      fromDayKey(first).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    return `${label(months[0].first)} – ${label(months[months.length - 1].first)}`;
  });

  protected readonly bestMonth = computed(() => {
    const best = this.view().bestMonth;
    return best ? monthName(best) : undefined;
  });

  protected routineLabel(r: { name?: string; anchor: string }): string {
    return r.name || r.anchor;
  }

  /** Hover text for a day: "Tue, Mar 3: 2 of 3 done". */
  protected dayTitle(d: YearDay): string {
    const date = fromDayKey(d.day).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    switch (d.kind) {
      case 'day':
        return `${date}: ${d.done} of ${d.asked} done (${LEVEL_WORDS[d.level ?? 0]})`;
      case 'rest':
        return `${date}: nothing asked for`;
      default:
        return date;
    }
  }
}
