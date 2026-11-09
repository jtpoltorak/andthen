import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  ROUTINE_TEMPLATES,
  type Chain,
  type ChainLink,
  type CheckInKind,
  type PartOfDay,
  type RoutineTemplate,
  chainsByPartOfDay,
  fromDayKey,
  pickActiveRoutine,
} from '@andthen/core';
import { HabitStore } from '@web/data/habit-store';
import { PreferencesStore } from '@web/data/preferences';
import { DayRing } from '@web/today/day-ring';

/** How long "Saved … Undo" stays after an answer. */
export const UNDO_MS = 6000;

const lowerFirst = (text: string) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : '');

/** The full app, for everything the popup leaves out (editing, Progress, Help). */
export const WEB_APP_URL = 'https://andthenhabits.com';

const PART_LABELS: Record<PartOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
};

/**
 * The toolbar popup: today's routines, with the next habit up front and one tap
 * to check it off. Anything that needs room opens the full app in a tab.
 */
@Component({
  selector: 'ext-popup',
  imports: [DayRing],
  templateUrl: './popup.html',
  styleUrl: './popup.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Popup {
  protected readonly store = inject(HabitStore);
  // Applies the theme, accent and text options to the popup, as in the app.
  private readonly preferences = inject(PreferencesStore);

  protected readonly webAppUrl = WEB_APP_URL;
  protected readonly lowerFirst = lowerFirst;
  private undoTimer?: ReturnType<typeof setTimeout>;
  protected readonly partLabels = PART_LABELS;
  protected readonly loaded = signal(false);

  /** A card opened by hand; otherwise the popup opens the routine that's due. */
  private readonly openedByHand = signal<string | undefined>(undefined);
  /** The habit just answered, so it can be undone. */
  protected readonly lastAnswer = signal<{ habitId: string; name: string } | undefined>(undefined);

  protected readonly dateLabel = computed(() =>
    fromDayKey(this.store.today()).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
  );

  protected readonly chains = computed(() => this.store.chains());
  protected readonly groups = computed(() => chainsByPartOfDay(this.chains()));
  protected readonly statuses = computed(() =>
    this.chains().flatMap((c) => c.links.map((l) => l.status)),
  );
  protected readonly allDone = computed(() => {
    const chains = this.chains().filter((c) => c.total > 0 && !c.paused);
    return chains.length > 0 && chains.every((c) => c.complete);
  });

  protected readonly activeId = computed(() => {
    const byHand = this.openedByHand();
    if (byHand && this.chains().some((c) => c.routine.id === byHand)) return byHand;
    const now = new Date();
    return pickActiveRoutine(this.chains(), now.getHours() * 60 + now.getMinutes());
  });

  /** Offered while the extension has no routines yet. */
  protected readonly starters = ROUTINE_TEMPLATES;

  constructor() {
    void this.store.load().then(() => this.loaded.set(true));
    // "Today" rolls over at midnight if the popup stays open (it can, docked in some browsers).
    const onVisible = () => this.store.refreshDay();
    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(this.undoTimer);
    });
  }

  protected nextLink(chain: Chain): ChainLink | undefined {
    return chain.links.find((l) => l.isNext);
  }

  protected toggle(chain: Chain): void {
    this.openedByHand.set(this.activeId() === chain.routine.id ? '' : chain.routine.id);
  }

  protected async answer(link: ChainLink, kind: CheckInKind): Promise<void> {
    await this.store.checkIn(link.habit.id, kind);
    this.lastAnswer.set({ habitId: link.habit.id, name: link.habit.name });
    clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => this.lastAnswer.set(undefined), UNDO_MS);
  }

  protected async undo(): Promise<void> {
    const last = this.lastAnswer();
    if (!last) return;
    clearTimeout(this.undoTimer);
    await this.store.undoCheckIn(last.habitId);
    this.lastAnswer.set(undefined);
  }

  protected async start(template: RoutineTemplate): Promise<void> {
    await this.store.createFromTemplate(template);
  }
}
