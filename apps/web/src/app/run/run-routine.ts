import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { type ChainLink, type CheckInKind } from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { focusAfterRender } from '../shared/focus';
import { RoutineIcon } from '../shared/routine-icon';

/**
 * Run a routine: one habit at a time, big and calm, in chain order.
 * "After I pour my coffee, and then... stretch." Each answer moves to the next link.
 */
@Component({
  selector: 'app-run-routine',
  imports: [RouterLink, RoutineIcon],
  templateUrl: './run-routine.html',
  styleUrl: './run-routine.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunRoutine {
  private readonly store = inject(HabitStore);
  private readonly injector = inject(Injector);

  /** Route param `:id`, bound by the router. */
  readonly id = input.required<string>();

  protected readonly chain = computed(() =>
    this.store.chains().find((c) => c.routine.id === this.id()),
  );
  /** The habit being asked about now. */
  protected readonly step = computed(() => this.chain()?.links.find((l) => l.isNext));
  protected readonly stepNumber = computed(() => {
    const chain = this.chain();
    const step = this.step();
    return chain && step ? chain.links.indexOf(step) + 1 : 0;
  });

  /** The last habit answered here, so it can be undone. */
  protected readonly last = signal<ChainLink | undefined>(undefined);
  /** True right after the last link is answered here, for the finish animation. */
  protected readonly justFinished = signal(false);

  protected async answer(link: ChainLink, kind: CheckInKind): Promise<void> {
    await this.store.checkIn(link.habit.id, kind);
    this.last.set(link);
    this.justFinished.set(!!this.chain()?.complete);
    this.focusStep();
  }

  protected async undo(): Promise<void> {
    const last = this.last();
    if (!last) return;
    await this.store.undoCheckIn(last.habit.id);
    this.last.set(undefined);
    this.justFinished.set(false);
    this.focusStep();
  }

  protected readonly sparks = [0, 45, 90, 135, 180, 225, 270, 315];

  /** The answer buttons are replaced on each step, so put focus on the new step's heading. */
  private focusStep(): void {
    focusAfterRender(this.injector, () => document.getElementById('run-focus'));
  }

  protected answerLabel(link: ChainLink): string {
    switch (link.status) {
      case 'full':
        return 'Done';
      case 'mini':
        return '2 min';
      case 'skip':
        return 'Skipped';
      default:
        return link.isNext ? 'Now' : 'Up next';
    }
  }
}
