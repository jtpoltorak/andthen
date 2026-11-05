import { describe, expect, it } from 'vitest';
import {
  MAX_CHECKIN_NOTE,
  cleanCheckInNote,
  describeJournal,
  journalEntries,
  withJournal,
} from './journal';
import type { CheckIn } from './model';

const base: CheckIn = { habitId: 'h', date: '2026-11-05', kind: 'full' };

describe('journal', () => {
  it('tidies a note into one short line', () => {
    expect(cleanCheckInNote('  a\n\n  b  ')).toBe('a b');
    expect(cleanCheckInNote('   ')).toBeUndefined();
    expect(cleanCheckInNote('x'.repeat(300))).toHaveLength(MAX_CHECKIN_NOTE);
  });

  it('sets, keeps and clears mood and note', () => {
    const a = withJournal(base, { mood: 'hard' });
    expect(a).toEqual({ ...base, mood: 'hard' });
    const b = withJournal(a, { note: ' rainy ' });
    expect(b).toEqual({ ...base, mood: 'hard', note: 'rainy' });
    expect(withJournal(b, { mood: null })).toEqual({ ...base, note: 'rainy' });
    expect(withJournal(b, { note: '' })).toEqual({ ...base, mood: 'hard' });
  });

  it("lists one habit's entries newest first, and describes them", () => {
    const list: CheckIn[] = [
      { ...base, date: '2026-11-01', mood: 'good' },
      { ...base, date: '2026-11-03' },
      { ...base, date: '2026-11-04', note: 'late' },
      { ...base, habitId: 'other', date: '2026-11-05', mood: 'okay' },
    ];
    expect(journalEntries(list, 'h').map((c) => c.date)).toEqual(['2026-11-04', '2026-11-01']);
    expect(journalEntries(list, 'h', 1)).toHaveLength(1);
    expect(describeJournal({ mood: 'good', note: 'easy' })).toBe('Felt good · easy');
    expect(describeJournal({ note: 'easy' })).toBe('easy');
  });
});
