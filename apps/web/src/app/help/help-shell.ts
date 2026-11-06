import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HELP_ARTICLES, HELP_PARTS, type HelpArticleInfo } from './help-articles';
import { filterArticles } from './help-home';

/**
 * The frame around every Help page. On phones it adds nothing. On laptops (900px and up)
 * every topic is listed in a sidebar on the left, and the page reads in a wider column.
 */
@Component({
  selector: 'app-help-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="help-shell">
      <nav class="side" aria-label="Help topics">
        <a class="rail-brand" routerLink="/today">
          <svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true">
            <circle cx="8" cy="15" r="5" fill="currentColor" />
            <path d="M13 15h4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="22.5" cy="15" r="5" fill="none" stroke="currentColor" stroke-width="2.5" />
          </svg>
          <span>AndThen</span>
          <span class="visually-hidden">: back to the app</span>
        </a>
        <a
          class="topic home"
          routerLink="/help"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          [routerLinkActiveOptions]="{ exact: true }"
          >All help topics</a
        >
        <label class="visually-hidden" for="help-side-filter">Find a topic</label>
        <input
          id="help-side-filter"
          class="filter"
          type="search"
          autocomplete="off"
          placeholder="Find a topic"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
          (keydown.escape)="query.set('')"
        />
        @if (query().trim()) {
          <p class="count" role="status">
            {{ results().length }} {{ results().length === 1 ? 'topic' : 'topics' }}
          </p>
          <ul>
            @for (a of results(); track a.slug) {
              <li>
                <a
                  class="topic"
                  [routerLink]="['/help', a.slug]"
                  routerLinkActive="active"
                  ariaCurrentWhenActive="page"
                  >{{ a.title }}</a
                >
              </li>
            }
          </ul>
        } @else {
          @for (part of parts; track part.id) {
            <h2 class="part">{{ part.title }}</h2>
            <ul>
              @for (a of byPart(part.id); track a.slug) {
                <li>
                  <a
                    class="topic"
                    [routerLink]="['/help', a.slug]"
                    routerLinkActive="active"
                    ariaCurrentWhenActive="page"
                    >{{ a.title }}</a
                  >
                </li>
              }
            </ul>
          }
        }
      </nav>
      <div class="content"><router-outlet /></div>
    </div>
  `,
  styles: `
    .side {
      display: none;
    }

    @media (min-width: 900px) {
      .help-shell {
        display: grid;
        grid-template-columns: var(--rail-width) minmax(0, 1fr);
        align-items: start;
      }
      .side {
        position: sticky;
        top: 0;
        display: flex;
        flex-direction: column;
        height: calc(100dvh / var(--zoom));
        overflow-y: auto;
        padding: var(--rail-padding);
        scrollbar-gutter: stable;
        border-right: 1px solid var(--border);
        background: var(--surface);
      }
      .part {
        margin: 18px 14px 4px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .topic {
        display: flex;
        align-items: center;
        min-height: 34px;
        padding: 6px 14px;
        border-radius: 10px;
        color: var(--ink-soft);
        font-size: 14px;
        font-weight: 600;
        line-height: 1.3;
        text-decoration: none;
      }
      .topic:hover {
        background: var(--bg);
        color: var(--ink);
      }
      .topic.active {
        background: var(--accent-soft);
        color: var(--accent-ink);
        font-weight: 700;
      }
      .home {
        font-weight: 700;
      }
      .filter {
        width: 100%;
        min-height: 40px;
        margin: 10px 0 4px;
        padding: 0 12px;
        border: 1.5px solid var(--input-border);
        border-radius: 10px;
        background: var(--bg);
        color: var(--ink);
        font: inherit;
        font-size: 14px;
      }
      .filter:focus-visible {
        outline: 3px solid var(--focus);
        outline-offset: 1px;
      }
      .count {
        margin: 8px 14px 4px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpShell {
  protected readonly parts = HELP_PARTS;
  protected readonly query = signal('');
  protected readonly results = computed(() => filterArticles(this.query()));
  protected byPart(part: string): readonly HelpArticleInfo[] {
    return HELP_ARTICLES.filter((a) => a.part === part);
  }
}
