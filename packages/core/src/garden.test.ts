import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { gardenStage, grewInto, growthHint, routineGrowth } from './garden';
import type { CheckIn, CheckInKind, Habit, Routine } from './model';

const TODAY = '2026-11-07';

const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'morning',
  anchor: 'After I pour my coffee',
  order: 0,
  createdOn: '2026-09-01',
  ...over,
});

const habit = (id: string, routineId = 'morning'): Habit => ({
  id,
  routineId,
  name: id,
  twoMinuteVersion: 'a little',
  order: 0,
  createdOn: '2026-09-01',
});

const HABITS = [habit('water'), habit('stretch'), habit('read', 'evening')];

/** `n` check-ins of one kind for a habit, one a day, ending `last`. */
const days = (habitId: string, n: number, kind: CheckInKind = 'full', last = TODAY): CheckIn[] =>
  Array.from({ length: n }, (_, i) => ({ habitId, date: addDays(last, -i), kind }));

describe('gardenStage', () => {
  it('climbs at 1, 5, 15, 30 and 60 check-ins', () => {
    const at = (n: number) => gardenStage(n).stage;
    expect([0, 1, 4, 5, 14, 15, 29, 30, 59, 60, 500].map(at)).toEqual([
      'seed',
      'sprout',
      'sprout',
      'seedling',
      'seedling',
      'young',
      'young',
      'budding',
      'budding',
      'bloom',
      'bloom',
    ]);
  });
});

describe('grewInto', () => {
  it('names the stage only when a threshold is crossed', () => {
    expect(grewInto(0, 1)?.stage).toBe('sprout');
    expect(grewInto(14, 15)?.stage).toBe('young');
    expect(grewInto(15, 16)).toBeUndefined();
    expect(grewInto(5, 4)).toBeUndefined();
  });
});

describe('routineGrowth', () => {
  it('counts Done and 2 min across the routine, not skips or other routines', () => {
    const g = routineGrowth(
      routine(),
      HABITS,
      [
        ...days('water', 10),
        ...days('stretch', 6, 'mini'),
        ...days('stretch', 3, 'skip', addDays(TODAY, -10)),
        ...days('read', 20),
      ],
      TODAY,
    );
    expect(g.growth).toBe(16);
    expect(g.stage.stage).toBe('young');
    expect(g.next?.stage).toBe('budding');
    expect(g.toNext).toBe(14);
    expect(g.progress).toBeCloseTo(1 / 15);
    expect(growthHint(g)).toBe('14 more to a bud');
    expect(g.resting).toBe(false);
  });

  it('keeps growth from retired habits', () => {
    const retired = { ...habit('old'), archivedOn: '2026-10-01' };
    const g = routineGrowth(routine(), [retired], days('old', 5, 'full', '2026-09-30'), TODAY);
    expect(g.stage.stage).toBe('seedling');
  });

  it('starts as a seed that is not resting', () => {
    const g = routineGrowth(routine(), HABITS, [], TODAY);
    expect(g.stage.stage).toBe('seed');
    expect(growthHint(g)).toBe('1 more to sprout');
    expect(g.resting).toBe(false);
  });

  it('rests after a week without growth, and never loses growth', () => {
    const quiet = routineGrowth(routine(), HABITS, days('water', 5, 'full', '2026-10-31'), TODAY);
    expect(quiet.resting).toBe(false);
    const quieter = routineGrowth(routine(), HABITS, days('water', 5, 'full', '2026-10-30'), TODAY);
    expect(quieter.resting).toBe(true);
    expect(quieter.stage.stage).toBe('seedling');
  });

  it('rests while paused', () => {
    const paused = routine({ pauses: [{ from: '2026-11-05' }] });
    expect(routineGrowth(paused, HABITS, days('water', 2), TODAY).resting).toBe(true);
  });

  it('is in full bloom at the top', () => {
    const g = routineGrowth(routine(), HABITS, days('water', 61), TODAY);
    expect(g.next).toBeUndefined();
    expect(g.progress).toBe(1);
    expect(growthHint(g)).toBe('In full bloom');
  });

  it('ignores check-ins after today', () => {
    const g = routineGrowth(routine(), HABITS, days('water', 3, 'full', addDays(TODAY, 2)), TODAY);
    expect(g.growth).toBe(1);
  });
});
