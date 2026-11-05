import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  type Habit,
  type Schedule,
  MAX_TIMES_A_WEEK,
  WEEKDAYS,
  describeSchedule,
  type RowBox,
  dropIndex,
  suggestTwoMinuteVersion,
} from '@andthen/core';

type ScheduleKind = 'daily' | 'days' | 'weekly';

/** A habit being dragged by its handle. Positions are in viewport pixels. */
interface Drag {
  id: string;
  pointerId: number;
  from: number;
  to: number;
  startY: number;
  dy: number;
  /** Height of the dragged row, which is how far the rows it passes slide over. */
  height: number;
  /** Where each habit row sat when the drag started. */
  rows: RowBox[];
}

/** Day toggles, Monday first. Values are `Date.getDay()` numbers. */
const DAY_TOGGLES = [
  { value: 1, short: 'M', long: 'Monday' },
  { value: 2, short: 'T', long: 'Tuesday' },
  { value: 3, short: 'W', long: 'Wednesday' },
  { value: 4, short: 'T', long: 'Thursday' },
  { value: 5, short: 'F', long: 'Friday' },
  { value: 6, short: 'S', long: 'Saturday' },
  { value: 0, short: 'S', long: 'Sunday' },
];
import { HabitStore } from '../data/habit-store';
import { Autofocus, byId, focusAfterRender } from '../shared/focus';
import { HelpLink } from '../help/help-link';

/** What is open for editing: the anchor, one habit, or nothing. */
type Editing = { kind: 'anchor' } | { kind: 'habit'; id: string } | undefined;

/**
 * Edits one routine chain: its anchor, and the habits that follow it.
 * Add, rename, reorder (drag, or up/down), and remove links. Changes save right away.
 */
