import { addDays } from './dates';
import type { CheckIn, DayKey, Habit, Routine } from './model';
import { isPausedOn } from './pause';

/**
 * The routine garden: each routine grows a little plant. Every Done or 2-minute
 * check-in in the routine adds one step of growth. It's a running total, not a
 * streak, so a skip or a missed day never takes growth away.
 */
export type GardenStage = 'seed' | 'sprout' | 'seedling' | 'young' | 'budding' | 'bloom';

export interface GardenStageInfo {
  stage: GardenStage;
  /** "Young plant", for labels. */
  name: string;
  /** Check-ins needed to reach this stage. */
  at: number;
  /** How the next-stage hint ends: "8 more to a bud". */
  toReach: string;
  /** What the one-time note says when a plant reaches this stage. */
  reached: string;
}

/** Every stage, smallest first. */
export const GARDEN_STAGES: readonly GardenStageInfo[] = [
  { stage: 'seed', name: 'Seed', at: 0, toReach: 'to plant', reached: 'Planted' },
  { stage: 'sprout', name: 'Sprout', at: 1, toReach: 'to sprout', reached: 'Your plant sprouted' },
  {
    stage: 'seedling',
    name: 'Seedling',
    at: 5,
    toReach: 'to a seedling',
    reached: 'Your plant is a seedling now',
  },
  {
    stage: 'young',
    name: 'Young plant',
    at: 15,
    toReach: 'to a young plant',
    reached: 'Your plant grew new leaves',
  },
  {
    stage: 'budding',
    name: 'Budding',
    at: 30,
    toReach: 'to a bud',
    reached: 'Your plant has a bud',
  },
  {
    stage: 'bloom',
    name: 'In bloom',
    at: 60,
    toReach: 'to bloom',
    reached: 'Your plant is in bloom',
  },
];

/** A routine with no growth for this many days shows as resting. */
export const GARDEN_REST_DAYS = 7;

export interface RoutineGrowth {
  /** Done and 2-minute check-ins so far, across every habit the routine has ever had. */
  growth: number;
  stage: GardenStageInfo;
  /** The stage after this one, unless it's in bloom. */
  next?: GardenStageInfo;
  /** Check-ins still needed for the next stage (0 when in bloom). */
  toNext: number;
  /** How far along the way to the next stage, from 0 to 1 (1 when in bloom). */
  progress: number;
  /** The last day it grew. */
  lastGrowth?: DayKey;
  /**
   * Shown softly with a moon: paused today, or no growth for a week. It never wilts,
   * and the next check-in wakes it up.
   */
  resting: boolean;
}

/** The stage a plant with this much growth has reached. */
export function gardenStage(growth: number): GardenStageInfo {
  let reached = GARDEN_STAGES[0];
  for (const s of GARDEN_STAGES) if (growth >= s.at) reached = s;
  return reached;
}

/** The stage reached by going from `before` to `after` check-ins, if it's a new one. */
export function grewInto(before: number, after: number): GardenStageInfo | undefined {
  const was = gardenStage(before);
  const now = gardenStage(after);
  return now.at > was.at ? now : undefined;
}

/** How a routine's plant is doing today. Check-ins after today are ignored. */
export function routineGrowth(
  routine: Routine,
  habits: readonly Habit[],
  checkIns: readonly CheckIn[],
  today: DayKey,
): RoutineGrowth {
  const ids = new Set(habits.filter((h) => h.routineId === routine.id).map((h) => h.id));
  let growth = 0;
  let lastGrowth: DayKey | undefined;
  for (const c of checkIns) {
    if (!ids.has(c.habitId) || c.date > today) continue;
    if (c.kind !== 'full' && c.kind !== 'mini') continue;
    growth++;
    if (!lastGrowth || c.date > lastGrowth) lastGrowth = c.date;
  }
  const stage = gardenStage(growth);
  const next = GARDEN_STAGES[GARDEN_STAGES.indexOf(stage) + 1];
  const toNext = next ? next.at - growth : 0;
  const progress = next ? (growth - stage.at) / (next.at - stage.at) : 1;
  const quiet = growth > 0 && !!lastGrowth && lastGrowth < addDays(today, -GARDEN_REST_DAYS);
  return {
    growth,
    stage,
    next,
    toNext,
    progress,
    lastGrowth,
    resting: isPausedOn(routine, today) || quiet,
  };
}

/** "8 more to a bud", "1 more to sprout", or "In full bloom". */
export function growthHint(g: Pick<RoutineGrowth, 'next' | 'toNext'>): string {
  return g.next ? `${g.toNext} more ${g.next.toReach}` : 'In full bloom';
}
