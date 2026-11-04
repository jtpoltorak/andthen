import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AboutCard } from './about-card';
import { AppUpdates } from './app-updates';
import { RELEASES } from './release-notes';
import { UpdateBanner } from './update-banner';
import { APP_VERSION } from './version.generated';
import { WhatsNew } from './whats-new';

async function render<T>(component: Type<T>) {
  TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

describe('About card', () => {
  it('shows the version and links to What’s new and Privacy', async () => {
    const { root } = await render(AboutCard);
    expect(root.textContent).toContain(`AndThen ${APP_VERSION}`);
    expect(root.querySelector('a[href="/whats-new"]')).toBeTruthy();
    expect(root.querySelector('a[href="/privacy"]')).toBeTruthy();
  });
});

describe('What’s new', () => {
  it('lists every release', async () => {
    const { root } = await render(WhatsNew);
    expect(root.querySelectorAll('h2').length).toBe(RELEASES.length);
    expect(root.textContent).toContain(RELEASES[0].notes[0]);
  });

  it('clears the “Updated” banner once read', async () => {
    localStorage.setItem('andthen.lastSeenVersion', JSON.stringify('0.0.1'));
    TestBed.configureTestingModule({ imports: [WhatsNew], providers: [provideRouter([])] });
    const updates = TestBed.inject(AppUpdates);
    expect(updates.justUpdatedTo()).toBe(APP_VERSION);
    TestBed.createComponent(WhatsNew);
    expect(updates.justUpdatedTo()).toBeNull();
  });
});

describe('Update banner', () => {
  beforeEach(() => localStorage.clear());

  it('stays out of the way when there is nothing to say', async () => {
    const { root } = await render(UpdateBanner);
    expect(root.textContent?.trim()).toBe('');
  });

  it('offers a reload when a new version is ready', async () => {
    const { fixture, root } = await render(UpdateBanner);
    const updates = TestBed.inject(AppUpdates);
    const reload = vi.spyOn(updates, 'reload').mockResolvedValue();
    updates.ready.set(true);
    await fixture.whenStable();
    const button = root.querySelector('button')!;
    expect(button.textContent).toContain('Reload');
    button.click();
    expect(reload).toHaveBeenCalled();
  });

  it('points to What’s new after an update', async () => {
    const { fixture, root } = await render(UpdateBanner);
    TestBed.inject(AppUpdates).justUpdatedTo.set('9.9.9');
    await fixture.whenStable();
    expect(root.textContent).toContain('Updated to AndThen 9.9.9');
    expect(root.querySelector('a[href="/whats-new"]')).toBeTruthy();
  });
});