@Component({
  selector: 'app-chain-editor',
  imports: [RouterLink, Autofocus, HelpLink],
  templateUrl: './chain-editor.html',
  styleUrl: './routines.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChainEditor {
  private readonly store = inject(HabitStore);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Route param `:id`, bound by the router. */
  readonly id = input.required<string>();

  protected readonly routine = computed(() => {
    const r = this.store.routine(this.id());
    return r && !r.archivedOn ? r : undefined;
  });
  protected readonly habits = computed(() => this.store.habitsOf(this.id()));

  protected readonly editing = signal<Editing>(undefined);
  protected readonly confirmingRemoveRoutine = signal(false);

  // Drafts for whichever form is open.
  protected readonly draftAnchor = signal('');
  protected readonly draftTime = signal('');
  protected readonly draftName = signal('');
  protected readonly draftMini = signal('');
  protected readonly draftEasier = signal('');
  protected readonly draftObstacle = signal('');
  protected readonly draftWhy = signal('');
  protected readonly draftScheduleKind = signal<ScheduleKind>('daily');
  protected readonly draftDays = signal<number[]>([...WEEKDAYS]);
  protected readonly draftTimes = signal(3);

  protected readonly dayToggles = DAY_TOGGLES;
  protected readonly scheduleOptions: readonly { kind: ScheduleKind; label: string }[] = [
    { kind: 'daily', label: 'Every day' },
    { kind: 'days', label: 'Some days' },
    { kind: 'weekly', label: 'Times a week' },
  ];
  protected readonly timesOptions = Array.from({ length: MAX_TIMES_A_WEEK }, (_, i) => i + 1);
  protected readonly describeSchedule = describeSchedule;

  // The "+ and then..." form.
  protected readonly adding = signal(false);
  protected readonly newName = signal('');
  protected readonly newMini = signal('');
  protected readonly newSuggestion = computed(() => suggestTwoMinuteVersion(this.newName()));

  protected isEditingHabit(habit: Habit): boolean {
    const e = this.editing();
    return e?.kind === 'habit' && e.id === habit.id;
  }

  protected editAnchor(): void {
    const r = this.routine();
    if (!r) return;
    this.draftAnchor.set(r.anchor);
    this.draftTime.set(r.usualTime ?? '');
    this.editing.set({ kind: 'anchor' });
  }

  protected async saveAnchor(): Promise<void> {
    if (!this.draftAnchor().trim()) return;
    await this.store.updateRoutine(this.id(), {
      anchor: this.draftAnchor(),
      usualTime: this.draftTime() || undefined,
    });
    this.cancel();
  }

  protected editHabit(habit: Habit): void {
    this.draftName.set(habit.name);
    this.draftMini.set(habit.twoMinuteVersion);
    this.draftEasier.set(habit.makeItEasier ?? '');
    this.draftObstacle.set(habit.obstacle ?? '');
    this.draftWhy.set(habit.why ?? '');
    const schedule = habit.schedule;
    this.draftScheduleKind.set(schedule?.kind ?? 'daily');
    this.draftDays.set(schedule?.kind === 'days' ? [...schedule.days] : [...WEEKDAYS]);
    this.draftTimes.set(schedule?.kind === 'weekly' ? schedule.times : 3);
    this.adding.set(false);
    this.editing.set({ kind: 'habit', id: habit.id });
  }

  protected async saveHabit(habit: Habit): Promise<void> {
    const name = this.draftName().trim();
    if (!name) return;
    await this.store.updateHabit(habit.id, {
      name,
      twoMinuteVersion: this.draftMini().trim() || suggestTwoMinuteVersion(name),
      makeItEasier: this.draftEasier(),
      obstacle: this.draftObstacle(),
      why: this.draftWhy(),
      schedule: this.draftSchedule(),
    });
    this.cancel();
  }

  /** The schedule the form describes. Undefined means every day. */
  private draftSchedule(): Schedule | undefined {
    switch (this.draftScheduleKind()) {
      case 'days':
        return { kind: 'days', days: this.draftDays() };
      case 'weekly':
        return { kind: 'weekly', times: this.draftTimes() };
      default:
        return undefined;
    }
  }

  protected toggleDay(day: number): void {
    this.draftDays.update((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    );
  }

  protected setDays(days: readonly number[]): void {
    this.draftDays.set([...days]);
  }

  protected readonly weekdays = WEEKDAYS;

  /** "Some days" needs at least one day picked. */
  protected readonly scheduleValid = computed(
    () => this.draftScheduleKind() !== 'days' || this.draftDays().length > 0,
  );

  protected async removeHabit(habit: Habit): Promise<void> {
    await this.store.archiveHabit(habit.id);
    this.editing.set(undefined);
    focusAfterRender(this.injector, byId('add-habit'));
  }

  protected readonly drag = signal<Drag | undefined>(undefined);

  /** Starts dragging a habit by its handle. The up and down buttons stay for keyboards. */
  protected startDrag(event: PointerEvent, habit: Habit, index: number): void {
    if (this.drag() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const rows = [...this.host.nativeElement.querySelectorAll<HTMLElement>('.habit-row')];
    const row = rows[index];
    if (!row) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    const boxes = rows.map((r) => {
      const rect = r.getBoundingClientRect();
      return { top: rect.top, bottom: rect.top + rect.height };
    });
    this.editing.set(undefined);
    this.drag.set({
      id: habit.id,
      pointerId: event.pointerId,
      from: index,
      to: index,
      startY: event.clientY,
      dy: 0,
      height: row.getBoundingClientRect().height,
      rows: boxes,
    });
  }

  protected moveDrag(event: PointerEvent): void {
    const drag = this.drag();
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dy = event.clientY - drag.startY;
    const to = dropIndex(drag.rows, drag.from, dy);
    this.drag.set({ ...drag, dy, to });
  }

  protected async endDrag(event: PointerEvent, cancelled = false): Promise<void> {
    const drag = this.drag();
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.drag.set(undefined);
    if (!cancelled && drag.to !== drag.from) {
      await this.store.moveHabit(drag.id, drag.to - drag.from);
    }
  }

  /** How far a row slides while another one is dragged past it. */
  protected rowShift(index: number): string | null {
    const drag = this.drag();
    if (!drag) return null;
    if (index === drag.from) return `translateY(${drag.dy}px)`;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) {
      return `translateY(${-drag.height}px)`;
    }
    if (drag.to < drag.from && index >= drag.to && index < drag.from) {
      return `translateY(${drag.height}px)`;
    }
    return 'translateY(0)';
  }

  /** Moves a habit, keeping focus on its arrow (or the other one, at the top or bottom). */
  protected async move(habit: Habit, by: number): Promise<void> {
    await this.store.moveHabit(habit.id, by);
    const [same, other] = by < 0 ? ['up', 'down'] : ['down', 'up'];
    focusAfterRender(this.injector, () => {
      const button = document.getElementById(`${same}-${habit.id}`) as HTMLButtonElement | null;
      return button && !button.disabled ? button : document.getElementById(`${other}-${habit.id}`);
    });
  }

  protected startAdding(): void {
    this.editing.set(undefined);
    this.newName.set('');
    this.newMini.set('');
    this.adding.set(true);
  }

  protected async addHabit(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;
    await this.store.addLink(this.id(), name, this.newMini().trim() || this.newSuggestion());
    // Stay open so a few habits can be added in a row.
    this.newName.set('');
    this.newMini.set('');
  }

  /** Closes whichever form is open and puts focus back on the button that opened it. */
  protected cancel(): void {
    const editing = this.editing();
    const returnTo = this.adding()
      ? 'add-habit'
      : editing?.kind === 'habit'
        ? `edit-${editing.id}`
        : editing?.kind === 'anchor'
          ? 'edit-anchor'
          : undefined;
    this.editing.set(undefined);
    this.adding.set(false);
    if (returnTo) focusAfterRender(this.injector, byId(returnTo));
  }

  protected keepRoutine(): void {
    this.confirmingRemoveRoutine.set(false);
    focusAfterRender(this.injector, byId('remove-routine'));
  }

  protected async removeRoutine(): Promise<void> {
    await this.store.archiveRoutine(this.id());
    await this.router.navigate(['/routines']);
  }
}
