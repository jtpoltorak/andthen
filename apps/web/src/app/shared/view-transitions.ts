import type { ViewTransitionInfo } from '@angular/router';

/**
 * Screen changes use the browser's View Transitions: tabs cross-fade, and a routine's
 * card on Today grows into its Run screen (both carry the same `view-transition-name`).
 * Skipped entirely when the device asks for reduced motion.
 */
export function onViewTransitionCreated({ transition }: ViewTransitionInfo): void {
  if (prefersReducedMotion()) transition.skipTransition();
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The shared name that links a routine's Today card to its Run screen. */
export const routineTransitionName = (routineId: string) => `routine-${routineId}`;
