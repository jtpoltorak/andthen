import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { toDayKey } from '@andthen/core';
import { downloadJson } from '../settings/data-backup';
import { Autofocus, byId, focusAfterRender } from '../shared/focus';
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
  imports: [SignInForm, RouterLink, Autofocus],
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

      <h3>Your account</h3>
      <a class="link" routerLink="/privacy">Privacy: what's stored, and where</a>
      @if (!confirmingDelete()) {
        <div class="row wrap">
          <button type="button" class="btn-outline" [disabled]="busy()" (click)="downloadAccount()">
            Download account data
          </button>
          <button
            type="button"
            class="btn-text danger"
            id="delete-account-open"
            [disabled]="busy()"
            (click)="confirmingDelete.set(true)"
          >
            Delete account…
          </button>
        </div>
        @if (savedName()) {
          <p class="hint" role="status">Saved {{ savedName() }}. Check your downloads folder.</p>
        }
      } @else {
        <div class="confirm" role="group" aria-labelledby="delete-account-title">
          <p appAutofocus id="delete-account-title" class="confirm-title" tabindex="-1">
            Delete your sync account?
          </p>
          <p>
            This deletes {{ sync.email() }} and the copy of your habits on our server, and stops
            sync on all your devices. Everything already on your devices stays there. It can't be
            undone.
          </p>
          <div class="row">
            <button type="button" class="btn-danger" [disabled]="busy()" (click)="deleteAccount()">
              Delete my account
            </button>
            <button type="button" class="btn-text" [disabled]="busy()" (click)="cancelDelete()">
              Cancel
            </button>
          </div>
        </div>
      }
      @if (accountError()) {
        <p class="error" role="alert">{{ accountError() }}</p>
      }
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
        @if (sync.accountDeleted()) {
          <p role="status">
            Your sync account was deleted. Everything on this device is still here.
          </p>
        }
        <button type="button" class="btn-outline" id="sync-open" (click)="signingIn.set(true)">
          Set up sync…
        </button>
        <a class="link" routerLink="/privacy">How sync handles your data</a>
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
    h3 {
      margin: 8px 0 0;
      font-size: 16px;
      font-weight: 800;
    }
    .wrap {
      flex-wrap: wrap;
    }
    .link {
      align-self: flex-start;
      color: var(--accent-ink);
      font-weight: 700;
    }
    .danger {
      color: var(--danger);
    }
    .btn-danger {
      height: 48px;
      padding: 0 18px;
      border: none;
      border-radius: 12px;
      background: var(--danger-fill);
      color: var(--on-accent);
      font-size: 15px;
      font-weight: 700;
    }
    .btn-danger:disabled {
      background: var(--disabled);
    }
    .confirm {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px;
      border: 1.5px solid var(--danger);
      border-radius: 16px;
    }
    .confirm-title {
      font-weight: 800;
      color: var(--danger);
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
  protected readonly confirmingDelete = signal(false);
  protected readonly savedName = signal('');
  protected readonly accountError = signal('');
  private readonly injector = inject(Injector);

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

  protected async downloadAccount(): Promise<void> {
    this.busy.set(true);
    this.accountError.set('');
    try {
      const file = await this.sync.exportAccount();
      this.savedName.set(downloadJson(`andthen-account-${toDayKey(new Date())}.json`, file));
    } catch {
      this.accountError.set(
        "Couldn't download your account data. Check your connection and try again.",
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async deleteAccount(): Promise<void> {
    this.busy.set(true);
    this.accountError.set('');
    try {
      await this.sync.deleteAccount();
      this.confirmingDelete.set(false);
      focusAfterRender(this.injector, byId('sync-open'));
    } catch {
      this.accountError.set(
        "Couldn't delete your account just now, so nothing changed. Try again.",
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected cancelDelete(): void {
    this.confirmingDelete.set(false);
    focusAfterRender(this.injector, byId('delete-account-open'));
  }

  protected async turnOff(): Promise<void> {
    this.busy.set(true);
    try {
      await this.sync.turnOff();
    } finally {
      this.busy.set(false);
    }
  }
}
