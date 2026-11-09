import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { SyncService } from '@web/sync/sync.service';

/** Shown from the popup's footer: who's signed in, when it last synced, and a way out. */
@Component({
  selector: 'ext-sync-status',
  template: `
    <h2 class="title">Sync</h2>
    <p>
      Signed in as <strong>{{ sync.email() }}</strong
      >.
    </p>
    <p class="quiet" role="status">{{ statusText() }}</p>
    @if (sync.problem()) {
      <p class="error">{{ sync.problem() }}</p>
    }
    <div class="row">
      <button
        type="button"
        class="secondary"
        [disabled]="sync.phase() === 'syncing'"
        (click)="sync.syncNow()"
      >
        Sync now
      </button>
      @if (confirming()) {
        <button type="button" class="danger" (click)="turnOff()">Yes, turn off</button>
      } @else {
        <button type="button" class="text-btn" (click)="confirming.set(true)">Turn off sync</button>
      }
    </div>
    @if (confirming()) {
      <p class="quiet small">
        Your habits stay in this browser and on your other devices. This browser just stops syncing.
      </p>
    }
    <button type="button" class="text-btn back" (click)="closed.emit()">Back</button>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .title {
      font-size: 16px;
      font-weight: 700;
    }
    p {
      font-size: 13px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .quiet {
      color: var(--muted);
    }
    .small {
      font-size: 12px;
    }
    .error {
      color: var(--danger);
      font-weight: 600;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    .secondary,
    .danger {
      height: 38px;
      padding: 0 14px;
      border-radius: 12px;
      font-weight: 700;
    }
    .secondary {
      border: 1.5px solid var(--accent);
      background: var(--surface);
      color: var(--accent-ink);
    }
    .danger {
      border: 0;
      background: var(--danger-fill);
      color: #fff;
    }
    .text-btn {
      min-height: 32px;
      padding: 0 2px;
      border: 0;
      background: none;
      color: var(--accent-ink);
      font-size: 13px;
      font-weight: 700;
    }
    .back {
      align-self: flex-start;
      color: var(--muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncStatus {
  protected readonly sync = inject(SyncService);
  readonly closed = output<void>();
  protected readonly confirming = signal(false);

  protected readonly statusText = computed(() => {
    switch (this.sync.phase()) {
      case 'syncing':
        return 'Syncing…';
      case 'offline':
        return "You're offline. It'll sync when you're back.";
      case 'error':
        return "Couldn't sync just now.";
      default: {
        const at = this.sync.lastSyncedAt();
        return at
          ? `Last synced at ${new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.`
          : 'Up to date.';
      }
    }
  });

  protected async turnOff(): Promise<void> {
    await this.sync.turnOff();
    this.closed.emit();
  }
}
