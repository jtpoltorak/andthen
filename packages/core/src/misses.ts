import { cleanCheckInNote } from './journal';
import type { DayKey, Habit, MissNote, MissReason } from './model';

/**
 * What got in the way: an optional, one-tap note on a missed day.
 *
 * A miss has no check-in to hang a note on, so the notes live on the habit,
 * newest last, one per day. Only the most recent few are kept, which is
 * plenty for spotting a pattern and keeps the habit record small for sync.
 */
export const MISS_REASONS: readonly MissReason[] = [
  'tired',
  'busy',
  'forgot',
  'sick',
  'away',
  'not-feeling-it',
  'other',
];

export const MISS_REASON_LABELS: Record<MissReason, string> = {
  tired: 'Tired',
  busy: 'Too busy',
  forgot: 'Forgot',
  sick: 'Sick',
  away: 'Away from home',
  'not-feeling-it': 'Not feeling it',
  other: 'Something else',
};

/** How many miss notes a habit keeps. Older ones drop off. */
export const MAX_MISS_NOTES = 60;

export function isMissReason(value: unknown): value is MissReason {
  return typeof value === 'string' && (MISS_REASONS as readonly string[]).includes(value);
}

/** A habit's note for a day, if it has one. */
export function missNoteOn(habit: Habit, date: DayKey): MissNote | undefined {
  return habit.misses?.find((m) => m.date === date);
}

/**
 * Sets (or, with neither a reason nor words, clears) the note for a day.
 * Returns the habit's new list, sorted by day and trimmed to the newest few.
 */
export function withMissNote(
  habit: Habit,
  date: DayKey,
  entry: { reason?: MissReason; note?: string },
): MissNote[] {
  const rest = (habit.misses ?? []).filter((m) => m.date !== date);
  const note = cleanCheckInNote(entry.note);
  const next: MissNote = { date };
  if (entry.reason) next.reason = entry.reason;
  if (note) next.note = note;
  const list = next.reason || next.note ? [...rest, next] : rest;
  return list.sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_MISS_NOTES);
}

/** Checks a list read from a backup or sync. Bad entries are dropped, not an error. */
export function cleanMissNotes(raw: unknown): MissNote[] {
  if (!Array.isArray(raw)) return [];
  const byDate = new Map<DayKey, MissNote>();
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { date, reason, note } = item as Record<string, unknown>;
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const entry: MissNote = { date };
    if (isMissReason(reason)) entry.reason = reason;
    const words = cleanCheckInNote(typeof note === 'string' ? note : undefined);
    if (words) entry.note = words;
    if (entry.reason || entry.note) byDate.set(date, entry);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_MISS_NOTES);
}

/** "Tired", or "Tired · Up late", or just the words. */
export function describeMissNote(note: MissNote): string {
  return [note.reason ? MISS_REASON_LABELS[note.reason] : '', note.note ?? '']
    .filter(Boolean)
    .join(' · ');
}

export interface MissTally {
  reason: MissReason;
  count: number;
}

/**
 * What got in the way from `from` to `to` (inclusive), most common first.
 * Notes with only words aren't counted. Ties keep the order of MISS_REASONS.
 */
export function tallyMissReasons(habits: readonly Habit[], from: DayKey, to: DayKey): MissTally[] {
  const counts = new Map<MissReason, number>();
  for (const habit of habits) {
    for (const m of habit.misses ?? []) {
      if (m.reason && m.date >= from && m.date <= to) {
        counts.set(m.reason, (counts.get(m.reason) ?? 0) + 1);
      }
    }
  }
  return MISS_REASONS.filter((r) => counts.has(r))
    .map((reason) => ({ reason, count: counts.get(reason)! }))
    .sort((a, b) => b.count - a.count);
}

/** The habit with the most noted misses in the span: a good place for a "make it easy" note. */
export function mostMissedHabit(
  habits: readonly Habit[],
  from: DayKey,
  to: DayKey,
): Habit | undefined {
  let best: Habit | undefined;
  let bestCount = 0;
  for (const habit of habits) {
    const count = (habit.misses ?? []).filter((m) => m.date >= from && m.date <= to).length;
    if (count > bestCount) {
      best = habit;
      bestCount = count;
    }
  }
  return best;
}
