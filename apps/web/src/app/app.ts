import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HabitStore } from './data/habit-store';
import { PreferencesStore } from './data/preferences';
import { Reminders } from './reminders/reminders';

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
    // Roll "today" over after midnight, and notice permission changes made elsewhere.
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly store = inject(HabitStore);
  protected readonly reminders = inject(Reminders);
  // Created at boot so the chosen theme applies on every screen, the welcome flow included.
  private readonly preferences = inject(PreferencesStore);

  constructor() {
    this.reminders.start();
  }

  protected onVisibilityChange(): void {
    this.store.refreshDay();
    this.reminders.refreshPermission();
  }
}
