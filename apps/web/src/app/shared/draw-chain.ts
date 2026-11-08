import { DestroyRef, type Signal, inject, signal } from '@angular/core';
import { HabitStore } from '../data/habit-store';

/** Long enough for the drawing animation (in today.css and routines.css) to finish. */
export const DRAW_MS = 1800;

/**
 * "The anchor draws itself": the first screen to show a routine that was just made
 * claims it, and its chain draws once, from the anchor down to the first habit.
 * Returns the id of the routine being drawn, which clears when the drawing is done.
 * Call from a component's constructor or field initializer.
 */
export function drawNewChain(): Signal<string | undefined> {
  const store = inject(HabitStore);
  const drawing = signal(store.justCreated());
  if (drawing()) {
    store.justCreated.set(undefined);
    const timer = setTimeout(() => drawing.set(undefined), DRAW_MS);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
  return drawing.asReadonly();
}
