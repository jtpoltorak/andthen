import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  type ChainLink,
  type CheckInKind,
  fromDayKey,
  pickActiveRoutine,
  suggestTwoMinuteVersion,
} from '@andthen/core';
import { HabitStore } from '../data/habit-store';

const lowerFirst = (text: string) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : '');

/** Today: each routine is a card; the active one is open and asks "what's next?" */
@Component({
  selector: 'app-today',
  templateUrl: './today.html',
  styleUrl: './today.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Today {
  protected readonly store = inject(HabitStore);

  /** A card the person opened by hand; otherwise the app picks the active routine. */
  private readonly openedByHand = signal<string | undefined>(undefined);
  /** Routine whose "+ and then..." form is open. */
  protected readonly addingTo = signal<string | undefined>(undefined);
  protected readonly draft = signal('');

  protected readonly chains = this.store.chains;

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
  }

  protected answer(link: ChainLink, kind: CheckInKind): void {
    void this.store.checkIn(link.habit.id, kind);
  }

  protected undo(link: ChainLink): void {
    void this.store.undoCheckIn(link.habit.id);
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

  protected async addLink(routineId: string): Promise<void> {
    const name = this.draft().trim();
    if (name) await this.store.addLink(routineId, name, suggestTwoMinuteVersion(name));
    this.draft.set('');
    this.addingTo.set(undefined);
  }
}
