import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { type GlanceRow, dayAtAGlance, glanceHours, timeOfMinutes } from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { readJson, writeJson } from '../data/local-store';
import { formatUsualTime } from '../reminders/reminders';

/** Suggestions the person said no to: routine id to the suggested `HH:mm`. Per device. */
export const GLANCE_KEPT_KEY = 'andthen.glanceKept';

const HOUR_PX = 22;
const TOP = 12;
const WIDTH = 320;
const AXIS = 40;
const BAND_X = 50;
const BAND_W = 116;
const LABEL_X = BAND_X + BAND_W + 12;
const LABEL_GAP = 32;
const MAX_LABEL = 19;

interface Drawn {
  row: GlanceRow;
  name: string;
  note: string;
  x: number;
  w: number;
  planned?: { y: number; h: number };
  usual?: { y: number; h: number };
  dots: { cx: number; cy: number; kind: 'full' | 'mini' }[];
  labelY: number;
}

const shorten = (text: string) =>
  text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1).trimEnd()}…` : text;

const time = (minutes: number) => formatUsualTime(timeOfMinutes(minutes));

/**
 * Progress: when each routine really happens, next to when it's planned, on a
 * timeline of the day. Offers to move a routine's time when the two drift apart.
 */
@Component({
  selector: 'app-day-glance',
  template: `
    @if (rows().length) {
      <section class="card glance" aria-labelledby="glance-title">
        <h2 id="glance-title" class="eyebrow">Your day at a glance</h2>
        @if (hasTimes()) {
          <p class="glance-sub">When your routines really happen, from the last 4 weeks.</p>
        } @else {
          <p class="glance-sub">
            Each check-in now notes the time. After a few days, this shows when your routines really
            happen next to when you planned them.
          </p>
        }

        <svg
          class="glance-chart"
          [attr.viewBox]="'0 0 ' + width + ' ' + chart().height"
          [attr.height]="chart().height"
          aria-hidden="true"
          focusable="false"
        >
          @for (hour of chart().hours; track hour.y) {
            <line
              [class.major]="hour.label"
              [attr.x1]="axis"
              [attr.x2]="width"
              [attr.y1]="hour.y"
              [attr.y2]="hour.y"
            />
            @if (hour.label) {
              <text class="hour" [attr.x]="axis - 6" [attr.y]="hour.y + 4">{{ hour.label }}</text>
            }
          }
          @for (d of chart().drawn; track d.row.routine.id) {
            @if (d.usual; as u) {
              <rect
                class="usual"
                [attr.x]="d.x"
                [attr.y]="u.y"
                [attr.width]="d.w"
                [attr.height]="u.h"
                rx="7"
              />
            }
            @if (d.planned; as p) {
              <rect
                class="planned"
                [attr.x]="d.x"
                [attr.y]="p.y"
                [attr.width]="d.w"
                [attr.height]="p.h"
                rx="5"
              />
            }
            @for (dot of d.dots; track $index) {
              <circle
                [class]="'today-dot ' + dot.kind"
                [attr.cx]="dot.cx"
                [attr.cy]="dot.cy"
                r="5"
              />
            }
            <text class="name" [attr.x]="labelX" [attr.y]="d.labelY - 2">{{ d.name }}</text>
            <text class="note" [attr.x]="labelX" [attr.y]="d.labelY + 13">{{ d.note }}</text>
          }
          @if (chart().now; as now) {
            <line
              class="now"
              [attr.x1]="axis"
              [attr.x2]="width"
              [attr.y1]="now.y"
              [attr.y2]="now.y"
            />
            <circle class="now-dot" [attr.cx]="axis" [attr.cy]="now.y" r="4" />
          }
        </svg>

        <ul class="visually-hidden">
          @for (d of chart().drawn; track d.row.routine.id) {
            <li>{{ d.row.routine.name || d.row.routine.anchor }}: {{ spoken(d.row) }}</li>
          }
        </ul>

        <div class="legend" aria-hidden="true">
          <span><i class="key key-usual"></i>Usual time</span>
          <span><i class="key key-planned"></i>Planned</span>
          <span><i class="key key-today"></i>Today</span>
        </div>

        @for (s of suggestions(); track s.routine.id) {
          <div class="suggest">
            <p>
              <strong>{{ s.routine.name || s.routine.anchor }}</strong> usually starts around
              {{ time(s.usual!.start) }}, not {{ time(s.planned!) }}. Move its time to match?
              Reminders follow it.
            </p>
            <div class="suggest-actions">
              <button type="button" class="move" (click)="move(s)">
                Move to {{ time(s.suggestion!) }}
              </button>
              <button type="button" class="keep" (click)="keep(s)">
                Keep {{ time(s.planned!) }}
              </button>
            </div>
          </div>
        }
      </section>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface);
    }
    .eyebrow {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .glance-sub {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      color: var(--muted);
    }
    .glance-chart {
      display: block;
      width: 100%;
      max-width: 420px;
      height: auto;
      font-family: var(--font);
    }
    line {
      stroke: var(--line);
      stroke-width: 1;
      opacity: 0.5;
    }
    line.major {
      opacity: 1;
    }
    .hour {
      font-size: 11px;
      font-weight: 600;
      fill: var(--muted);
      text-anchor: end;
    }
    .usual {
      fill: color-mix(in srgb, var(--accent) 24%, var(--surface));
    }
    .planned {
      fill: none;
      stroke: var(--dashed);
      stroke-width: 1.5;
      stroke-dasharray: 4 3;
    }
    .today-dot.full {
      fill: var(--accent);
    }
    .today-dot.mini {
      fill: var(--amber);
    }
    .name {
      font-size: 13px;
      font-weight: 800;
      fill: var(--ink);
    }
    .note {
      font-size: 11px;
      font-weight: 600;
      fill: var(--muted);
    }
    line.now {
      stroke: var(--amber);
      stroke-width: 2;
      opacity: 1;
    }
    .now-dot {
      fill: var(--amber);
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 14px;
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
    }
    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .key {
      display: inline-block;
    }
    .key-usual {
      width: 18px;
      height: 8px;
      border-radius: 4px;
      background: color-mix(in srgb, var(--accent) 24%, var(--surface));
    }
    .key-planned {
      width: 16px;
      height: 6px;
      border: 1.5px dashed var(--dashed);
      border-radius: 3px;
    }
    .key-today {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
    }
    .suggest {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px 16px;
      border-radius: var(--radius-control);
      background: var(--amber-soft);
      color: var(--amber-soft-ink);
    }
    .suggest p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }
    .suggest-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .suggest button {
      min-height: 40px;
      padding: 0 16px;
      border-radius: var(--radius-control);
      font: inherit;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .move {
      border: none;
      background: var(--accent);
      color: var(--on-accent);
    }
    .keep {
      border: 1.5px solid currentColor;
      background: transparent;
      color: inherit;
    }
    .suggest button:focus-visible {
      outline: 3px solid var(--focus);
      outline-offset: 2px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayGlance {
  private readonly store = inject(HabitStore);

  protected readonly width = WIDTH;
  protected readonly axis = AXIS;
  protected readonly labelX = LABEL_X;
  protected readonly time = time;

  /** Minutes after midnight, for the "now" line. Checked once a minute. */
  private readonly now = signal(minutesNow());
  private readonly kept = signal(readKept());

  constructor() {
    const timer = setInterval(() => this.now.set(minutesNow()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected readonly rows = computed(() =>
    dayAtAGlance(
      this.store.activeRoutines(),
      this.store.habits(),
      this.store.checkIns(),
      this.store.today(),
    ),
  );

  protected readonly hasTimes = computed(() => this.rows().some((r) => r.usual || r.today.length));

  /** One suggestion at a time, so it stays a gentle nudge. */
  protected readonly suggestions = computed(() =>
    this.rows()
      .filter(
        (r) =>
          r.suggestion !== undefined && this.kept()[r.routine.id] !== timeOfMinutes(r.suggestion),
      )
      .slice(0, 1),
  );

  protected readonly chart = computed(() => {
    // In time order, so lanes and labels can be laid out top to bottom.
    const rows = [...this.rows()].sort((a, b) => spanOf(a).start - spanOf(b).start);
    const { from, to } = glanceHours(rows);
    const y = (minutes: number) => TOP + ((minutes - from * 60) / 60) * HOUR_PX;
    const height = Math.round(y(to * 60) + TOP);

    const hours = [];
    for (let h = from; h <= to; h++) {
      const label =
        h % 3 === 0 && h < 24
          ? new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: 'numeric' })
          : '';
      hours.push({ y: y(h * 60), label });
    }

    // Routines whose times overlap share the column side by side.
    const spans = rows.map((row) => spanOf(row));
    const lanes: number[] = [];
    const laneEnds: number[] = [];
    for (const [i, span] of spans.entries()) {
      let lane = laneEnds.findIndex((end) => end <= span.start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = span.end;
      lanes[i] = lane;
    }
    const laneCount = Math.max(1, laneEnds.length);
    const w = (BAND_W - (laneCount - 1) * 6) / laneCount;

    let lastLabel = -Infinity;
    const drawn: Drawn[] = rows.map((row, i) => {
      const x = BAND_X + lanes[i] * (w + 6);
      const span = spans[i];
      const labelY = Math.max(y((span.start + span.end) / 2) + 2, lastLabel + LABEL_GAP);
      lastLabel = labelY;
      const d: Drawn = {
        row,
        name: shorten(row.routine.name || row.routine.anchor),
        note: noteFor(row),
        x,
        w,
        dots: row.today.map((t, j) => ({
          cx: x + Math.min(w - 8, 12 + j * 16),
          cy: y(t.at),
          kind: t.kind,
        })),
        labelY,
      };
      if (row.planned !== undefined) d.planned = { y: y(row.planned), h: HOUR_PX / 4 };
      if (row.usual) {
        d.usual = {
          y: y(row.usual.start) - 4,
          h: Math.max(10, y(row.usual.end) - y(row.usual.start) + 8),
        };
      }
      return d;
    });

    const nowMinutes = this.now();
    const now = nowMinutes >= from * 60 && nowMinutes <= to * 60 ? { y: y(nowMinutes) } : undefined;
    return { height, hours, drawn, now };
  });

  protected spoken(row: GlanceRow): string {
    return [
      row.planned !== undefined ? `planned for ${time(row.planned)}` : '',
      row.usual ? `usually ${time(row.usual.start)} to ${time(row.usual.end)}` : '',
      row.today.length ? `today at ${row.today.map((t) => time(t.at)).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('; ');
  }

  protected async move(row: GlanceRow): Promise<void> {
    if (row.suggestion === undefined) return;
    await this.store.updateRoutine(row.routine.id, { usualTime: timeOfMinutes(row.suggestion) });
  }

  protected keep(row: GlanceRow): void {
    if (row.suggestion === undefined) return;
    const next = { ...this.kept(), [row.routine.id]: timeOfMinutes(row.suggestion) };
    this.kept.set(next);
    writeJson(GLANCE_KEPT_KEY, next);
  }
}

function minutesNow(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function readKept(): Record<string, string> {
  const raw = readJson(GLANCE_KEPT_KEY);
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      (e): e is [string, string] => typeof e[1] === 'string',
    ),
  );
}

/** The stretch of the day a routine takes up on the chart. */
function spanOf(row: GlanceRow): { start: number; end: number } {
  const times = [
    ...(row.planned !== undefined ? [row.planned, row.planned + 15] : []),
    ...(row.usual ? [row.usual.start, row.usual.end] : []),
    ...row.today.map((t) => t.at),
  ];
  return { start: Math.min(...times), end: Math.max(...times) };
}

function noteFor(row: GlanceRow): string {
  if (row.usual) {
    const { start, end } = row.usual;
    return end - start >= 5 ? `usually ${time(start)} to ${time(end)}` : `usually ${time(start)}`;
  }
  if (row.today.length) return `today ${time(row.today[0].at)}`;
  return row.planned !== undefined ? `planned ${time(row.planned)}` : '';
}
