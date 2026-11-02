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
  fromDayKey,
  greeting,
  pickActiveRoutine,
  suggestTwoMinuteVersion,
} from '@andthen/core';
import { RouterLink } from '@angular/router';
import { HabitStore } from '../data/habit-store';
import { PreferencesStore } from '../data/preferences';
import { Autofocus, byId, focusAfterRender } from '../shared/focus';

const lowerFirst = (text: string) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : '');

/** Today: each routine is a card; the active one is open and asks "what's next?" */
@Component({
  selector: 'app-today',
  imports: [RouterLink, NgTemplateOutlet, Autofocus],
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

  protected readonly chains = this.store.chains;
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
    this.focusCard(routineId);
  }

  protected async undo(routineId: string, link: ChainLink): Promise<void> {
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
