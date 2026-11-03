/** A calendar day in the user's local time, formatted `YYYY-MM-DD`. */
export type DayKey = string;

/**
 * A routine is a chain of habits that starts with an anchor: something the
 * person already does every day ("After I pour my coffee").
 */
export interface Routine {
  id: string;
  /** Optional short label, e.g. "Morning". */
  name?: string;
  /** The existing behavior that kicks off the chain. */
  anchor: string;
  /** Usual time of the anchor as `HH:mm`. Used for ordering and optional reminders only. */
  usualTime?: string;
  order: number;
  createdOn: DayKey;
  archivedOn?: DayKey;
}

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
  order: number;
  createdOn: DayKey;
  archivedOn?: DayKey;
}

/** `full` = did the habit, `mini` = did the 2-minute version, `skip` = consciously skipped. */
export type CheckInKind = 'full' | 'mini' | 'skip';

/** At most one check-in per habit per day. */
export interface CheckIn {
  habitId: string;
  date: DayKey;
  kind: CheckInKind;
}

export type LinkStatus = CheckInKind | 'pending';
