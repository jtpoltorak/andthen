import { addDays } from './dates';
import type { DayKey, Pause, Routine } from './model';

/** How long a pause can be picked for, in days. Undefined means "until I resume". */
export const PAUSE_LENGTHS: readonly (number | undefined)[] = [3, 7, 14, undefined];

/** True when the routine is paused on this day. */
export function isPausedOn(routine: Pick<Routine, 'pauses'> | undefined, day: DayKey): boolean {
  return !!routine?.pauses?.some((p) => p.from <= day && (!p.until || day < p.until));
}

/** The pause covering this day, if any. */
export function pauseOn(routine: Pick<Routine, 'pauses'>, day: DayKey): Pause | undefined {
  return routine.pauses?.find((p) => p.from <= day && (!p.until || day < p.until));
}

/**
 * Pauses a routine from today, for `days` days or until resumed. Today is paused too,
 * so nothing left on today's list counts against anyone. Returns the new pauses list.
 */
export function addPause(routine: Pick<Routine, 'pauses'>, today: DayKey, days?: number): Pause[] {
  const kept = (routine.pauses ?? []).filter(
    (p) => !(p.from <= today && (!p.until || today < p.until)),
  );
  const pause: Pause = { from: today };
  if (days !== undefined && days > 0) pause.until = addDays(today, days);
  return [...kept, pause].sort((a, b) => a.from.localeCompare(b.from));
}

/**
 * Ends the pause covering today, so the routine is back on today's list.
 * A pause that started today is dropped entirely; an older one now ends today.
 */
export function endPause(routine: Pick<Routine, 'pauses'>, today: DayKey): Pause[] {
  return (routine.pauses ?? []).flatMap((p) => {
    if (!(p.from <= today && (!p.until || today < p.until))) return [p];
    return p.from === today ? [] : [{ from: p.from, until: today }];
  });
}

/** Tidies a pauses list read from a backup or sync: valid ranges only, oldest first. */
export function normalizePauses(pauses: readonly Pause[]): Pause[] {
  return pauses
    .filter((p) => !p.until || p.until > p.from)
    .map((p) => (p.until ? { from: p.from, until: p.until } : { from: p.from }))
    .sort((a, b) => a.from.localeCompare(b.from));
}
