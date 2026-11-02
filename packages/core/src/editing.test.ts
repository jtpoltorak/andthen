import { describe, expect, it } from 'vitest';
import { chainHabits, moveItem } from './editing';
import type { Habit } from './model';

const habit = (id: string, order: number, over: Partial<Habit> = {}): Habit => ({
  id,
  routineId: 'morning',
  name: id,
  twoMinuteVersion: `tiny ${id}`,
  order,
  createdOn: '2026-11-01',
  ...over,
});

describe('chainHabits', () => {
  it('returns live habits of the routine in order', () => {
    const list = [
      habit('c', 2),
      habit('a', 0),
      habit('gone', 1, { archivedOn: '2026-11-02' }),
      habit('other', 0, { routineId: 'evening' }),
      habit('b', 1),
    ];
    expect(chainHabits('morning', list, '2026-11-02').map((h) => h.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('moveItem', () => {
  const list = [habit('a', 0), habit('b', 1), habit('c', 2)];

  it('moves down and returns only the changed items', () => {
    expect(moveItem(list, 0, 1).map((h) => [h.id, h.order])).toEqual([
      ['b', 0],
      ['a', 1],
    ]);
  });

  it('moves to the top and renumbers gaps', () => {
    const gappy = [habit('a', 0), habit('b', 3), habit('c', 7)];
    expect(moveItem(gappy, 2, 0).map((h) => [h.id, h.order])).toEqual([
      ['c', 0],
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('ignores moves past either end', () => {
    expect(moveItem(list, 0, -1)).toEqual([]);
    expect(moveItem(list, 2, 3)).toEqual([]);
    expect(moveItem(list, 1, 1)).toEqual([]);
  });

  it('does not mutate the input', () => {
    moveItem(list, 0, 2);
    expect(list.map((h) => h.order)).toEqual([0, 1, 2]);
  });
});
