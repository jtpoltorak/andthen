import { isRoutineIcon, type Habit, type Routine, type RoutineIcon, type Schedule } from './model';
import { parseSchedule } from './schedule';

/** One habit in a shared routine. Only what's needed to set it up, nothing personal. */
export interface SharedHabit {
  name: string;
  twoMinuteVersion: string;
  makeItEasier?: string;
  schedule?: Schedule;
}

/**
 * A routine as it travels in a share link: the anchor and the chain of habits.
 * No check-ins, journal notes, reflections or "why" lines go along.
 */
export interface SharedRoutine {
  name?: string;
  anchor: string;
  usualTime?: string;
  icon?: RoutineIcon;
  habits: SharedHabit[];
}

/** A chain longer than this isn't a chain anyone should be sent. */
export const MAX_SHARED_HABITS = 12;
const MAX_TEXT = 200;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** What's shared from a routine and its current habits (in chain order). */
export function toSharedRoutine(routine: Routine, habits: readonly Habit[]): SharedRoutine {
  const shared: SharedRoutine = {
    anchor: routine.anchor,
    habits: [...habits]
      .sort((a, b) => a.order - b.order)
      .slice(0, MAX_SHARED_HABITS)
      .map((h) => ({
        name: h.name,
        twoMinuteVersion: h.twoMinuteVersion,
        ...(h.makeItEasier ? { makeItEasier: h.makeItEasier } : {}),
        ...(h.schedule ? { schedule: h.schedule } : {}),
      })),
  };
  if (routine.name) shared.name = routine.name;
  if (routine.usualTime) shared.usualTime = routine.usualTime;
  if (routine.icon) shared.icon = routine.icon;
  return shared;
}

/*
 * The link carries the routine as compact JSON (short keys, version 1), in
 * base64url, after the # so it never reaches a server: the page reads it locally.
 */

interface Wire {
  v: 1;
  n?: string;
  a: string;
  t?: string;
  i?: string;
  h: { n: string; m: string; e?: string; s?: Schedule }[];
}

export function encodeSharedRoutine(shared: SharedRoutine): string {
  const wire: Wire = {
    v: 1,
    ...(shared.name ? { n: shared.name } : {}),
    a: shared.anchor,
    ...(shared.usualTime ? { t: shared.usualTime } : {}),
    ...(shared.icon ? { i: shared.icon } : {}),
    h: shared.habits.map((h) => ({
      n: h.name,
      m: h.twoMinuteVersion,
      ...(h.makeItEasier ? { e: h.makeItEasier } : {}),
      ...(h.schedule ? { s: h.schedule } : {}),
    })),
  };
  return toBase64Url(JSON.stringify(wire));
}

/** Reads a share code. Anything malformed, too big or from a newer version gives null. */
export function decodeSharedRoutine(code: string): SharedRoutine | null {
  if (!code || code.length > 8000) return null;
  let wire: unknown;
  try {
    wire = JSON.parse(fromBase64Url(code));
  } catch {
    return null;
  }
  if (!isObject(wire) || wire['v'] !== 1) return null;
  const anchor = clean(wire['a']);
  const list = wire['h'];
  if (!anchor || !Array.isArray(list) || list.length < 1 || list.length > MAX_SHARED_HABITS) {
    return null;
  }
  const habits: SharedHabit[] = [];
  for (const raw of list) {
    if (!isObject(raw)) return null;
    const name = clean(raw['n']);
    const twoMinuteVersion = clean(raw['m']);
    if (!name || !twoMinuteVersion) return null;
    const habit: SharedHabit = { name, twoMinuteVersion };
    const easier = clean(raw['e']);
    if (easier) habit.makeItEasier = easier;
    const schedule = parseSchedule(raw['s']);
    if (schedule === null) return null;
    if (schedule) habit.schedule = schedule;
    habits.push(habit);
  }
  const shared: SharedRoutine = { anchor, habits };
  const name = clean(wire['n']);
  if (name) shared.name = name;
  const time = wire['t'];
  if (typeof time === 'string' && TIME_RE.test(time)) shared.usualTime = time;
  if (isRoutineIcon(wire['i'])) shared.icon = wire['i'];
  return shared;
}

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT).trim();
  return text || undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
