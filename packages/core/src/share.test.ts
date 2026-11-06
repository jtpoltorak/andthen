import { describe, expect, it } from 'vitest';
import type { Habit, Routine } from './model';
import { decodeSharedRoutine, encodeSharedRoutine, toSharedRoutine } from './share';

const routine: Routine = {
  id: 'r',
  name: 'Morning',
  anchor: 'After I pour my coffee ☕',
  usualTime: '07:30',
  order: 0,
  createdOn: '2026-11-01',
};
const habit = (over: Partial<Habit>): Habit => ({
  id: 'h',
  routineId: 'r',
  name: 'Stretch',
  twoMinuteVersion: 'Touch my toes',
  order: 0,
  createdOn: '2026-11-01',
  ...over,
});

describe('share a routine', () => {
  it('keeps the chain, and leaves anything personal behind', () => {
    const shared = toSharedRoutine(routine, [
      habit({ id: 'b', name: 'Read', order: 1, schedule: { kind: 'days', days: [1, 3, 5] } }),
      habit({ id: 'a', order: 0, makeItEasier: 'Mat by the bed', why: 'My back' }),
    ]);
    expect(shared).toEqual({
      name: 'Morning',
      anchor: 'After I pour my coffee ☕',
      usualTime: '07:30',
      habits: [
        { name: 'Stretch', twoMinuteVersion: 'Touch my toes', makeItEasier: 'Mat by the bed' },
        {
          name: 'Read',
          twoMinuteVersion: 'Touch my toes',
          schedule: { kind: 'days', days: [1, 3, 5] },
        },
      ],
    });
  });

  it('round-trips through a URL-safe code', () => {
    const shared = toSharedRoutine(routine, [habit({ makeItEasier: 'Ünïcode ✓' })]);
    const code = encodeSharedRoutine(shared);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeSharedRoutine(code)).toEqual(shared);
  });

  it('carries the routine icon, and ignores one it does not know', () => {
    const shared = toSharedRoutine({ ...routine, icon: 'moon' }, [habit({})]);
    expect(shared.icon).toBe('moon');
    expect(decodeSharedRoutine(encodeSharedRoutine(shared))?.icon).toBe('moon');
    const unknown = encodeSharedRoutine({ ...shared, icon: 'rocket' as never });
    const decoded = decodeSharedRoutine(unknown);
    expect(decoded).not.toBeNull();
    expect(decoded && 'icon' in decoded).toBe(false);
  });

  it('turns away codes that are broken, empty or from a newer version', () => {
    const enc = (o: unknown) =>
      btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeSharedRoutine('')).toBeNull();
    expect(decodeSharedRoutine('%%%')).toBeNull();
    expect(decodeSharedRoutine(enc({ v: 2, a: 'x', h: [{ n: 'a', m: 'b' }] }))).toBeNull();
    expect(decodeSharedRoutine(enc({ v: 1, a: 'x', h: [] }))).toBeNull();
    expect(decodeSharedRoutine(enc({ v: 1, a: ' ', h: [{ n: 'a', m: 'b' }] }))).toBeNull();
    expect(decodeSharedRoutine(enc({ v: 1, a: 'x', h: [{ n: 'a' }] }))).toBeNull();
    expect(
      decodeSharedRoutine(enc({ v: 1, a: 'x', h: [{ n: 'a', m: 'b', s: { kind: 'x' } }] })),
    ).toBeNull();
    // A bad time is simply dropped.
    expect(decodeSharedRoutine(enc({ v: 1, a: 'x', t: '99:99', h: [{ n: 'a', m: 'b' }] }))).toEqual(
      { anchor: 'x', habits: [{ name: 'a', twoMinuteVersion: 'b' }] },
    );
  });
});
