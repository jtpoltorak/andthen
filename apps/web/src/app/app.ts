import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HabitStore } from './data/habit-store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<div class="app"><router-outlet /></div>`,
  styles: `
    .app {
      max-width: 480px;
      min-height: 100dvh;
      margin: 0 auto;
      background: var(--bg);
    }
  `,
  host: {
    // Roll "today" over when the app comes back after midnight.
    '(document:visibilitychange)': 'store.refreshDay()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly store = inject(HabitStore);
}
