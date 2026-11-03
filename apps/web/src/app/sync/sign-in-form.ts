import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  inject,
  input,
  output,
  type OnInit,
  signal,
} from '@angular/core';
import { Autofocus, byId, focusAfterRender } from '../shared/focus';
import { signInErrorMessage } from './sync-api';
import { SyncService } from './sync.service';

/** Email, then the 6-digit code from the email. Signing in turns sync on. */
@Component({
  selector: 'app-sign-in-form',
  imports: [Autofocus],
  template: `
    @if (step() === 'email') {
      <form class="form" (submit)="$event.preventDefault(); send()">
        <label class="field-label" for="sync-email">Your email</label>
        <input
          appAutofocus
          id="sync-email"
          class="text-input"
          type="email"
          autocomplete="email"
          inputmode="email"
          autocapitalize="off"
          spellcheck="false"
          required
          [value]="email()"
          (input)="email.set($any($event.target).value)"
        />
        <p class="hint">We'll email you a code. No password needed.</p>
        <button type="submit" class="btn-primary" [disabled]="!email().trim() || busy()">
          {{ busy() ? 'Sending…' : 'Email me a code' }}
        </button>
      </form>
    } @else {
      <form class="form" (submit)="$event.preventDefault(); verify()">
        <p id="code-sent" tabindex="-1">
          We sent a 6-digit code to <strong>{{ email().trim() }}</strong
          >. Enter it here, or tap the link in the email.
        </p>
        <label class="field-label" for="sync-code">Code</label>
        <input
          id="sync-code"
          class="text-input code"
          type="text"
          autocomplete="one-time-code"
          inputmode="numeric"
          maxlength="8"
          [value]="code()"
          (input)="code.set($any($event.target).value)"
        />
        <button type="submit" class="btn-primary" [disabled]="!code().trim() || busy()">
          {{ busy() ? 'Signing in…' : 'Sign in and sync' }}
        </button>
        <div class="row">
          <button type="button" class="btn-text" [disabled]="busy()" (click)="send()">
            Send a new code
          </button>
          <button type="button" class="btn-text" [disabled]="busy()" (click)="changeEmail()">
            Use a different email
          </button>
        </div>
      </form>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
  `,
  styles: `
    :host,
    .form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .field-label {
      margin: 0;
    }
    .hint,
    p {
      font-size: 15px;
      line-height: 1.5;
    }
    .hint {
      color: var(--muted);
    }
    .code {
      letter-spacing: 0.3em;
      font-size: 20px;
      font-weight: 700;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
    }
    .btn-text {
      min-height: 44px;
      padding: 0 4px;
      border: none;
      background: none;
      color: var(--accent-ink);
      font-size: 15px;
      font-weight: 700;
    }
    .error {
      font-size: 14px;
      color: var(--danger);
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInForm implements OnInit {
  private readonly sync = inject(SyncService);
  private readonly injector = inject(Injector);

  /** Fills the email field, for example from a sign-in link. */
  readonly initialEmail = input('');
  readonly signedIn = output<void>();

  protected readonly step = signal<'email' | 'code'>('email');
  protected readonly email = signal('');
  protected readonly code = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    if (this.initialEmail()) this.email.set(this.initialEmail());
  }

  protected async send(): Promise<void> {
    if (!this.email().trim() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.sync.sendCode(this.email());
      this.code.set('');
      this.step.set('code');
      focusAfterRender(this.injector, byId('sync-code'));
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
      this.signedIn.emit();
    } catch (e) {
      this.error.set(signInErrorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected changeEmail(): void {
    this.step.set('email');
    this.error.set('');
    focusAfterRender(this.injector, byId('sync-email'));
  }
}
