import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { STARTER_ANCHORS, suggestTwoMinuteVersion } from '@andthen/core';
import { HabitStore } from '../data/habit-store';

/** Starts another routine: an anchor and its first habit, on one screen. */
@Component({
  selector: 'app-new-routine',
  imports: [RouterLink],
  template: `
    <main class="page">
      <a class="back-link" routerLink="/routines">‹ Routines</a>
      <h1>New routine</h1>

      <form (submit)="$event.preventDefault(); save()">
        <fieldset>
          <legend class="field-label">Start after</legend>
          <div class="chips">
            @for (a of unusedAnchors(); track a.anchor) {
              <button
                type="button"
                class="chip"
                [class.selected]="anchor() === a.anchor"
                [attr.aria-pressed]="anchor() === a.anchor"
                (click)="anchor.set(a.anchor)"
              >
                {{ a.anchor }}
              </button>
            }
          </div>
          <label class="visually-hidden" for="new-anchor">Or write your own anchor</label>
          <input
            id="new-anchor"
            class="text-input"
            type="text"
            placeholder="After I..."
            autocomplete="off"
            [value]="anchor()"
            (input)="anchor.set($any($event.target).value)"
          />
        </fieldset>

        <label class="field-label" for="new-habit">And then I'll...</label>
        <input
          id="new-habit"
          class="text-input"
          type="text"
          placeholder="e.g. Stretch"
          autocomplete="off"
          [value]="habit()"
          (input)="habit.set($any($event.target).value)"
        />

        <label class="field-label" for="new-mini">2-minute version</label>
        <input
          id="new-mini"
          class="text-input"
          type="text"
          autocomplete="off"
          [placeholder]="suggestion() || 'e.g. Touch my toes once'"
          [value]="mini()"
          (input)="mini.set($any($event.target).value)"
        />

        <button type="submit" class="btn-primary" [disabled]="!canSave()">Add routine</button>
      </form>
    </main>
  `,
  styleUrl: './routines.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewRoutine {
  private readonly store = inject(HabitStore);
  private readonly router = inject(Router);

  protected readonly anchor = signal('');
  protected readonly habit = signal('');
  protected readonly mini = signal('');
  private readonly saving = signal(false);

  /** Starter anchors the person isn't already using. */
  protected readonly unusedAnchors = computed(() => {
    const used = new Set(this.store.activeRoutines().map((r) => r.anchor.toLowerCase()));
    return STARTER_ANCHORS.filter((a) => !used.has(a.anchor.toLowerCase()));
  });
  protected readonly suggestion = computed(() => suggestTwoMinuteVersion(this.habit()));
  protected readonly canSave = computed(
    () => !!this.anchor().trim() && !!this.habit().trim() && !this.saving(),
  );

  protected async save(): Promise<void> {
    if (!this.canSave()) return;
    this.saving.set(true);
    try {
      const preset = STARTER_ANCHORS.find((a) => a.anchor === this.anchor());
      const routine = await this.store.createChain({
        anchor: this.anchor(),
        usualTime: preset?.usualTime,
        habitName: this.habit(),
        twoMinuteVersion: this.mini().trim() || this.suggestion(),
      });
      await this.router.navigate(['/routines', routine.id]);
    } finally {
      this.saving.set(false);
    }
  }
}
