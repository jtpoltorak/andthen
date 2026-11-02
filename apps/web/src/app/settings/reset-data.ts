import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Autofocus, byId, focusAfterRender } from '../shared/focus';
import { HabitStore } from '../data/habit-store';
import { clearLocalSettings } from '../data/local-store';
import { PreferencesStore } from '../data/preferences';
import { Reminders } from '../reminders/reminders';
import { downloadBackup } from './data-backup';

/** The word to type before the delete button wakes up. */
export const RESET_WORD = 'reset';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Start over: deletes all habit data and settings on this device. It asks twice,
 * offers a backup first, and needs the word "reset" typed before it does anything.
 */
@Component({
  selector: 'app-reset-data',
  imports: [Autofocus],
  template: `
    @if (!open()) {
      <p class="hint">
        Delete all your routines, check-ins and settings on this device, and begin again from the
        welcome screen.
      </p>
      <button type="button" class="btn-outline danger" id="reset-open" (click)="open.set(true)">
        Reset everything…
      </button>
    } @else {
      <div class="confirm" role="group" aria-labelledby="reset-title">
        <p appAutofocus id="reset-title" class="confirm-title" tabindex="-1">Reset everything?</p>
        <p>
          This deletes {{ summary() }}, plus your name, look and reminder settings, from this
          device. It can't be undone.
        </p>

        @if (hasData()) {
          <div class="backup">
            <p>Want a copy first? A backup file lets you restore it all later.</p>
            <button type="button" class="btn-outline" (click)="backUp()">Back up my data</button>
            @if (savedName(); as name) {
              <p class="saved" role="status">Saved {{ name }}. Check your downloads folder.</p>
            }
          </div>
        }

        <label class="field-label" for="reset-word">Type “{{ word }}” to confirm</label>
        <input
          id="reset-word"
          class="text-input"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          [value]="typed()"
          (input)="typed.set($any($event.target).value)"
          (keydown.enter)="confirm()"
        />

        <div class="actions">
          <button
            type="button"
            class="btn-small danger-fill"
            [disabled]="!ready() || busy()"
            (click)="confirm()"
          >
            Delete everything
          </button>
          <button type="button" class="btn-text" [disabled]="busy()" (click)="cancel()">
            Cancel
          </button>
        </div>
      </div>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .hint {
      font-size: 15px;
      line-height: 1.5;
      color: var(--muted);
    }
    .btn-outline,
    .btn-small {
      height: 48px;
      padding: 0 18px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
    }
    .btn-outline {
      border: 1.5px solid var(--input-border);
      background: var(--surface);
      color: var(--accent-ink);
    }
    .btn-outline.danger {
      color: var(--danger);
    }
    .btn-small {
      border: none;
      background: var(--danger-fill);
      color: var(--on-accent);
    }
    .btn-small:disabled {
      background: var(--disabled);
    }
    .btn-text {
      min-height: 44px;
      padding: 0 10px;
      border: none;
      background: none;
      color: var(--accent-ink);
      font-size: 15px;
      font-weight: 700;
    }
    .confirm {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px;
      border: 1.5px solid var(--danger);
      border-radius: 16px;
      font-size: 15px;
      line-height: 1.5;
    }
    .confirm-title {
      font-weight: 800;
      color: var(--danger);
    }
    .backup {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      border-radius: 12px;
      background: var(--accent-soft);
    }
    .saved {
      font-size: 14px;
    }
    .field-label {
      margin: 4px 0 0;
    }
    .text-input:focus-visible {
      outline: 3px solid var(--focus);
      outline-offset: 2px;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .error {
      font-size: 14px;
      line-height: 1.5;
      color: var(--danger);
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetData {
  private readonly store = inject(HabitStore);
  private readonly preferences = inject(PreferencesStore);
  private readonly reminders = inject(Reminders);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly word = RESET_WORD;
  protected readonly open = signal(false);
  protected readonly typed = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly savedName = signal('');

  protected readonly ready = computed(() => this.typed().trim().toLowerCase() === RESET_WORD);
  protected readonly hasData = computed(
    () => this.store.routines().length > 0 || this.store.checkIns().length > 0,
  );
  protected readonly summary = computed(() => {
    const routines = this.store.routines().length;
    const checkIns = this.store.checkIns().length;
    if (!routines && !checkIns) return 'everything';
    return `${plural(routines, 'routine')} and ${plural(checkIns, 'check-in')}`;
  });

  protected backUp(): void {
    this.savedName.set(downloadBackup(this.store));
  }

  protected cancel(): void {
    this.open.set(false);
    this.typed.set('');
    this.savedName.set('');
    this.error.set('');
    focusAfterRender(this.injector, byId('reset-open'));
  }

  protected async confirm(): Promise<void> {
    if (!this.ready() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.store.resetAll();
    } catch {
      this.busy.set(false);
      this.error.set('Something went wrong, so nothing was deleted. Try again.');
      return;
    }
    this.reminders.reset();
    this.preferences.reset();
    clearLocalSettings();
    await this.router.navigateByUrl('/welcome');
  }
}
