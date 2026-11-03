import { describe, expect, it } from 'vitest';
import {
  buildChain,
  buildDay,
  indexCheckIns,
  missedYesterday,
  nudgeFor,
  nextOrder,
  pickActiveRoutine,
  removeCheckIn,
  upsertCheckIn,
} from './chain';
import type { CheckIn, Habit, Routine } from './model';

const TODAY = '2026-11-06';
const YESTERDAY = '2026-11-05';

const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'morning',
  anchor: 'After I pour my coffee',
  usualTime: '07:30',
  order: 0,
  createdOn: '2026-11-01',
  ...over,
});

const habit = (id: string, order: number, over: Partial<Habit> = {}): Habit => ({
  id,
  routineId: 'morning',
  name: id,
  twoMinuteVersion: `tiny ${id}`,
  order,
  createdOn: '2026-11-01',
  ...over,
});

const habits = [habit('water', 0), habit('stretch', 1), habit('task', 2)];

describe('buildChain', () => {
  it('orders links and marks the first pending link as next', () => {
    const checkIns: CheckIn[] = [{ habitId: 'water', date: TODAY, kind: 'full' }];
    const chain = buildChain(routine(), [...habits].reverse(), indexCheckIns(checkIns), TODAY);

    expect(chain.links.map((l) => l.habit.id)).toEqual(['water', 'stretch', 'task']);
    expect(chain.links.map((l) => l.status)).toEqual(['full', 'pending', 'pending']);
    expect(chain.links.map((l) => l.isNext)).toEqual([false, true, false]);
    expect(chain.complete).toBe(false);
  });

  it('a skip moves the chain on without counting as done', () => {
    const checkIns: CheckIn[] = [
      { habitId: 'water', date: TODAY, kind: 'skip' },
      { habitId: 'stretch', date: TODAY, kind: 'mini' },
    ];
    const chain = buildChain(routine(), habits, indexCheckIns(checkIns), TODAY);

    expect(chain.links.find((l) => l.isNext)?.habit.id).toBe('task');
    expect(chain.doneCount).toBe(1);
    expect(chain.total).toBe(3);
  });

  it('is complete once every link is answered, skips included', () => {
    const checkIns: CheckIn[] = habits.map((h, i) => ({
      habitId: h.id,
      date: TODAY,
      kind: i === 0 ? 'skip' : 'full',
    }));
    const chain = buildChain(routine(), habits, indexCheckIns(checkIns), TODAY);
    expect(chain.complete).toBe(true);
    expect(chain.links.some((l) => l.isNext)).toBe(false);
  });

  it('an empty routine is never complete', () => {
    expect(buildChain(routine(), [], new Map(), TODAY).complete).toBe(false);
  });

  it('ignores habits from other routines and archived or future habits', () => {
    const list = [
      ...habits,
      habit('other', 3, { routineId: 'evening' }),
      habit('old', 4, { archivedOn: '2026-11-03' }),
      habit('future', 5, { createdOn: '2026-11-10' }),
    ];
    const chain = buildChain(routine(), list, new Map(), TODAY);
    expect(chain.links.map((l) => l.habit.id)).toEqual(['water', 'stretch', 'task']);
  });
});

describe('missedYesterday (never miss twice)', () => {
  it('is true when yesterday has no check-in', () => {
    expect(missedYesterday(habit('water', 0), new Map(), TODAY)).toBe(true);
  });

  it('is true when yesterday was skipped', () => {
    const idx = indexCheckIns([{ habitId: 'water', date: YESTERDAY, kind: 'skip' }]);
    expect(missedYesterday(habit('water', 0), idx, TODAY)).toBe(true);
  });

  it('is false when yesterday was done in full or as the 2-minute version', () => {
    for (const kind of ['full', 'mini'] as const) {
      const idx = indexCheckIns([{ habitId: 'water', date: YESTERDAY, kind }]);
      expect(missedYesterday(habit('water', 0), idx, TODAY)).toBe(false);
    }
  });

  it('is false for a habit created today', () => {
    expect(missedYesterday(habit('water', 0, { createdOn: TODAY }), new Map(), TODAY)).toBe(false);
  });

  it('works across a month boundary', () => {
    const idx = indexCheckIns([{ habitId: 'water', date: '2026-10-31', kind: 'full' }]);
    expect(missedYesterday(habit('water', 0, { createdOn: '2026-10-01' }), idx, '2026-11-01')).toBe(
      false,
    );
  });
});

