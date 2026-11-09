import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { readJson, writeJson } from '@web/data/local-store';
import { signInErrorMessage } from '@web/sync/sync-api';
import { SyncService } from '@web/sync/sync.service';
import { WEB_APP_URL } from './links';

/** Where a sign-in in progress waits while the popup is closed (to read the email). */
export const PENDING_KEY = 'andthen.ext.signIn';
/** Codes last 10 minutes on the server; after that, start over. */
export const PENDING_MS = 10 * 60 * 1000;

interface Pending {
  email: string;
  sentAt: number;
}

function readPending(now = Date.now()): Pending | undefined {
  const value = readJson(PENDING_KEY) as Partial<Pending> | undefined;
  if (typeof value?.email !== 'string' || typeof value.sentAt !== 'number') return undefined;
  return now - value.sentAt < PENDING_MS ? (value as Pending) : undefined;
}

function clearPending(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing stored.
  }
}

/**
 * Email, then the 6-digit code. Like the app's sign-in form, but made for a popup:
 * the popup closes while you check your email, so the step is remembered for the
 * ten minutes the code lasts, and the email's link (which opens the website) isn't
 * needed here.
 */
@Component({
  selector: 'ext-sign-in',
  template: `
    <h2 class="title" id="sign-in-title">Sign in to sync</h2>
    @if (step() === 'email') {
      <form class="form" (submit)="$event.preventDefault(); send()" aria-labelledby="sign-in-title">
        <p class="quiet">
          Use the email you use for sync in the AndThen app. Your routines will match on every
          device.
        </p>
        <label class="field-label" for="ext-email">Your email</label>
        <input
          id="ext-email"
          class="text-input"
          type="email"
          autocomplete="email"
          autocapitalize="off"
          spellcheck="false"
          required
          [value]="email()"
          (input)="email.set($any($event.target).value)"
        />
        <p class="quiet small">
          We'll email you a code. No password needed. By continuing, you agree to the
          <a [href]="webAppUrl + '/terms'" target="_blank" rel="noopener">Terms of Use</a> and
          <a [href]="webAppUrl + '/privacy'" target="_blank" rel="noopener">Privacy policy</a>.
        </p>
        <button type="submit" class="primary" [disabled]="!email().trim() || busy()">
          {{ busy() ? 'Sending…' : 'Email me a code' }}
        </button>
      </form>
    } @else {
      <form
        class="form"
        (submit)="$event.preventDefault(); verify()"
        aria-labelledby="sign-in-title"
      >
        <p>
          We sent a 6-digit code to <strong>{{ email().trim() }}</strong
          >. You can close this and come back with it.
        </p>
        <label class="field-label" for="ext-code">Code</label>
        <input
          id="ext-code"
          class="text-input code"
          type="text"
          autocomplete="one-time-code"
          inputmode="numeric"
          maxlength="8"
          [value]="code()"
          (input)="code.set($any($event.target).value)"
        />
        <button type="submit" class="primary" [disabled]="!code().trim() || busy()">
          {{ busy() ? 'Signing in…' : 'Sign in and sync' }}
        </button>
        <div class="row">
          <button type="button" class="text-btn" [disabled]="busy()" (click)="send()">
            Send a new code
          </button>
          <button type="button" class="text-btn" [disabled]="busy()" (click)="changeEmail()">
            Use a different email
          </button>
        </div>
      </form>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    <button type="button" class="text-btn back" (click)="cancel()">Back</button>
  `,
  styles: `
    :host,
    .form {
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
    }
    .quiet {
      color: var(--muted);
    }
    .small {
      font-size: 12px;
    }
    a {
      color: var(--accent-ink);
      font-weight: 700;
    }
    .field-label {
      margin: 4px 0 0;
      font-size: 13px;
    }
    .text-input {
      height: 42px;
      font-size: 15px;
    }
    .code {
      letter-spacing: 0.3em;
      font-size: 18px;
      font-weight: 700;
    }
    .primary {
      height: 42px;
      border: 0;
      border-radius: 12px;
      background: var(--accent);
      color: var(--on-accent);
      font-weight: 700;
    }
    .primary:disabled {
      background: var(--disabled);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
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
    .error {
      color: var(--danger);
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignIn {
  private readonly sync = inject(SyncService);

  readonly signedIn = output<void>();
  readonly cancelled = output<void>();

  protected readonly webAppUrl = WEB_APP_URL;
  private readonly pending = readPending();
  protected readonly step = signal<'email' | 'code'>(this.pending ? 'code' : 'email');
  protected readonly email = signal(this.pending?.email ?? '');
  protected readonly code = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected async send(): Promise<void> {
    if (!this.email().trim() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.sync.sendCode(this.email());
      writeJson(PENDING_KEY, { email: this.email().trim(), sentAt: Date.now() });
      this.code.set('');
      this.step.set('code');
    } catch (e) {
      this.error.set(signInErrorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async verify(): Promise<void> {
    if (!this.code().trim() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.sync.signIn(this.email(), this.code().replace(/\s/g, ''));
      clearPending();
      this.signedIn.emit();
    } catch (e) {
      this.error.set(signInErrorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected changeEmail(): void {
    clearPending();
    this.step.set('email');
    this.error.set('');
  }

  protected cancel(): void {
    clearPending();
    this.cancelled.emit();
  }
}
