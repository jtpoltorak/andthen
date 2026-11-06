import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Copyright } from '../legal/copyright';
import { BackButton } from '../shared/back-button';
import { HELP_PARTS, helpArticle, type HelpArticleInfo } from './help-articles';

/** The frame around every help article: title, reading time, related reads, way back. */
@Component({
  selector: 'app-help-article',
  imports: [BackButton, RouterLink, Copyright],
  template: `
    <div class="layout">
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
      @if (sections().length >= 3) {
        <!-- Wide screens only: the article's headings, to jump around a longer read. -->
        <nav class="toc" aria-labelledby="toc-title">
          <h2 id="toc-title">On this page</h2>
          <ul>
            @for (s of sections(); track s.id) {
              <li>
                <a [href]="'#' + s.id" (click)="jump($event, s.id)">{{ s.title }}</a>
              </li>
            }
          </ul>
        </nav>
      }
    </div>
  `,
  styles: `
    .toc {
      display: none;
    }
    @media (min-width: 1240px) {
      .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 220px;
        align-items: start;
        gap: 24px;
        max-width: 1000px;
        margin: 0 auto;
        padding-right: 24px;
      }
      .toc {
        position: sticky;
        top: 0;
        display: block;
        padding: 64px 0 24px;
      }
      .toc h2 {
        margin: 0 0 8px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .toc ul {
        margin: 0;
        padding: 0 0 0 12px;
        list-style: none;
        border-left: 2px solid var(--border);
      }
      .toc a {
        display: block;
        padding: 5px 0;
        color: var(--ink-soft);
        font-size: 14px;
        font-weight: 600;
        line-height: 1.35;
        text-decoration: none;
      }
      .toc a:hover {
        color: var(--accent-ink);
        text-decoration: underline;
      }
    }
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

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** The article's own section headings, for "On this page". */
  protected readonly sections = signal<{ id: string; title: string }[]>([]);

  constructor() {
    afterNextRender(() => {
      const headings = this.host.nativeElement.querySelectorAll<HTMLElement>('main.reading > h2');
      const used = new Set<string>();
      const found: { id: string; title: string }[] = [];
      for (const h of headings) {
        const title = h.textContent?.trim() ?? '';
        if (!title) continue;
        let id = h.id || `${this.slug()}-${slugify(title)}`;
        while (used.has(id)) id += '-2';
        used.add(id);
        h.id = id;
        found.push({ id, title });
      }
      this.sections.set(found);
    });
  }

  /** Scrolls to a heading and moves focus there, without changing the route. */
  protected jump(event: Event, id: string): void {
    event.preventDefault();
    const target = this.host.nativeElement.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!target) return;
    target.setAttribute('tabindex', '-1');
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  }

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

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
