import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { HelpSlug } from './help-articles';

/**
 * A small round "?" that opens the help article for the screen or setting next to it.
 * Its accessible name says which topic it opens. It only imports the article list's
 * types, so the list itself stays out of the main bundle.
 */
@Component({
  selector: 'app-help-link',
  imports: [RouterLink],
  template: `
    <a
      [routerLink]="['/help', slug()]"
      [attr.aria-label]="'Help: ' + title()"
      [attr.title]="'Help: ' + title()"
      >?</a
    >
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      color: var(--muted);
      font-size: 15px;
      font-weight: 800;
      text-decoration: none;
    }
    a::before {
      content: '';
      position: absolute;
      width: 26px;
      height: 26px;
      border: 1.5px solid currentColor;
      border-radius: 50%;
    }
    a {
      position: relative;
    }
    a:hover {
      color: var(--accent-ink);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpLink {
  readonly slug = input.required<HelpSlug>();
  protected readonly title = computed(() => this.slug().replace(/-/g, ' '));
}
