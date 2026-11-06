import { TestBed } from '@angular/core/testing';
import { PreferencesStore } from '../data/preferences';
import { PreferenceSettings } from './preference-settings';

describe('PreferenceSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
    delete document.documentElement.dataset['accent'];
    delete document.documentElement.dataset['text'];
    delete document.documentElement.dataset['contrast'];
  });

  async function setup() {
    TestBed.configureTestingModule({ imports: [PreferenceSettings] });
    const fixture = TestBed.createComponent(PreferenceSettings);
    await fixture.whenStable();
    return {
      fixture,
      prefs: TestBed.inject(PreferencesStore),
      root: fixture.nativeElement as HTMLElement,
    };
  }

  it('saves a tidied name', async () => {
    const { fixture, prefs, root } = await setup();
    const input = root.querySelector<HTMLInputElement>('#pref-name')!;
    input.value = '  Sam   Lee ';
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(prefs.prefs().name).toBe('Sam Lee');
    expect(input.value).toBe('Sam Lee');
    expect(JSON.parse(localStorage.getItem('andthen.prefs')!).name).toBe('Sam Lee');
    expect(root.textContent).toContain('Hi, Sam Lee');
  });

  it('switches the theme on the page and remembers it', async () => {
    const { fixture, root } = await setup();
    expect(document.documentElement.dataset['theme']).toBe('system');

    const dark = root.querySelector<HTMLInputElement>('input[name="theme"][value="dark"]')!;
    dark.click();
    await fixture.whenStable();

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(JSON.parse(localStorage.getItem('andthen.prefs')!).theme).toBe('dark');
  });

  it('switches the accent color, and teal clears it again', async () => {
    const { fixture, root } = await setup();
    expect(document.documentElement.dataset['accent']).toBeUndefined();

    root.querySelector<HTMLInputElement>('input[name="accent"][value="plum"]')!.click();
    await fixture.whenStable();
    expect(document.documentElement.dataset['accent']).toBe('plum');
    expect(JSON.parse(localStorage.getItem('andthen.prefs')!).accent).toBe('plum');

    root.querySelector<HTMLInputElement>('input[name="accent"][value="teal"]')!.click();
    await fixture.whenStable();
    expect(document.documentElement.dataset['accent']).toBeUndefined();
  });

  it('colors the title bar with the accent in light mode, and dark in dark mode', async () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
    try {
      const { fixture, prefs } = await setup();
      prefs.setTheme('light');
      prefs.setAccent('plum');
      await fixture.whenStable();
      expect(meta.content).toBe('#7a4a86');

      prefs.setTheme('dark');
      await fixture.whenStable();
      expect(meta.content).toBe('#121815');
    } finally {
      meta.remove();
    }
  });

  it('turns on larger text and more contrast, and remembers them', async () => {
    const { fixture, root } = await setup();
    const [large, contrast] = root.querySelectorAll<HTMLInputElement>('input[role="switch"]');
    expect(large.checked).toBe(false);

    large.click();
    contrast.click();
    await fixture.whenStable();
    expect(document.documentElement.dataset['text']).toBe('large');
    expect(document.documentElement.dataset['contrast']).toBe('more');
    const saved = JSON.parse(localStorage.getItem('andthen.prefs')!);
    expect(saved.largeText).toBe(true);
    expect(saved.moreContrast).toBe(true);

    large.click();
    await fixture.whenStable();
    expect(document.documentElement.dataset['text']).toBeUndefined();
  });

  it('changes the first day of the week', async () => {
    const { fixture, prefs, root } = await setup();
    root.querySelectorAll<HTMLInputElement>('input[name="week-start"]')[1].click();
    await fixture.whenStable();
    expect(prefs.prefs().weekStartsOn).toBe(0);
  });
});
