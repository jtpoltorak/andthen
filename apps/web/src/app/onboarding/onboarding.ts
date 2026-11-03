import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  type RoutineTemplate,
  STARTER_ANCHORS,
  STARTER_HABITS,
  suggestTwoMinuteVersion,
} from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { TemplateList } from '../routines/template-list';
import { DataBackup } from '../settings/data-backup';
import { focusAfterRender } from '../shared/focus';

type Step = 'welcome' | 'template' | 'habit' | 'anchor' | 'mini';

const lowerFirst = (text: string) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : '');

/**
 * First run: welcome, pick a habit, pick its anchor, make it tiny. Target: under 60 seconds.
 * Or, from the welcome screen, start a whole ready-made routine in one tap.
 */
@Component({
  selector: 'app-onboarding',
  imports: [DataBackup, TemplateList],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Onboarding {
  private readonly store = inject(HabitStore);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

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

  /** Shows a step and moves focus to its heading, so keyboard and screen reader users start at the top. */
  protected go(step: Step): void {
    this.step.set(step);
    focusAfterRender(this.injector, () => document.querySelector<HTMLElement>('main h1'));
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
    if (this.habit().trim()) this.go('anchor');
  }

  protected toMini(): void {
    if (!this.anchor().trim()) return;
    if (!this.mini().trim()) this.mini.set(suggestTwoMinuteVersion(this.habit()));
    this.go('mini');
  }

  /** A restored backup with routines skips the rest of first run. */
  protected async afterRestore(): Promise<void> {
    if (this.store.hasRoutines()) await this.router.navigate(['/today']);
  }

  /** Saves a whole ready-made routine and goes straight to Today. */
  protected async useTemplate(template: RoutineTemplate): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      await this.store.createFromTemplate(template);
      await this.router.navigate(['/today']);
    } finally {
      this.saving.set(false);
    }
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
