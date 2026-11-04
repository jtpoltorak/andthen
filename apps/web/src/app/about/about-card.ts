import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppUpdates } from './app-updates';
import { APP_VERSION, BUILD_COMMIT, BUILD_DATE } from './version.generated';
import { releaseDay } from './release-day';

const RESULT_TEXT = {
  found: 'Downloading the new version…',
  none: "You're up to date.",
  failed: "Couldn't check. Are you online?",
} as const;

/** Settings card: which version this is, what changed, and where to ask questions. */
@Component({
  selector: 'app-about-card',
  imports: [RouterLink],
  template: `
    <p>
      <strong>AndThen {{ version }}</strong>
    </p>
    <p class="hint">
      Built {{ built }}
      @if (commit) {
        · {{ commit }}
      }
    </p>
    @if (updates.supported) {
      <div class="row">
        <button type="button" class="btn-outline" [disabled]="checking()" (click)="check()">
          Check for updates
        </button>
        @if (result(); as text) {
          <p class="hint" role="status">{{ text }}</p>
        }
      </div>
    }
    <nav class="links" aria-label="About AndThen">
      <a routerLink="/whats-new">What's new</a>
      <a routerLink="/privacy">Privacy</a>
    </nav>
    <p class="hint">
      Questions or ideas? Email
      <a href="mailto:hello@andthenhabits.com">hello&#64;andthenhabits.com</a>.
    </p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 15px;
      line-height: 1.5;
    }
    .hint {
      color: var(--muted);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 12px;
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
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 20px;
    }
    a {
      color: var(--accent-ink);
      font-weight: 700;
    }
    .links a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutCard {
  protected readonly updates = inject(AppUpdates);
  protected readonly version = APP_VERSION;
  protected readonly built = releaseDay(BUILD_DATE);
  protected readonly commit = BUILD_COMMIT;
  protected readonly checking = signal(false);
  protected readonly result = signal('');

  protected async check(): Promise<void> {
    this.checking.set(true);
    this.result.set('');
    const outcome = await this.updates.check();
    this.checking.set(false);
    // When one is found, the banner at the top takes it from here.
    this.result.set(RESULT_TEXT[outcome]);
  }
}
