import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Privacy } from '../privacy/privacy';
import { copyrightYears } from './copyright';
import { Terms } from './terms';

async function render<T>(component: Type<T>) {
  TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('copyright years', () => {
  it('shows just 2026 in the first year, then a range', () => {
    expect(copyrightYears('2026-11-04')).toBe('2026');
    expect(copyrightYears('2028-01-02')).toBe('2026–2028');
  });
});

describe('Terms of Use', () => {
  it('covers the essentials and links to Privacy', async () => {
    const root = await render(Terms);
    const text = root.textContent ?? '';
    expect(text).toContain('at least 13 years old');
    expect(text).toContain('Not medical advice');
    expect(text).toContain('Commonwealth of Pennsylvania');
    expect(text).toContain('Jonathan T. Poltorak. All rights reserved.');
    expect(root.querySelector('a[href="/privacy"]')).toBeTruthy();
  });
});

describe('Privacy', () => {
  it('lists your rights, links to the Terms, and carries the copyright', async () => {
    const root = await render(Privacy);
    const text = root.textContent ?? '';
    expect(text).toContain('Your rights');
    expect(text).toContain('Children');
    expect(root.querySelector('a[href="/terms"]')).toBeTruthy();
    expect(text).toContain('All rights reserved.');
  });
});
