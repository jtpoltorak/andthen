/** How the app looks: follow the device, or always light or dark. */
export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** The app's highlight color. Teal is AndThen's own; the others are for taste. */
export const ACCENTS = ['teal', 'blue', 'plum', 'clay', 'slate'] as const;
export type Accent = (typeof ACCENTS)[number];

/** The first day of the week in Progress, as `Date.getDay()` numbers: Monday (1) or Sunday (0). */
export const WEEK_STARTS = [1, 0] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

/** Longest name we keep. Enough for a first name or a nickname. */
export const MAX_NAME_LENGTH = 40;

/** Per-device preferences. None of them change habit data. */
export interface Preferences {
  /** What to call the person. Empty means no name, and that's fine. */
  name: string;
  theme: Theme;
  accent: Accent;
  weekStartsOn: WeekStart;
  /** Bigger text (and everything with it) across the app. */
  largeText: boolean;
  /** Darker borders and secondary text, for bright light or tired eyes. */
  moreContrast: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  name: '',
  theme: 'system',
  accent: 'teal',
  weekStartsOn: 1,
  largeText: false,
  moreContrast: false,
};

/** Trims a name, folds inner runs of spaces, and caps its length. */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH).trim();
}

/** Reads stored preferences defensively; anything odd falls back to the defaults. */
export function parsePreferences(raw: unknown): Preferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFERENCES };
  const r = raw as Record<string, unknown>;
  const theme = THEMES.find((t) => t === r['theme']);
  const accent = ACCENTS.find((a) => a === r['accent']);
  const weekStartsOn = WEEK_STARTS.find((w) => w === r['weekStartsOn']);
  return {
    name: typeof r['name'] === 'string' ? cleanName(r['name']) : DEFAULT_PREFERENCES.name,
    theme: theme ?? DEFAULT_PREFERENCES.theme,
    accent: accent ?? DEFAULT_PREFERENCES.accent,
    weekStartsOn: weekStartsOn ?? DEFAULT_PREFERENCES.weekStartsOn,
    largeText: r['largeText'] === true,
    moreContrast: r['moreContrast'] === true,
  };
}

/** A friendly hello for the hour of the day, with the person's name if they gave one. */
export function greeting(name: string, hour: number): string {
  const part =
    hour < 5 ? 'Hi' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const who = cleanName(name);
  return who ? `${part}, ${who}` : part;
}

/** Weekday labels for a week grid, one letter per row, in the user's week order. */
export function weekdayLabels(weekStartsOn: WeekStart): string[] {
  return weekStartsOn === 0
    ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
}
