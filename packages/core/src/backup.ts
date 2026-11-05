import type { CheckIn, CheckInKind, DayKey, Habit, Reflection, Routine } from './model';
import { cleanNote } from './reflection';
import { parseSchedule } from './schedule';

/** Everything AndThen stores on a device. */
export interface BackupData {
  routines: Routine[];
  habits: Habit[];
  checkIns: CheckIn[];
  /** Weekly reflections. Backups made before reflections existed don't have this list. */
  reflections: Reflection[];
}

/** The JSON file written by "Back up my data". */
export interface BackupFile {
  app: 'andthen';
  /** Format version. Bump it when the shape changes, and teach `parseBackup` to upgrade older files. */
  version: 1;
  /** ISO timestamp of when the backup was made. */
  exportedAt: string;
  data: BackupData;
}

export const BACKUP_VERSION = 1;

export interface BackupSummary {
  routines: number;
  habits: number;
  checkIns: number;
  /** Earliest and latest check-in days, if there are any. */
  firstDay?: DayKey;
  lastDay?: DayKey;
  exportedAt?: string;
}

export type ParsedBackup =
  { ok: true; data: BackupData; summary: BackupSummary } | { ok: false; error: string };

/** Wraps a device's data in a versioned backup file. */
export function createBackup(data: BackupData, now = new Date()): BackupFile {
  return {
    app: 'andthen',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: {
      routines: [...data.routines].sort((a, b) => a.order - b.order),
      habits: [...data.habits].sort(
        (a, b) => a.routineId.localeCompare(b.routineId) || a.order - b.order,
      ),
      checkIns: [...data.checkIns].sort(
        (a, b) => a.date.localeCompare(b.date) || a.habitId.localeCompare(b.habitId),
      ),
      reflections: [...data.reflections].sort((a, b) => a.week.localeCompare(b.week)),
    },
  };
}

/** A file name like `andthen-backup-2026-11-02.json`. */
export function backupFileName(day: DayKey): string {
  return `andthen-backup-${day}.json`;
}

export function summarizeBackup(data: BackupData, exportedAt?: string): BackupSummary {
  const days = data.checkIns.map((c) => c.date).sort();
  return {
    routines: data.routines.length,
    habits: data.habits.length,
    checkIns: data.checkIns.length,
    firstDay: days[0],
    lastDay: days[days.length - 1],
    exportedAt,
  };
}

class BackupError extends Error {}

const DAY_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const KINDS: readonly CheckInKind[] = ['full', 'mini', 'skip'];

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function fail(message: string): never {
  throw new BackupError(message);
}

function text(
  o: Record<string, unknown>,
  key: string,
  where: string,
  required = true,
): string | undefined {
  const v = o[key];
  if (v === undefined && !required) return undefined;
  if (typeof v !== 'string' || (required && !v.trim())) fail(`${where} is missing "${key}".`);
  return v;
}

function day(
  o: Record<string, unknown>,
  key: string,
  where: string,
  required = true,
): DayKey | undefined {
  const v = text(o, key, where, required);
  if (v !== undefined && !DAY_RE.test(v)) fail(`${where} has a bad date in "${key}".`);
  return v;
}

function order(o: Record<string, unknown>, where: string): number {
  const v = o['order'];
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${where} is missing "order".`);
  return v;
}

function list(data: Record<string, unknown>, key: string): unknown[] {
  const v = data[key];
  if (!Array.isArray(v)) fail(`The backup has no "${key}" list.`);
  return v;
}

function readRoutine(raw: unknown, i: number): Routine {
  const where = `Routine ${i + 1}`;
  if (!isObject(raw)) fail(`${where} isn't valid.`);
  const routine: Routine = {
    id: text(raw, 'id', where)!,
    anchor: text(raw, 'anchor', where)!,
    order: order(raw, where),
    createdOn: day(raw, 'createdOn', where)!,
  };
  const name = text(raw, 'name', where, false);
  if (name) routine.name = name;
  const usualTime = text(raw, 'usualTime', where, false);
  if (usualTime) {
    if (!TIME_RE.test(usualTime)) fail(`${where} has a bad time in "usualTime".`);
    routine.usualTime = usualTime;
  }
  const archivedOn = day(raw, 'archivedOn', where, false);
  if (archivedOn) routine.archivedOn = archivedOn;
  return routine;
}

function readHabit(raw: unknown, i: number): Habit {
  const where = `Habit ${i + 1}`;
  if (!isObject(raw)) fail(`${where} isn't valid.`);
  const habit: Habit = {
    id: text(raw, 'id', where)!,
    routineId: text(raw, 'routineId', where)!,
    name: text(raw, 'name', where)!,
    twoMinuteVersion: text(raw, 'twoMinuteVersion', where)!,
    order: order(raw, where),
    createdOn: day(raw, 'createdOn', where)!,
  };
  const makeItEasier = text(raw, 'makeItEasier', where, false)?.trim();
  if (makeItEasier) habit.makeItEasier = makeItEasier;
  const obstacle = text(raw, 'obstacle', where, false)?.trim();
  if (obstacle) habit.obstacle = obstacle;
  const why = text(raw, 'why', where, false)?.trim();
  if (why) habit.why = why;
  // Optional: older backups were made before schedules, and every habit was every day.
  const schedule = parseSchedule(raw['schedule']);
  if (schedule === null) fail(`${where} has a schedule AndThen can't read.`);
  if (schedule) habit.schedule = schedule;
  const archivedOn = day(raw, 'archivedOn', where, false);
  if (archivedOn) habit.archivedOn = archivedOn;
  return habit;
}

