import { Injectable, computed, inject, signal } from '@angular/core';
import { isReflectionDay, reflectionFor, reflectionWeek } from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { readJson, writeJson } from '../data/local-store';
import { PreferencesStore } from '../data/preferences';

/** The week whose Today card was put away with "Not this week". Per device, like other prompts. */
export const REFLECTION_DISMISSED_KEY = 'andthen.reflectionDismissed';

/**
 * Decides when Today asks for the weekly reflection: on the last day of the week
 * and the day after, until it's done or put away for that week.
 */
@Injectable({ providedIn: 'root' })
export class ReflectionPrompt {
  private readonly store = inject(HabitStore);
  private readonly preferences = inject(PreferencesStore);

  private readonly dismissedWeek = signal(readDismissed());

  /** The week a reflection is about today. */
  readonly week = computed(() =>
    reflectionWeek(this.store.today(), this.preferences.prefs().weekStartsOn),
  );

  readonly show = computed(() => {
    const today = this.store.today();
    const { from } = this.week();
    return (
      this.store.hasRoutines() &&
      isReflectionDay(today, this.preferences.prefs().weekStartsOn) &&
      !reflectionFor(this.store.reflections(), from) &&
      this.dismissedWeek() !== from
    );
  });

  dismiss(): void {
    const week = this.week().from;
    this.dismissedWeek.set(week);
    writeJson(REFLECTION_DISMISSED_KEY, week);
  }
}

function readDismissed(): string | undefined {
  const raw = readJson(REFLECTION_DISMISSED_KEY);
  return typeof raw === 'string' ? raw : undefined;
}