describe('nudgeFor and chain.atRisk', () => {
  const water = habit('water', 0, { createdOn: '2026-10-01' });
  const r = routine({ createdOn: '2026-10-01' });
  const DAY_BEFORE = '2026-11-04';

  it('says "don\'t miss twice" after one missed day', () => {
    const idx = indexCheckIns([{ habitId: 'water', date: DAY_BEFORE, kind: 'full' }]);
    expect(nudgeFor(water, r, idx, TODAY)?.nudge).toBe('dont-miss-twice');
  });

  it('welcomes you back after two or more missed days', () => {
    expect(nudgeFor(water, r, new Map(), TODAY)?.nudge).toBe('welcome-back');
  });

  it('never nudges after a skip or a done day', () => {
    for (const kind of ['skip', 'full', 'mini'] as const) {
      const idx = indexCheckIns([{ habitId: 'water', date: YESTERDAY, kind }]);
      expect(nudgeFor(water, r, idx, TODAY)).toBeUndefined();
    }
  });

  it('does not nudge a habit that started today', () => {
    expect(nudgeFor(habit('water', 0, { createdOn: TODAY }), r, new Map(), TODAY)).toBeUndefined();
  });

  it('treats a habit that started yesterday as one miss, not a comeback', () => {
    const fresh = habit('water', 0, { createdOn: YESTERDAY });
    expect(nudgeFor(fresh, r, new Map(), TODAY)?.nudge).toBe('dont-miss-twice');
  });

  it('puts the nudge on every open link and counts the ones at risk', () => {
    const habits = [water, habit('stretch', 1, { createdOn: '2026-10-01' })];
    const checkIns = [
      { habitId: 'water', date: DAY_BEFORE, kind: 'full' as const },
      { habitId: 'stretch', date: DAY_BEFORE, kind: 'full' as const },
    ];
    const chain = buildChain(r, habits, indexCheckIns(checkIns), TODAY);
    expect(chain.links.map((l) => l.nudge)).toEqual(['dont-miss-twice', 'dont-miss-twice']);
    expect(chain.atRisk).toBe(2);

    // Once a habit is answered today, its nudge goes away.
    const answered = buildChain(
      r,
      habits,
      indexCheckIns([...checkIns, { habitId: 'water', date: TODAY, kind: 'mini' }]),
      TODAY,
    );
    expect(answered.links[0].nudge).toBeUndefined();
    expect(answered.atRisk).toBe(1);
  });
});

describe('buildDay and pickActiveRoutine', () => {
  const evening = routine({
    id: 'evening',
    anchor: 'After I brush my teeth',
    usualTime: '22:00',
    order: 1,
  });
  const allHabits = [...habits, habit('read', 0, { routineId: 'evening' })];

  it('returns routines in order', () => {
    const day = buildDay([evening, routine()], allHabits, [], TODAY);
    expect(day.map((c) => c.routine.id)).toEqual(['morning', 'evening']);
  });

  it('opens the first unfinished routine whose time has passed', () => {
    const checkIns: CheckIn[] = habits.map((h) => ({ habitId: h.id, date: TODAY, kind: 'full' }));
    const day = buildDay([routine(), evening], allHabits, checkIns, TODAY);
    expect(pickActiveRoutine(day, 23 * 60)).toBe('evening');
  });

  it('falls back to the first unfinished routine before any time has passed', () => {
    const day = buildDay([routine(), evening], allHabits, [], TODAY);
    expect(pickActiveRoutine(day, 5 * 60)).toBe('morning');
  });

  it('returns undefined when everything is complete', () => {
    const checkIns: CheckIn[] = allHabits.map((h) => ({
      habitId: h.id,
      date: TODAY,
      kind: 'mini',
    }));
    const day = buildDay([routine(), evening], allHabits, checkIns, TODAY);
    expect(pickActiveRoutine(day, 12 * 60)).toBeUndefined();
  });
});

describe('check-in helpers', () => {
  it('upsert replaces the same habit and day, and remove undoes it', () => {
    let list = upsertCheckIn([], 'water', TODAY, 'full');
    list = upsertCheckIn(list, 'water', TODAY, 'mini');
    list = upsertCheckIn(list, 'water', YESTERDAY, 'full');
    expect(list).toHaveLength(2);
    expect(list.find((c) => c.date === TODAY)?.kind).toBe('mini');

    list = removeCheckIn(list, 'water', TODAY);
    expect(list).toEqual([{ habitId: 'water', date: YESTERDAY, kind: 'full' }]);
  });

  it('nextOrder appends after the highest order', () => {
    expect(nextOrder([])).toBe(0);
    expect(nextOrder([{ order: 0 }, { order: 4 }])).toBe(5);
  });
});
