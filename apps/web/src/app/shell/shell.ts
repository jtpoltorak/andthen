import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/** The signed-in-free main app: page content above a bottom tab bar. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="page"><router-outlet /></div>
    <nav aria-label="Main">
      <!-- Shown only in the wide layout, at the top of the side rail. -->
      <a class="rail-brand" routerLink="/today" aria-label="AndThen, Today">
        <svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true">
          <circle cx="8" cy="15" r="5" fill="currentColor" />
          <path d="M13 15h4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
          <circle cx="22.5" cy="15" r="5" fill="none" stroke="currentColor" stroke-width="2.5" />
        </svg>
        <span>AndThen</span>
      </a>
      <a class="tab" routerLink="/today" routerLinkActive="active" ariaCurrentWhenActive="page">
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
      <a class="tab" routerLink="/routines" routerLinkActive="active" ariaCurrentWhenActive="page">
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
      <a class="tab" routerLink="/progress" routerLinkActive="active" ariaCurrentWhenActive="page">
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
      <a class="tab" routerLink="/settings" routerLinkActive="active" ariaCurrentWhenActive="page">
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
      /* Stays put while the screen beside it changes. */
      view-transition-name: app-nav;
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
    .tab {
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
    .tab.active {
      color: var(--accent-ink);
      font-weight: 700;
    }
    .rail-brand {
      display: none;
    }

    /* Laptops and desktops: the tabs move to a rail on the left, and pages get more room. */
    @media (min-width: 900px) {
      :host {
        display: grid;
        grid-template-columns: var(--rail-width) minmax(0, 1fr);
        align-items: start;
      }
      nav {
        grid-column: 1;
        grid-row: 1;
        top: 0;
        bottom: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
        height: calc(100dvh / var(--zoom));
        padding: var(--rail-padding);
        border-top: none;
        border-inline: none;
        border-right: 1px solid var(--border);
      }
      .page {
        grid-column: 2;
        grid-row: 1;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
      }
      .page:has(app-today) {
        max-width: 960px;
      }
      .page:has(app-habit-grid) {
        max-width: 1120px;
      }
      .tab {
        flex-direction: row;
        justify-content: flex-start;
        gap: 12px;
        padding: 0 14px;
        border-radius: 12px;
        font-size: 15px;
      }
      .tab:hover {
        background: var(--bg);
        color: var(--ink);
      }
      .tab.active {
        background: var(--accent-soft);
        color: var(--accent-ink);
      }
      .rail-brand {
        display: flex;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {}
