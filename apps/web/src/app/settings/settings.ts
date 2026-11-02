import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DataBackup } from './data-backup';
import { PreferenceSettings } from './preference-settings';
import { ReminderSettings } from './reminder-settings';
import { ResetData } from './reset-data';

/** Settings tab: preferences, reminders, backup, and starting over. */
@Component({
  selector: 'app-settings',
  imports: [PreferenceSettings, ReminderSettings, DataBackup, ResetData],
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

      <section aria-labelledby="data-heading">
        <h2 id="data-heading">Your data</h2>
        <app-data-backup />
      </section>

      <section aria-labelledby="reset-heading">
        <h2 id="reset-heading">Start over</h2>
        <app-reset-data />
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
