import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SignInForm } from './sign-in-form';
import { SyncService } from './sync.service';

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * Settings card: turn sync on by signing in with an email code, see how it's
 * going, sync by hand, or turn it off.
 */
@Component({
  selector: 'app-sync-settings',
  imports: [SignInForm],
  template: `
    @if (sync.enabled()) {
      <p>
        Syncing as <strong>{{ sync.email() }}</strong>
      </p>
      <p class="status" role="status">{{ statusText() }}</p>
      @if (sync.problem()) {
        <p class="error">{{ sync.problem() }}</p>
      }
      <div class="row">
        <button
          type="button"
          class="btn-outline"
          [disabled]="sync.phase() === 'syncing'"
          (click)="sync.syncNow()"
        >
          Sync now
        </button>
        <button type="button" class="btn-text" [disabled]="busy()" (click)="turnOff()">
          Turn off sync
        </button>
      </div>
      <p class="hint">
        Turning sync off signs this device out. Everything stays on this device, and your other
        devices keep syncing.
      </p>
    } @else {
      @if (sync.signedOutNotice()) {
        <p class="error" role="alert">
          This device was signed out, so sync is off. Sign in again to keep syncing.
        </p>
      }
      @if (!signingIn()) {
        <p class="hint">
          Keep your routines and check-ins on your phone, tablet and computer. Free, and the app
          still works offline. Sign in with your email to start.
        </p>
        <button type="button" class="btn-outline" id="sync-open" (click)="signingIn.set(true)">
          Set up sync…
        </button>
      } @else {
        <p class="hint">
          Your routines on this device will be added to your account. If the account already has a
          copy of something, the account's copy is kept.
        </p>
        <app-sign-in-form (signedIn)="signingIn.set(false)" />
        <button type="button" class="btn-text cancel" (click)="signingIn.set(false)">Cancel</button>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 15px;
      line-height: 1.5;
    }
    .hint,
    .status {
      color: var(--muted);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-outline {
      height: 48px;
      padding: 0 18px;
      border-radius: 12px;
      border: 1.5px solid var(--input-border);
      background: var(--surface);
      color: var(--accent-ink);
      font-size: 15px;
      font-weight: 700;
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
    .cancel {
      align-self: flex-start;
      padding: 0;
    }
    .error {
      font-size: 14px;
      color: var(--danger);
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncSettings {
  protected readonly sync = inject(SyncService);
  protected readonly signingIn = signal(false);
  protected readonly busy = signal(false);

  protected readonly statusText = computed(() => {
    const last = this.sync.lastSyncedAt();
    switch (this.sync.phase()) {
      case 'syncing':
        return 'Syncing…';
      case 'offline':
        return "You're offline. Changes will sync when you're back online.";
      case 'error':
        return last ? `Last synced at ${time(last)}.` : 'Not synced yet.';
      default:
        return last ? `Up to date. Last synced at ${time(last)}.` : 'Up to date.';
    }
  });

  protected async turnOff(): Promise<void> {
    this.busy.set(true);
    try {
      await this.sync.turnOff();
    } finally {
      this.busy.set(false);
    }
  }
}
