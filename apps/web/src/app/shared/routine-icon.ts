import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { RoutineIcon as IconId } from '@andthen/core';

/** A shape in a 24×24 line icon: a path, or a circle. */
type Shape = { d: string } | { cx: number; cy: number; r: number };

/** The routine icons: simple line drawings, drawn for AndThen in one style. */
const SHAPES: Record<IconId, readonly Shape[]> = {
  coffee: [
    { d: 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z' },
    { d: 'M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16' },
    { d: 'M9 3.5v2.5M12.5 3.5v2.5' },
  ],
  sun: [
    { cx: 12, cy: 12, r: 4 },
    {
      d: 'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
    },
  ],
  moon: [{ d: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z' }],
  bed: [{ d: 'M3 6v13M3 15h18v4M21 15v-2.5a3 3 0 0 0-3-3h-7V15' }, { cx: 7, cy: 12, r: 1.8 }],
  laptop: [{ d: 'M5.5 6.5h13v9h-13zM3 18.5h18' }],
  book: [
    {
      d: 'M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z',
    },
    { d: 'M12 6.5v13' },
  ],
  pen: [{ d: 'M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5zM13.5 7l3 3' }],
  shoe: [
    {
      d: 'M3 17.5V11l4-.5 2.5-3.5 3 2.5 3.5 1.5 4 1.5a2 2 0 0 1 1 1.8V17.5zM3 17.5h18M10 10l1.5-1.5M12.5 11.5l1.5-1.5',
    },
  ],
  weights: [{ d: 'M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11' }],
  leaf: [{ d: 'M5 19c0-8 5-14 14.5-14.5C19 14 13 19 5 19zM5 19l7.5-7.5' }],
  heart: [{ d: 'M12 19.5s-7.5-4.5-7.5-10A4 4 0 0 1 12 7a4 4 0 0 1 7.5 2.5c0 5.5-7.5 10-7.5 10z' }],
  music: [
    { d: 'M9 17.5V5.5l10.5-2v12' },
    { cx: 6.5, cy: 17.5, r: 2.5 },
    { cx: 17, cy: 15.5, r: 2.5 },
  ],
  home: [{ d: 'M3.5 11.5L12 4l8.5 7.5M6 9.5V20h12V9.5M10 20v-5h4v5' }],
};

/** What each icon is called, for the picker and screen readers. */
export const ROUTINE_ICON_NAMES: Record<IconId, string> = {
  coffee: 'Mug',
  sun: 'Sun',
  moon: 'Moon',
  bed: 'Bed',
  laptop: 'Laptop',
  book: 'Book',
  pen: 'Pen',
  shoe: 'Shoe',
  weights: 'Weights',
  leaf: 'Leaf',
  heart: 'Heart',
  music: 'Music',
  home: 'Home',
};

/**
 * One routine icon, drawn in the current text color. Decorative by default, since the
 * routine's anchor is always written beside it.
 */
@Component({
  selector: 'app-routine-icon',
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @for (shape of shapes(); track $index) {
        @if ('d' in shape) {
          <path [attr.d]="shape.d" />
        } @else {
          <circle [attr.cx]="shape.cx" [attr.cy]="shape.cy" [attr.r]="shape.r" />
        }
      }
    </svg>
  `,
  host: { '[class.tile]': 'tile()' },
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    /* A soft round tile, the size of a chain's habit rings, for where the anchor dot sits. */
    :host(.tile) {
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--accent-soft);
      color: var(--accent-ink);
    }
    svg {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutineIcon {
  readonly icon = input.required<IconId>();
  readonly size = input(16);
  /** Draws it on a round tile, in place of a routine's plain anchor dot. */
  readonly tile = input(false);
  protected readonly shapes = computed(() => SHAPES[this.icon()] ?? []);
}
