import { Injectable, computed, inject, signal } from '@angular/core';
import { freshMilestone, milestoneProgress } from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { readJson, writeJson } from '../data/local-store';

/** Milestones already mentioned on Today. Per device, like other prompts. */
export const MILESTONES_SEEN_KEY = 'andthen.milestonesSeen';

/** Gentle milestones: what's been reached, and whether Today should mention one. */
@Injectable({ providedIn: 'root' })
export class MilestonesStore {
  private readonly store = inject(HabitStore);
  private readonly seen = signal<ReadonlySet<string>>(readSeen());

  readonly progress = computed(() => milestoneProgress(this.store.checkIns(), this.store.today()));

  /** The newly reached milestone Today shows once, if any. */
  readonly fresh = computed(() => freshMilestone(this.progress(), this.seen(), this.store.today()));

  /** Puts the card away, along with any other milestone reached so far. */
  dismiss(): void {
    const ids = new Set([...this.seen(), ...this.progress().reached.map((r) => r.milestone.id)]);
    this.seen.set(ids);
    writeJson(MILESTONES_SEEN_KEY, [...ids]);
  }
}

function readSeen(): ReadonlySet<string> {
  const raw = readJson(MILESTONES_SEEN_KEY);
  return new Set(Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : []);
}
