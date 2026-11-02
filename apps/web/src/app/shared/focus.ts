import { Directive, ElementRef, Injector, afterNextRender, inject } from '@angular/core';

/**
 * Moves keyboard focus once the DOM has caught up with a state change.
 * Use it when the element that had focus is about to disappear (a form closing,
 * a button that only shows in one state), so focus lands somewhere useful
 * instead of falling back to the top of the page.
 *
 * `find` runs after the next render and may return nothing, in which case focus stays put.
 */
export function focusAfterRender(
  injector: Injector,
  find: () => HTMLElement | null | undefined,
): void {
  afterNextRender({ read: () => find()?.focus({ preventScroll: false }) }, { injector });
}

/** Looks up an element by id, for use with `focusAfterRender`. */
export const byId = (id: string) => () => document.getElementById(id);

/**
 * Focuses its element when it first appears. Put it on the first field of a form
 * that opens in place (an inline edit or "+ and then..."), so typing can start right away.
 */
@Directive({ selector: '[appAutofocus]' })
export class Autofocus {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender({ read: () => el.focus() });
  }
}
