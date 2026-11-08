import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import type { CheckIn } from './model';
import { freshMilestone, milestoneProgress } from './milestones';

const TODAY = '2026-11-08';

/** One Done check-in a day for `n` days, ending `last`, for each habit. */
const daily = (n: number, habits = ['water'], last = TODAY): CheckIn[] =>
  Array.from({ length: n }, (_, i) =>
    habits.map((habitId) => ({ habitId, date: addDays(last, -i), kind: 'full' as const })),
  ).flat();

describe('milestoneProgress', () => {
  it('starts with the first check-in in sight', () => {
    const p = milestoneProgress([], TODAY);
    expect(p.reached).toEqual([]);
    expect(p.next?.milestone.id).toBe('checkins-1');
    expect(p.next?.remaining).toBe(1);
  });

  it('dates each milestone by the check-in that reached it, newest first', () => {
    // 4 habits a day for 7 days: 28 check-ins over 7 days.
    const p = milestoneProgress(daily(7, ['a', 'b', 'c', 'd']), TODAY);
    expect(p.checkIns).toBe(28);
    expect(p.days).toBe(7);
    expect(p.reached.map((r) => [r.milestone.id, r.on])).toEqual([
      ['checkins-25', TODAY],
      ['days-7', TODAY],
      ['checkins-1', '2026-11-02'],
    ]);
    expect(p.next).toMatchObject({ milestone: { id: 'days-30' }, remaining: 23 });
  });

  it('never counts skips, and missed days never take one away', () => {
    const checkIns: CheckIn[] = [
      { habitId: 'water', date: '2026-10-01', kind: 'full' },
      { habitId: 'water', date: '2026-10-02', kind: 'skip' },
      ...daily(6, ['water'], '2026-11-08'),
    ];
    const p = milestoneProgress(checkIns, TODAY);
    expect(p.checkIns).toBe(7);
    expect(p.reached.map((r) => r.milestone.id)).toContain('days-7');
  });

  it('ignores check-ins after today', () => {
    const p = milestoneProgress(daily(1, ['water'], addDays(TODAY, 1)), TODAY);
    expect(p.reached).toEqual([]);
  });
});

describe('freshMilestone', () => {
  it('offers the newest unseen one from the last few days only', () => {
    const p = milestoneProgress(daily(7, ['a', 'b', 'c', 'd']), TODAY);
    expect(freshMilestone(p, new Set(), TODAY)?.milestone.id).toBe('checkins-25');
    expect(freshMilestone(p, new Set(['checkins-25']), TODAY)?.milestone.id).toBe('days-7');
    // The first check-in was six days ago: too old to bring up now.
    expect(freshMilestone(p, new Set(['days-7', 'checkins-25']), TODAY)).toBeUndefined();
  });
});
