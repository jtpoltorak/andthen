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
  sunrise: [
    {
      d: 'M3 19h18M6.5 19a5.5 5.5 0 0 1 11 0M12 3.5v5M9.5 6L12 3.5 14.5 6M4 12.5l1.5 1M20 12.5l-1.5 1',
    },
  ],
  alarm: [{ cx: 12, cy: 13, r: 7 }, { d: 'M12 9.5V13l2.5 2M3.5 6.5l3-3M20.5 6.5l-3-3' }],
  timer: [{ cx: 12, cy: 13.5, r: 7 }, { d: 'M12 13.5V10M10 3h4M12 3v3.5' }],
  calendar: [{ d: 'M4.5 6h15v14h-15zM4.5 10.5h15M8.5 3.5v4M15.5 3.5v4' }],
  bike: [
    { cx: 6, cy: 16, r: 3.5 },
    { cx: 18, cy: 16, r: 3.5 },
    { d: 'M6 16l3-6.5h7L18 16M12 16L9 9.5M12 16l4-6.5M7.5 7h3M16 9.5l-1-3h2' },
  ],
  lotus: [
    {
      d: 'M12 19.5c-4 0-8-2-9-5.5 3.5-.5 6.5 1 9 5.5 2.5-4.5 5.5-6 9-5.5-1 3.5-5 5.5-9 5.5zM12 19.5c-2-2-3-4.5-3-7.5 .8-1.5 1.8-2.6 3-3.5 1.2.9 2.2 2 3 3.5 0 3-1 5.5-3 7.5z',
    },
  ],
  water: [
    { d: 'M6 4h12l-1.5 15.6a1.5 1.5 0 0 1-1.5 1.4H9a1.5 1.5 0 0 1-1.5-1.4z' },
    { d: 'M6.6 10h10.8' },
  ],
  apple: [
    {
      d: 'M12 8c-2-1.5-7.5-1.5-7.5 4.5 0 4.5 3 8 5 8 1 0 1.5-.5 2.5-.5s1.5.5 2.5.5c2 0 5-3.5 5-8 0-6-5.5-6-7.5-4.5z',
    },
    { d: 'M12 8c0-2 1-3.5 3-4.5' },
  ],
  meal: [{ d: 'M7 3.5v17M4.5 3.5v4a2.5 2.5 0 0 0 5 0v-4M17.5 20.5v-17c-2.5 1-3.5 4-3.5 8h3.5' }],
  pill: [
    { d: 'M4.9 12.7l7.8-7.8a4.24 4.24 0 0 1 6 6l-7.8 7.8a4.24 4.24 0 0 1-6-6z' },
    { d: 'M8.8 8.8l6 6' },
  ],
  tooth: [
    {
      d: 'M8 4C5.5 4 4 6 4.5 9c.4 2.4 1.5 3.6 2 6 .5 2.6 1 5 2.5 5s1.5-4 3-4 1.5 4 3 4 2-2.4 2.5-5c.5-2.4 1.6-3.6 2-6 .5-3-1-5-3.5-5-1.8 0-2.6 1-4 1s-2.2-1-4-1z',
    },
  ],
  drop: [{ d: 'M12 3.5s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z' }],
  headphones: [
    { d: 'M4 17v-4a8 8 0 0 1 16 0v4' },
    { d: 'M4 14.5h3V20H5.5A1.5 1.5 0 0 1 4 18.5zM20 14.5h-3V20h1.5a1.5 1.5 0 0 0 1.5-1.5z' },
  ],
  palette: [
    {
      d: 'M12 3.5a8.5 8.5 0 0 0 0 17c1.4 0 2-.9 2-1.9 0-1.4-1-1.8-1-2.9 0-1 .9-1.7 2-1.7h2a3.5 3.5 0 0 0 3.5-3.5c0-4-4-7-8.5-7z',
    },
    { cx: 8, cy: 10.5, r: 1 },
    { cx: 12, cy: 7.5, r: 1 },
    { cx: 16, cy: 9.5, r: 1 },
  ],
  list: [{ d: 'M11 6.5h9M11 12h9M11 17.5h9M4 6.5l1.5 1.5L8 5.5M4 12l1.5 1.5L8 11M4.5 17.5h2' }],
  star: [{ d: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z' }],
  smile: [{ cx: 12, cy: 12, r: 8.5 }, { d: 'M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01' }],
  flame: [
    {
      d: 'M12 21c-3.5 0-6-2.5-6-6 0-4 3.5-6 4-10 2.5 1.5 4 4 4.5 6.5 1-.5 1.5-1.5 1.5-2.5 1.5 1.5 2 3.5 2 6 0 3.5-2.5 6-6 6z',
    },
  ],
  broom: [{ d: 'M12 3v9M7 12h10l2 8.5H5zM9.5 15.5l-.5 5M14.5 15.5l.5 5' }],
  sprout: [
    {
      d: 'M12 20v-8M12 12c0-4-3-6.5-7-6.5 0 4 3 6.5 7 6.5zM12 14.5c0-3.5 2.5-6 6.5-6 0 3.5-2.5 6-6.5 6zM6 20h12',
    },
  ],
  paw: [
    { d: 'M8 17.5c0-2.5 2-4.5 4-4.5s4 2 4 4.5c0 1.5-1 2-2 2s-1.3-.5-2-.5-1 .5-2 .5-2-.5-2-2z' },
    { cx: 5, cy: 11.5, r: 1.4 },
    { cx: 9, cy: 7, r: 1.4 },
    { cx: 15, cy: 7, r: 1.4 },
    { cx: 19, cy: 11.5, r: 1.4 },
  ],
  cart: [{ d: 'M3 4h2.5l2 11h11l2-8H6.5' }, { cx: 9, cy: 19, r: 1.5 }, { cx: 17, cy: 19, r: 1.5 }],
  wallet: [
    {
      d: 'M4 6.5A2.5 2.5 0 0 1 6.5 4H17v3.5M4 6.5v12A1.5 1.5 0 0 0 5.5 20H19a1.5 1.5 0 0 0 1.5-1.5V9A1.5 1.5 0 0 0 19 7.5H5A1 1 0 0 1 4 6.5zM16 14h1',
    },
  ],
  car: [{ d: 'M4 16.5V12l2-5h12l2 5v4.5zM4 12h16M6.5 16.5V19M17.5 16.5V19M7 14.2h1M16 14.2h1' }],
  mountain: [{ d: 'M2.5 19.5l7-12 4 6.5 2.5-3.5 5.5 9z' }],
  briefcase: [{ d: 'M3.5 8h17v11h-17zM9 8V5.5h6V8M3.5 13h17' }],
  phone: [
    {
      d: 'M7.5 3h9A1.5 1.5 0 0 1 18 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.5v-15A1.5 1.5 0 0 1 7.5 3zM11 18h2',
    },
  ],
  mail: [{ d: 'M3.5 6h17v12h-17zM3.5 6.5l8.5 6.5 8.5-6.5' }],
  chat: [{ d: 'M4 5.5h16v10h-10l-4 3.5v-3.5H4z' }],
  people: [
    { cx: 9, cy: 8.5, r: 3 },
    { cx: 17, cy: 9.5, r: 2.5 },
    { d: 'M3.5 19.5a5.5 5.5 0 0 1 11 0M15.5 14.2a4.5 4.5 0 0 1 5 5.3' },
  ],
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
  sunrise: 'Sunrise',
  alarm: 'Alarm clock',
  timer: 'Timer',
  calendar: 'Calendar',
  bike: 'Bike',
  lotus: 'Lotus',
  water: 'Glass of water',
  apple: 'Apple',
  meal: 'Fork and knife',
  pill: 'Pill',
  tooth: 'Tooth',
  drop: 'Drop',
  headphones: 'Headphones',
  palette: 'Palette',
  list: 'Checklist',
  star: 'Star',
  smile: 'Smile',
  flame: 'Flame',
  broom: 'Broom',
  sprout: 'Plant',
  paw: 'Paw',
  cart: 'Cart',
  wallet: 'Wallet',
  car: 'Car',
  mountain: 'Mountain',
  briefcase: 'Briefcase',
  phone: 'Phone',
  mail: 'Envelope',
  chat: 'Speech bubble',
  people: 'People',
};

/** The picker's groups, so a longer set stays easy to scan. Every icon is in exactly one. */
export const ROUTINE_ICON_GROUPS: readonly { name: string; icons: readonly IconId[] }[] = [
  {
    name: 'Times of day',
    icons: ['sun', 'sunrise', 'moon', 'bed', 'alarm', 'coffee', 'timer', 'calendar'],
  },
  {
    name: 'Body',
    icons: [
      'shoe',
      'weights',
      'bike',
      'lotus',
      'heart',
      'water',
      'apple',
      'meal',
      'pill',
      'tooth',
      'drop',
    ],
  },
  {
    name: 'Mind',
    icons: ['book', 'pen', 'music', 'headphones', 'palette', 'list', 'star', 'smile', 'flame'],
  },
  {
    name: 'Home and outdoors',
    icons: ['home', 'broom', 'sprout', 'leaf', 'paw', 'cart', 'wallet', 'car', 'mountain'],
  },
  { name: 'Work and people', icons: ['laptop', 'briefcase', 'phone', 'mail', 'chat', 'people'] },
];

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
