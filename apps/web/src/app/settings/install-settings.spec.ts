import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InstallPrompt } from '../shared/install-prompt';
import { InstallSettings } from './install-settings';

/** A stand-in for Chrome's install event. */
function installEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  };
  event.prompt = vi.fn(() => Promise.resolve());
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe('InstallSettings', () => {
  async function setup() {
    TestBed.configureTestingModule({ imports: [InstallSettings], providers: [provideRouter([])] });
    const install = TestBed.inject(InstallPrompt);
    const fixture = TestBed.createComponent(InstallSettings);
    await fixture.whenStable();
    return { fixture, install, root: fixture.nativeElement as HTMLElement };
  }

  it('has no way to install until the browser offers one (outside iOS Safari)', async () => {
    const { install } = await setup();
    expect(install.way()).toBe('none');
  });

  it('shows the browser prompt from a button, then hides once installed', async () => {
    const { fixture, install, root } = await setup();
    const event = installEvent('accepted');
    window.dispatchEvent(event);
    await fixture.whenStable();
    expect(event.defaultPrevented).toBe(true);
    expect(install.way()).toBe('prompt');

    const button = [...root.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Install AndThen'),
    )!;
    button.click();
    await fixture.whenStable();
    await Promise.resolve();
    expect(event.prompt).toHaveBeenCalled();
    expect(install.way()).toBe('none');
  });

  it('keeps nothing to offer after a dismissed prompt, since it can only show once', async () => {
    const { install } = await setup();
    window.dispatchEvent(installEvent('dismissed'));
    expect(await install.install()).toBe(false);
    expect(install.way()).toBe('none');
  });
});
