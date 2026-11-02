import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { STARTER_ANCHORS, STARTER_HABITS, suggestTwoMinuteVersion } from '@andthen/core';
import { HabitStore } from '../data/habit-store';

type Step = 'welcome' | 'habit' | 'anchor' | 'mini';

const lowerFirst = (text: string) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : '');

/** First run: welcome, pick a habit, pick its anchor, make it tiny. Target: under 60 seconds. */
@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Onboarding {
  private readonly store = inject(HabitStore);
  private readonly router = inject(Router);

  protected readonly starterHabits = STARTER_HABITS;
  protected readonly starterAnchors = STARTER_ANCHORS;

  protected readonly step = signal<Step>('welcome');
  protected readonly habit = signal('');
  protected readonly anchor = signal('');
  protected readonly mini = signal('');
  protected readonly saving = signal(false);

  protected readonly isPresetHabit = computed(() =>
    STARTER_HABITS.some((h) => h.name === this.habit()),
  );
  protected readonly isPresetAnchor = computed(() =>
    STARTER_ANCHORS.some((a) => a.anchor === this.anchor()),
  );
  protected readonly habitLower = computed(() => lowerFirst(this.habit().trim()));
  protected readonly miniLower = computed(() => lowerFirst(this.mini().trim()));

  protected go(step: Step): void {
    this.step.set(step);
  }

  protected pickHabit(name: string, twoMinuteVersion: string): void {
    this.habit.set(name);
    this.mini.set(twoMinuteVersion);
  }

  protected typeHabit(value: string): void {
    this.habit.set(value);
    this.mini.set('');
  }

  protected toAnchor(): void {
    if (this.habit().trim()) this.step.set('anchor');
  }

  protected toMini(): void {
    if (!this.anchor().trim()) return;
    if (!this.mini().trim()) this.mini.set(suggestTwoMinuteVersion(this.habit()));
    this.step.set('mini');
  }

  protected async start(): Promise<void> {
    if (!this.mini().trim() || this.saving()) return;
    this.saving.set(true);
    try {
      const preset = STARTER_ANCHORS.find((a) => a.anchor === this.anchor());
      await this.store.createChain({
        anchor: this.anchor(),
        usualTime: preset?.usualTime,
        habitName: this.habit(),
        twoMinuteVersion: this.mini(),
      });
      await this.router.navigate(['/today']);
    } finally {
      this.saving.set(false);
    }
  }
}
