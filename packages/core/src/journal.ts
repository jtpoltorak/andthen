import type { CheckIn, Mood } from './model';

/** The moods to pick from, in the order they're shown. */
export const MOODS: readonly Mood[] = ['good', 'okay', 'hard'];

export const MOOD_LABELS: Record<Mood, string> = {
  good: 'Felt good',
  okay: 'Okay',
  hard: 'Hard',
};

/** A journal note is a few words, not an essay. */
export const MAX_CHECKIN_NOTE = 140;

/** Trims a note to one tidy line, or undefined when there's nothing left. */
export function cleanCheckInNote(note: string | undefined): string | undefined {
  const text = (note ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_CHECKIN_NOTE).trim();
  return text || undefined;
}

export function isMood(value: unknown): value is Mood {
  return MOODS.includes(value as Mood);
}

/** True when a check-in has a mood or a note. */
export function hasJournal(c: Pick<CheckIn, 'mood' | 'note'>): boolean {
  return !!(c.mood || c.note);
}

/**
 * Sets (or clears) the journal on a check-in. `undefined` for a field leaves it as is;
 * `null` clears it. Returns a new check-in.
 */
export function withJournal(
  checkIn: CheckIn,
  journal: { mood?: Mood | null; note?: string | null },
): CheckIn {
  const next: CheckIn = { habitId: checkIn.habitId, date: checkIn.date, kind: checkIn.kind };
  const mood = journal.mood === undefined ? checkIn.mood : (journal.mood ?? undefined);
  const note =
    journal.note === undefined ? checkIn.note : cleanCheckInNote(journal.note ?? undefined);
  if (mood) next.mood = mood;
  if (note) next.note = note;
  return next;
}

/** One habit's journal entries, newest first. */
export function journalEntries(
  checkIns: readonly CheckIn[],
  habitId: string,
  limit = Infinity,
): CheckIn[] {
  return checkIns
    .filter((c) => c.habitId === habitId && hasJournal(c))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

/** Words for a journal entry, such as "Felt good · slept in, still did it". */
export function describeJournal(c: Pick<CheckIn, 'mood' | 'note'>): string {
  return [c.mood ? MOOD_LABELS[c.mood] : '', c.note ?? ''].filter(Boolean).join(' · ');
}
