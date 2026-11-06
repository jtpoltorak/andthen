import { ChangeDetectionStrategy, Component, Injector, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, skip } from 'rxjs';
import { AppUpdates } from './about/app-updates';
import { UpdateBanner } from './about/update-banner';
import { HabitStore } from './data/habit-store';
import { PreferencesStore } from './data/preferences';
import { Reminders } from './reminders/reminders';
import { focusAfterRender } from './shared/focus';
import { InstallPrompt } from './shared/install-prompt';
import { SyncService } from './sync/sync.service';

/** The new screen's main heading, made focusable so focus can move to it. */
function pageHeading(): HTMLElement | null {
  const heading = document.querySelector<HTMLElement>('main h1');
  heading?.setAttribute('tabindex', '-1');
  return heading;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UpdateBanner],
  template: `<div class="app"><app-update-banner /><router-outlet /></div>`,
  styles: `
    .app {
      max-width: 480px;
      min-height: calc(100dvh / var(--zoom));
      margin: 0 auto;
      background: var(--bg);
    }
    /* On laptops the tabbed app (Shell) and Help (HelpShell) get the whole width; welcome and Run stay narrow. */
    @media (min-width: 900px) {
      .app:has(app-shell),
      .app:has(app-help-shell) {
        max-width: none;
      }
    }
  `,
  host: {
    // Roll "today" over after midnight, notice permission changes made elsewhere,
    // and look for a new version when the app comes back to the foreground.
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly store = inject(HabitStore);
  protected readonly reminders = inject(Reminders);
  // Created at boot so the chosen theme applies on every screen, the welcome flow included.
  private readonly preferences = inject(PreferencesStore);
  private readonly updates = inject(AppUpdates);
  // Created at boot too: the browser offers its install prompt only once, early on.
  private readonly install = inject(InstallPrompt);

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
    if (document.visibilityState === 'visible') void this.updates.check();
  }
}
