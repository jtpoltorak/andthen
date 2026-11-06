import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/** The signed-in-free main app: page content above a bottom tab bar. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="page"><router-outlet /></div>
    <nav aria-label="Main">
      <a routerLink="/today" routerLinkActive="active" ariaCurrentWhenActive="page">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="2.5" />
          <path d="M6 8.5v7" />
          <circle cx="6" cy="18" r="2.5" />
          <path d="M12 6h8M12 18h8" />
        </svg>
        Today
      </a>
      <a routerLink="/routines" routerLinkActive="active" ariaCurrentWhenActive="page">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="16" height="6" rx="2" />
          <rect x="4" y="14" width="16" height="6" rx="2" />
        </svg>
        Routines
      </a>
      <a routerLink="/progress" routerLinkActive="active" ariaCurrentWhenActive="page">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="1.5" />
          <circle cx="12" cy="6" r="1.5" />
          <circle cx="18" cy="6" r="1.5" />
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="18" cy="12" r="1.5" />
          <circle cx="6" cy="18" r="1.5" />
          <circle cx="12" cy="18" r="1.5" />
        </svg>
        Progress
      </a>
      <a routerLink="/settings" routerLinkActive="active" ariaCurrentWhenActive="page">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"
          />
        </svg>
        Settings
      </a>
    </nav>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: calc(100dvh / var(--zoom));
    }
    .page {
      flex: 1;
    }
    nav {
      position: sticky;
      bottom: 0;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      padding: 8px 8px max(14px, env(safe-area-inset-bottom));
      border-top: 1px solid var(--border);
      background: var(--surface);
    }
    /* On wider screens the app sits in a centered column; frame the tab bar to match. */
    @media (min-width: 481px) {
      nav {
        border-inline: 1px solid var(--border);
      }
    }
    a {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      min-height: 48px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
    }
    a.active {
      color: var(--accent-ink);
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {}
