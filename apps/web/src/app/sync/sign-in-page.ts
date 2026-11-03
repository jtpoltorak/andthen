import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  type OnInit,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HabitStore } from '../data/habit-store';
import { SignInForm } from './sign-in-form';
import { signInErrorMessage } from './sync-api';
import { SyncService } from './sync.service';

/**
 * `/sign-in`: where the link in the sign-in email lands (`?email=…&code=…`),
 * and where a new device starts when the person already uses AndThen elsewhere.
 */
@Component({
  selector: 'app-sign-in-page',
  imports: [SignInForm, RouterLink],
  template: `
    <main class="page">
      <h1 tabindex="-1">Sync across devices</h1>
      @switch (state()) {
        @case ('working') {
          <p role="status">Signing you in and syncing…</p>
        }
        @case ('form') {
          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <p class="hint">
            Sign in with the email you use for AndThen. Your routines and check-ins will sync to
            this device.
          </p>
          <app-sign-in-form [initialEmail]="email() ?? ''" (signedIn)="done()" />
        }
      }
      <a class="back" routerLink="/">Not now</a>
    </main>
  `,
  styles: `
    .page {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 28px 20px 24px;
      font-size: 15px;
      line-height: 1.5;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .hint {
      color: var(--muted);
    }
    .error {
      color: var(--danger);
      font-weight: 600;
    }
    .back {
      align-self: center;
      min-height: 44px;
      line-height: 44px;
      color: var(--accent-ink);
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage implements OnInit {
  private readonly sync = inject(SyncService);
  private readonly store = inject(HabitStore);
  private readonly router = inject(Router);

  /** From the sign-in link's query string. */
  readonly email = input<string>();
  readonly code = input<string>();

  protected readonly state = signal<'working' | 'form'>('form');
  protected readonly error = signal('');

  ngOnInit(): void {
    const email = this.email();
    const code = this.code();
    if (email && code) void this.useLink(email, code);
  }

  private async useLink(email: string, code: string): Promise<void> {
    this.state.set('working');
    try {
      await this.sync.signIn(email, code);
      await this.done();
    } catch (e) {
      this.error.set(signInErrorMessage(e));
      this.state.set('form');
    }
  }

  protected async done(): Promise<void> {
    await this.store.load();
    await this.router.navigateByUrl(this.store.hasRoutines() ? '/today' : '/welcome');
  }
}
