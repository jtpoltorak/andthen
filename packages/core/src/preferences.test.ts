import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  MAX_NAME_LENGTH,
  cleanName,
  greeting,
  parsePreferences,
  weekdayLabels,
} from './preferences';

describe('parsePreferences', () => {
  it('falls back to the defaults for missing or odd data', () => {
    expect(parsePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('nope')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences({ name: 4, theme: 'purple', accent: 'neon', weekStartsOn: 3 })).toEqual(
      DEFAULT_PREFERENCES,
    );
  });

  it('keeps valid values', () => {
    expect(
      parsePreferences({ name: '  Sam ', theme: 'dark', accent: 'plum', weekStartsOn: 0 }),
    ).toEqual({
      name: 'Sam',
      theme: 'dark',
      accent: 'plum',
      weekStartsOn: 0,
    });
  });

  it('returns a fresh copy of the defaults', () => {
    const prefs = parsePreferences(null);
    prefs.name = 'changed';
    expect(DEFAULT_PREFERENCES.name).toBe('');
  });
});

describe('cleanName', () => {
  it('trims, folds spaces, and caps the length', () => {
    expect(cleanName('  Mary   Ann  ')).toBe('Mary Ann');
    expect(cleanName('x'.repeat(100))).toHaveLength(MAX_NAME_LENGTH);
  });
});

describe('greeting', () => {
  it('fits the time of day', () => {
    expect(greeting('', 8)).toBe('Good morning');
    expect(greeting('', 13)).toBe('Good afternoon');
    expect(greeting('', 20)).toBe('Good evening');
    expect(greeting('', 2)).toBe('Hi');
  });

  it('adds the name when there is one', () => {
    expect(greeting(' Jo ', 8)).toBe('Good morning, Jo');
  });
});

describe('weekdayLabels', () => {
  it('puts M, W and F under the right columns', () => {
    expect(weekdayLabels(1)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(weekdayLabels(0)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  });
});
