import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Copyright } from '../legal/copyright';
import { BackButton } from '../shared/back-button';
import { HELP_ARTICLES, HELP_PARTS, type HelpArticleInfo } from './help-articles';

/** Lower-cased words of an article, for the filter box. */
const haystack = (a: HelpArticleInfo) =>
  `${a.title} ${a.summary} ${a.keywords}`.toLowerCase().replace(/[’']/g, '');

/** Articles matching every word typed, in reading order. */
export function filterArticles(query: string): HelpArticleInfo[] {
  const words = query.toLowerCase().replace(/[’']/g, '').split(/\s+/).filter(Boolean);
  if (!words.length) return [...HELP_ARTICLES];
  return HELP_ARTICLES.filter((a) => words.every((w) => haystack(a).includes(w)));
}

/** `/help`: every article, grouped, with a filter box. */
@Component({
  selector: 'app-help-home',
  imports: [BackButton, RouterLink, Copyright],
  template: `
    <main class="reading">
      <app-back-button />
      <h1 tabindex="-1">Help</h1>
      <p class="lede">
        How habits stick, how AndThen works, and what to do when something doesn’t.
      </p>

      <label class="field-label" for="help-filter">Find a topic</label>
      <input
        id="help-filter"
        class="text-input"
        type="search"
        autocomplete="off"
        placeholder="e.g. reminders, skip, backup"
        [value]="query()"
        (input)="query.set($any($event.target).value)"
      />

      @if (query().trim()) {
        <p class="muted" role="status">
          {{ results().length }} {{ results().length === 1 ? 'topic' : 'topics' }}
        </p>
        @if (results().length) {
          <ul class="topics">
            @for (a of results(); track a.slug) {
              <li>
                <a [routerLink]="['/help', a.slug]">{{ a.title }}</a>
                <span class="summary">{{ a.summary }}</span>
              </li>
            }
          </ul>
        } @else {
          <p>
            Nothing matches that. Try another word, or email
            <a href="mailto:hello@andthenhabits.com">hello&#64;andthenhabits.com</a>.
          </p>
        }
      } @else {
        @for (part of parts; track part.id) {
          <section [attr.aria-labelledby]="'part-' + part.id">
            <h2 [id]="'part-' + part.id">{{ part.title }}</h2>
            <p class="muted">{{ part.intro }}</p>
            <ul class="topics">
              @for (a of byPart(part.id); track a.slug) {
                <li>
                  <a [routerLink]="['/help', a.slug]">{{ a.title }}</a>
                  <span class="summary">{{ a.summary }}</span>
                </li>
              }
            </ul>
          </section>
        }
      }

      <p class="muted more">
        See also: <a routerLink="/whats-new">What’s new</a> · <a routerLink="/privacy">Privacy</a> ·
        <a routerLink="/terms">Terms of Use</a>
      </p>
      <app-copyright />
    </main>
  `,
  styles: `
    .field-label {
      margin: 8px 0 0;
    }
    section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .reading .topics {
      list-style: none;
      margin: 4px 0 0;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface);
    }
    .topics li {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 12px 18px;
    }
    .topics li + li {
      border-top: 1px solid var(--border);
    }
    .summary {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.45;
    }
    .more {
      margin-top: 12px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpHome {
  protected readonly parts = HELP_PARTS;
  protected readonly query = signal('');
  protected readonly results = computed(() => filterArticles(this.query()));
  protected byPart(part: string): readonly HelpArticleInfo[] {
    return HELP_ARTICLES.filter((a) => a.part === part);
  }
}
