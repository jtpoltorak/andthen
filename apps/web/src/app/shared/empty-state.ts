import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Which little drawing goes with the message. */
export type EmptyArt = 'chain' | 'rest' | 'pause' | 'dots';

/**
 * A friendly empty screen: a small drawing, a heading, a line of text and,
 * optionally, one action (projected as the content after the text).
 *
 * The drawings are plain shapes in the theme's own colors, so they follow
 * light, dark and the accent color without any images to download.
 */
@Component({
  selector: 'app-empty-state',
  template: `
    <div class="art" aria-hidden="true">
      @switch (art()) {
        @case ('chain') {
          <!-- An anchor, and a chain waiting for its first link. -->
          <svg viewBox="0 0 120 96" width="120" height="96">
            <circle cx="30" cy="20" r="8" class="muted-fill" />
            <line x1="30" y1="32" x2="30" y2="48" class="line" />
            <circle cx="30" cy="62" r="12" class="ring-accent" />
            <line x1="30" y1="78" x2="30" y2="92" class="line dashed" />
            <rect x="52" y="14" width="44" height="10" rx="5" class="soft" />
            <rect x="52" y="56" width="56" height="10" rx="5" class="accent-soft" />
            <path d="M30 56v12M24 62h12" class="plus" />
          </svg>
        }
        @case ('rest') {
          <!-- A moon and a couple of stars: nothing planned today. -->
          <svg viewBox="0 0 120 96" width="120" height="96">
            <circle cx="60" cy="48" r="30" class="accent-soft" />
            <path d="M68 26a24 24 0 1 0 14 38a20 20 0 1 1 -14 -38z" class="accent-fill" />
            <path d="M28 22l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" class="amber-fill" />
            <path
              d="M96 66l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z"
              class="amber-fill"
            />
          </svg>
        }
        @case ('pause') {
          <!-- A pause sign on a soft circle: on a break, nothing lost. -->
          <svg viewBox="0 0 120 96" width="120" height="96">
            <circle cx="60" cy="48" r="30" class="accent-soft" />
            <rect x="48" y="34" width="8" height="28" rx="4" class="accent-fill" />
            <rect x="64" y="34" width="8" height="28" rx="4" class="accent-fill" />
            <circle cx="22" cy="48" r="4" class="soft" />
            <circle cx="98" cy="48" r="4" class="soft" />
          </svg>
        }
        @case ('dots') {
          <!-- A dot grid, with the first dot filled in. -->
          <svg viewBox="0 0 120 96" width="120" height="96">
            @for (row of rows; track row) {
              @for (col of cols; track col) {
                <circle
                  [attr.cx]="18 + col * 14"
                  [attr.cy]="20 + row * 14"
                  r="5"
                  [attr.class]="
                    row === 0 && col === 0
                      ? 'accent-fill'
                      : row === 0 && col === 1
                        ? 'amber-fill'
                        : 'soft'
                  "
                />
              }
            }
          </svg>
        }
      }
    </div>
    <h2>{{ heading() }}</h2>
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 28px 20px 24px;
      border: 1.5px dashed var(--dashed-soft);
      border-radius: var(--radius-card);
      text-align: center;
    }
    .art {
      margin-bottom: 4px;
    }
    svg {
      display: block;
    }
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
    }
    :host ::ng-deep p {
      margin: 0;
      max-width: 34ch;
      font-size: 15px;
      line-height: 1.5;
      color: var(--muted);
    }
    :host ::ng-deep p a {
      color: var(--accent-ink);
      font-weight: 700;
    }
    :host ::ng-deep .empty-action {
      margin-top: 8px;
      padding: 12px 18px;
      border-radius: 12px;
      background: var(--accent);
      color: var(--on-accent);
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
    }
    .muted-fill {
      fill: var(--muted);
    }
    .soft {
      fill: var(--line);
    }
    .accent-soft {
      fill: var(--accent-soft);
    }
    .accent-fill {
      fill: var(--accent);
    }
    .amber-fill {
      fill: var(--amber);
    }
    .ring-accent {
      fill: var(--surface);
      stroke: var(--accent);
      stroke-width: 2.5;
    }
    .plus {
      stroke: var(--accent);
      stroke-width: 2.5;
      stroke-linecap: round;
    }
    .line {
      stroke: var(--line);
      stroke-width: 2.5;
    }
    .dashed {
      stroke: var(--dashed-soft);
      stroke-dasharray: 3 4;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly art = input.required<EmptyArt>();
  readonly heading = input.required<string>();
  protected readonly rows = [0, 1, 2, 3, 4];
  protected readonly cols = [0, 1, 2, 3, 4, 5, 6];
}
