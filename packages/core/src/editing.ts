import type { DayKey, Habit } from './model';

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

/** The habits currently in a routine's chain (not archived, already created), in chain order. */
export function chainHabits(routineId: string, habits: readonly Habit[], day: DayKey): Habit[] {
  return habits
    .filter(
      (h) =>
        h.routineId === routineId && h.createdOn <= day && (!h.archivedOn || h.archivedOn > day),
    )
    .sort(byOrder);
}

/**
 * Moves the item at `from` to `to` and renumbers the list 0..n-1.
 * Returns only the items whose `order` changed, ready to save.
 * Out-of-range moves return an empty array.
 */
export function moveItem<T extends { order: number }>(
  ordered: readonly T[],
  from: number,
  to: number,
): T[] {
  if (from === to || from < 0 || to < 0 || from >= ordered.length || to >= ordered.length) {
    return [];
  }
  const list = [...ordered];
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  return list.flatMap((entry, order) => (entry.order === order ? [] : [{ ...entry, order }]));
}
