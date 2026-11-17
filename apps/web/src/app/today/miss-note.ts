import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import {
  MAX_CHECKIN_NOTE,
  MISS_REASONS,
  MISS_REASON_LABELS,
  describeMissNote,
  missNoteOn,
  type DayKey,
  type MissReason,
} from '@andthen/core';
import { HabitStore } from '../data/habit-store';

/**
 * "What got in the way?": an optional note on a missed day, one tap and a few
 * words. It never opens on its own; it's a small link beside the miss, there
 * for the person who wants to spot a pattern. Saved notes add up on This week.
 */
@Component({
  selector: 'app-miss-note',
  template: `
    @if (open()) {
      <form
        class="box"
        [attr.aria-label]="'What got in the way of ' + habitName() + '?'"
        (submit)="$event.preventDefault(); save()"
        (keydown.escape)="open.set(false)"
      >
        <div class="q">What got in the way {{ when() }}?</div>
        <p class="hint">Optional. Just for you, to spot patterns.</p>
        <div class="reasons">
          @for (r of reasons; track r) {
            <button
              type="button"
              class="reason"
              [class.reason-on]="reason() === r"
              [attr.aria-pressed]="reason() === r"
              (click)="reason.set(reason() === r ? undefined : r)"
            >
              {{ labels[r] }}
            </button>
          }
        </div>
        <input
          class="note-input"
          type="text"
          autocomplete="off"
          placeholder="A few words, if you like"
          aria-label="A few words about what got in the way"
          [attr.maxlength]="maxNote"
          [value]="draft()"
          (input)="draft.set($any($event.target).value)"
        />
        <div class="actions">
          <button type="submit" class="save">Save</button>
          <button type="button" class="later" (click)="open.set(false)">Not now</button>
        </div>
      </form>
    } @else if (saved(); as words) {
      <div class="line">
        <span class="noted">Noted: {{ words }}</span>
        <button type="button" class="edit" (click)="start()">
          Edit<span class="visually-hidden"> what got in the way of {{ habitName() }}</span>
        </button>
      </div>
    } @else {
      <button type="button" class="add" (click)="start()">
        + What got in the way?<span class="visually-hidden"> {{ habitName() }}</span>
      </button>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .box {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 8px 0 4px;
      padding: 14px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: var(--bg);
    }
    .q {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
    }
    .hint {
      margin: -6px 0 2px;
      font-size: 12.5px;
      color: var(--muted);
    }
    .reasons {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .reason {
      min-height: 34px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1.5px solid var(--input-border);
      background: var(--surface);
      color: var(--ink-soft);
      font-size: 13px;
      font-weight: 600;
    }
    .reason-on {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent-ink);
    }
    .note-input {
      height: 40px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1.5px solid var(--input-border);
      background: var(--surface);
      color: var(--ink);
      font-size: 15px;
    }
    .actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .save {
      height: 38px;
      padding: 0 18px;
      border: none;
      border-radius: 10px;
      background: var(--accent);
      color: var(--on-accent);
      font-size: 14px;
      font-weight: 700;
    }
    .later {
      height: 38px;
      padding: 0 10px;
      border: none;
      background: none;
      color: var(--muted);
      font-size: 14px;
      font-weight: 600;
    }
    .line {
      margin: 2px 0 6px;
      font-size: 13px;
      line-height: 1.4;
      color: var(--muted);
    }
    .noted {
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
      margin: 0 0 4px -4px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissNote {
  private readonly store = inject(HabitStore);
  readonly habitId = input.required<string>();
  readonly habitName = input.required<string>();
  /** The missed day. */
  readonly date = input.required<DayKey>();
  /** "yesterday", or "on Monday". */
  readonly when = input('yesterday');

  protected readonly reasons = MISS_REASONS;
  protected readonly labels = MISS_REASON_LABELS;
  protected readonly maxNote = MAX_CHECKIN_NOTE;
  protected readonly open = signal(false);
  protected readonly reason = signal<MissReason | undefined>(undefined);
  protected readonly draft = signal('');

  private readonly note = computed(() => {
    const habit = this.store.habits().find((h) => h.id === this.habitId());
    return habit ? missNoteOn(habit, this.date()) : undefined;
  });
  protected readonly saved = computed(() => {
    const note = this.note();
    return note ? describeMissNote(note) : '';
  });

  /** Opens the box with what was saved before, if anything. */
  protected start(): void {
    this.reason.set(this.note()?.reason);
    this.draft.set(this.note()?.note ?? '');
    this.open.set(true);
  }

  protected async save(): Promise<void> {
    await this.store.noteMiss(this.habitId(), this.date(), {
      reason: this.reason(),
      note: this.draft(),
    });
    this.open.set(false);
  }
}
