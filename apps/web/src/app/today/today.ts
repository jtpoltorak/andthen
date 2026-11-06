import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  type ChainLink,
  type CheckInKind,
  type PartOfDay,
  addDays,
  chainsByPartOfDay,
  fromDayKey,
  greeting,
  pickActiveRoutine,
  suggestTwoMinuteVersion,
} from '@andthen/core';
import { RouterLink } from '@angular/router';
import { HabitStore } from '../data/habit-store';
import { PreferencesStore } from '../data/preferences';
import { ReflectionPrompt } from '../reflection/reflection-prompt';
import { Autofocus, byId, focusAfterRender } from '../shared/focus';
import { EmptyState } from '../shared/empty-state';
import { HelpLink } from '../help/help-link';
import { CheckInJournal } from './check-in-journal';
import { DayRing } from './day-ring';

/** Long enough for the longest celebration animation in today.css to finish. */
const CELEBRATE_MS = 1600;

const lowerFirst = (text: string) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : '');

/** Today: each routine is a card; the active one is open and asks "what's next?" */
@Component({
  selector: 'app-today',
  imports: [RouterLink, NgTemplateOutlet, Autofocus, HelpLink, EmptyState, CheckInJournal, DayRing],
  templateUrl: './today.html',
  styleUrl: './today.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Today {
  protected readonly store = inject(HabitStore);
  private readonly injector = inject(Injector);

  /** A card the person opened by hand; otherwise the app picks the active routine. */
  private readonly openedByHand = signal<string | undefined>(undefined);
  /** Routine whose "+ and then..." form is open. */
  protected readonly addingTo = signal<string | undefined>(undefined);
  protected readonly draft = signal('');

  /** The habit just checked off, so its ring can pop. Cleared once the animation is over. */
  protected readonly poppedHabit = signal<string | undefined>(undefined);
  /** The routine whose chain was just finished, for a short celebration. */
  protected readonly finishedRoutine = signal<string | undefined>(undefined);
  /** Directions, in degrees, for the little sparks around "Chain complete". */
  protected readonly sparks = [0, 45, 90, 135, 180, 225, 270, 315];
  private celebrateTimer?: ReturnType<typeof setTimeout>;

  /** The habit whose "how did it feel?" box is open: the one just checked off. */
  protected readonly journaling = signal<string | undefined>(undefined);

  /**
   * Routines with something planned today. A routine whose habits all rest today is
   * listed apart, and so is a paused one.
   */
  protected readonly chains = computed(() =>
    this.store.chains().filter((c) => !c.paused && (c.total > 0 || c.resting === 0)),
  );
  /** Routines grouped into Morning, Afternoon, Evening and Anytime, by their usual time. */
  protected readonly groups = computed(() => chainsByPartOfDay(this.chains()));
  protected readonly partLabels: Record<PartOfDay, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    anytime: 'Anytime',
  };

  /** Every habit planned today, in order, for the ring beside the title. */
  protected readonly statuses = computed(() =>
    this.chains().flatMap((c) => c.links.map((l) => l.status)),
  );
  protected readonly resting = computed(() =>
    this.store.chains().filter((c) => !c.paused && c.total === 0 && c.resting > 0),
  );
  protected readonly paused = computed(() => this.store.chains().filter((c) => !!c.paused));

  /** "until Thu, Nov 12" for a pause with an end, or nothing for one that lasts until resumed. */
  protected pausedUntil(until: string | undefined): string {
    if (!until) return '';
    const last = fromDayKey(addDays(until, -1));
    return `through ${last.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
  }

  protected async resume(routineId: string): Promise<void> {
    await this.store.resumeRoutine(routineId);
    this.openedByHand.set(routineId);
    this.focusCard(routineId);
  }
  protected readonly reflection = inject(ReflectionPrompt);
  private readonly preferences = inject(PreferencesStore);

  /** "Good morning, Sam" when there's a name; nothing extra when there isn't. */
  protected readonly greeting = computed(() => {
    const name = this.preferences.prefs().name;
    this.store.today(); // Refresh when the day rolls over.
    return name ? greeting(name, new Date().getHours()) : '';
  });

  protected readonly dateLabel = computed(() =>
    fromDayKey(this.store.today()).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
  );

  protected readonly openRoutineId = computed(() => {
    const chains = this.chains();
    const byHand = this.openedByHand();
    if (byHand && chains.some((c) => c.routine.id === byHand)) return byHand;
    const now = new Date();
    return (
      pickActiveRoutine(chains, now.getHours() * 60 + now.getMinutes()) ?? chains[0]?.routine.id
    );
  });

  protected open(routineId: string): void {
    this.openedByHand.set(routineId);
    this.addingTo.set(undefined);
    this.focusCard(routineId);
  }

  protected async answer(routineId: string, link: ChainLink, kind: CheckInKind): Promise<void> {
    await this.store.checkIn(link.habit.id, kind);
    this.celebrate(routineId, link, kind);
    // A skip doesn't ask how it felt.
    if (kind === 'skip') this.journaling.set(undefined);
    else this.journaling.set(link.habit.id);
    this.focusCard(routineId);
  }

  /**
   * A small, quick "well done": the ring pops for Done and Did 2 min, and the card
   * celebrates when the last habit in the chain gets its answer. Reduced motion turns
   * the animation off (styles.css); the words still change as before.
   */
  private celebrate(routineId: string, link: ChainLink, kind: CheckInKind): void {
    clearTimeout(this.celebrateTimer);
    this.poppedHabit.set(kind === 'skip' ? undefined : link.habit.id);
    const chain = this.store.chains().find((c) => c.routine.id === routineId);
    this.finishedRoutine.set(chain?.complete ? routineId : undefined);
    this.celebrateTimer = setTimeout(() => {
      this.poppedHabit.set(undefined);
      this.finishedRoutine.set(undefined);
    }, CELEBRATE_MS);
  }

  protected async undo(routineId: string, link: ChainLink): Promise<void> {
    if (this.journaling() === link.habit.id) this.journaling.set(undefined);
    this.poppedHabit.set(undefined);
    this.finishedRoutine.set(undefined);
    await this.store.undoCheckIn(link.habit.id);
    this.focusCard(routineId);
  }

  /**
   * The buttons that had focus go away after a check-in, so move focus on: to the next
   * habit's first action, or to "Chain complete" once there's nothing left.
   */
  private focusCard(routineId: string): void {
    focusAfterRender(this.injector, () => {
      const card = document.getElementById(`card-${routineId}`);
      return card?.querySelector<HTMLElement>('.act, .complete') ?? card;
    });
  }

  protected subtitle(link: ChainLink): string {
    switch (link.status) {
      case 'full':
        return 'Done';
      case 'mini':
        return 'Did the 2-minute version';
      case 'skip':
        return 'Skipped. The chain keeps going.';
      default:
        return `Tiny version: ${lowerFirst(link.habit.twoMinuteVersion)}`;
    }
  }

  /** "Missed yesterday", or the weekday for a habit that isn't every day. */
  protected missedLabel(link: ChainLink): string {
    const on = link.missedOn;
    if (!on || on === addDays(this.store.today(), -1)) return 'Missed yesterday';
    return `Missed ${fromDayKey(on).toLocaleDateString(undefined, { weekday: 'long' })}`;
  }

  protected startAdding(routineId: string): void {
    this.draft.set('');
    this.addingTo.set(routineId);
  }

  protected cancelAdding(routineId: string): void {
    this.draft.set('');
    this.addingTo.set(undefined);
    focusAfterRender(this.injector, byId(`and-then-${routineId}`));
  }

  protected async addLink(routineId: string): Promise<void> {
    const name = this.draft().trim();
    if (name) await this.store.addLink(routineId, name, suggestTwoMinuteVersion(name));
    this.cancelAdding(routineId);
  }
}
