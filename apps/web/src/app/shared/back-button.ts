import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * "‹ Back" for pages that open on top of the app (Privacy, What's new). Goes back
 * to where the person came from, or into the app if they opened the page directly.
 */
@Component({
  selector: 'app-back-button',
  template: `<button type="button" (click)="back()">‹ Back</button>`,
  styles: `
    :host {
      align-self: flex-start;
    }
    button {
      min-height: 44px;
      padding: 0;
      border: none;
      background: none;
      color: var(--accent-ink);
      font-size: 15px;
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackButton {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  protected back(): void {
    // Angular numbers in-app navigations; 1 is the page the app was opened on.
    if ((history.state?.navigationId ?? 1) > 1) this.location.back();
    else void this.router.navigateByUrl('/');
  }
}
