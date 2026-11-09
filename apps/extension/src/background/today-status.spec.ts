import type { CheckIn, Habit, Routine } from '@andthen/core';
import { DEFAULT_EXT_SETTINGS, type ExtSettings } from '../shared/ext-settings';
import {
  badgeText,
  badgeTitle,
  notificationId,
  routineFromNotification,
  todayStatus,
} from './today-status';

const day = '2026-11-09';
const at = (time: string) => new Date(`${day}T${time}:00`);

const routine = (id: string, usualTime?: string): Routine => ({
  id,
  anchor: `Anchor ${id}`,
  order: 0,
  createdOn: '2026-11-01',
  ...(usualTime ? { usualTime } : {}),
});
const habit = (id: string, routineId: string, order = 0): Habit => ({
  id,
  routineId,
  name: `Habit ${id}`,
  twoMinuteVersion: `Tiny ${id}`,
  order,
  createdOn: '2026-11-01',
});

const snapshot = (checkIns: CheckIn[] = []) => ({
  routines: [routine('morning', '07:30'), routine('evening', '21:00')],
  habits: [habit('water', 'morning'), habit('stretch', 'morning', 1), habit('read', 'evening')],
  checkIns,
  reflections: [],
});

const withReminders = (lead: 0 | 5 | 15 = 0): ExtSettings => ({
  ...DEFAULT_EXT_SETTINGS,
  reminders: { enabled: true, leadMinutes: lead, mutedRoutineIds: [] },
});

describe('todayStatus', () => {
  it('counts the habits left today for the badge', () => {
    const status = todayStatus(
      snapshot([{ habitId: 'water', date: day, kind: 'mini' }]),
      DEFAULT_EXT_SETTINGS,
      [],
      at('08:00'),
    );
    expect(status.left).toBe(2);
    expect(status.badge).toBe('2');
    expect(status.title).toBe('AndThen: 2 habits left today');
  });

  it('clears the badge when everything is answered, skips included', () => {
    const done: CheckIn[] = [
      { habitId: 'water', date: day, kind: 'full' },
      { habitId: 'stretch', date: day, kind: 'skip' },
      { habitId: 'read', date: day, kind: 'full' },
    ];
    const status = todayStatus(snapshot(done), DEFAULT_EXT_SETTINGS, [], at('22:00'));
    expect(status.badge).toBe('');
    expect(status.title).toBe("AndThen: that's everything for today");
  });

  it('sends a reminder at the usual time, once, and not before', () => {
    expect(todayStatus(snapshot(), withReminders(), [], at('07:29')).due).toEqual([]);
    const due = todayStatus(snapshot(), withReminders(), [], at('07:30')).due;
    expect(due.map((d) => d.routineId)).toEqual(['morning']);
    expect(due[0].title).toBe('Anchor morning');
    expect(due[0].body).toContain('Habit water');
    expect(todayStatus(snapshot(), withReminders(), ['morning'], at('07:31')).due).toEqual([]);
  });

  it('honors the lead time, and sends nothing while reminders are off', () => {
    expect(todayStatus(snapshot(), withReminders(15), [], at('07:15')).due).toHaveLength(1);
    expect(todayStatus(snapshot(), DEFAULT_EXT_SETTINGS, [], at('07:30')).due).toEqual([]);
  });

  it('skips a routine that is already done', () => {
    const done: CheckIn[] = [
      { habitId: 'water', date: day, kind: 'full' },
      { habitId: 'stretch', date: day, kind: 'full' },
    ];
    expect(todayStatus(snapshot(done), withReminders(), [], at('07:30')).due).toEqual([]);
  });
});

describe('badge helpers', () => {
  it('shows nothing when the badge is turned off, and caps big numbers', () => {
    expect(badgeText(3, { badge: false })).toBe('');
    expect(badgeText(120, { badge: true })).toBe('99+');
    expect(badgeTitle(1, true)).toBe('AndThen: 1 habit left today');
    expect(badgeTitle(0, false)).toBe('AndThen');
  });

  it('round-trips the routine through a notification id', () => {
    expect(routineFromNotification(notificationId('r-1'))).toBe('r-1');
    expect(routineFromNotification('something-else')).toBeUndefined();
  });
});
