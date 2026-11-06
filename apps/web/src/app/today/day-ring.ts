import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { LinkStatus } from '@andthen/core';

const SIZE = 44;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Space between segments, along the ring. */
const GAP = 3;

interface Segment {
  status: LinkStatus;
  dash: string;
  offset: number;
}

/**
 * Today at a glance: a ring with one segment per habit planned today, in the same
 * colors as the chain (teal for Done, amber for 2 minutes, faint for a skip).
 * It closes with a check once every habit has its answer.
 */
@Component({
  selector: 'app-day-ring',
  template: `
    <div
      class="ring"
      role="img"
      [class.all-done]="allAnswered()"
      [class.celebrate]="celebrate() && allAnswered()"
      [attr.aria-label]="label()"
    >
      <svg [attr.width]="size" [attr.height]="size" [attr.viewBox]="'0 0 ' + size + ' ' + size">
        <g [attr.transform]="'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'">
          @for (segment of segments(); track $index) {
            <circle
              [class]="'seg seg-' + segment.status"
              [attr.cx]="size / 2"
              [attr.cy]="size / 2"
              [attr.r]="radius"
              [attr.stroke-width]="stroke"
              [attr.stroke-dasharray]="segment.dash"
              [attr.stroke-dashoffset]="segment.offset"
            />
          }
        </g>
      </svg>
      <span class="center" aria-hidden="true">
        @if (allAnswered()) {
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        } @else {
          {{ done() }}<span class="of">/{{ statuses().length }}</span>
        }
      </span>
    </div>
  `,
  styles: `
    /* Sits at the right of the title row, beside the help link. */
    :host {
      display: inline-flex;
      margin-left: auto;
    }
    .ring {
      position: relative;
      width: 44px;
      height: 44px;
    }
    svg {
      display: block;
    }
    .seg {
      fill: none;
      stroke: var(--line);
      transition: stroke 0.3s ease;
    }
    .seg-full {
      stroke: var(--accent);
    }
    .seg-mini {
      stroke: var(--amber);
    }
    .seg-skip {
      stroke: var(--dashed);
    }
    .center {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ink);
      font-size: 14px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .of {
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
    }
    .all-done .center {
      color: var(--accent-ink);
    }
    .celebrate {
      animation: day-ring-pulse 0.7s ease-out;
    }
    @keyframes day-ring-pulse {
      0% {
        transform: scale(1);
      }
      35% {
        transform: scale(1.15);
      }
      100% {
        transform: scale(1);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayRing {
  /** Each habit planned today, in the order Today shows them. */
  readonly statuses = input.required<readonly LinkStatus[]>();
  /** True right after a check-in, so finishing the day gets a small pulse. */
  readonly celebrate = input(false);

  protected readonly size = SIZE;
  protected readonly stroke = STROKE;
  protected readonly radius = RADIUS;

  protected readonly done = computed(
    () => this.statuses().filter((s) => s === 'full' || s === 'mini').length,
  );
  protected readonly allAnswered = computed(
    () => this.statuses().length > 0 && this.statuses().every((s) => s !== 'pending'),
  );

  protected readonly segments = computed((): Segment[] => {
    const statuses = this.statuses();
    const n = statuses.length;
    const step = CIRCUMFERENCE / Math.max(n, 1);
    const gap = n > 1 ? GAP : 0;
    const length = Math.max(step - gap, 1);
    return statuses.map((status, i) => ({
      status,
      dash: `${length} ${CIRCUMFERENCE - length}`,
      // Start each segment half a gap in, so the gaps sit evenly around the ring.
      offset: -(i * step + gap / 2),
    }));
  });

  protected readonly label = computed(() => {
    const total = this.statuses().length;
    const skipped = this.statuses().filter((s) => s === 'skip').length;
    const base = `${this.done()} of ${total} ${total === 1 ? 'habit' : 'habits'} done today`;
    return skipped ? `${base}, ${skipped} skipped` : base;
  });
}
