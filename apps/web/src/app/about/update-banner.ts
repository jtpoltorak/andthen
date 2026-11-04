import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppUpdates } from './app-updates';

/** A slim note at the top of every screen: an update is ready, or one just arrived. */
@Component({
  selector: 'app-update-banner',
  imports: [RouterLink],
  template: `
    @if (updates.ready()) {
      <div class="banner" role="status">
        <p>A new version of AndThen is ready.</p>
        <button type="button" class="action" (click)="updates.reload()">Reload</button>
      </div>
    } @else if (updates.justUpdatedTo(); as version) {
      <div class="banner" role="status">
        <p>Updated to AndThen {{ version }}.</p>
        <a class="action" routerLink="/whats-new">What's new</a>
        <button type="button" class="close" aria-label="Dismiss" (click)="updates.dismissUpdated()">
          ×
        </button>
      </div>
    }
  `,
  styles: `
    .banner {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 12px 0;
      padding: 6px 6px 6px 16px;
      border-radius: 14px;
      background: var(--accent-soft);
      font-size: 14px;
      font-weight: 600;
    }
    p {
      flex: 1;
    }
    .action {
      display: inline-flex;
      align-items: center;
      min-height: 40px;
      padding: 0 12px;
      border: none;
      border-radius: 10px;
      background: none;
      color: var(--accent-ink);
      font-size: 14px;
      font-weight: 800;
      text-decoration: none;
    }
    .close {
      width: 40px;
      height: 40px;
      border: none;
      background: none;
      color: var(--muted);
      font-size: 22px;
      line-height: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateBanner {
  protected readonly updates = inject(AppUpdates);
}
