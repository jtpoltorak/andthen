import { describe, expect, it } from 'vitest';
import { indexCheckIns } from './chain';
import type { CheckIn, Habit, Routine } from './model';
import { addMonths, dayLevel, yearView } from './year';

// A Sunday. Weeks start on Monday.
const TODAY = '2026-11-08';

const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'am',
  anchor: 'After I pour my coffee',
  order: 0,
  createdOn: '2026-10-01',
  ...over,
});

const habit = (id: string, over: Partial<Habit> = {}): Habit => ({
  id,
  routineId: 'am',
  name: id,
  twoMinuteVersion: 'a little',
  order: 0,
  createdOn: '2026-10-01',
  ...over,
});

const check = (habitId: string, date: string, kind: CheckIn['kind'] = 'full'): CheckIn => ({
  habitId,
  date,
  kind,
});

const view = (habits: Habit[], checkIns: CheckIn[], r = routine()) =>
  yearView([r], habits, indexCheckIns(checkIns), TODAY);

describe('addMonths', () => {
  it('steps across years both ways', () => {
    expect(addMonths('2026-11-08', -11)).toBe('2025-12-01');
    expect(addMonths('2026-11-30', 2)).toBe('2027-01-01');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01');
  });
});

describe('dayLevel', () => {
  it('says none, some, most or all', () => {
    expect(dayLevel(0, 3)).toBe(0);
    expect(dayLevel(1, 3)).toBe(1);
    expect(dayLevel(2, 4)).toBe(2);
    expect(dayLevel(3, 3)).toBe(3);
  });
});

describe('yearView', () => {
  it('gives twelve months ending this one, each lined up under its weekday', () => {
    const v = view([habit('water')], []);
    expect(v.months).toHaveLength(12);
    expect(v.months[0].first).toBe('2025-12-01');
    expect(v.months[11].first).toBe('2026-11-01');
    // Nov 1, 2026 is a Sunday: six blanks before it when weeks start on Monday.
    expect(v.months[11].lead).toBe(6);
    expect(v.months[11].days).toHaveLength(30);
  });

  it('shades each day by how much was done, and never counts skips', () => {
    const v = view(
      [habit('water'), habit('stretch')],
      [
        check('water', '2026-11-02'),
        check('stretch', '2026-11-02', 'mini'),
        check('water', '2026-11-03'),
        check('water', '2026-11-04'),
        check('stretch', '2026-11-04', 'skip'),
      ],
    );
    const nov = v.months[11].days;
    expect(nov[1]).toMatchObject({ kind: 'day', done: 2, asked: 2, level: 3 });
    expect(nov[2]).toMatchObject({ kind: 'day', done: 1, asked: 2, level: 2 });
    // Water done, stretch skipped: everything asked was done.
    expect(nov[3]).toMatchObject({ kind: 'day', done: 1, asked: 1, level: 3 });
    expect(nov[4]).toMatchObject({ kind: 'day', done: 0, level: 0 });
    expect(v.showedUp).toBe(3);
    expect(v.checkIns).toBe(4);
    expect(v.bestMonth).toBe('2026-11-01');
  });

  it('leaves days before the habit, rest days, today and the future unshaded', () => {
    const paused = routine({ pauses: [{ from: '2026-11-05', until: '2026-11-07' }] });
    const v = view([habit('water')], [], paused);
    const nov = v.months[11].days;
    expect(v.months[9].days[0].kind).toBe('none'); // Sep 1, before it started.
    expect(nov[4].kind).toBe('rest'); // Paused Nov 5.
    expect(nov[7].kind).toBe('rest'); // Today, nothing done yet.
    expect(nov[8].kind).toBe('future');
    expect(v.bestMonth).toBeUndefined();
  });
});
