import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { REMINDER_LEADS, type ReminderLead } from '@andthen/core';
import {
  DEFAULT_EXT_SETTINGS,
  loadExtSettings,
  saveExtSettings,
  type ExtSettings,
} from '../shared/ext-settings';
import { WEB_APP_URL } from './links';

const LEAD_LABELS: Record<ReminderLead, string> = {
  0: 'At the usual time',
  5: '5 minutes before',
  15: '15 minutes before',
};

/** The extension's own settings: reminders and the toolbar badge. */
@Component({
  selector: 'ext-settings-panel',
  template: `
    <h2 class="title">Settings</h2>

    <label class="toggle">
      <input
        id="ext-reminders"
        type="checkbox"
        [checked]="settings().reminders.enabled"
        (change)="setReminders($any($event.target).checked)"
      />
      <span>
        <span class="label">Remind me</span>
        <span class="hint">
          At each routine's usual time, if something's still left. Only while the browser is open.
        </span>
      </span>
    </label>

    @if (settings().reminders.enabled) {
      <label class="field" for="ext-lead">
        <span class="label">When</span>
        <select id="ext-lead" (change)="setLead(+$any($event.target).value)">
          @for (lead of leads; track lead) {
            <option [value]="lead" [selected]="lead === settings().reminders.leadMinutes">
              {{ leadLabels[lead] }}
            </option>
          }
        </select>
      </label>
      <p class="hint">
        Routines without a usual time don't get reminders. Set one in the
        <a [href]="webAppUrl + '/routines'" target="_blank" rel="noopener">app</a>.
      </p>
    }

    <label class="toggle">
      <input
        id="ext-badge"
        type="checkbox"
        [checked]="settings().badge"
        (change)="setBadge($any($event.target).checked)"
      />
      <span>
        <span class="label">Show what's left on the icon</span>
        <span class="hint">A small number on the AndThen icon: habits still to do today.</span>
      </span>
    </label>

    <button type="button" class="text-btn back" (click)="closed.emit()">Back</button>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .title {
      font-size: 16px;
      font-weight: 700;
    }
    .toggle {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
    }
    .toggle input {
      flex: none;
      width: 18px;
      height: 18px;
      margin: 1px 0 0;
      accent-color: var(--accent);
    }
    .toggle > span {
      display: grid;
      gap: 2px;
    }
    .label {
      font-size: 14px;
      font-weight: 600;
    }
    .hint {
      font-size: 12px;
      line-height: 1.45;
      color: var(--muted);
    }
    .hint a {
      color: var(--accent-ink);
      font-weight: 700;
    }
    .field {
      display: grid;
      gap: 4px;
      margin-left: 28px;
    }
    select {
      height: 36px;
      padding: 0 8px;
      border: 1.5px solid var(--input-border);
      border-radius: 10px;
      background: var(--surface);
      color: var(--ink);
      font: inherit;
    }
    p.hint {
      margin-left: 28px;
    }
    .text-btn {
      min-height: 32px;
      padding: 0 2px;
      border: 0;
      background: none;
      font-size: 13px;
      font-weight: 700;
    }
    .back {
      align-self: flex-start;
      color: var(--muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPanel {
  readonly closed = output<void>();

  protected readonly webAppUrl = WEB_APP_URL;
  protected readonly leads = REMINDER_LEADS;
  protected readonly leadLabels = LEAD_LABELS;
  protected readonly settings = signal<ExtSettings>(structuredClone(DEFAULT_EXT_SETTINGS));

  constructor() {
    void loadExtSettings().then((s) => this.settings.set(s));
  }

  protected setReminders(enabled: boolean): Promise<void> {
    return this.save({ reminders: { ...this.settings().reminders, enabled } });
  }

  protected setLead(leadMinutes: number): Promise<void> {
    const lead = REMINDER_LEADS.find((l) => l === leadMinutes) ?? 0;
    return this.save({ reminders: { ...this.settings().reminders, leadMinutes: lead } });
  }

  protected setBadge(badge: boolean): Promise<void> {
    return this.save({ badge });
  }

  /** Saved to the extension's storage; the background worker picks it up from there. */
  private async save(change: Partial<ExtSettings>): Promise<void> {
    this.settings.set(await saveExtSettings(change));
  }
}
