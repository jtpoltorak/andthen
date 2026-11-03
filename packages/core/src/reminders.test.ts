import { describe, expect, it } from 'vitest';
import { buildDay } from './chain';
import type { CheckIn, Habit, Routine } from './model';
import {
  DEFAULT_REMINDER_PREFS,
  type ReminderPrefs,
  dueReminders,
  nextReminderMinutes,
  parseReminderPrefs,
  planReminders,
} from './reminders';

const TODAY = '2026-11-06';

const routine = (id: string, usualTime: string | undefined, order: number): Routine => ({
  id,
  anchor: `After ${id}`,
  usualTime,
  order,
  createdOn: '2026-11-01',
});

const habit = (id: string, routineId: string, order = 0): Habit => ({
  id,
  routineId,
  name: id,
  twoMinuteVersion: `tiny ${id}`,
  order,
  createdOn: '2026-11-01',
});

const routines = [
  routine('coffee', '07:30', 0),
  routine('lunch', '12:15', 1),
  routine('whenever', undefined, 2),
];
const habits = [
  habit('water', 'coffee', 0),
  habit('stretch', 'coffee', 1),
  habit('walk', 'lunch'),
  habit('read', 'whenever'),
];

const on: ReminderPrefs = { ...DEFAULT_REMINDER_PREFS, enabled: true };
const chains = (checkIns: CheckIn[] = []) => buildDay(routines, habits, checkIns, TODAY);
const at = (h: number, m: number) => h * 60 + m;

describe('planReminders', () => {
  it('plans nothing while reminders are off', () => {
    expect(planReminders(chains(), DEFAULT_REMINDER_PREFS)).toEqual([]);
  });

  it('plans one reminder per routine that has a usual time, earliest first', () => {
    const planned = planReminders(chains(), on);
    expect(planned.map((p) => [p.routineId, p.atMinutes])).toEqual([
      ['coffee', at(7, 30)],
      ['lunch', at(12, 15)],
    ]);
  });

  it('names the anchor and the next habit, gently', () => {
    const [coffee] = planReminders(chains([{ habitId: 'water', date: TODAY, kind: 'full' }]), on);
    expect(coffee.title).toBe('After coffee');
    expect(coffee.body).toBe('And then: stretch. Even the 2-minute version counts.');
  });

  it('after one missed day, says two minutes keeps the chain alive', () => {
    const checkIns: CheckIn[] = [{ habitId: 'water', date: '2026-11-04', kind: 'full' }];
    const [coffee] = planReminders(chains(checkIns), on);
    expect(coffee.body).toBe('And then: water. Two minutes today keeps the chain alive.');
  });

  it('comes early by the chosen lead, but never before midnight', () => {
    const early = planReminders(
      buildDay([routine('late', '00:05', 0)], [habit('x', 'late')], [], TODAY),
      { ...on, leadMinutes: 15 },
    );
    expect(early[0].atMinutes).toBe(0);
    expect(planReminders(chains(), { ...on, leadMinutes: 15 })[0].atMinutes).toBe(at(7, 15));
  });

  it('skips muted routines and routines already finished today', () => {
    const done: CheckIn[] = [
      { habitId: 'water', date: TODAY, kind: 'full' },
      { habitId: 'stretch', date: TODAY, kind: 'skip' },
    ];
    expect(planReminders(chains(done), on).map((p) => p.routineId)).toEqual(['lunch']);
    expect(
      planReminders(chains(), { ...on, mutedRoutineIds: ['lunch'] }).map((p) => p.routineId),
    ).toEqual(['coffee']);
  });
});

describe('dueReminders and nextReminderMinutes', () => {
  const planned = planReminders(chains(), on);

  it('is due from its time until the grace window closes, once', () => {
    expect(dueReminders(planned, at(7, 29), [])).toEqual([]);
    expect(dueReminders(planned, at(7, 30), []).map((p) => p.routineId)).toEqual(['coffee']);
    expect(dueReminders(planned, at(8, 29), []).map((p) => p.routineId)).toEqual(['coffee']);
    expect(dueReminders(planned, at(8, 30), [])).toEqual([]);
    expect(dueReminders(planned, at(7, 45), ['coffee'])).toEqual([]);
  });

  it('finds the next reminder still to come', () => {
    expect(nextReminderMinutes(planned, at(6, 0), [])).toBe(at(7, 30));
    expect(nextReminderMinutes(planned, at(7, 30), [])).toBe(at(12, 15));
    expect(nextReminderMinutes(planned, at(13, 0), [])).toBeUndefined();
  });
});

describe('parseReminderPrefs', () => {
  it('falls back to defaults for anything unexpected', () => {
    expect(parseReminderPrefs(null)).toEqual(DEFAULT_REMINDER_PREFS);
    expect(
      parseReminderPrefs({ enabled: 'yes', leadMinutes: 7, mutedRoutineIds: [1, 'a'] }),
    ).toEqual({ enabled: false, leadMinutes: 0, mutedRoutineIds: ['a'] });
    expect(parseReminderPrefs({ enabled: true, leadMinutes: 15 })).toEqual({
      enabled: true,
      leadMinutes: 15,
      mutedRoutineIds: [],
    });
  });
});
