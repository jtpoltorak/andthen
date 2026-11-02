import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { type Habit, suggestTwoMinuteVersion } from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { Autofocus, byId, focusAfterRender } from '../shared/focus';

/** What is open for editing: the anchor, one habit, or nothing. */
type Editing = { kind: 'anchor' } | { kind: 'habit'; id: string } | undefined;

/**
 * Edits one routine chain: its anchor, and the habits that follow it.
 * Add, rename, reorder (up/down), and remove links. Changes save right away.
 */
@Component({
  selector: 'app-chain-editor',
  imports: [RouterLink, Autofocus],
  templateUrl: './chain-editor.html',
  styleUrl: './routines.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChainEditor {
  private readonly store = inject(HabitStore);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  /** Route param `:id`, bound by the router. */
  readonly id = input.required<string>();

  protected readonly routine = computed(() => {
    const r = this.store.routine(this.id());
    return r && !r.archivedOn ? r : undefined;
  });
  protected readonly habits = computed(() => this.store.habitsOf(this.id()));

  protected readonly editing = signal<Editing>(undefined);
  protected readonly confirmingRemoveRoutine = signal(false);

  // Drafts for whichever form is open.
  protected readonly draftAnchor = signal('');
  protected readonly draftTime = signal('');
  protected readonly draftName = signal('');
  protected readonly draftMini = signal('');

  // The "+ and then..." form.
  protected readonly adding = signal(false);
  protected readonly newName = signal('');
  protected readonly newMini = signal('');
  protected readonly newSuggestion = computed(() => suggestTwoMinuteVersion(this.newName()));

  protected isEditingHabit(habit: Habit): boolean {
    const e = this.editing();
    return e?.kind === 'habit' && e.id === habit.id;
  }

  protected editAnchor(): void {
    const r = this.routine();
    if (!r) return;
    this.draftAnchor.set(r.anchor);
    this.draftTime.set(r.usualTime ?? '');
    this.editing.set({ kind: 'anchor' });
  }

  protected async saveAnchor(): Promise<void> {
    if (!this.draftAnchor().trim()) return;
    await this.store.updateRoutine(this.id(), {
      anchor: this.draftAnchor(),
      usualTime: this.draftTime() || undefined,
    });
    this.cancel();
  }

  protected editHabit(habit: Habit): void {
    this.draftName.set(habit.name);
    this.draftMini.set(habit.twoMinuteVersion);
    this.adding.set(false);
    this.editing.set({ kind: 'habit', id: habit.id });
  }

  protected async saveHabit(habit: Habit): Promise<void> {
    const name = this.draftName().trim();
    if (!name) return;
    await this.store.updateHabit(habit.id, {
      name,
      twoMinuteVersion: this.draftMini().trim() || suggestTwoMinuteVersion(name),
    });
    this.cancel();
  }

  protected async removeHabit(habit: Habit): Promise<void> {
    await this.store.archiveHabit(habit.id);
    this.editing.set(undefined);
    focusAfterRender(this.injector, byId('add-habit'));
  }

  /** Moves a habit, keeping focus on its arrow (or the other one, at the top or bottom). */
  protected async move(habit: Habit, by: number): Promise<void> {
    await this.store.moveHabit(habit.id, by);
    const [same, other] = by < 0 ? ['up', 'down'] : ['down', 'up'];
    focusAfterRender(this.injector, () => {
      const button = document.getElementById(`${same}-${habit.id}`) as HTMLButtonElement | null;
      return button && !button.disabled ? button : document.getElementById(`${other}-${habit.id}`);
    });
  }

  protected startAdding(): void {
    this.editing.set(undefined);
    this.newName.set('');
    this.newMini.set('');
    this.adding.set(true);
  }

  protected async addHabit(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;
    await this.store.addLink(this.id(), name, this.newMini().trim() || this.newSuggestion());
    // Stay open so a few habits can be added in a row.
    this.newName.set('');
    this.newMini.set('');
  }

  /** Closes whichever form is open and puts focus back on the button that opened it. */
  protected cancel(): void {
    const editing = this.editing();
    const returnTo = this.adding()
      ? 'add-habit'
      : editing?.kind === 'habit'
        ? `edit-${editing.id}`
        : editing?.kind === 'anchor'
          ? 'edit-anchor'
          : undefined;
    this.editing.set(undefined);
    this.adding.set(false);
    if (returnTo) focusAfterRender(this.injector, byId(returnTo));
  }

  protected keepRoutine(): void {
    this.confirmingRemoveRoutine.set(false);
    focusAfterRender(this.injector, byId('remove-routine'));
  }

  protected async removeRoutine(): Promise<void> {
    await this.store.archiveRoutine(this.id());
    await this.router.navigate(['/routines']);
  }
}
