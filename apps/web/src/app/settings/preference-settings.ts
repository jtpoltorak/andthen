import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAX_NAME_LENGTH, type Theme, type WeekStart } from '@andthen/core';
import { PreferencesStore } from '../data/preferences';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const WEEK_OPTIONS: { value: WeekStart; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 0, label: 'Sunday' },
];

/** Name, theme and week start. Each change saves right away. */
@Component({
  selector: 'app-preference-settings',
  template: `
    <div class="field">
      <label class="field-label" for="pref-name">Your name</label>
      <input
        id="pref-name"
        class="text-input"
        type="text"
        autocomplete="given-name"
        enterkeyhint="done"
        placeholder="Optional"
        [maxLength]="maxName"
        [value]="prefs.prefs().name"
        aria-describedby="pref-name-hint"
        (change)="saveName($event)"
        (keydown.enter)="$any($event.target).blur()"
      />
      <p id="pref-name-hint" class="hint">Used for a hello on Today. Leave it blank to skip it.</p>
    </div>

    <fieldset>
      <legend class="field-label">Look</legend>
      <p class="hint top">System follows your device's light or dark setting.</p>
      <div class="segmented">
        @for (option of themes; track option.value) {
          <label>
            <input
              type="radio"
              name="theme"
              [value]="option.value"
              [checked]="prefs.prefs().theme === option.value"
              (change)="prefs.setTheme(option.value)"
            />
            <span>{{ option.label }}</span>
          </label>
        }
      </div>
    </fieldset>

    <fieldset>
      <legend class="field-label">Weeks start on</legend>
      <div class="segmented">
        @for (option of weekStarts; track option.value) {
          <label>
            <input
              type="radio"
              name="week-start"
              [value]="option.value"
              [checked]="prefs.prefs().weekStartsOn === option.value"
              (change)="prefs.setWeekStart(option.value)"
            />
            <span>{{ option.label }}</span>
          </label>
        }
      </div>
      <p class="hint">Changes "This week" and the grid on Progress.</p>
    </fieldset>

    <p class="status" role="status" aria-live="polite">{{ status() }}</p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .field,
    fieldset {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      border: none;
    }
    .hint {
      margin-top: 8px;
      font-size: 14px;
      line-height: 1.5;
      color: var(--muted);
    }
    .hint.top {
      margin: 0 0 8px;
    }
    .text-input:focus-visible {
      outline: 3px solid var(--focus);
      outline-offset: 2px;
    }
    .segmented {
      display: flex;
      gap: 4px;
      padding: 4px;
      border: 1.5px solid var(--input-border);
      border-radius: var(--radius-control);
      background: var(--bg);
    }
    .segmented label {
      position: relative;
      flex: 1;
      min-width: 0;
    }
    .segmented input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    }
    .segmented span {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 6px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      text-align: center;
      color: var(--muted);
    }
    .segmented input:checked + span {
      background: var(--accent);
      color: var(--on-accent);
      font-weight: 700;
    }
    .segmented input:focus-visible + span {
      outline: 3px solid var(--focus);
      outline-offset: 2px;
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
export class PreferenceSettings {
  protected readonly prefs = inject(PreferencesStore);

  protected readonly themes = THEME_OPTIONS;
  protected readonly weekStarts = WEEK_OPTIONS;
  protected readonly maxName = MAX_NAME_LENGTH;
  protected readonly status = signal('');

  protected saveName(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.prefs.setName(input.value);
    const name = this.prefs.prefs().name;
    input.value = name; // Show the tidied version.
    this.status.set(name ? `Saved. Hi, ${name}!` : 'Name cleared.');
  }
}
