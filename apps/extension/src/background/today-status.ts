import {
  buildDay,
  dueReminders,
  planReminders,
  toDayKey,
  type Chain,
  type PlannedReminder,
} from '@andthen/core';
import type { HabitSnapshot } from '@andthen/data';
import type { ExtSettings } from '../shared/ext-settings';

/** Habits still waiting for an answer today. Paused routines and rest days don't count. */
export function habitsLeft(chains: readonly Chain[]): number {
  return chains
    .filter((c) => !c.paused)
    .reduce((left, c) => left + c.links.filter((l) => l.status === 'pending').length, 0);
}

/** The toolbar badge: the number left, or nothing when the day is done (or the badge is off). */
export function badgeText(left: number, settings: Pick<ExtSettings, 'badge'>): string {
  if (!settings.badge || left <= 0) return '';
  return left > 99 ? '99+' : String(left);
}

/** The icon's tooltip, which also reads the count out to screen readers. */
export function badgeTitle(left: number, hasRoutines: boolean): string {
  if (!hasRoutines) return 'AndThen';
  if (left === 0) return "AndThen: that's everything for today";
  return `AndThen: ${left} ${left === 1 ? 'habit' : 'habits'} left today`;
}

export interface TodayStatus {
  chains: Chain[];
  left: number;
  badge: string;
  title: string;
  /** Reminders to send now. */
  due: PlannedReminder[];
}

/** Everything the background worker needs to know, worked out from the stored habits. */
export function todayStatus(
  snapshot: HabitSnapshot,
  settings: ExtSettings,
  sentToday: readonly string[],
  now: Date,
): TodayStatus {
  const chains = buildDay(
    snapshot.routines,
    snapshot.habits,
    snapshot.checkIns,
    toDayKey(now),
    settings.weekStartsOn,
  );
  const left = habitsLeft(chains);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return {
    chains,
    left,
    badge: badgeText(left, settings),
    title: badgeTitle(left, chains.length > 0),
    due: dueReminders(planReminders(chains, settings.reminders), minutesNow, sentToday),
  };
}

/** Notification ids carry the routine, so a click knows which one it was about. */
export const notificationId = (routineId: string) => `andthen-routine-${routineId}`;
export const routineFromNotification = (id: string) =>
  id.startsWith('andthen-routine-') ? id.slice('andthen-routine-'.length) : undefined;
