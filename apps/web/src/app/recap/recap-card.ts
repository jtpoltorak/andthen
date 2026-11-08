import type { DayStatus, GardenStage } from '@andthen/core';
import { drawPlant } from '../shared/plant-art';

/** What the weekly recap card shows. Built by the page, drawn by `drawRecapCard`. */
export interface RecapData {
  /** "Nov 2 – Nov 8" */
  range: string;
  daysShowedUp: number;
  daysSoFar: number;
  full: number;
  mini: number;
  skips: number;
  /** Each habit's week. `name` is left out when the person hides habit names. */
  habits: { name?: string; days: DayStatus[] }[];
  /** The garden: one plant per routine, labelled with its name or, when names are hidden, its stage. */
  plants?: { stage: GardenStage; resting: boolean; label: string }[];
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

/** Post is 4:5, for a feed post or a message. Story is 9:16, full screen on Instagram and the like. */
export type CardFormat = 'post' | 'story';

export const CARD_SIZES: Record<CardFormat, { width: number; height: number }> = {
  post: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};
/** At most this many habits get a row; the rest are counted underneath. */
export const MAX_HABIT_ROWS = 6;
const ROW_H = 96;
const MORE_H = 60;
const GARDEN_H = 300;
const WENT_WELL_H = 160;
/** Stories put the profile bar on top and the reply box at the bottom: keep content clear of both. */
const STORY_SAFE = 250;

const FONT = "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif";
const PAD = 84;
const BAND_H = 420;

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
  format: CardFormat = 'post',
): void {
  const { width: W, height: H } = CARD_SIZES[format];
  const story = format === 'story';
  const bandTop = story ? STORY_SAFE : 36;
  const footerY = story ? H - STORY_SAFE - 40 : H - 150;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  // A soft accent band across the top.
  ctx.fillStyle = c.accentSoft;
  roundRect(ctx, 36, bandTop, W - 72, BAND_H, 48);
  ctx.fill();

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = c.accentInk;
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText('MY WEEK', PAD, bandTop + 96);
  ctx.fillStyle = c.muted;
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText(data.range, PAD, bandTop + 146);

  ctx.fillStyle = c.ink;
  ctx.font = `800 88px ${FONT}`;
  ctx.fillText(`Showed up ${data.daysShowedUp}`, PAD, bandTop + 256);
  ctx.font = `700 46px ${FONT}`;
  ctx.fillStyle = c.muted;
  ctx.fillText(`of ${data.daysSoFar} ${data.daysSoFar === 1 ? 'day' : 'days'}`, PAD, bandTop + 316);

  // Chips: done, 2 min, skipped.
  let x = PAD;
  const chipY = bandTop + 348;
  x = chip(ctx, x, chipY, `${data.full} done`, c.accent, c.onAccent) + 14;
  x = chip(ctx, x, chipY, `${data.mini} as 2 min`, c.amber, '#3d2b04') + 14;
  chip(ctx, x, chipY, `${data.skips} skipped`, c.surface, c.muted);

  // On a post, a few plants from the garden sit in the band's top corner.
  const plants = data.plants ?? [];
  if (!story) {
    const shown = plants.slice(0, 3);
    const size = 150;
    shown.forEach((p, i) => {
      const px = W - PAD + 20 - (shown.length - i) * size;
      drawPlant(ctx, p.stage, px, bandTop + 4, size, p.resting);
    });
  }

  // Habit rows with seven dots each. Without names, the dots sit in the middle.
  let y = bandTop + BAND_H + 104;
  const rows = data.habits.slice(0, fitRows(data, story, footerY - 30 - y));
  const named = rows.some((h) => h.name);
  const dotGap = 54;
  const dotsLeft = named ? W - PAD - dotGap * 6 - 16 : W / 2 - dotGap * 3 - 16;
  if (rows.length) {
    ctx.fillStyle = c.muted;
    ctx.font = `700 26px ${FONT}`;
    ctx.textAlign = 'center';
    data.dayLabels.forEach((label, i) => ctx.fillText(label, dotsLeft + 16 + i * dotGap, y - 48));
    ctx.textAlign = 'left';
  }
  for (const habit of rows) {
    if (habit.name) {
      ctx.fillStyle = c.ink;
      ctx.font = `700 38px ${FONT}`;
      ctx.fillText(ellipsize(ctx, habit.name, dotsLeft - PAD - 28), PAD, y + 13);
    }
    habit.days.forEach((status, i) => dot(ctx, dotsLeft + 16 + i * dotGap, y, status, c));
    y += ROW_H;
  }
  if (data.habits.length > rows.length) {
    ctx.fillStyle = c.muted;
    ctx.font = `600 32px ${FONT}`;
    const more = `+ ${data.habits.length - rows.length} more`;
    if (named) ctx.fillText(more, PAD, y);
    else {
      ctx.textAlign = 'center';
      ctx.fillText(more, W / 2, y);
      ctx.textAlign = 'left';
    }
    y += MORE_H;
  }
  if (!rows.length) {
    ctx.fillStyle = c.muted;
    ctx.font = `600 36px ${FONT}`;
    ctx.fillText('A fresh week. One small check-in gets it started.', PAD, y);
    y += 60;
  }

  // On a story, the whole garden gets a row of its own.
  if (story && plants.length) {
    const shown = plants.slice(0, 4);
    y += 10;
    ctx.fillStyle = c.accentInk;
    ctx.font = `800 30px ${FONT}`;
    ctx.fillText('MY GARDEN', PAD, y);
    const slot = (W - PAD * 2) / shown.length;
    const size = Math.min(170, slot - 20);
    ctx.textAlign = 'center';
    shown.forEach((p, i) => {
      const cx = PAD + slot * i + slot / 2;
      drawPlant(ctx, p.stage, cx - size / 2, y + 20, size, p.resting);
      ctx.fillStyle = c.ink;
      ctx.font = `700 30px ${FONT}`;
      ctx.fillText(ellipsize(ctx, p.label, slot - 16), cx, y + size + 62);
    });
    ctx.textAlign = 'left';
    y += size + 120;
  }

  // What went well, if the reflection has it and there's room.
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
  ctx.moveTo(PAD, footerY);
  ctx.lineTo(W - PAD, footerY);
  ctx.stroke();
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.arc(PAD + 14, footerY + 66, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.ink;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText('AndThen', PAD + 44, footerY + 80);
  ctx.fillStyle = c.muted;
  ctx.font = `600 30px ${FONT}`;
  const site = 'andthenhabits.com';
  ctx.fillText(site, W - PAD - ctx.measureText(site).width, footerY + 78);
}

/**
 * How many habit rows fit in `space` pixels, leaving room for the story's garden and
 * "what went well". Habits that don't fit are counted as "+ N more".
 */
export function fitRows(data: RecapData, story: boolean, space: number): number {
  let reserve = data.wentWell ? WENT_WELL_H : 0;
  if (story && data.plants?.length) reserve += GARDEN_H;
  let rows = Math.min(data.habits.length, MAX_HABIT_ROWS);
  const need = (n: number) => n * ROW_H + (data.habits.length > n ? MORE_H : 0) + reserve;
  while (rows > 1 && need(rows) > space) rows--;
  return rows;
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
