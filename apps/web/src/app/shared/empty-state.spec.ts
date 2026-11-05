import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyState, type EmptyArt } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `<app-empty-state [art]="art" heading="Nothing yet"><p>Body text</p></app-empty-state>`,
})
class Host {
  art: EmptyArt = 'chain';
}

describe('EmptyState', () => {
  it.each<EmptyArt>(['chain', 'rest', 'pause', 'dots'])(
    'shows the %s drawing (hidden from screen readers), the heading and the text',
    async (art) => {
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.art = art;
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('.art[aria-hidden="true"] svg')).toBeTruthy();
      expect(root.querySelector('h2')?.textContent).toBe('Nothing yet');
      expect(root.textContent).toContain('Body text');
    },
  );
});
