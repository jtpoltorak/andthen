import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { skyPhase } from '@andthen/core';

/** How often the sky checks the clock. The phase only changes on the hour. */
const TICK_MS = 60_000;

/**
 * A soft sky behind Today's header: sunrise, daylight, dusk or a night with a moon.
 * Purely decorative, so it's hidden from screen readers. Turned on in Settings.
 */
@Component({
  selector: 'app-sky',
  host: {
    'aria-hidden': 'true',
    '[class]': "'sky sky-' + phase()",
  },
  template: `
    <svg class="art" width="140" height="80" viewBox="0 0 140 80" focusable="false">
      @switch (phase()) {
        @case ('dawn') {
          <circle class="glow" cx="96" cy="48" r="30" />
          <circle class="sun" cx="96" cy="48" r="18" />
        }
        @case ('day') {
          <circle class="glow" cx="60" cy="26" r="28" />
          <circle class="sun" cx="60" cy="26" r="16" />
          <path class="cloud" d="M84 58h44a12 12 0 0 0-6-22 18 18 0 0 0-33 4 10 10 0 0 0-5 18z" />
        }
        @case ('dusk') {
          <circle class="glow" cx="40" cy="48" r="30" />
          <circle class="sun" cx="40" cy="48" r="18" />
        }
        @default {
          <circle class="moon" cx="96" cy="34" r="17" />
          <circle class="moon-shade" cx="104" cy="28" r="14" />
          <circle class="star" cx="30" cy="20" r="1.6" />
          <circle class="star" cx="58" cy="50" r="1.2" />
          <circle class="star" cx="128" cy="62" r="1.4" />
          <circle class="star" cx="72" cy="12" r="1.1" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      position: absolute;
      z-index: -1;
      top: -28px;
      right: -20px;
      bottom: -8px;
      left: -20px;
      pointer-events: none;
      background: linear-gradient(
        180deg,
        var(--sky-top) 0%,
        var(--sky-mid) 55%,
        color-mix(in srgb, var(--sky-mid) 0%, transparent) 100%
      );
    }
    .art {
      position: absolute;
      top: 6px;
      right: 100px;
    }
    .glow {
      fill: var(--sky-sun);
      opacity: 0.2;
    }
    .sun {
      fill: var(--sky-sun);
    }
    .cloud {
      fill: var(--sky-cloud);
    }
    .moon {
      fill: var(--sky-moon);
    }
    .moon-shade {
      fill: var(--sky-top);
    }
    .star {
      fill: var(--sky-star);
    }
    :host(.sky-dawn) {
      --sky-top: var(--sky-dawn-top);
      --sky-mid: var(--sky-dawn-mid);
      --sky-sun: #f6bf57;
    }
    :host(.sky-day) {
      --sky-top: var(--sky-day-top);
      --sky-mid: var(--sky-day-mid);
      --sky-sun: #f8d77a;
    }
    :host(.sky-dusk) {
      --sky-top: var(--sky-dusk-top);
      --sky-mid: var(--sky-dusk-mid);
      --sky-sun: #ef9a6a;
    }
    :host(.sky-night) {
      --sky-top: var(--sky-night-top);
      --sky-mid: var(--sky-night-mid);
    }
    @media (prefers-reduced-motion: no-preference) {
      :host {
        animation: sky-in 600ms ease-out both;
      }
      .sun,
      .glow,
      .moon {
        animation: sky-rise 900ms ease-out both;
      }
    }
    @keyframes sky-in {
      from {
        opacity: 0;
      }
    }
    @keyframes sky-rise {
      from {
        transform: translateY(10px);
        opacity: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sky {
  private readonly hour = signal(new Date().getHours());
  protected readonly phase = computed(() => skyPhase(this.hour()));

  constructor() {
    const timer = setInterval(() => this.hour.set(new Date().getHours()), TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
