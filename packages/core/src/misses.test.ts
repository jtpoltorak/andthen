import { describe, expect, it } from 'vitest';
import type { Habit } from './model';
import { createBackup, parseBackup } from './backup';
import {
  MAX_MISS_NOTES,
  cleanMissNotes,
  describeMissNote,
  missNoteOn,
  mostMissedHabit,
  tallyMissReasons,
  withMissNote,
} from './misses';
import { addDays } from './dates';

const habit = (id: string, misses?: Habit['misses']): Habit => ({
  id,
  routineId: 'r1',
  name: id,
  twoMinuteVersion: 'tiny',
  order: 0,
  createdOn: '2026-10-01',
  ...(misses ? { misses } : {}),
});

describe('miss notes', () => {
  it('sets, replaces and clears the note for a day, keeping days in order', () => {
    let h = habit('h1');
    h = { ...h, misses: withMissNote(h, '2026-11-16', { reason: 'tired', note: '  Up late ' }) };
    h = { ...h, misses: withMissNote(h, '2026-11-10', { reason: 'busy' }) };
    expect(h.misses?.map((m) => m.date)).toEqual(['2026-11-10', '2026-11-16']);
    expect(missNoteOn(h, '2026-11-16')).toEqual({
      date: '2026-11-16',
      reason: 'tired',
      note: 'Up late',
    });

    h = { ...h, misses: withMissNote(h, '2026-11-16', { reason: 'forgot' }) };
    expect(missNoteOn(h, '2026-11-16')).toEqual({ date: '2026-11-16', reason: 'forgot' });

    h = { ...h, misses: withMissNote(h, '2026-11-16', {}) };
    expect(missNoteOn(h, '2026-11-16')).toBeUndefined();
    expect(h.misses).toHaveLength(1);
  });

  it(`keeps only the newest ${MAX_MISS_NOTES}`, () => {
    let h = habit('h1');
    for (let i = 0; i < MAX_MISS_NOTES + 5; i++) {
      h = { ...h, misses: withMissNote(h, addDays('2026-01-01', i), { reason: 'busy' }) };
    }
    expect(h.misses).toHaveLength(MAX_MISS_NOTES);
    expect(h.misses?.[0].date).toBe(addDays('2026-01-01', 5));
  });

  it('drops bad entries and unknown reasons when reading', () => {
    expect(
      cleanMissNotes([
        { date: '2026-11-16', reason: 'tired' },
        { date: 'nope', reason: 'tired' },
        { date: '2026-11-15', reason: 'from-the-future' },
        { date: '2026-11-14', reason: 'from-the-future', note: 'Rain' },
        'junk',
      ]),
    ).toEqual([
      { date: '2026-11-14', note: 'Rain' },
      { date: '2026-11-16', reason: 'tired' },
    ]);
    expect(cleanMissNotes(undefined)).toEqual([]);
  });

  it('describes a note in words', () => {
    expect(describeMissNote({ date: '2026-11-16', reason: 'tired', note: 'Up late' })).toBe(
      'Tired · Up late',
    );
    expect(describeMissNote({ date: '2026-11-16', note: 'Rain' })).toBe('Rain');
  });

  it('tallies reasons in a span, most common first, and finds the most-missed habit', () => {
    const a = habit('a', [
      { date: '2026-11-09', reason: 'tired' },
      { date: '2026-11-16', reason: 'tired' },
      { date: '2026-11-17', reason: 'busy' },
    ]);
    const b = habit('b', [
      { date: '2026-11-16', reason: 'tired' },
      { date: '2026-11-17', note: 'Words only' },
    ]);
    expect(tallyMissReasons([a, b], '2026-11-16', '2026-11-22')).toEqual([
      { reason: 'tired', count: 2 },
      { reason: 'busy', count: 1 },
    ]);
    expect(mostMissedHabit([a, b], '2026-11-16', '2026-11-22')?.id).toBe('a');
    expect(mostMissedHabit([a, b], '2026-12-01', '2026-12-07')).toBeUndefined();
  });

  it('go along in backups', () => {
    const data = {
      routines: [{ id: 'r1', anchor: 'After coffee', order: 0, createdOn: '2026-10-01' }],
      habits: [habit('h1', [{ date: '2026-11-16', reason: 'tired' as const, note: 'Up late' }])],
      checkIns: [],
      reflections: [],
    };
    const result = parseBackup(JSON.stringify(createBackup(data)));
    expect(result.ok && result.data.habits[0].misses).toEqual([
      { date: '2026-11-16', reason: 'tired', note: 'Up late' },
    ]);
  });
});
