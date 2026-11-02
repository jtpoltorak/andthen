import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HabitStore } from '../data/habit-store';

/** Routines tab: every chain at a glance. Tap one to edit it. */
@Component({
  selector: 'app-routines',
  imports: [RouterLink],
  template: `
    <main class="page">
      <h1>Routines</h1>
      <p class="hint">
        Each routine starts with something you already do, and then a few tiny habits.
      </p>

      @for (item of items(); track item.routine.id) {
        <a class="routine-card" [routerLink]="['/routines', item.routine.id]">
          <span class="routine-anchor">
            <span class="anchor-dot" aria-hidden="true"></span>{{ item.routine.anchor }}
          </span>
          <span class="routine-habits">
            @for (h of item.habits; track h.id; let last = $last) {
              {{ h.name }}{{ last ? '' : ' · ' }}
            } @empty {
              No habits yet
            }
          </span>
          <span class="routine-edit">Edit</span>
        </a>
      } @empty {
        <p class="empty">No routines yet. Start one below.</p>
      }

      <a class="and-then" routerLink="/routines/new">+ New routine</a>
    </main>
  `,
  styleUrl: './routines.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Routines {
  private readonly store = inject(HabitStore);

  protected readonly items = computed(() =>
    this.store.activeRoutines().map((routine) => ({
      routine,
      habits: this.store.habitsOf(routine.id),
    })),
  );
}
