import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { checkInTime, dayAtAGlance, glanceHours, timeOfMinutes } from './glance';
import type { CheckIn, Habit, Routine } from './model';
import { parseBackup } from './backup';

const TODAY = '2026-11-08';
const routine = (id: string, usualTime?: string): Routine => ({
  id,
  anchor: `After ${id}`,
  order: 0,
  createdOn: '2026-01-01',
  ...(usualTime ? { usualTime } : {}),
});
const habit = (id: string, routineId: string): Habit => ({
  id,
  routineId,
  name: id,
  twoMinuteVersion: id,
  order: 0,
  createdOn: '2026-01-01',
});
const at = (habitId: string, daysAgo: number, time: string, kind: CheckIn['kind'] = 'full') => ({
  habitId,
  date: addDays(TODAY, -daysAgo),
  kind,
  at: time,
});

const routines = [routine('morning', '07:00'), routine('evening', '19:00'), routine('loose')];
const habits = [habit('water', 'morning'), habit('stretch', 'morning'), habit('tidy', 'evening')];

describe('dayAtAGlance', () => {
  it('finds the usual start and end from the middle of each day', () => {
    const checkIns: CheckIn[] = [];
    for (let d = 1; d <= 5; d++) {
      checkIns.push(at('water', d, `07:${20 + d}`), at('stretch', d, `08:0${d}`, 'mini'));
    }
    const [morning] = dayAtAGlance(routines, habits, checkIns, TODAY);
    expect(morning.routine.id).toBe('morning');
    expect(morning.planned).toBe(7 * 60);
    expect(morning.usual).toEqual({ start: 7 * 60 + 23, end: 8 * 60 + 3, days: 5 });
    // 7:23 is 23 minutes after 7:00, so it suggests 7:30.
    expect(morning.suggestion).toBe(7 * 60 + 30);
  });

  it('waits for a few days before showing a usual time or a suggestion', () => {
    const two = [at('tidy', 1, '20:10'), at('tidy', 2, '20:20')];
    expect(dayAtAGlance(routines, habits, two, TODAY)[1].usual).toBeUndefined();
    const four = [...two, at('tidy', 3, '20:00'), at('tidy', 4, '20:30')];
    const evening = dayAtAGlance(routines, habits, four, TODAY)[1];
    expect(evening.usual?.start).toBe(20 * 60 + 15);
    expect(evening.suggestion).toBeUndefined();
  });

  it('suggests nothing when the plan is close enough', () => {
    const checkIns = [1, 2, 3, 4, 5].map((d) => at('tidy', d, '19:10'));
    expect(dayAtAGlance(routines, habits, checkIns, TODAY)[1].suggestion).toBeUndefined();
  });

  it("keeps today's check-ins apart, and ignores skips, untimed and old ones", () => {
    const checkIns: CheckIn[] = [
      at('water', 0, '07:40'),
      at('stretch', 0, '07:31', 'mini'),
      at('tidy', 0, '19:00', 'skip'),
      { habitId: 'water', date: addDays(TODAY, -1), kind: 'full' },
      at('water', 40, '06:00'),
    ];
    const [morning, evening] = dayAtAGlance(routines, habits, checkIns, TODAY);
    expect(morning.today).toEqual([
      { at: 7 * 60 + 31, kind: 'mini' },
      { at: 7 * 60 + 40, kind: 'full' },
    ]);
    expect(morning.usual).toBeUndefined();
    expect(evening.today).toEqual([]);
  });

  it('leaves out routines with no time at all, and archived ones', () => {
    const rows = dayAtAGlance(
      [...routines, { ...routine('old', '09:00'), archivedOn: '2026-10-01' }],
      habits,
      [],
      TODAY,
    );
    expect(rows.map((r) => r.routine.id)).toEqual(['morning', 'evening']);
  });
});

describe('glanceHours', () => {
  it('covers 6 am to 10 pm, wider when needed', () => {
    const rows = dayAtAGlance(routines, habits, [], TODAY);
    expect(glanceHours(rows)).toEqual({ from: 6, to: 22 });
    const late = dayAtAGlance(routines, habits, [at('tidy', 0, '23:15')], TODAY);
    expect(glanceHours(late)).toEqual({ from: 6, to: 24 });
    const early = dayAtAGlance([routine('morning', '05:30')], habits, [], TODAY);
    expect(glanceHours(early).from).toBe(5);
  });
});

describe('check-in times', () => {
  it('formats minutes and dates as HH:mm', () => {
    expect(timeOfMinutes(7 * 60 + 5)).toBe('07:05');
    expect(checkInTime(new Date(2026, 10, 8, 21, 9))).toBe('21:09');
  });

  it('keeps a valid time from a backup and drops a bad one', () => {
    const file = (time: unknown) =>
      JSON.stringify({
        app: 'andthen',
        version: 1,
        exportedAt: '2026-11-08T12:00:00Z',
        data: {
          routines: [routine('morning')],
          habits: [habit('water', 'morning')],
          checkIns: [{ habitId: 'water', date: TODAY, kind: 'full', at: time }],
        },
      });
    const good = parseBackup(file('7:05'));
    const bad = parseBackup(file('25:00'));
    expect(good.ok && good.data.checkIns[0].at).toBe('07:05');
    expect(bad.ok && bad.data.checkIns[0].at).toBeUndefined();
  });
});