function readCheckIn(raw: unknown, i: number): CheckIn {
  const where = `Check-in ${i + 1}`;
  if (!isObject(raw)) fail(`${where} isn't valid.`);
  const kind = raw['kind'];
  if (!KINDS.includes(kind as CheckInKind)) fail(`${where} has an unknown kind.`);
  return {
    habitId: text(raw, 'habitId', where)!,
    date: day(raw, 'date', where)!,
    kind: kind as CheckInKind,
  };
}

function readReflection(raw: unknown, i: number): Reflection {
  const where = `Reflection ${i + 1}`;
  if (!isObject(raw)) fail(`${where} isn't valid.`);
  const reflection: Reflection = {
    week: day(raw, 'week', where)!,
    savedOn: day(raw, 'savedOn', where)!,
  };
  const wentWell = cleanNote(text(raw, 'wentWell', where, false));
  if (wentWell) reflection.wentWell = wentWell;
  const tweak = cleanNote(text(raw, 'tweak', where, false));
  if (tweak) reflection.tweak = tweak;
  return reflection;
}

/** The kinds of record AndThen stores, by the name of their list in a backup. */
export type RecordCollection = 'routines' | 'habits' | 'checkIns' | 'reflections';

export interface RecordTypes {
  routines: Routine;
  habits: Habit;
  checkIns: CheckIn;
  reflections: Reflection;
}

export type ParsedRecord<C extends RecordCollection> =
  { ok: true; record: RecordTypes[C] } | { ok: false; error: string };

const READERS: { [C in RecordCollection]: (raw: unknown, i: number) => RecordTypes[C] } = {
  routines: readRoutine,
  habits: readHabit,
  checkIns: readCheckIn,
  reflections: readReflection,
};

/**
 * Checks one record with the same rules a backup uses, keeping only known fields.
 * Sync uses it on both ends, so a bad record is refused before it's stored.
 */
export function parseRecord<C extends RecordCollection>(
  collection: C,
  raw: unknown,
): ParsedRecord<C> {
  try {
    return { ok: true, record: READERS[collection](raw, 0) };
  } catch (e) {
    if (e instanceof BackupError) return { ok: false, error: e.message.replace(/ 1\b/, '') };
    throw e;
  }
}

function uniqueIds(items: { id: string }[], label: string): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) fail(`Two ${label} share the same id.`);
    ids.add(item.id);
  }
  return ids;
}

/**
 * Reads a backup file's text (or already-parsed JSON) and checks every record.
 * Returns clean data with only known fields, or a friendly reason it can't be used.
 * Nothing is written anywhere: the caller decides whether to restore.
 */
export function parseBackup(input: string | unknown): ParsedBackup {
  try {
    let json: unknown = input;
    if (typeof input === 'string') {
      try {
        json = JSON.parse(input);
      } catch {
        fail("This file isn't an AndThen backup (it isn't valid JSON).");
      }
    }
    if (!isObject(json) || json['app'] !== 'andthen') fail("This file isn't an AndThen backup.");
    const version = json['version'];
    if (typeof version !== 'number') fail("This backup doesn't say which version it is.");
    if (version > BACKUP_VERSION) {
      fail('This backup came from a newer version of AndThen. Update the app, then try again.');
    }
    if (version < 1) fail("This backup's version isn't supported.");
    if (!isObject(json['data'])) fail('This backup has no data in it.');

    const raw = json['data'];
    const routines = list(raw, 'routines').map(readRoutine);
    const habits = list(raw, 'habits').map(readHabit);
    const checkIns = list(raw, 'checkIns').map(readCheckIn);
    // Optional: older backups were made before weekly reflections.
    const reflections =
      raw['reflections'] === undefined ? [] : list(raw, 'reflections').map(readReflection);

    const routineIds = uniqueIds(routines, 'routines');
    const habitIds = uniqueIds(habits, 'habits');
    for (const h of habits) {
      if (!routineIds.has(h.routineId))
        fail(`The habit "${h.name}" belongs to a routine that isn't in the backup.`);
    }
    const seen = new Set<string>();
    for (const c of checkIns) {
      if (!habitIds.has(c.habitId))
        fail(`A check-in on ${c.date} is for a habit that isn't in the backup.`);
      const key = `${c.habitId}|${c.date}`;
      if (seen.has(key)) fail(`A habit has two check-ins on ${c.date}.`);
      seen.add(key);
    }
    const weeks = new Set<DayKey>();
    for (const r of reflections) {
      if (weeks.has(r.week)) fail(`There are two reflections for the week of ${r.week}.`);
      weeks.add(r.week);
    }

    const data: BackupData = { routines, habits, checkIns, reflections };
    const exportedAt = typeof json['exportedAt'] === 'string' ? json['exportedAt'] : undefined;
    return { ok: true, data, summary: summarizeBackup(data, exportedAt) };
  } catch (e) {
    if (e instanceof BackupError) return { ok: false, error: e.message };
    throw e;
  }
}
