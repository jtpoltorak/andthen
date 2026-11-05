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

/** Where a list item sits on screen, top and bottom edges in pixels. */
export interface RowBox {
  top: number;
  bottom: number;
}

/**
 * Where a dragged item lands: its index once dropped, given where every item sat
 * (in order, measured before the drag started), the index it was picked up from,
 * and how far it has been dragged (down is positive).
 * Dragging down, it passes a neighbour once its bottom edge crosses that neighbour's
 * middle; dragging up, once its top edge does. That works for tall rows as well as short.
 */
export function dropIndex(rows: readonly RowBox[], from: number, dy: number): number {
  const dragged = rows[from];
  if (!dragged) return from;
  const top = dragged.top + dy;
  const bottom = dragged.bottom + dy;
  let index = 0;
  rows.forEach((row, i) => {
    const middle = (row.top + row.bottom) / 2;
    if (i < from && middle < top) index++;
    if (i > from && middle < bottom) index++;
  });
  return index;
}
