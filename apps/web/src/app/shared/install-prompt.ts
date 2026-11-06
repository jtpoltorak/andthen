import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';

/** Chrome, Edge and Samsung Internet's install event. Not in the DOM typings yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Knows whether AndThen can be installed from here, and how.
 * - `prompt`: the browser offered an install prompt (Chrome, Edge, Android), so one tap does it.
 * - `ios`: Safari on iPhone or iPad, which installs from the Share menu instead.
 * - `none`: already installed, or a browser that can't install.
 * Created at boot (in App), because the browser fires its install event only once, early.
 */
@Injectable({ providedIn: 'root' })
export class InstallPrompt {
  private readonly document = inject(DOCUMENT);
  private readonly deferred = signal<BeforeInstallPromptEvent | undefined>(undefined);
  private readonly installed = signal(false);

  readonly way = computed((): 'prompt' | 'ios' | 'none' => {
    if (this.installed() || this.standalone()) return 'none';
    if (this.deferred()) return 'prompt';
    return this.isIosSafari() ? 'ios' : 'none';
  });

  constructor() {
    const win = this.document.defaultView;
    win?.addEventListener('beforeinstallprompt', (event) => {
      // Keep the browser's own mini-infobar from popping up; Settings offers it instead.
      event.preventDefault();
      this.deferred.set(event as BeforeInstallPromptEvent);
    });
    win?.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.deferred.set(undefined);
    });
  }

  /** Shows the browser's install prompt. Returns true if the person said yes. */
  async install(): Promise<boolean> {
    const event = this.deferred();
    if (!event) return false;
    this.deferred.set(undefined); // A prompt can only be shown once.
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') this.installed.set(true);
    return outcome === 'accepted';
  }

  private standalone(): boolean {
    const win = this.document.defaultView;
    return (
      !!win?.matchMedia?.('(display-mode: standalone)').matches ||
      (win?.navigator as (Navigator & { standalone?: boolean }) | undefined)?.standalone === true
    );
  }

  private isIosSafari(): boolean {
    const nav = this.document.defaultView?.navigator;
    if (!nav) return false;
    const ua = nav.userAgent;
    // iPadOS reports itself as a Mac, but with touch.
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1);
    // Other iOS browsers (Chrome, Firefox, Edge) add their own token.
    return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  }
}
