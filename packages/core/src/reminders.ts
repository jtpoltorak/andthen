import type { Chain } from './chain';
import { minutesOf } from './dates';

/** How far ahead of a routine's usual time the reminder comes. */
export const REMINDER_LEADS = [0, 5, 15] as const;
export type ReminderLead = (typeof REMINDER_LEADS)[number];

/** Per-device reminder preferences. Off until the person turns them on. */
export interface ReminderPrefs {
  enabled: boolean;
  leadMinutes: ReminderLead;
  /** Routines the person opted out of. New routines get reminders by default. */
  mutedRoutineIds: string[];
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  enabled: false,
  leadMinutes: 0,
  mutedRoutineIds: [],
};

/**
 * A reminder only goes out within this many minutes of its time. If the app
 * wasn't open then, a late nudge hours afterwards would just feel like nagging.
 */
export const REMINDER_GRACE_MINUTES = 60;

/** One reminder planned for today. */
export interface PlannedReminder {
  routineId: string;
  /** Minutes since local midnight. */
  atMinutes: number;
  title: string;
  body: string;
}

/** Reads stored prefs defensively; anything odd falls back to the defaults. */
export function parseReminderPrefs(raw: unknown): ReminderPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_REMINDER_PREFS };
  const r = raw as Record<string, unknown>;
  const lead = REMINDER_LEADS.find((l) => l === r['leadMinutes']);
  const muted = Array.isArray(r['mutedRoutineIds'])
    ? r['mutedRoutineIds'].filter((id): id is string => typeof id === 'string')
    : [];
  return {
    enabled: r['enabled'] === true,
    leadMinutes: lead ?? DEFAULT_REMINDER_PREFS.leadMinutes,
    mutedRoutineIds: muted,
  };
}

/** The gentle message for a routine: its anchor, then the next habit. No streak talk, no guilt. */
export function reminderMessage(chain: Chain): { title: string; body: string } {
  const link = chain.links.find((l) => l.isNext);
  const next = link?.habit;
  const title = chain.routine.anchor;
  const body = !next
    ? 'Your routine is ready when you are.'
    : link.nudge === 'dont-miss-twice'
      ? `And then: ${next.name}. Two minutes today keeps the chain alive.`
      : `And then: ${next.name}. Even the 2-minute version counts.`;
  return { title, body };
}

/**
 * Today's reminders, earliest first. A routine gets one only if it has a usual
 * time, isn't muted, and still has something left to do.
 */
export function planReminders(chains: readonly Chain[], prefs: ReminderPrefs): PlannedReminder[] {
  if (!prefs.enabled) return [];
  const muted = new Set(prefs.mutedRoutineIds);
  const planned: PlannedReminder[] = [];
  for (const chain of chains) {
    const usual = minutesOf(chain.routine.usualTime);
    if (usual === undefined || muted.has(chain.routine.id)) continue;
    if (chain.total === 0 || chain.complete) continue;
    planned.push({
      routineId: chain.routine.id,
      atMinutes: Math.max(0, usual - prefs.leadMinutes),
      ...reminderMessage(chain),
    });
  }
  return planned.sort((a, b) => a.atMinutes - b.atMinutes);
}

/** Reminders that should go out right now and haven't been sent today. */
export function dueReminders(
  planned: readonly PlannedReminder[],
  minutesNow: number,
  sentRoutineIds: readonly string[],
): PlannedReminder[] {
  const sent = new Set(sentRoutineIds);
  return planned.filter(
    (p) =>
      !sent.has(p.routineId) &&
      p.atMinutes <= minutesNow &&
      minutesNow < p.atMinutes + REMINDER_GRACE_MINUTES,
  );
}

/** Minutes since midnight of the next reminder still to come today, if any. */
export function nextReminderMinutes(
  planned: readonly PlannedReminder[],
  minutesNow: number,
  sentRoutineIds: readonly string[],
): number | undefined {
  const sent = new Set(sentRoutineIds);
  return planned.find((p) => !sent.has(p.routineId) && p.atMinutes > minutesNow)?.atMinutes;
}
