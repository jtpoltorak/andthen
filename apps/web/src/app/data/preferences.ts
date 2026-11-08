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

/** The dark theme's page color, for the title bar in dark mode (matches --bg in styles.css). */
export const DARK_TITLE_BAR = '#121815';

/** The easy-reading font's stylesheet. Loaded only once someone turns it on (also in index.html). */
export const EASY_FONT_URL =
  'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;600;700;800&display=swap';

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

  /** Whether the device itself is in dark mode, for the "system" theme. */
  private readonly systemDark = signal(false);

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
    });
    // Larger text and more contrast: `data-text` and `data-contrast` on <html> (styles.css).
    effect(() => {
      const { largeText, moreContrast } = this.prefs();
      const root = this.document.documentElement;
      if (largeText) root.dataset['text'] = 'large';
      else delete root.dataset['text'];
      if (moreContrast) root.dataset['contrast'] = 'more';
      else delete root.dataset['contrast'];
    });
    // The easy-reading font: `data-font` on <html> swaps --font, and its stylesheet loads once.
    effect(() => {
      const { easyFont } = this.prefs();
      const root = this.document.documentElement;
      if (!easyFont) {
        delete root.dataset['font'];
        return;
      }
      root.dataset['font'] = 'easy';
      if (!this.document.getElementById('easy-font')) {
        const link = this.document.createElement('link');
        link.id = 'easy-font';
        link.rel = 'stylesheet';
        link.href = EASY_FONT_URL;
        this.document.head.appendChild(link);
      }
    });
    // The browser and installed-app title bar follow along: the accent in light mode,
    // the page's own dark color in dark mode, so a bright bar never sits over a dark app.
    const media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
    if (media) {
      this.systemDark.set(media.matches);
      media.addEventListener?.('change', (e) => this.systemDark.set(e.matches));
    }
    effect(() => {
      const { accent, theme } = this.prefs();
      const dark = theme === 'dark' || (theme === 'system' && this.systemDark());
      this.document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? DARK_TITLE_BAR : ACCENT_SWATCHES[accent]);
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

  setLargeText(largeText: boolean): void {
    this.update({ largeText });
  }

  setMoreContrast(moreContrast: boolean): void {
    this.update({ moreContrast });
  }

  setEasyFont(easyFont: boolean): void {
    this.update({ easyFont });
  }

  setSkyHeader(skyHeader: boolean): void {
    this.update({ skyHeader });
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
