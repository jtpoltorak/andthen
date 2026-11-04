import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HELP_ARTICLES, HELP_PARTS, helpArticle } from './help-articles';
import { HelpHome, filterArticles } from './help-home';
import { HelpLink } from './help-link';
import { HELP_COMPONENTS, HELP_ROUTES } from './help.routes';

describe('help articles', () => {
  it('have unique slugs, a known part, and related reads that exist', () => {
    const slugs = HELP_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const a of HELP_ARTICLES) {
      expect(
        HELP_PARTS.some((p) => p.id === a.part),
        a.slug,
      ).toBe(true);
      for (const r of a.related) expect(helpArticle(r), `${a.slug} → ${r}`).toBeTruthy();
      expect(r(a.related).includes(a.slug), `${a.slug} relates to itself`).toBe(false);
    }
  });

  it('each has a route', () => {
    for (const a of HELP_ARTICLES) {
      expect(
        HELP_ROUTES.some((route) => route.path === a.slug),
        a.slug,
      ).toBe(true);
    }
  });

  it.each(HELP_ARTICLES.map((a) => [a.slug, a] as const))(
    '%s renders its title and a real body, with working in-app links',
    async (slug, article) => {
      TestBed.configureTestingModule({ providers: [provideRouter(HELP_ROUTES.map((x) => x))] });
      const fixture = TestBed.createComponent(HELP_COMPONENTS[slug]);
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('h1')?.textContent).toBe(article.title);
      expect(root.textContent!.length).toBeGreaterThan(400);
      // Every link to another help article points at one that exists.
      for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href^="/help/"]')) {
        const target = link.getAttribute('href')!.slice('/help/'.length);
        expect(helpArticle(target), `${slug} links to ${target}`).toBeTruthy();
      }
    },
  );
});

/** Keeps `related` readable as a plain string array in the test above. */
function r(related: readonly string[]): readonly string[] {
  return related;
}

describe('help filter', () => {
  it('shows everything for an empty query', () => {
    expect(filterArticles('  ').length).toBe(HELP_ARTICLES.length);
  });

  it('matches titles, summaries and keywords, every word', () => {
    expect(filterArticles('reminders').map((a) => a.slug)).toContain('no-reminders');
    expect(filterArticles('iphone install').map((a) => a.slug)).toEqual(['install']);
    expect(filterArticles('dont miss').map((a) => a.slug)).toContain('nudges');
    expect(filterArticles('zebra')).toEqual([]);
  });

  it('narrows the list as you type', async () => {
    TestBed.configureTestingModule({ imports: [HelpHome], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HelpHome);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.topics li').length).toBe(HELP_ARTICLES.length);

    const input = root.querySelector<HTMLInputElement>('#help-filter')!;
    input.value = 'backup';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const shown = root.querySelectorAll('.topics li').length;
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(HELP_ARTICLES.length);
  });
});

describe('help link', () => {
  it('names the article it opens', async () => {
    TestBed.configureTestingModule({ imports: [HelpLink], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HelpLink);
    fixture.componentRef.setInput('slug', 'reminders');
    await fixture.whenStable();
    const a = (fixture.nativeElement as HTMLElement).querySelector('a')!;
    expect(a.getAttribute('href')).toBe('/help/reminders');
    expect(a.getAttribute('aria-label')).toBe('Help: reminders');
  });
});
