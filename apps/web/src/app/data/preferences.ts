import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';
import {
  type Preferences,
  type Theme,
  type WeekStart,
  DEFAULT_PREFERENCES,
  cleanName,
  parsePreferences,
} from '@andthen/core';
import { readJson, writeJson } from './local-store';

/** Also read by the small script in index.html, so the right theme shows before Angular boots. */
export const PREFERENCES_KEY = 'andthen.prefs';

/**
 * Name, theme and week start. They're per-device, like reminders, so they live in
 * localStorage and stay out of habit data and backups.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesStore {
  private readonly document = inject(DOCUMENT);

  readonly prefs = signal<Preferences>(parsePreferences(readJson(PREFERENCES_KEY)));

  constructor() {
    // The page follows the theme: `data-theme` on <html> picks the colors in styles.css.
    effect(() => {
      this.document.documentElement.dataset['theme'] = this.prefs().theme;
    });
  }

  setName(name: string): void {
    this.update({ name: cleanName(name) });
  }

  setTheme(theme: Theme): void {
    this.update({ theme });
  }

  setWeekStart(weekStartsOn: WeekStart): void {
    this.update({ weekStartsOn });
  }

  /** Back to the defaults. Used by "Reset everything", which clears storage itself. */
  reset(): void {
    this.prefs.set({ ...DEFAULT_PREFERENCES });
  }

  private update(change: Partial<Preferences>): void {
    const next = { ...this.prefs(), ...change };
    this.prefs.set(next);
    writeJson(PREFERENCES_KEY, next);
  }
}
