import { ChangeDetectionStrategy, Component, Injector, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, skip } from 'rxjs';
import { HabitStore } from './data/habit-store';
import { PreferencesStore } from './data/preferences';
import { Reminders } from './reminders/reminders';
import { focusAfterRender } from './shared/focus';
import { SyncService } from './sync/sync.service';

/** The new screen's main heading, made focusable so focus can move to it. */
function pageHeading(): HTMLElement | null {
  const heading = document.querySelector<HTMLElement>('main h1');
  heading?.setAttribute('tabindex', '-1');
  return heading;
}

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
    // Does nothing unless sync was turned on, on this device.
    void inject(SyncService).start();

    // After moving to another screen, put focus on its heading. Without this, focus stays on
    // the link that was pressed (or drops to the page), and screen readers don't hear the change.
    const injector = inject(Injector);
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        skip(1), // Leave the first page load alone.
        takeUntilDestroyed(),
      )
      .subscribe(() => focusAfterRender(injector, pageHeading));
  }

  protected onVisibilityChange(): void {
    this.store.refreshDay();
    this.reminders.refreshPermission();
  }
}
