import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MAX_CHECKIN_NOTE, MOODS, MOOD_LABELS, describeJournal, type Mood } from '@andthen/core';
import { HabitStore } from '../data/habit-store';

/**
 * The tiny journal, under a habit just checked off: one tap for how it felt,
 * and a few optional words. Saves to today's check-in.
 */
@Component({
  selector: 'app-check-in-journal',
  template: `
    @if (open()) {
      <form
        class="box"
        [attr.aria-label]="'How did ' + habitName() + ' feel?'"
        (submit)="$event.preventDefault(); save()"
        (keydown.escape)="closed.emit()"
      >
        <div class="journal-q">How did it feel?</div>
        <div class="moods">
          @for (m of moods; track m) {
            <button
              type="button"
              class="mood"
              [class.mood-on]="mood() === m"
              [attr.aria-pressed]="mood() === m"
              (click)="setMood(m)"
            >
              {{ moodLabels[m] }}
            </button>
          }
        </div>
        <div class="note-row">
          <input
            class="note-input"
            type="text"
            autocomplete="off"
            placeholder="A few words, if you like"
            aria-label="A few words about it"
            [attr.maxlength]="maxNote"
            [value]="draft()"
            (input)="draft.set($any($event.target).value)"
          />
          <button type="submit" class="note-save">Save</button>
        </div>
      </form>
    } @else if (words(); as saved) {
      <div class="line">
        <span class="words">{{ saved }}</span>
        <button type="button" class="edit" (click)="opened.emit()">
          Edit<span class="visually-hidden"> note for {{ habitName() }}</span>
        </button>
      </div>
    } @else {
      <button type="button" class="add" (click)="opened.emit()">
        + How did it feel?<span class="visually-hidden"> {{ habitName() }}</span>
      </button>
    }
  `,
  styles: `
    .box {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
      padding: 12px;
      border-radius: 14px;
      background: var(--accent-soft);
    }
    .journal-q {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent-ink);
    }
    .moods {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .mood {
      min-height: 36px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1.5px solid var(--input-border);
      background: var(--surface);
      color: var(--ink);
      font-size: 14px;
      font-weight: 600;
    }
    .mood-on {
      border-color: var(--accent);
      background: var(--accent);
      color: var(--on-accent);
    }
    .note-row {
      display: flex;
      gap: 6px;
    }
    .note-input {
      flex: 1;
      min-width: 0;
      height: 40px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1.5px solid var(--input-border);
      background: var(--surface);
      color: var(--ink);
      font-size: 15px;
    }
    .note-save {
      height: 40px;
      padding: 0 14px;
      border: none;
      border-radius: 10px;
      background: var(--accent);
      color: var(--on-accent);
      font-size: 14px;
      font-weight: 700;
    }
    .line {
      margin-top: 4px;
      font-size: 13px;
      line-height: 1.4;
      color: var(--muted);
    }
    .words {
      font-style: italic;
    }
    .edit,
    .add {
      min-height: 24px;
      padding: 2px 4px;
      border: none;
      background: none;
      color: var(--accent-ink);
      font-size: 13px;
      font-weight: 700;
    }
    .edit {
      text-decoration: underline;
    }
    .add {
      margin-top: 2px;
      padding-left: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckInJournal {
  private readonly store = inject(HabitStore);
  readonly habitId = input.required<string>();
  readonly habitName = input.required<string>();
  /** Shows the "how did it feel?" box; otherwise the saved words, or a link to add some. */
  readonly open = input(false);
  readonly opened = output<void>();
  /** Saved or dismissed. */
  readonly closed = output<void>();

  protected readonly moods = MOODS;
  protected readonly moodLabels = MOOD_LABELS;
  protected readonly maxNote = MAX_CHECKIN_NOTE;
  protected readonly draft = signal('');

  protected readonly words = computed(() => {
    const checkIn = this.store.todaysCheckIn(this.habitId());
    return checkIn ? describeJournal(checkIn) : '';
  });

  constructor() {
    // Each time the box opens, start from the saved note.
    effect(() => {
      if (this.open())
        this.draft.set(untracked(() => this.store.todaysCheckIn(this.habitId())?.note ?? ''));
    });
  }

  protected mood(): Mood | undefined {
    return this.store.todaysCheckIn(this.habitId())?.mood;
  }

  /** Tapping the picked mood again clears it. */
  protected async setMood(mood: Mood): Promise<void> {
    await this.store.journal(this.habitId(), { mood: this.mood() === mood ? null : mood });
  }

  /** Saves the note (if it changed) and closes. */
  protected async save(): Promise<void> {
    const note = this.draft();
    if (note.trim() !== (this.store.todaysCheckIn(this.habitId())?.note ?? '')) {
      await this.store.journal(this.habitId(), { note });
    }
    this.closed.emit();
  }
}
