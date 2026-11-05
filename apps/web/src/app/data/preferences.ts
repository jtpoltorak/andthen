import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';
import {
  type Preferences,
  type Accent,
  type Theme,
  type WeekStart,
  DEFAULT_PREFERENCES,
  cleanName,
  parsePreferences,
} from '@andthen/core';
import { readJson, writeJson } from './local-store';

/** Each accent's main color in light mode, for swatches and the browser's title bar. */
export const ACCENT_SWATCHES: Record<Accent, string> = {
  teal: '#1e6b5c',
  blue: '#2f5f9e',
  plum: '#7a4a86',
  clay: '#a14b2b',
  slate: '#4a5560',
};

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
    // `data-accent` picks the highlight color; teal, the default, needs none.
    effect(() => {
      const { accent } = this.prefs();
      const root = this.document.documentElement;
      if (accent === 'teal') delete root.dataset['accent'];
      else root.dataset['accent'] = accent;
      // The browser and installed-app title bar follow along.
      this.document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', ACCENT_SWATCHES[accent]);
    });
  }

  setName(name: string): void {
    this.update({ name: cleanName(name) });
  }

  setTheme(theme: Theme): void {
    this.update({ theme });
  }

  setAccent(accent: Accent): void {
    this.update({ accent });
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
