import { describe, expect, it } from 'vitest';
import { ROUTINE_TEMPLATES, routineTemplate } from './templates';

describe('ROUTINE_TEMPLATES', () => {
  it('has unique ids and names', () => {
    expect(new Set(ROUTINE_TEMPLATES.map((t) => t.id)).size).toBe(ROUTINE_TEMPLATES.length);
    expect(new Set(ROUTINE_TEMPLATES.map((t) => t.name)).size).toBe(ROUTINE_TEMPLATES.length);
  });

  it('gives every template an anchor, a time, and tiny habits', () => {
    for (const t of ROUTINE_TEMPLATES) {
      expect(t.anchor.trim()).not.toBe('');
      expect(t.usualTime).toMatch(/^\d{2}:\d{2}$/);
      expect(t.habits.length).toBeGreaterThan(0);
      for (const h of t.habits) {
        expect(h.name.trim()).not.toBe('');
        expect(h.twoMinuteVersion.trim()).not.toBe('');
      }
    }
  });

  it('is listed in time-of-day order', () => {
    const times = ROUTINE_TEMPLATES.map((t) => t.usualTime);
    expect(times).toEqual([...times].sort());
  });

  it('looks up a template by id', () => {
    expect(routineTemplate('wind-down')?.name).toBe('Wind-down');
    expect(routineTemplate('nope')).toBeUndefined();
  });
});
