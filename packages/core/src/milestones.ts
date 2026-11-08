import { addDays } from './dates';
import type { CheckIn, DayKey } from './model';

/**
 * Gentle milestones: quiet markers for how much you've shown up, ever. They only count
 * up. Nothing here is a streak, so a missed day can never take one away.
 */
export interface Milestone {
  id: string;
  /** What's counted: Done and 2-minute check-ins, or days with at least one. */
  kind: 'checkins' | 'days';
  at: number;
  title: string;
  /** One kind line, in AndThen's own words. */
  note: string;
}

export const MILESTONES: readonly Milestone[] = [
  {
    id: 'checkins-1',
    kind: 'checkins',
    at: 1,
    title: 'Your first check-in',
    note: 'Every habit begins with a single small yes. This was yours.',
  },
  {
    id: 'days-7',
    kind: 'days',
    at: 7,
    title: '7 days showed up',
    note: 'A week of days with something done. That’s how a routine starts to feel normal.',
  },
  {
    id: 'checkins-25',
    kind: 'checkins',
    at: 25,
    title: '25 check-ins',
    note: 'Small things, done again and again. That’s the whole trick.',
  },
  {
    id: 'days-30',
    kind: 'days',
    at: 30,
    title: '30 days showed up',
    note: 'Thirty days with something done, in whatever order they came.',
  },
  {
    id: 'checkins-100',
    kind: 'checkins',
    at: 100,
    title: '100 check-ins',
    note: 'A hundred times you followed through, big or 2-minute.',
  },
  {
    id: 'days-100',
    kind: 'days',
    at: 100,
    title: '100 days showed up',
    note: 'A hundred days. These habits are part of your days now.',
  },
  {
    id: 'checkins-250',
    kind: 'checkins',
    at: 250,
    title: '250 check-ins',
    note: 'Quietly, steadily, a lot of small wins.',
  },
  {
    id: 'checkins-500',
    kind: 'checkins',
    at: 500,
    title: '500 check-ins',
    note: 'Five hundred. Look how far small steps go.',
  },
  {
    id: 'days-365',
    kind: 'days',
    at: 365,
    title: '365 days showed up',
    note: 'A whole year’s worth of days. Thank you for keeping at it.',
  },
  {
    id: 'checkins-1000',
    kind: 'checkins',
    at: 1000,
    title: '1,000 check-ins',
    note: 'A thousand small yeses. Truly something.',
  },
];

export interface ReachedMilestone {
  milestone: Milestone;
  /** The day it was reached. */
  on: DayKey;
}

export interface MilestoneProgress {
  /** Reached so far, newest first. */
  reached: ReachedMilestone[];
  /** The closest one not reached yet, and how many more it needs. */
  next?: { milestone: Milestone; remaining: number };
  checkIns: number;
  days: number;
}

/** Which milestones have been reached, and when, from every Done and 2-minute check-in up to today. */
export function milestoneProgress(checkIns: readonly CheckIn[], today: DayKey): MilestoneProgress {
  const done = checkIns
    .filter((c) => (c.kind === 'full' || c.kind === 'mini') && c.date <= today)
    .map((c) => c.date)
    .sort();
  const reachedOn = new Map<string, DayKey>();
  const days = new Set<DayKey>();
  let count = 0;
  for (const date of done) {
    count++;
    days.add(date);
    for (const m of MILESTONES) {
      if (reachedOn.has(m.id)) continue;
      const value = m.kind === 'checkins' ? count : days.size;
      if (value >= m.at) reachedOn.set(m.id, date);
    }
  }
  const reached = MILESTONES.filter((m) => reachedOn.has(m.id))
    .map((milestone) => ({ milestone, on: reachedOn.get(milestone.id)! }))
    .sort((a, b) => b.on.localeCompare(a.on) || b.milestone.at - a.milestone.at);
  const progress: MilestoneProgress = { reached, checkIns: count, days: days.size };
  const upcoming = MILESTONES.filter((m) => !reachedOn.has(m.id)).map((milestone) => ({
    milestone,
    remaining: milestone.at - (milestone.kind === 'checkins' ? count : days.size),
  }));
  upcoming.sort((a, b) => a.remaining - b.remaining || a.milestone.at - b.milestone.at);
  if (upcoming[0]) progress.next = upcoming[0];
  return progress;
}

/** How long a new milestone waits on Today before it's quietly left for Progress. */
export const MILESTONE_FRESH_DAYS = 3;

/**
 * The milestone Today should mention, if any: the newest one reached in the last few days
 * that hasn't been seen yet. Older ones stay on Progress, so a returning user isn't
 * greeted by a pile of cards.
 */
export function freshMilestone(
  progress: MilestoneProgress,
  seen: ReadonlySet<string>,
  today: DayKey,
): ReachedMilestone | undefined {
  const since = addDays(today, -(MILESTONE_FRESH_DAYS - 1));
  return progress.reached.find((r) => r.on >= since && !seen.has(r.milestone.id));
}
