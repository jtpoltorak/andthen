import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DataBackup } from './data-backup';
import { ReminderSettings } from './reminder-settings';

/** Settings tab: reminders and backup. Preferences come next. */
@Component({
  selector: 'app-settings',
  imports: [ReminderSettings, DataBackup],
  template: `
    <main class="page">
      <h1>Settings</h1>

      <section aria-labelledby="reminders-heading">
        <h2 id="reminders-heading">Reminders</h2>
        <app-reminder-settings />
      </section>

      <section aria-labelledby="data-heading">
        <h2 id="data-heading">Your data</h2>
        <app-data-backup />
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
