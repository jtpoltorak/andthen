import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ACCENTS, MAX_NAME_LENGTH, type Theme, type WeekStart } from '@andthen/core';
import { ACCENT_SWATCHES, PreferencesStore } from '../data/preferences';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const WEEK_OPTIONS: { value: WeekStart; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 0, label: 'Sunday' },
];

/** Name, theme, accent color, text size and contrast, and week start. Each change saves right away. */
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
      <legend class="field-label">Accent color</legend>
      <div class="swatches">
        @for (option of accents; track option.value) {
          <label class="swatch" [title]="option.label">
            <input
              type="radio"
              name="accent"
              [value]="option.value"
              [checked]="prefs.prefs().accent === option.value"
              (change)="prefs.setAccent(option.value)"
            />
            <span class="swatch-dot" [style.background]="option.color" aria-hidden="true"></span>
            <span class="swatch-name">{{ option.label }}</span>
          </label>
        }
      </div>
      <p class="hint">Changes buttons, checkmarks and highlights. The 2-minute amber stays.</p>
    </fieldset>

    <fieldset>
      <legend class="field-label">Easier to read</legend>
      <label class="switch-row">
        <span class="switch-text">
          <span class="switch-label">Larger text</span>
          <span class="switch-hint">Everything a bit bigger, buttons too.</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          [checked]="prefs.prefs().largeText"
          (change)="prefs.setLargeText($any($event.target).checked)"
        />
      </label>
      <label class="switch-row">
        <span class="switch-text">
          <span class="switch-label">More contrast</span>
          <span class="switch-hint">Darker lines and gray text. Handy in bright light.</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          [checked]="prefs.prefs().moreContrast"
          (change)="prefs.setMoreContrast($any($event.target).checked)"
        />
      </label>
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
    .swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .swatch {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-width: 56px;
      padding: 6px 4px;
      border-radius: 12px;
    }
    .swatch input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    }
    .swatch-dot {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      box-shadow: inset 0 0 0 2px rgb(255 255 255 / 0.25);
    }
    .swatch input:checked ~ .swatch-dot {
      outline: 3px solid var(--ink);
      outline-offset: 3px;
    }
    .swatch-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--muted);
    }
    .swatch input:checked ~ .swatch-name {
      color: var(--ink);
      font-weight: 800;
    }
    .swatch input:focus-visible ~ .swatch-dot {
      outline: 3px solid var(--focus);
      outline-offset: 3px;
    }
    .switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 56px;
    }
    .switch-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .switch-label {
      font-size: 16px;
      font-weight: 700;
    }
    .switch-hint {
      font-size: 14px;
      line-height: 1.4;
      color: var(--muted);
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
  protected readonly accents = ACCENTS.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
    color: ACCENT_SWATCHES[value],
  }));
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
