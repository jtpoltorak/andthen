import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BackButton } from '../shared/back-button';
import { AppUpdates } from './app-updates';
import { releaseDay } from './release-day';
import { RELEASES } from './release-notes';
import { APP_VERSION } from './version.generated';

/** `/whats-new`: every release, newest first. */
@Component({
  selector: 'app-whats-new',
  imports: [BackButton],
  template: `
    <main class="reading">
      <app-back-button />
      <h1 tabindex="-1">What's new</h1>
      <p class="lede">You're on AndThen {{ version }}.</p>

      @for (release of releases; track release.version) {
        <section [attr.aria-labelledby]="'v-' + release.version">
          <h2 [id]="'v-' + release.version">{{ release.version }}</h2>
          <p class="muted">{{ day(release.date) }}</p>
          @if (release.title) {
            <p>{{ release.title }}</p>
          }
          <ul>
            @for (note of release.notes; track $index) {
              <li>{{ note }}</li>
            }
          </ul>
        </section>
      }
    </main>
  `,
  styles: `
    section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsNew {
  protected readonly version = APP_VERSION;
  protected readonly releases = RELEASES;
  protected readonly day = releaseDay;

  constructor() {
    // Reading the notes is the point of the "Updated" banner, so it can go.
    inject(AppUpdates).dismissUpdated();
  }
}
