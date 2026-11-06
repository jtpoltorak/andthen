import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InstallPrompt } from '../shared/install-prompt';

/** "Install AndThen": one tap where the browser allows it, or the Share-menu steps on iPhone. */
@Component({
  selector: 'app-install-settings',
  imports: [RouterLink],
  template: `
    <div class="install">
      <img class="icon" src="icons/icon-192.png" alt="" width="48" height="48" />
      <p class="hint">
        Open AndThen from your home screen or dock, in its own window. It works offline, and
        reminders arrive while it's open.
      </p>
    </div>
    @if (install.way() === 'prompt') {
      <button type="button" class="btn-small" (click)="install.install()">Install AndThen</button>
    } @else {
      <p class="hint">
        On iPhone or iPad: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
        <a routerLink="/help/install">More help</a>
      </p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .install {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .icon {
      flex: none;
      border-radius: 12px;
    }
    .hint {
      font-size: 15px;
      line-height: 1.5;
      color: var(--muted);
    }
    .hint strong {
      color: var(--ink);
    }
    .hint a {
      color: var(--accent-ink);
      font-weight: 700;
    }
    .btn-small {
      height: 48px;
      padding: 0 18px;
      border: none;
      border-radius: 12px;
      background: var(--accent);
      color: var(--on-accent);
      font-size: 15px;
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallSettings {
  protected readonly install = inject(InstallPrompt);
}
