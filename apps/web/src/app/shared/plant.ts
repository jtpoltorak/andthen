import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { GardenStage } from '@andthen/core';
import { MOON, PLANTS, POT } from './plant-art';

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
      <path class="rim" [attr.d]="pot.rim" />
      <path class="pot" [attr.d]="pot.pot" />
      <path class="soil" [attr.d]="pot.soil" />
      @if (resting()) {
        <path class="moon" [attr.d]="moon" />
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
  protected readonly pot = POT;
  protected readonly moon = MOON;
}
