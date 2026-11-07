import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { GardenStage } from '@andthen/core';

/** One shape of the plant, drawn in a 120×120 box with the pot at the bottom. */
interface Part {
  d: string;
  kind: 'stem' | 'leaf' | 'sepal' | 'bud' | 'petal' | 'heart' | 'seed';
}

const LEAF = 'leaf' as const;
const STEM = 'stem' as const;

// Leaves shared by the bigger stages.
const LOW_LEAVES: Part[] = [
  { kind: LEAF, d: 'M60 72C46 72 40 62 42 56C52 56 59 64 60 72Z' },
  { kind: LEAF, d: 'M60 72C74 72 80 62 78 56C68 56 61 64 60 72Z' },
];
const HIGH_LEAVES: Part[] = [
  { kind: LEAF, d: 'M60 52C51 51 47 44 49 40C55 40 59 46 60 52Z' },
  { kind: LEAF, d: 'M60 52C69 51 73 44 71 40C65 40 61 46 60 52Z' },
];
const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

/** The plant at each stage of the routine garden: drawn for AndThen, in one style. */
const PLANTS: Record<GardenStage, readonly Part[]> = {
  seed: [{ kind: 'seed', d: 'M55 79.5a5 3.5 0 1 0 10 0a5 3.5 0 1 0 -10 0Z' }],
  sprout: [
    { kind: STEM, d: 'M60 82V70' },
    { kind: LEAF, d: 'M60 72C52 71 49 65 51 62C57 62 60 67 60 72Z' },
    { kind: LEAF, d: 'M60 72C68 71 71 65 69 62C63 62 60 67 60 72Z' },
  ],
  seedling: [
    { kind: STEM, d: 'M60 82V50' },
    { kind: LEAF, d: 'M60 64C48 63 44 53 47 48C56 48 60 56 60 64Z' },
    { kind: LEAF, d: 'M60 64C72 63 76 53 73 48C64 48 60 56 60 64Z' },
    { kind: LEAF, d: 'M60 52C57 48 58 44 60 42C62 44 63 48 60 52Z' },
  ],
  young: [
    { kind: STEM, d: 'M60 82C60 70 61 56 60 40' },
    ...LOW_LEAVES,
    ...HIGH_LEAVES,
    { kind: LEAF, d: 'M60 42C57 38 58 34 60 32C62 34 63 38 60 42Z' },
  ],
  budding: [
    { kind: STEM, d: 'M60 82C60 70 61 56 60 36' },
    ...LOW_LEAVES,
    ...HIGH_LEAVES,
    { kind: 'bud', d: 'M54.5 28a5.5 8 0 1 0 11 0a5.5 8 0 1 0 -11 0Z' },
    { kind: 'sepal', d: 'M60 38C55 36 54 32 55 30C58 31 60 34 60 38Z' },
    { kind: 'sepal', d: 'M60 38C65 36 66 32 65 30C62 31 60 34 60 38Z' },
  ],
  bloom: [
    { kind: STEM, d: 'M60 82C60 70 61 56 60 36' },
    ...LOW_LEAVES,
    ...HIGH_LEAVES,
    { kind: 'petal', d: circle(60, 19, 7.5) },
    { kind: 'petal', d: circle(68.6, 25.2, 7.5) },
    { kind: 'petal', d: circle(65.3, 35.3, 7.5) },
    { kind: 'petal', d: circle(54.7, 35.3, 7.5) },
    { kind: 'petal', d: circle(51.4, 25.2, 7.5) },
    { kind: 'heart', d: circle(60, 28, 6) },
  ],
};

/**
 * A routine's plant in the garden. It only ever grows: a resting plant (paused, or
 * quiet for a week) is drawn softly with a moon beside it, never wilted.
 * Decorative: the stage name is always written next to it.
 */
@Component({
  selector: 'app-plant',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      <g class="plant" [class.resting]="resting()" [class.grow]="grow()">
        @for (part of parts(); track $index) {
          <path [attr.d]="part.d" [attr.class]="part.kind" />
        }
      </g>
      <rect class="rim" x="34" y="82" width="52" height="10" rx="3" />
      <path class="pot" d="M38 92L82 92L77 112L43 112Z" />
      <ellipse class="soil" cx="60" cy="82.5" rx="23" ry="2.5" />
      @if (resting()) {
        <path class="moon" d="M92 18A11 11 0 1 0 104 34A9 9 0 1 1 92 18Z" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      line-height: 0;
    }
    .stem {
      fill: none;
      stroke: #2f7a64;
      stroke-width: 3;
      stroke-linecap: round;
    }
    .leaf {
      fill: #4c9f84;
    }
    .sepal {
      fill: #2f7a64;
    }
    .bud,
    .petal {
      fill: #f2b544;
    }
    .heart {
      fill: #c98a1f;
    }
    .seed {
      fill: #8a6a45;
    }
    .rim {
      fill: #cbb999;
    }
    .pot {
      fill: #d9cbb4;
    }
    .soil {
      fill: #6b5a45;
    }
    .moon {
      fill: #9aa197;
    }
    .resting {
      opacity: 0.5;
    }
    /* A new stage grows up out of the pot. Reduced motion turns this off (styles.css). */
    .grow {
      transform-box: view-box;
      transform-origin: 60px 84px;
      animation: plant-grow 900ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
    }
    @keyframes plant-grow {
      from {
        transform: scale(0.6);
        opacity: 0.4;
      }
    }
  `,
})
export class Plant {
  readonly stage = input.required<GardenStage>();
  readonly resting = input(false);
  /** Plays the grow-in once, when the plant has just reached this stage. */
  readonly grow = input(false);
  readonly size = input(48);

  protected readonly parts = computed(() => PLANTS[this.stage()]);
}
