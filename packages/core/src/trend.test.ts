import { describe, expect, it } from 'vitest';
import { indexCheckIns } from './chain';
import { addDays } from './dates';
import type { CheckIn, CheckInKind, Habit, Routine } from './model';
import { habitTrend } from './trend';

// 2026-11-06 is a Friday. Weeks start on Monday: this week began 2026-11-02.
const TODAY = '2026-11-06';
// Eight weeks of Mondays ago.
const START = '2026-09-14';

const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'morning',
  anchor: 'After I pour my coffee',
  order: 0,
  createdOn: START,
  ...over,
});

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'water',
  routineId: 'morning',
  name: 'Drink water',
  twoMinuteVersion: 'One sip',
  order: 0,
  createdOn: START,
  ...over,
});

/** F = full, M = mini, S = skip, . = nothing; one character per day from `from`. */
function pattern(text: string, from = START): CheckIn[] {
  const kinds: Record<string, CheckInKind> = { F: 'full', M: 'mini', S: 'skip' };
  return [...text.replace(/ /g, '')].flatMap((ch, i) =>
    kinds[ch] ? [{ habitId: 'water', date: addDays(from, i), kind: kinds[ch] }] : [],
  );
}

const trendOf = (text: string, h = habit(), r = routine()) =>
  habitTrend(h, r, indexCheckIns(pattern(text)), TODAY);

describe('habitTrend', () => {
  it('gives one share per week, oldest first, ending this week', () => {
    const t = trendOf('FFFFFFF FFF.... ....... MMMMMMM FFFFFFF FFFFFFF FFFFFFF FFFF');
    expect(t.weeks.map((w) => w.week)).toEqual([
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
      '2026-11-02',
    ]);
    expect(t.weeks.map((w) => w.share)).toEqual([1, 3 / 7, 0, 1, 1, 1, 1, 1]);
  });

  it("doesn't count skips, rest days or today while it's open", () => {
    // This week: Mon done, Tue skipped, Wed missed, Thu done, Fri (today) open.
    const t = trendOf('FFFFFFF '.repeat(7) + 'FS.F');
    expect(t.weeks[7].share).toBeCloseTo(2 / 3);
    const weekdays = habit({ schedule: { kind: 'days', days: [1, 2, 3, 4, 5] } });
    // Weekends are rest days, so a perfect weekday run is a full week.
    const w = habitTrend(weekdays, routine(), indexCheckIns(pattern('FFFFF.. '.repeat(7))), TODAY);
    expect(w.weeks[0].share).toBe(1);
  });

  it('leaves weeks before the habit started empty', () => {
    const late = habit({ createdOn: '2026-10-26' });
    const t = habitTrend(late, routine(), indexCheckIns(pattern('FFFF', '2026-10-26')), TODAY);
    expect(t.weeks.slice(0, 6).every((w) => w.share === undefined)).toBe(true);
    expect(t.weeks[6].share).toBeCloseTo(4 / 7);
  });

  it('scores a weekly habit by its count, and waits for this week to reach it', () => {
    const thrice = habit({ schedule: { kind: 'weekly', times: 3 } });
    const t = habitTrend(
      thrice,
      routine(),
      indexCheckIns(pattern('F.F.F.. F...... ' + 'FFFFF.. '.repeat(5) + 'F')),
      TODAY,
    );
    expect(t.weeks[0].share).toBe(1);
    expect(t.weeks[1].share).toBeCloseTo(1 / 3);
    expect(t.weeks[2].share).toBe(1); // Capped: 5 of 3 is still a full week.
    expect(t.weeks[7].share).toBeUndefined(); // 1 of 3 so far, still open.
  });

  it('points up, down or steady once there are three weeks to compare', () => {
    expect(trendOf('.......'.repeat(4) + 'FFFFFFF'.repeat(3) + 'FFFF').direction).toBe('up');
    expect(trendOf('FFFFFFF'.repeat(5) + '.......'.repeat(2) + 'F...').direction).toBe('down');
    expect(trendOf('FFFFF..'.repeat(7) + 'FFFF').direction).toBe('steady');
    // One good week after a dip isn't "a quieter stretch".
    expect(trendOf('FFFFFFF'.repeat(6) + 'FFF.F..' + 'FFFF').direction).toBe('steady');
    // Two good weeks running after a slow start is.
    expect(trendOf('F......'.repeat(2) + 'FFF....'.repeat(4) + 'FFFFFFF' + 'FFFF').direction).toBe(
      'up',
    );
    const late = habit({ createdOn: '2026-10-26' });
    const two = habitTrend(late, routine(), indexCheckIns(pattern('FFFF', '2026-10-26')), TODAY);
    expect(two.direction).toBeUndefined();
  });
});
