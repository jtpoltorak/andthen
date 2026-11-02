import { describe, expect, it } from 'vitest';
import { addDays, minutesOf, toDayKey } from './dates';
import { suggestTwoMinuteVersion } from './starters';

describe('dates', () => {
  it('formats local days with zero padding', () => {
    expect(toDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('adds days across months, years and leap days', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('parses HH:mm into minutes', () => {
    expect(minutesOf('07:30')).toBe(450);
    expect(minutesOf('7:05')).toBe(425);
    expect(minutesOf('24:00')).toBeUndefined();
    expect(minutesOf('soon')).toBeUndefined();
    expect(minutesOf(undefined)).toBeUndefined();
  });
});

describe('suggestTwoMinuteVersion', () => {
  it('uses the starter suggestion when the name matches', () => {
    expect(suggestTwoMinuteVersion('read')).toBe('Read one page');
  });

  it('falls back to a 2-minute phrasing for custom habits', () => {
    expect(suggestTwoMinuteVersion('practice guitar')).toBe('Practice guitar for 2 minutes');
    expect(suggestTwoMinuteVersion('  ')).toBe('');
  });
});
