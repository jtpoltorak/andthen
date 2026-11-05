import type { DayStatus } from '@andthen/core';

/** What the weekly recap card shows. Built by the page, drawn by `drawRecapCard`. */
export interface RecapData {
  /** "Nov 2 – Nov 8" */
  range: string;
  daysShowedUp: number;
  daysSoFar: number;
  full: number;
  mini: number;
  skips: number;
  habits: { name: string; days: DayStatus[] }[];
  /** One-letter weekday labels over the dots, in week order. */
  dayLabels: string[];
  /** "What went well" from the week's reflection, if any. */
  wentWell?: string;
}

/** Colors for the card, read from the page so it follows the theme and accent color. */
export interface RecapColors {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  accentInk: string;
  amber: string;
  amberSoft: string;
  amberSoftInk: string;
  dashed: string;
}

/** Card size in pixels: 4:5, a good fit for phone screens and photo sharing. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
/** At most this many habits get a row; the rest are counted underneath. */
export const MAX_HABIT_ROWS = 6;

const FONT = "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif";
const PAD = 84;

/** Reads the card colors from CSS custom properties on the page. */
export function readRecapColors(root: Element = document.documentElement): RecapColors {
  const css = getComputedStyle(root);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    bg: v('--bg', '#f5f5ef'),
    surface: v('--surface', '#ffffff'),
    ink: v('--ink', '#1b2420'),
    muted: v('--muted', '#5b6660'),
    line: v('--line', '#dde0d8'),
    accent: v('--accent', '#1e6b5c'),
    onAccent: v('--on-accent', '#ffffff'),
    accentSoft: v('--accent-soft', '#e3efea'),
    accentInk: v('--accent-ink', '#1e5a4e'),
    amber: v('--amber', '#f2b544'),
    amberSoft: v('--amber-soft', '#fbefd3'),
    amberSoftInk: v('--amber-soft-ink', '#5c4106'),
    dashed: v('--dashed', '#9aa197'),
  };
}

/** Draws the whole card. Pure canvas drawing, so it works offline and needs no library. */
export function drawRecapCard(
  ctx: CanvasRenderingContext2D,
  data: RecapData,
  c: RecapColors,
): void {
  const W = CARD_WIDTH;
  const H = CARD_HEIGHT;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  // A soft accent band across the top.
  ctx.fillStyle = c.accentSoft;
  roundRect(ctx, 36, 36, W - 72, 420, 48);
  ctx.fill();

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = c.accentInk;
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText('MY WEEK', PAD, 132);
  ctx.fillStyle = c.muted;
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText(data.range, PAD, 182);

  ctx.fillStyle = c.ink;
  ctx.font = `800 88px ${FONT}`;
  ctx.fillText(`Showed up ${data.daysShowedUp}`, PAD, 292);
  ctx.font = `700 46px ${FONT}`;
  ctx.fillStyle = c.muted;
  ctx.fillText(`of ${data.daysSoFar} ${data.daysSoFar === 1 ? 'day' : 'days'}`, PAD, 352);

  // Chips: done, 2 min, skipped.
  let x = PAD;
  const chipY = 384;
  x = chip(ctx, x, chipY, `${data.full} done`, c.accent, c.onAccent) + 14;
  x = chip(ctx, x, chipY, `${data.mini} as 2 min`, c.amber, '#3d2b04') + 14;
  chip(ctx, x, chipY, `${data.skips} skipped`, c.surface, c.muted);

  // Habit rows with seven dots each.
  let y = 560;
  const rows = data.habits.slice(0, MAX_HABIT_ROWS);
  const dotGap = 54;
  const dotsLeft = W - PAD - dotGap * 6 - 16;
  if (rows.length) {
    ctx.fillStyle = c.muted;
    ctx.font = `700 26px ${FONT}`;
    ctx.textAlign = 'center';
    data.dayLabels.forEach((label, i) => ctx.fillText(label, dotsLeft + 16 + i * dotGap, 512));
    ctx.textAlign = 'left';
  }
  for (const habit of rows) {
    ctx.fillStyle = c.ink;
    ctx.font = `700 38px ${FONT}`;
    ctx.fillText(ellipsize(ctx, habit.name, dotsLeft - PAD - 28), PAD, y + 13);
    habit.days.forEach((status, i) => dot(ctx, dotsLeft + 16 + i * dotGap, y, status, c));
    y += 96;
  }
  if (data.habits.length > rows.length) {
    ctx.fillStyle = c.muted;
    ctx.font = `600 32px ${FONT}`;
    ctx.fillText(`+ ${data.habits.length - rows.length} more`, PAD, y);
    y += 60;
  }
  if (!rows.length) {
    ctx.fillStyle = c.muted;
    ctx.font = `600 36px ${FONT}`;
    ctx.fillText('A fresh week. One small check-in gets it started.', PAD, y);
    y += 60;
  }

  // What went well, if the reflection has it.
  if (data.wentWell) {
    y += 10;
    ctx.fillStyle = c.accentInk;
    ctx.font = `800 30px ${FONT}`;
    ctx.fillText('WHAT WENT WELL', PAD, y);
    ctx.fillStyle = c.ink;
    ctx.font = `600 36px ${FONT}`;
    const lines = wrap(ctx, `“${data.wentWell}”`, W - PAD * 2, 2);
    lines.forEach((line, i) => ctx.fillText(line, PAD, y + 54 + i * 50));
  }

  // Footer.
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, H - 150);
  ctx.lineTo(W - PAD, H - 150);
  ctx.stroke();
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.arc(PAD + 14, H - 84, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.ink;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText('AndThen', PAD + 44, H - 70);
  ctx.fillStyle = c.muted;
  ctx.font = `600 30px ${FONT}`;
  const site = 'andthenhabits.com';
  ctx.fillText(site, W - PAD - ctx.measureText(site).width, H - 72);
}

function chip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  fill: string,
  ink: string,
): number {
  ctx.font = `700 30px ${FONT}`;
  const w = ctx.measureText(text).width + 44;
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, 52, 26);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.fillText(text, x + 22, y + 36);
  return x + w;
}

function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  status: DayStatus,
  c: RecapColors,
): void {
  const r = 18;
  ctx.beginPath();
  ctx.arc(x, y, status === 'rest' || status === 'off' ? 6 : r, 0, Math.PI * 2);
  ctx.setLineDash([]);
  switch (status) {
    case 'full':
      ctx.fillStyle = c.accent;
      ctx.fill();
      break;
    case 'mini':
      ctx.fillStyle = c.amber;
      ctx.fill();
      break;
    case 'skip':
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = c.dashed;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    case 'open':
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    case 'missed':
      ctx.fillStyle = c.line;
      ctx.fill();
      break;
    default:
      ctx.fillStyle = c.line;
      ctx.fill();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Shortens text with an ellipsis to fit `max` pixels. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > max) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

/** Word-wraps text into at most `maxLines` lines, the last one ellipsized. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  max: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= max) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length > maxLines) lines.length = maxLines;
  const used = lines.join(' ').split(/\s+/).length;
  if (used < words.length) lines[lines.length - 1] = ellipsize(ctx, `${lines.at(-1)}…`, max);
  return lines;
}
