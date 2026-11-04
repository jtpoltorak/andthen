import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AboutCard } from '../about/about-card';
import { DataBackup } from './data-backup';
import { PreferenceSettings } from './preference-settings';
import { ReminderSettings } from './reminder-settings';
import { ResetData } from './reset-data';
import { SyncSettings } from '../sync/sync-settings';

/** Settings tab: preferences, reminders, backup, starting over, and about the app. */
@Component({
  selector: 'app-settings',
  imports: [PreferenceSettings, ReminderSettings, DataBackup, ResetData, SyncSettings, AboutCard],
  template: `
    <main class="page">
      <h1>Settings</h1>

      <section aria-labelledby="prefs-heading">
        <h2 id="prefs-heading">You</h2>
        <app-preference-settings />
      </section>

      <section aria-labelledby="reminders-heading">
        <h2 id="reminders-heading">Reminders</h2>
        <app-reminder-settings />
      </section>

      <section aria-labelledby="sync-heading">
        <h2 id="sync-heading">Sync across devices</h2>
        <app-sync-settings />
      </section>

      <section aria-labelledby="data-heading">
        <h2 id="data-heading">Your data</h2>
        <app-data-backup />
      </section>

      <section aria-labelledby="reset-heading">
        <h2 id="reset-heading">Start over</h2>
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {}
