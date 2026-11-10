import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  type CheckInKind,
  type DayKey,
  type DayStatus,
  type GridCell,
  type Habit,
  type Routine,
  addDays,
  canEditDay,
  describeJournal,
  fromDayKey,
  gridDayShares,
  gridDays,
  habitGrid,
  habitStats,
  hasJournal,
  indexCheckIns,
} from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { PreferencesStore } from '../data/preferences';
import { EmptyState } from '../shared/empty-state';

/** How many weeks back the 7-day view can page. */
const MAX_PAGES = 12;

/** Wide enough for 30 roomy columns, a chain column and the "All habits" row. */
const WIDE = '(min-width: 700px)';
/** Laptops open on 30 days; phones on 7. */
const LAPTOP = '(min-width: 900px)';

const WORDS: Record<DayStatus, string> = {
  full: 'Done',
  mini: 'Did the 2-minute version',
  skip: 'Skipped',
  missed: 'No check-in',
  open: 'Not checked in yet',
  rest: 'Rest day',
  off: 'Not in a routine',
};

const shortDate = (day: DayKey) =>
  fromDayKey(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function matches(query: string): boolean {
  return typeof matchMedia === 'function' && matchMedia(query).matches;
}

interface Picked {
  habit: Habit;
  routine: Routine;
  cell: GridCell;
}

/**
 * Progress, as a grid: habits as rows grouped by routine, days as columns.
 * Tap a day in the last week to change it; older days are view-only.
 */
@Component({
  selector: 'app-habit-grid',
  imports: [RouterLink, EmptyState],
  templateUrl: './habit-grid.html',
  styleUrl: './habit-grid.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HabitGrid {
  private readonly store = inject(HabitStore);
  private readonly preferences = inject(PreferencesStore);
  private readonly editor = viewChild<ElementRef<HTMLDialogElement>>('editor');

  /** 7 or 30 days. */
  protected readonly span = signal<7 | 30>(matches(LAPTOP) ? 30 : 7);
  /** Weeks back from this one, in the 7-day view. */
  protected readonly page = signal(0);
  protected readonly wide = signal(matches(WIDE));
  protected readonly maxPage = MAX_PAGES;
  protected readonly picked = signal<Picked | undefined>(undefined);

  /** 30 days on a phone: too small to tap one day, so a tap opens that day's week. */
  protected readonly compact = computed(() => this.span() === 30 && !this.wide());

  private readonly index = computed(() => indexCheckIns(this.store.checkIns()));
  private readonly weekStartsOn = computed(() => this.preferences.prefs().weekStartsOn);

  protected readonly days = computed(() => {
    const today = this.store.today();
    return this.span() === 30 ? gridDays(today, 30) : gridDays(addDays(today, -7 * this.page()), 7);
  });

  protected readonly columns = computed(() =>
    this.days().map((date, i) => {
      const d = fromDayKey(date);
      return {
        date,
        letter: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        num: d.getDate(),
        isToday: date === this.store.today(),
        // A darker line where each week starts (not on the first column, which has its own edge).
        weekStart: i > 0 && d.getDay() === this.weekStartsOn(),
        // On a phone, 30 numbers don't fit: show where each week starts.
        showNum: !this.compact() || d.getDay() === this.weekStartsOn(),
        band: this.span() === 30 && this.wide() && canEditDay(date, this.store.today()),
        label: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
      };
    }),
  );

  protected readonly groups = computed(() => {
    const today = this.store.today();
    const index = this.index();
    return habitGrid(
      this.store.activeRoutines(),
      this.store.habits(),
      index,
      this.days(),
      today,
      this.weekStartsOn(),
    ).map((group) => ({
      routine: group.routine,
      rows: group.rows.map((row) => {
        const stats = habitStats(row.habit, group.routine, index, today, this.weekStartsOn());
        return {
          ...row,
          chain: stats.currentChain
            ? `${stats.currentChain}-${stats.unit} chain`
            : 'Starts with one check-in',
          chainOn: stats.currentChain > 0,
          count: `Done ${row.done} of ${row.asked}`,
        };
      }),
    }));
  });

  protected readonly shares = computed(() =>
    gridDayShares(this.groups(), this.days().length).map((share, i) => ({
      height: share === undefined ? 0 : Math.max(3, Math.round(share * 28)),
      today: i === this.days().length - 1 && this.page() === 0,
      band: this.columns()[i]?.band ?? false,
    })),
  );

  protected readonly showedUp = computed(() => {
    const days = new Set<DayKey>();
    for (const g of this.groups()) {
      for (const r of g.rows) {
        for (const c of r.cells) if (c.status === 'full' || c.status === 'mini') days.add(c.date);
      }
    }
    return `${days.size} of ${this.days().length} days`;
  });

  protected readonly gridColumns = computed(() => {
    const n = this.days().length;
    if (!this.wide()) return `104px repeat(${n}, minmax(0, 1fr))`;
    return `190px repeat(${n}, ${n === 30 ? 24 : 56}px) minmax(150px, 1fr)`;
  });

  protected readonly rangeLabel = computed(() => {
    const days = this.days();
    return `${shortDate(days[0])} – ${shortDate(days[days.length - 1])}`;
  });

  protected readonly caption = computed(() => {
    if (this.compact()) return 'A glance at 30 days. Tap any day to open its week.';
    if (this.span() === 30) {
      return 'Tap a day to change it. The shaded last 7 days can be changed; older days are view-only.';
    }
    return this.page() === 0
      ? 'Tap a day to change it. The last 7 days can be changed.'
      : 'Older days are view-only. Use the arrow to come back to this week.';
  });

  /** What the editor shows for the picked day. */
  protected readonly pickedView = computed(() => {
    const p = this.picked();
    if (!p) return undefined;
    const today = this.store.today();
    const { date } = p.cell;
    const day =
      date === today
        ? 'Today'
        : date === addDays(today, -1)
          ? 'Yesterday'
          : fromDayKey(date).toLocaleDateString(undefined, { weekday: 'long' });
    const checkIn = this.index().get(`${p.habit.id}|${date}`);
    // Read the status again, so the editor follows a change made while it's open.
    const status =
      this.groups()
        .flatMap((g) => g.rows)
        .find((r) => r.habit.id === p.habit.id)
        ?.cells.find((c) => c.date === date)?.status ?? p.cell.status;
    return {
      title: `${day}, ${shortDate(date)}`,
      name: p.habit.name,
      anchor: p.routine.anchor,
      mini: p.habit.twoMinuteVersion,
      now: WORDS[status],
      status,
      note: checkIn && hasJournal(checkIn) ? describeJournal(checkIn) : '',
      editable: p.cell.editable,
      hasCheckIn: !!checkIn,
    };
  });

  constructor() {
    if (typeof matchMedia === 'function') {
      const query = matchMedia(WIDE);
      const onChange = () => this.wide.set(query.matches);
      query.addEventListener?.('change', onChange);
      inject(DestroyRef).onDestroy(() => query.removeEventListener?.('change', onChange));
    }
  }

  protected label(row: { habit: Habit }, cell: GridCell): string {
    const day = fromDayKey(cell.date).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    const action = this.compact() ? '. Open this week' : cell.editable ? '' : ', view only';
    return `${row.habit.name}, ${day}: ${WORDS[cell.status]}${cell.noted ? ', with a note' : ''}${action}`;
  }

  protected showSpan(span: 7 | 30): void {
    this.span.set(span);
    this.page.set(0);
  }

  protected earlier(): void {
    this.page.update((p) => Math.min(p + 1, MAX_PAGES));
  }

  protected later(): void {
    this.page.update((p) => Math.max(p - 1, 0));
  }

  protected tap(habit: Habit, routine: Routine, cell: GridCell): void {
    if (this.compact()) {
      const daysAgo = Math.round(
        (fromDayKey(this.store.today()).getTime() - fromDayKey(cell.date).getTime()) / 86_400_000,
      );
      this.span.set(7);
      this.page.set(Math.floor(daysAgo / 7));
      return;
    }
    this.picked.set({ habit, routine, cell });
    const dialog = this.editor()?.nativeElement;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }

  protected async set(kind: CheckInKind | 'clear'): Promise<void> {
    const p = this.picked();
    if (!p) return;
    if (kind === 'clear') await this.store.clearCheckInOn(p.habit.id, p.cell.date);
    else await this.store.setCheckInOn(p.habit.id, p.cell.date, kind);
    this.close();
  }

  protected close(): void {
    const dialog = this.editor()?.nativeElement;
    if (dialog?.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
    this.picked.set(undefined);
  }

  /** A click on the backdrop (outside the dialog's box) closes it. */
  protected backdrop(event: MouseEvent): void {
    if (event.target === this.editor()?.nativeElement) this.close();
  }
}
