import {
  ChangeDetectionStrategy,
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  type BackupData,
  type BackupSummary,
  backupFileName,
  fromDayKey,
  parseBackup,
  toDayKey,
} from '@andthen/core';
import { HabitStore } from '../data/habit-store';

type Status =
  | { kind: 'idle' }
  | { kind: 'saved'; fileName: string }
  | { kind: 'error'; message: string }
  | { kind: 'confirm'; data: BackupData; summary: BackupSummary; fileName: string }
  | { kind: 'restoring' }
  | { kind: 'restored' };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const dayLabel = (day: string) =>
  fromDayKey(day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

/** Saves everything on this device as a JSON file in the downloads folder. Returns its name. */
export function downloadBackup(store: HabitStore, now = new Date()): string {
  const fileName = backupFileName(toDayKey(now));
  const blob = new Blob([JSON.stringify(store.backup(now), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}

/**
 * Back up everything on this device to a JSON file, or restore from one.
 * Restoring always shows what's in the file and asks before replacing anything.
 */
@Component({
  selector: 'app-data-backup',
  template: `
    @if (!restoreOnly()) {
      <p class="hint">
        Your routines and check-ins live only in this browser. Save a backup file now and then, and
        keep it somewhere safe, like your cloud drive.
      </p>
      <button type="button" class="btn-small" (click)="download()">Back up my data</button>
    }

    <input
      #picker
      type="file"
      accept="application/json,.json"
      class="visually-hidden"
      tabindex="-1"
      aria-hidden="true"
      (change)="pick(picker)"
    />

    @switch (status().kind) {
      @case ('confirm') {
        @if (confirming(); as c) {
          <div class="confirm" role="group" aria-labelledby="restore-title">
            <p id="restore-title" class="confirm-title">Restore {{ c.fileName }}?</p>
            <p>{{ describe(c.summary) }}</p>
            @if (hasData()) {
              <p class="warn">
                This replaces everything on this device. If you might want what's here now, back it
                up first.
              </p>
            }
            <div class="actions">
              <button type="button" class="btn-small danger-fill" (click)="confirmRestore(c.data)">
                {{ hasData() ? 'Replace my data' : 'Restore' }}
              </button>
              <button type="button" class="btn-text" (click)="reset()">Cancel</button>
            </div>
          </div>
        }
      }
      @default {
        <button
          type="button"
          [class]="restoreOnly() ? 'btn-text' : 'btn-outline'"
          [disabled]="status().kind === 'restoring'"
          (click)="picker.click()"
        >
          Restore from a backup
        </button>
      }
    }

    <p class="status" role="status" aria-live="polite">
      @switch (status().kind) {
        @case ('saved') {
          Saved {{ savedName() }}. Check your downloads folder.
        }
        @case ('restoring') {
          Restoring…
        }
        @case ('restored') {
          All set. Your data is back.
        }
      }
    </p>
    @if (errorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
    .hint {
      font-size: 15px;
      line-height: 1.5;
      color: var(--muted);
    }
    .btn-small,
    .btn-outline {
      height: 48px;
      padding: 0 18px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
    }
    .btn-small {
      border: none;
      background: var(--accent);
      color: var(--on-accent);
    }
    .btn-small.danger-fill {
      background: var(--danger-fill);
    }
    .btn-outline {
      border: 1.5px solid var(--input-border);
      background: var(--surface);
      color: var(--accent-ink);
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
      gap: 8px;
      padding: 16px;
      border: 1.5px solid var(--border);
      border-radius: 16px;
      background: var(--surface);
      font-size: 15px;
      line-height: 1.5;
    }
    .confirm-title {
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    .warn {
      color: var(--danger);
      font-weight: 600;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    .status,
    .error {
      font-size: 14px;
      line-height: 1.5;
    }
    .status:empty {
      display: none;
    }
    .error {
      color: var(--danger);
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataBackup {
  private readonly store = inject(HabitStore);

  /** Show only the restore button (used on the welcome screen). */
  readonly restoreOnly = input(false, { transform: booleanAttribute });
  /** Fires after a backup has been restored. */
  readonly restored = output<void>();

  protected readonly status = signal<Status>({ kind: 'idle' });
  protected readonly hasData = computed(
    () => this.store.routines().length > 0 || this.store.checkIns().length > 0,
  );
  protected readonly confirming = computed(() => {
    const s = this.status();
    return s.kind === 'confirm' ? s : undefined;
  });
  protected readonly savedName = computed(() => {
    const s = this.status();
    return s.kind === 'saved' ? s.fileName : '';
  });
  protected readonly errorMessage = computed(() => {
    const s = this.status();
    return s.kind === 'error' ? s.message : '';
  });

  protected download(): void {
    this.status.set({ kind: 'saved', fileName: downloadBackup(this.store) });
  }

  protected async pick(picker: HTMLInputElement): Promise<void> {
    const file = picker.files?.[0];
    picker.value = ''; // Picking the same file again should still fire (change).
    if (file) await this.readFile(file);
  }

  /** Reads and checks a chosen file, then asks before restoring it. */
  async readFile(file: File): Promise<void> {
    if (file.size > 20 * 1024 * 1024) {
      this.status.set({ kind: 'error', message: 'That file is too big to be an AndThen backup.' });
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      this.status.set({ kind: 'error', message: "Couldn't read that file. Try again." });
      return;
    }
    const result = parseBackup(text);
    this.status.set(
      result.ok
        ? { kind: 'confirm', data: result.data, summary: result.summary, fileName: file.name }
        : { kind: 'error', message: result.error },
    );
  }

  protected async confirmRestore(data: BackupData): Promise<void> {
    this.status.set({ kind: 'restoring' });
    try {
      await this.store.restore(data);
      this.status.set({ kind: 'restored' });
      this.restored.emit();
    } catch {
      this.status.set({
        kind: 'error',
        message: 'Something went wrong, so nothing was changed. Try again.',
      });
    }
  }

  protected reset(): void {
    this.status.set({ kind: 'idle' });
  }

  protected describe(s: BackupSummary): string {
    const parts = [
      plural(s.routines, 'routine'),
      plural(s.habits, 'habit'),
      plural(s.checkIns, 'check-in'),
    ];
    let text = `It has ${parts[0]}, ${parts[1]}, and ${parts[2]}`;
    if (s.firstDay && s.lastDay) {
      text +=
        s.firstDay === s.lastDay
          ? ` from ${dayLabel(s.firstDay)}`
          : ` from ${dayLabel(s.firstDay)} to ${dayLabel(s.lastDay)}`;
    }
    return `${text}.`;
  }
}
