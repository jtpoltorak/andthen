import { describe, expect, it } from 'vitest';
import { indexCheckIns, buildChain, nudgeFor } from './chain';
import { dayStatus, habitStats } from './history';
import type { CheckIn, Habit, Routine } from './model';
import { addPause, endPause, isPausedOn, normalizePauses } from './pause';
import { createBackup, parseBackup } from './backup';
import { habitWeeks, reflectionWeek } from './reflection';

const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'r1',
  anchor: 'After coffee',
  order: 0,
  createdOn: '2026-10-01',
  ...over,
});
const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  routineId: 'r1',
  name: 'Stretch',
  twoMinuteVersion: 'Touch toes',
  order: 0,
  createdOn: '2026-10-01',
  ...over,
});
const done = (date: string): CheckIn => ({ habitId: 'h1', date, kind: 'full' });

describe('pauses', () => {
  it('pauses from today for a number of days, or until resumed', () => {
    expect(addPause(routine(), '2026-11-05', 7)).toEqual([
      { from: '2026-11-05', until: '2026-11-12' },
    ]);
    expect(addPause(routine(), '2026-11-05')).toEqual([{ from: '2026-11-05' }]);
    const r = routine({ pauses: addPause(routine(), '2026-11-05', 3) });
    expect(isPausedOn(r, '2026-11-04')).toBe(false);
    expect(isPausedOn(r, '2026-11-05')).toBe(true);
    expect(isPausedOn(r, '2026-11-07')).toBe(true);
    expect(isPausedOn(r, '2026-11-08')).toBe(false);
  });

  it('resuming ends the pause today, or drops one that started today', () => {
    const older = routine({ pauses: [{ from: '2026-11-01' }] });
    expect(endPause(older, '2026-11-05')).toEqual([{ from: '2026-11-01', until: '2026-11-05' }]);
    const fresh = routine({ pauses: [{ from: '2026-11-05' }] });
    expect(endPause(fresh, '2026-11-05')).toEqual([]);
    const past = routine({ pauses: [{ from: '2026-10-01', until: '2026-10-03' }] });
    expect(endPause(past, '2026-11-05')).toEqual(past.pauses);
  });

  it('drops empty or backwards ranges', () => {
    expect(
      normalizePauses([
        { from: '2026-11-05', until: '2026-11-05' },
        { from: '2026-11-02', until: '2026-11-04' },
      ]),
    ).toEqual([{ from: '2026-11-02', until: '2026-11-04' }]);
  });

  it('turns paused days into rest days: no misses, no nudge, nothing on Today', () => {
    const r = routine({ pauses: [{ from: '2026-11-02', until: '2026-11-05' }] });
    const h = habit();
    const checkIns = indexCheckIns([done('2026-10-30'), done('2026-10-31'), done('2026-11-01')]);
    expect(dayStatus(h, r, checkIns, '2026-11-03', '2026-11-05')).toBe('rest');
    // Without the pause, 3 missed days would end the chain.
    const stats = habitStats(h, r, checkIns, '2026-11-05');
    expect(stats.currentChain).toBe(3);
    expect(stats.atRisk).toBe(false);
    expect(nudgeFor(h, r, checkIns, '2026-11-05')).toBeUndefined();

    const pausedToday = routine({ pauses: [{ from: '2026-11-05' }] });
    const chain = buildChain(pausedToday, [h], checkIns, '2026-11-05');
    expect(chain.total).toBe(0);
    expect(chain.paused).toEqual({ from: '2026-11-05' });
  });

  it("lowers a weekly habit's count for a paused week", () => {
    // Paused Monday to Friday; 3 times a week; done once on Saturday.
    const r = routine({ pauses: [{ from: '2026-11-02', until: '2026-11-07' }] });
    const h = habit({ schedule: { kind: 'weekly', times: 3 } });
    const checkIns = indexCheckIns([done('2026-11-07')]);
    const [week] = habitWeeks([r], [h], checkIns, reflectionWeek('2026-11-08'), '2026-11-08');
    expect(week.target).toBe(2);
  });

  it('round-trips through a backup, and older backups have none', () => {
    const data = {
      routines: [
        routine({ pauses: [{ from: '2026-11-01', until: '2026-11-04' }, { from: '2026-11-05' }] }),
      ],
      habits: [habit()],
      checkIns: [],
      reflections: [],
    };
    const result = parseBackup(JSON.stringify(createBackup(data)));
    expect(result.ok && result.data.routines[0].pauses).toEqual(data.routines[0].pauses);
    const old = parseBackup(JSON.stringify(createBackup({ ...data, routines: [routine()] })));
    expect(old.ok && 'pauses' in old.data.routines[0]).toBe(false);
  });
});
