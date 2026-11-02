import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { REMINDER_LEADS, type ReminderLead } from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { Reminders, formatUsualTime } from '../reminders/reminders';

const LEAD_LABELS: Record<ReminderLead, string> = {
  0: 'At the usual time',
  5: '5 minutes before',
  15: '15 minutes before',
};

/** Opt-in reminders around each routine's usual time. Honest about what browsers allow. */
@Component({
  selector: 'app-reminder-settings',
  imports: [RouterLink],
  template: `
    @if (reminders.permission() === 'unsupported') {
      <p class="hint">
        This browser can't show notifications. On an iPhone or iPad, add AndThen to your Home Screen
        first (Share, then Add to Home Screen), open it from there, and come back here.
      </p>
    } @else {
      <p class="hint">
        A quiet nudge around each routine's usual time, only if there's something left to do.
      </p>

      <label class="switch-row">
        <span class="switch-label">Remind me</span>
        <input
          type="checkbox"
          role="switch"
          [checked]="reminders.active()"
          [disabled]="busy()"
          (change)="toggle($event)"
        />
      </label>

      @if (reminders.permission() === 'denied') {
        <p class="note" role="alert">
          Notifications are blocked for AndThen in this browser. To use reminders, allow them in
          your browser's site settings, then turn this on again.
        </p>
      }

      @if (reminders.active()) {
        <label class="field">
          <span>When</span>
          <select [value]="reminders.prefs().leadMinutes" (change)="setLead($event)">
            @for (lead of leads; track lead) {
              <option [value]="lead">{{ leadLabel(lead) }}</option>
            }
          </select>
        </label>

        @if (timed().length) {
          <fieldset>
            <legend>Routines</legend>
            @for (r of timed(); track r.id) {
              <label class="check-row">
                <input
                  type="checkbox"
                  [checked]="!reminders.isMuted(r.id)"
                  (change)="setRoutine(r.id, $event)"
                />
                <span class="routine">
                  <span class="anchor">{{ r.anchor }}</span>
                  <span class="time">{{ time(r.usualTime) }}</span>
                </span>
              </label>
            }
          </fieldset>
        }
        @if (untimed() > 0) {
          <p class="hint small">
            {{ untimed() === 1 ? 'One routine has' : untimed() + ' routines have' }} no usual time,
            so {{ untimed() === 1 ? "it won't" : "they won't" }} get a reminder. You can add one in
            <a routerLink="/routines">Routines</a>.
          </p>
        }

        <button type="button" class="btn-outline" (click)="test()">Send a test reminder</button>
      }

      <p class="hint small">
        Reminders arrive only while AndThen is open, in a browser tab or as an installed app.
        Browsers don't let web apps wake themselves up, so if AndThen is fully closed, no reminder
        will come. Once a routine is done for the day, its reminder is skipped.
      </p>
    }

    <p class="status" role="status" aria-live="polite">{{ status() }}</p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .hint {
      font-size: 15px;
      line-height: 1.5;
      color: var(--muted);
    }
    .hint.small {
      font-size: 14px;
    }
    .hint a {
      color: var(--accent-ink);
      font-weight: 700;
    }
    .switch-row,
    .check-row {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 48px;
    }
    .switch-row {
      justify-content: space-between;
    }
    .switch-label {
      font-size: 16px;
      font-weight: 700;
    }
    input[role='switch'] {
      appearance: none;
      position: relative;
      flex: none;
      width: 52px;
      height: 32px;
      margin: 0;
      border-radius: 16px;
      background: var(--disabled);
      cursor: pointer;
      transition: background 0.15s;
    }
    input[role='switch']::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--knob);
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.2);
      transition: transform 0.15s;
    }
    input[role='switch']:checked {
      background: var(--accent);
    }
    input[role='switch']:checked::after {
      transform: translateX(20px);
    }
    input[role='switch']:focus-visible,
    select:focus-visible,
    .check-row input:focus-visible {
      outline: 3px solid var(--accent);
      outline-offset: 2px;
    }
    .note {
      font-size: 14px;
      line-height: 1.5;
      color: var(--danger);
      font-weight: 600;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 14px;
      font-weight: 700;
    }
    select {
      height: 48px;
      padding: 0 12px;
      border: 1.5px solid var(--input-border);
      border-radius: var(--radius-control);
      background: var(--surface);
      color: var(--ink);
      font: inherit;
      font-size: 15px;
      font-weight: 600;
    }
    fieldset {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      border: none;
    }
    legend {
      margin-bottom: 4px;
      font-size: 14px;
      font-weight: 700;
    }
    .check-row input {
      flex: none;
      width: 22px;
      height: 22px;
      margin: 0;
      accent-color: var(--accent);
    }
    .routine {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .anchor {
      font-size: 15px;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .time {
      font-size: 13px;
      color: var(--muted);
    }
    .btn-outline {
      height: 48px;
      padding: 0 18px;
      border: 1.5px solid var(--input-border);
      border-radius: 12px;
      background: var(--surface);
      color: var(--accent-ink);
      font-size: 15px;
      font-weight: 700;
    }
    .status {
      font-size: 14px;
      line-height: 1.5;
    }
    .status:empty {
      display: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReminderSettings {
  protected readonly reminders = inject(Reminders);
  private readonly store = inject(HabitStore);

  protected readonly leads = REMINDER_LEADS;
  protected readonly busy = signal(false);
  protected readonly status = signal('');

  protected readonly timed = computed(() =>
    this.store.activeRoutines().filter((r) => !!formatUsualTime(r.usualTime)),
  );
  protected readonly untimed = computed(
    () => this.store.activeRoutines().length - this.timed().length,
  );

  constructor() {
    // The person may have changed the permission in site settings since the app opened.
    this.reminders.refreshPermission();
  }

  protected leadLabel(lead: ReminderLead): string {
    return LEAD_LABELS[lead];
  }

  protected time(usualTime: string | undefined): string {
    return formatUsualTime(usualTime);
  }

  protected async toggle(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    this.status.set('');
    if (!input.checked) {
      this.reminders.disable();
      this.status.set('Reminders are off.');
      return;
    }
    this.busy.set(true);
    try {
      const permission = await this.reminders.enable();
      if (permission === 'granted') {
        this.status.set('Reminders are on.');
      } else if (permission === 'default') {
        this.status.set('No problem. You can turn reminders on any time.');
      }
    } finally {
      // Snap the switch back to the real state if permission wasn't given.
      input.checked = this.reminders.active();
      this.busy.set(false);
    }
  }

  protected setLead(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    const lead = REMINDER_LEADS.find((l) => l === value);
    if (lead !== undefined) this.reminders.setLead(lead);
  }

  protected setRoutine(routineId: string, event: Event): void {
    this.reminders.setRoutineMuted(routineId, !(event.target as HTMLInputElement).checked);
  }

  protected async test(): Promise<void> {
    const shown = await this.reminders.sendTest();
    this.status.set(
      shown
        ? 'Sent. If nothing appeared, check that notifications are allowed for this browser in your system settings.'
        : "Couldn't show a notification in this browser.",
    );
  }
}
