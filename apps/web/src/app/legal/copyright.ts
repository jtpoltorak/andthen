import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BUILD_DATE } from '../about/version.generated';

export const COPYRIGHT_HOLDER = 'Jonathan T. Poltorak';
const FIRST_YEAR = 2026;

/** "2026", or "2026–2028" once later years have come around. */
export function copyrightYears(buildDate: string = BUILD_DATE): string {
  const year = Number(buildDate.slice(0, 4));
  return year > FIRST_YEAR ? `${FIRST_YEAR}–${year}` : `${FIRST_YEAR}`;
}

/** The one-line copyright notice, shown in About, on the welcome screen and under reading pages. */
@Component({
  selector: 'app-copyright',
  template: `© {{ years }} {{ holder }}. All rights reserved.`,
  styles: `
    :host {
      display: block;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Copyright {
  protected readonly years = copyrightYears();
  protected readonly holder = COPYRIGHT_HOLDER;
}
