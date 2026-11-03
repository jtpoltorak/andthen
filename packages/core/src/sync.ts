import { parseRecord, type BackupData, type RecordCollection, type RecordTypes } from './backup';
import type { CheckIn, Habit, Reflection, Routine } from './model';

/**
 * Optional sync between devices.
 *
 * Every routine, habit, check-in and reflection is a *record* with a stable key.
 * A device keeps a list of the records it changed (its outbox), sends them to
 * the server, and pulls back what other devices changed since its last cursor.
 * When two devices changed the same record, the edit made most recently wins.
 */

export const SYNC_COLLECTIONS: readonly RecordCollection[] = [
  'routines',
  'habits',
  'checkIns',
  'reflections',
];

/** One changed record: its new contents, or a tombstone saying it was removed. */
export type SyncChange = {
  [C in RecordCollection]: {
    collection: C;
    key: string;
    /** When the edit was made, in ms since 1970, by the editing device's clock. */
    updatedAt: number;
    /** The device that made the edit. Breaks ties between equal timestamps. */
    deviceId: string;
    /** True when the record was removed. Then `data` is left out. */
    deleted: boolean;
    data?: RecordTypes[C];
  };
}[RecordCollection];

/** `POST /v1/sync`: push local changes and pull everything newer than `cursor`. */
export interface SyncRequest {
  deviceId: string;
  /** The server cursor from the last successful sync; 0 the first time. */
  cursor: number;
  changes: SyncChange[];
}

export interface SyncResponse {
  /** Store it and send it next time. */
  cursor: number;
  /** Records other devices changed since the request's cursor. */
  changes: SyncChange[];
  /** True when there are more changes to pull: sync again straight away. */
  more: boolean;
}

/** The server refuses edits stamped further ahead than this, so a wrong clock can't win forever. */
export const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

/** How a record of a collection is keyed. Check-ins are one per habit per day. */
export function recordKey(change: Pick<SyncChange, 'collection' | 'data'>): string;
export function recordKey<C extends RecordCollection>(
  collection: C,
  record: RecordTypes[C],
): string;
export function recordKey(
  a: RecordCollection | Pick<SyncChange, 'collection' | 'data'>,
  b?: RecordTypes[RecordCollection],
): string {
  const collection = typeof a === 'string' ? a : a.collection;
  const record = typeof a === 'string' ? b : a.data;
  if (!record) throw new Error('A record is needed to work out its key.');
  switch (collection) {
    case 'routines':
    case 'habits':
      return (record as Routine | Habit).id;
    case 'checkIns':
      return checkInKey((record as CheckIn).habitId, (record as CheckIn).date);
    case 'reflections':
      return (record as Reflection).week;
  }
}

export function checkInKey(habitId: string, date: string): string {
  return `${habitId}|${date}`;
}

/** Splits a check-in key back into its habit and day. */
export function parseCheckInKey(key: string): { habitId: string; date: string } {
  const at = key.lastIndexOf('|');
  return { habitId: key.slice(0, at), date: key.slice(at + 1) };
}

/** True when `a` should win over `b`: the later edit, or on a tie the higher device id. */
export function isNewer(
  a: Pick<SyncChange, 'updatedAt' | 'deviceId'>,
  b: Pick<SyncChange, 'updatedAt' | 'deviceId'>,
): boolean {
  return a.updatedAt > b.updatedAt || (a.updatedAt === b.updatedAt && a.deviceId > b.deviceId);
}

/**
 * Whether a change pulled from the server should be written on this device.
 * It loses only to a local edit of the same record that is still waiting to be
 * sent and was made later.
 */
export function shouldApplyRemote(remote: SyncChange, pendingLocal?: SyncChange): boolean {
  return !pendingLocal || !isNewer(pendingLocal, remote);
}

/** Keeps only the winning change for each record. */
export function latestPerRecord(changes: readonly SyncChange[]): SyncChange[] {
  const byKey = new Map<string, SyncChange>();
  for (const change of changes) {
    const id = `${change.collection}/${change.key}`;
    const seen = byKey.get(id);
    if (!seen || isNewer(change, seen)) byKey.set(id, change);
  }
  return [...byKey.values()];
}

/** A change that saves a record. */
export function putChange<C extends RecordCollection>(
  collection: C,
  record: RecordTypes[C],
  deviceId: string,
  updatedAt: number,
): SyncChange {
  return {
    collection,
    key: recordKey(collection, record),
    updatedAt,
    deviceId,
    deleted: false,
    data: record,
  } as SyncChange;
}

/** A tombstone: the record with this key was removed. */
export function deleteChange(
  collection: RecordCollection,
  key: string,
  deviceId: string,
  updatedAt: number,
): SyncChange {
  return { collection, key, updatedAt, deviceId, deleted: true };
}

/** Every record on a device as changes. The first sync sends these, so it merges rather than overwrites. */
export function snapshotChanges(
  data: BackupData,
  deviceId: string,
  updatedAt: number,
): SyncChange[] {
  return SYNC_COLLECTIONS.flatMap((collection) =>
    (data[collection] as RecordTypes[typeof collection][]).map((record) =>
      putChange(collection, record, deviceId, updatedAt),
    ),
  );
}

/**
 * The changes that turn `before` into `after` when everything is replaced at once
 * (restoring a backup): every record in `after`, plus a tombstone for each
 * record that was in `before` and is gone.
 */
export function replaceChanges(
  before: BackupData,
  after: BackupData,
  deviceId: string,
  updatedAt: number,
): SyncChange[] {
  const puts = snapshotChanges(after, deviceId, updatedAt);
  const kept = new Set(puts.map((c) => `${c.collection}/${c.key}`));
  const gone = snapshotChanges(before, deviceId, updatedAt)
    .filter((c) => !kept.has(`${c.collection}/${c.key}`))
    .map((c) => deleteChange(c.collection, c.key, deviceId, updatedAt));
  return [...puts, ...gone];
}

export type ParsedSyncChange = { ok: true; change: SyncChange } | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Checks a change that arrived over the network. The record inside is checked
 * with the same rules as a backup, and its key must match its contents.
 * Pass `now` to also refuse timestamps too far in the future.
 */
export function parseSyncChange(raw: unknown, now?: number): ParsedSyncChange {
  if (!isObject(raw)) return { ok: false, error: "A change isn't valid." };
  const { collection, key, updatedAt, deviceId, deleted, data } = raw;
  if (!SYNC_COLLECTIONS.includes(collection as RecordCollection))
    return { ok: false, error: 'A change is for an unknown kind of record.' };
  const c = collection as RecordCollection;
  if (typeof key !== 'string' || !key) return { ok: false, error: 'A change has no key.' };
  if (typeof updatedAt !== 'number' || !Number.isSafeInteger(updatedAt) || updatedAt < 0)
    return { ok: false, error: 'A change has a bad timestamp.' };
  if (now !== undefined && updatedAt > now + MAX_CLOCK_SKEW_MS)
    return { ok: false, error: "A change is dated in the future. Check the device's clock." };
  if (typeof deviceId !== 'string' || !deviceId)
    return { ok: false, error: 'A change has no device id.' };
  if (typeof deleted !== 'boolean')
    return { ok: false, error: 'A change has a bad "deleted" flag.' };
  if (deleted) return { ok: true, change: deleteChange(c, key, deviceId, updatedAt) };

  const parsed = parseRecord(c, data);
  if (!parsed.ok) return parsed;
  if (recordKey(c, parsed.record) !== key)
    return { ok: false, error: "A change's key doesn't match its record." };
  return { ok: true, change: putChange(c, parsed.record, deviceId, updatedAt) };
}
