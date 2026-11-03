import { describe, expect, it } from 'vitest';
import type { BackupData } from './backup';
import { parseRecord } from './backup';
import {
  MAX_CLOCK_SKEW_MS,
  deleteChange,
  isNewer,
  latestPerRecord,
  parseCheckInKey,
  parseSyncChange,
  putChange,
  recordKey,
  replaceChanges,
  shouldApplyRemote,
  snapshotChanges,
  type SyncChange,
} from './sync';

const data = (): BackupData => ({
  routines: [{ id: 'r1', anchor: 'After coffee', order: 0, createdOn: '2026-11-01' }],
  habits: [
    {
      id: 'h1',
      routineId: 'r1',
      name: 'Stretch',
      twoMinuteVersion: 'Touch toes',
      order: 0,
      createdOn: '2026-11-01',
    },
  ],
  checkIns: [{ habitId: 'h1', date: '2026-11-02', kind: 'full' }],
  reflections: [{ week: '2026-10-27', wentWell: 'Mornings', savedOn: '2026-11-02' }],
});

const checkIn = (kind: 'full' | 'mini' | 'skip', updatedAt: number, deviceId = 'a'): SyncChange =>
  putChange('checkIns', { habitId: 'h1', date: '2026-11-03', kind }, deviceId, updatedAt);

describe('record keys', () => {
  it('uses ids, habit plus day, and week', () => {
    const d = data();
    expect(recordKey('routines', d.routines[0])).toBe('r1');
    expect(recordKey('habits', d.habits[0])).toBe('h1');
    expect(recordKey('checkIns', d.checkIns[0])).toBe('h1|2026-11-02');
    expect(recordKey('reflections', d.reflections[0])).toBe('2026-10-27');
  });

  it('splits a check-in key back apart', () => {
    expect(parseCheckInKey('h1|2026-11-02')).toEqual({ habitId: 'h1', date: '2026-11-02' });
  });
});

describe('who wins', () => {
  it('the later edit wins', () => {
    expect(isNewer(checkIn('full', 2), checkIn('skip', 1))).toBe(true);
    expect(isNewer(checkIn('full', 1), checkIn('skip', 2))).toBe(false);
  });

  it('breaks a tie by device id, the same way on every device', () => {
    expect(isNewer(checkIn('full', 5, 'b'), checkIn('skip', 5, 'a'))).toBe(true);
    expect(isNewer(checkIn('skip', 5, 'a'), checkIn('full', 5, 'b'))).toBe(false);
  });

  it('applies a remote change unless a later local edit is still waiting', () => {
    const remote = checkIn('skip', 10, 'laptop');
    expect(shouldApplyRemote(remote)).toBe(true);
    expect(shouldApplyRemote(remote, checkIn('full', 9, 'phone'))).toBe(true);
    expect(shouldApplyRemote(remote, checkIn('full', 11, 'phone'))).toBe(false);
  });

  it('keeps only the winner per record', () => {
    const other = putChange('habits', data().habits[0], 'a', 1);
    const winners = latestPerRecord([
      checkIn('full', 1),
      other,
      checkIn('mini', 3),
      checkIn('skip', 2),
    ]);
    expect(winners).toHaveLength(2);
    expect(winners.find((c) => c.collection === 'checkIns')?.data).toMatchObject({ kind: 'mini' });
  });
});

describe('whole-device changes', () => {
  it('turns every record into a change', () => {
    const changes = snapshotChanges(data(), 'a', 7);
    expect(changes.map((c) => `${c.collection}/${c.key}`)).toEqual([
      'routines/r1',
      'habits/h1',
      'checkIns/h1|2026-11-02',
      'reflections/2026-10-27',
    ]);
    expect(changes.every((c) => c.updatedAt === 7 && !c.deleted)).toBe(true);
  });

  it('adds tombstones for records a restore removes', () => {
    const after = { ...data(), checkIns: [], reflections: [] };
    const changes = replaceChanges(data(), after, 'a', 7);
    expect(changes.filter((c) => c.deleted).map((c) => `${c.collection}/${c.key}`)).toEqual([
      'checkIns/h1|2026-11-02',
      'reflections/2026-10-27',
    ]);
    expect(changes.filter((c) => !c.deleted)).toHaveLength(2);
  });
});

describe('parseSyncChange', () => {
  const now = Date.UTC(2026, 10, 3);

  it('accepts a good change and drops unknown fields', () => {
    const raw = {
      ...checkIn('mini', now),
      data: { habitId: 'h1', date: '2026-11-03', kind: 'mini', x: 1 },
    };
    const parsed = parseSyncChange(raw, now);
    expect(parsed).toEqual({ ok: true, change: checkIn('mini', now) });
  });

  it('accepts a tombstone without data', () => {
    expect(parseSyncChange(deleteChange('checkIns', 'h1|2026-11-03', 'a', now), now).ok).toBe(true);
  });

  it('refuses a key that does not match the record', () => {
    const parsed = parseSyncChange({ ...checkIn('full', now), key: 'h2|2026-11-03' }, now);
    expect(parsed).toEqual({ ok: false, error: "A change's key doesn't match its record." });
  });

  it('refuses a bad record, an unknown collection and a far-future timestamp', () => {
    expect(parseSyncChange({ ...checkIn('full', now), data: { habitId: 'h1' } }, now).ok).toBe(
      false,
    );
    expect(parseSyncChange({ ...checkIn('full', now), collection: 'notes' }, now).ok).toBe(false);
    expect(parseSyncChange(checkIn('full', now + MAX_CLOCK_SKEW_MS + 1), now).ok).toBe(false);
    expect(parseSyncChange(checkIn('full', now + MAX_CLOCK_SKEW_MS), now).ok).toBe(true);
  });
});

describe('parseRecord', () => {
  it('uses the backup rules without the list position in the message', () => {
    expect(parseRecord('routines', { id: 'r1' })).toEqual({
      ok: false,
      error: 'Routine is missing "anchor".',
    });
  });
});
