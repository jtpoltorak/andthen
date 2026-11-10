import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AboutCard } from '../about/about-card';
import { DataBackup } from './data-backup';
import { PreferenceSettings } from './preference-settings';
import { ReminderSettings } from './reminder-settings';
import { ResetData } from './reset-data';
import { SyncSettings } from '../sync/sync-settings';
import { HelpLink } from '../help/help-link';
import { InstallPrompt } from '../shared/install-prompt';
import { InstallSettings } from './install-settings';

/** Settings tab: preferences, reminders, backup, starting over, and about the app. */
@Component({
  selector: 'app-settings',
  imports: [
    PreferenceSettings,
    ReminderSettings,
    DataBackup,
    ResetData,
    SyncSettings,
    AboutCard,
    HelpLink,
    RouterLink,
    InstallSettings,
  ],
  template: `
    <main class="page">
      <div class="title-row">
        <h1>Settings</h1>
        <a class="help-all" routerLink="/help">Help</a>
      </div>

      @if (install.way() !== 'none') {
        <section aria-labelledby="install-heading">
          <div class="section-head">
            <h2 id="install-heading">Install AndThen</h2>
            <app-help-link slug="install" />
          </div>
          <app-install-settings />
        </section>
      }

      <section aria-labelledby="prefs-heading">
        <div class="section-head">
          <h2 id="prefs-heading">You</h2>
          <app-help-link slug="make-it-yours" />
        </div>
        <app-preference-settings />
      </section>

      <section aria-labelledby="reminders-heading">
        <div class="section-head">
          <h2 id="reminders-heading">Reminders</h2>
          <app-help-link slug="reminders" />
        </div>
        <app-reminder-settings />
      </section>

      <section aria-labelledby="sync-heading">
        <div class="section-head">
          <h2 id="sync-heading">Sync across devices</h2>
          <app-help-link slug="sync" />
        </div>
        <app-sync-settings />
      </section>

      <section aria-labelledby="data-heading">
        <div class="section-head">
          <h2 id="data-heading">Your data</h2>
          <app-help-link slug="backup" />
        </div>
        <app-data-backup />
      </section>

      <section aria-labelledby="reset-heading">
        <div class="section-head">
          <h2 id="reset-heading">Start over</h2>
          <app-help-link slug="start-over" />
        </div>
        <app-reset-data />
      </section>

      <section aria-labelledby="about-heading">
        <h2 id="about-heading">About</h2>
        <app-about-card />
      </section>
    </main>
  `,
  styles: `
    .page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 28px 20px 24px;
    }
    /* Wide screens: the sections flow into two columns (top to bottom, then across). */
    @media (min-width: 1100px) {
      .page {
        display: block;
        columns: 2;
        column-gap: 24px;
      }
      .page > * {
        break-inside: avoid;
        margin-bottom: 20px;
      }
      .title-row {
        column-span: all;
      }
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface);
    }
    h2 {
      font-size: 18px;
      font-weight: 800;
    }
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: -10px -12px -10px 0;
    }
    .help-all {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      color: var(--accent-ink);
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  protected readonly install = inject(InstallPrompt);
}
