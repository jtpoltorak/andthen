import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Copyright } from '../legal/copyright';
import { BackButton } from '../shared/back-button';
import { HELP_PARTS, helpArticle, type HelpArticleInfo } from './help-articles';

/** The frame around every help article: title, reading time, related reads, way back. */
@Component({
  selector: 'app-help-article',
  imports: [BackButton, RouterLink, Copyright],
  template: `
    <main class="reading">
      <app-back-button />
      @if (info(); as a) {
        <p class="eyebrow">{{ partTitle() }} · {{ a.minutes }} min read</p>
        <h1 tabindex="-1">{{ a.title }}</h1>
        <ng-content />
        @if (related().length) {
          <nav class="related" aria-labelledby="related-title">
            <h2 id="related-title">Read next</h2>
            <ul>
              @for (r of related(); track r.slug) {
                <li>
                  <a [routerLink]="['/help', r.slug]">{{ r.title }}</a>
                </li>
              }
            </ul>
          </nav>
        }
      }
      <a class="all" routerLink="/help">All help topics</a>
      <app-copyright />
    </main>
  `,
  styles: `
    .eyebrow {
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .related {
      margin-top: 16px;
      padding: 16px 20px;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface);
    }
    .related h2 {
      margin: 0 0 4px;
      font-size: 16px;
    }
    .related ul {
      list-style: none;
      padding: 0;
    }
    .related a,
    .all {
      display: inline-flex;
      align-items: center;
      min-height: 40px;
    }
    .all {
      align-self: flex-start;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpArticle {
  readonly slug = input.required<string>();

  protected readonly info = computed(() => helpArticle(this.slug()));
  protected readonly partTitle = computed(
    () => HELP_PARTS.find((p) => p.id === this.info()?.part)?.title ?? 'Help',
  );
  protected readonly related = computed(() =>
    (this.info()?.related ?? [])
      .map((slug) => helpArticle(slug))
      .filter((a): a is HelpArticleInfo => !!a),
  );
}
