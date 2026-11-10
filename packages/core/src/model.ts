/** A calendar day in the user's local time, formatted `YYYY-MM-DD`. */
export type DayKey = string;

/**
 * A routine is a chain of habits that starts with an anchor: something the
 * person already does every day ("After I pour my coffee").
 */
/**
 * The built-in routine icons. New ones go on the end: the stored id is what syncs, so an id
 * never changes once it ships. (The picker shows them in its own groups.)
 */
export const ROUTINE_ICONS = [
  'coffee',
  'sun',
  'moon',
  'bed',
  'laptop',
  'book',
  'pen',
  'shoe',
  'weights',
  'leaf',
  'heart',
  'music',
  'home',
  // Added in 1.37.0.
  'sunrise',
  'alarm',
  'timer',
  'calendar',
  'bike',
  'lotus',
  'water',
  'apple',
  'meal',
  'pill',
  'tooth',
  'drop',
  'headphones',
  'palette',
  'list',
  'star',
  'smile',
  'flame',
  'broom',
  'sprout',
  'paw',
  'cart',
  'wallet',
  'car',
  'mountain',
  'briefcase',
  'phone',
  'mail',
  'chat',
  'people',
] as const;

export type RoutineIcon = (typeof ROUTINE_ICONS)[number];

/** True for an icon AndThen knows. Unknown ones (from a newer version) are dropped, not an error. */
export function isRoutineIcon(value: unknown): value is RoutineIcon {
  return typeof value === 'string' && (ROUTINE_ICONS as readonly string[]).includes(value);
}

export interface Routine {
  id: string;
  /** Optional short label, e.g. "Morning". */
  name?: string;
  /** The existing behavior that kicks off the chain. */
  anchor: string;
  /** Usual time of the anchor as `HH:mm`. Used for ordering and optional reminders only. */
  usualTime?: string;
  /** Optional icon from the built-in set (`ROUTINE_ICONS`), so routines are easy to tell apart. */
  icon?: RoutineIcon;
  order: number;
  createdOn: DayKey;
  archivedOn?: DayKey;
  /**
   * Optional: times the routine was set aside (travel, illness, a busy stretch).
   * Paused days are rest days for every habit in it: never a miss, never a nudge.
   */
  pauses?: Pause[];
}

/** A stretch of days a routine is paused: from `from` (inclusive) to `until` (exclusive). No `until` means until resumed. */
export interface Pause {
  from: DayKey;
  until?: DayKey;
}

/**
 * How often a habit is meant to happen. A habit with no schedule is every day.
 * - `days`: only on these weekdays, as `Date.getDay()` numbers (0 = Sunday). Weekdays are 1 to 5.
 * - `weekly`: any days, `times` times a week. It leaves Today once the week's count is reached.
 */
export type Schedule = { kind: 'days'; days: number[] } | { kind: 'weekly'; times: number };

/** A habit is one link in a routine's chain. */
export interface Habit {
  id: string;
  routineId: string;
  name: string;
  /** The 2-minute version that still counts on a busy day. */
  twoMinuteVersion: string;
  /** Optional: one thing that makes the habit easier to start, e.g. "Lay out my shoes the night before". */
  makeItEasier?: string;
  /** Optional: what tends to get in the way, e.g. "I'm tired after work". */
  obstacle?: string;
  /** Optional: why this habit matters to the person, e.g. "So I have energy for the kids". */
  why?: string;
  /** Optional: when it's due. Missing means every day. */
  schedule?: Schedule;
  order: number;
  createdOn: DayKey;
  archivedOn?: DayKey;
}

/** `full` = did the habit, `mini` = did the 2-minute version, `skip` = consciously skipped. */
export type CheckInKind = 'full' | 'mini' | 'skip';

/** How a check-in felt, picked with one tap afterwards. Optional. */
export type Mood = 'good' | 'okay' | 'hard';

/** At most one check-in per habit per day. */
export interface CheckIn {
  habitId: string;
  date: DayKey;
  kind: CheckInKind;
  /** The tiny journal: how it felt, and a few words. Both optional. */
  mood?: Mood;
  note?: string;
  /** Local time of the check-in as `HH:mm`. Only on check-ins from version 1.30.0 on. */
  at?: string;
}

export type LinkStatus = CheckInKind | 'pending';

/** A short weekly check-in: what went well, and what to tweak. One per week. */
export interface Reflection {
  /** The first day of the week this reflection is about. */
  week: DayKey;
  wentWell?: string;
  tweak?: string;
  /** The day it was last saved. */
  savedOn: DayKey;
}
