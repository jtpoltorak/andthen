import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { readJson, writeJson } from '../data/local-store';
import { APP_VERSION } from './version.generated';

const LAST_SEEN_KEY = 'andthen.lastSeenVersion';

/**
 * Tells people when a new version of AndThen is ready, and once they're on it.
 *
 * The service worker downloads new versions in the background. Without this, the
 * new version only appears after the app is fully closed and opened again, which
 * on an installed phone app can take days.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdates {
  // Not provided in dev builds or tests, where the service worker is off.
  private readonly sw = inject(SwUpdate, { optional: true });

  /** A new version is downloaded; reloading switches to it. */
  readonly ready = signal(false);
  /** The version this device just moved to, until the person dismisses the note. */
  readonly justUpdatedTo = signal<string | null>(null);

  constructor() {
    const lastSeen = readJson(LAST_SEEN_KEY);
    // A first visit has nothing to compare against, so there's nothing to announce.
    if (typeof lastSeen === 'string' && lastSeen !== APP_VERSION) {
      this.justUpdatedTo.set(APP_VERSION);
    }
    writeJson(LAST_SEEN_KEY, APP_VERSION);

    if (this.sw?.isEnabled) {
      this.sw.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') this.ready.set(true);
      });
      // The cached app is broken beyond repair (rare); a reload fetches a fresh copy.
      this.sw.unrecoverable.subscribe(() => this.ready.set(true));
    }
  }

  /** Whether this browser can update in the background at all. */
  get supported(): boolean {
    return !!this.sw?.isEnabled;
  }

  /**
   * Asks the server for a newer version. 'found' means the banner will show once
   * it has downloaded; 'failed' usually means offline.
   */
  async check(): Promise<'found' | 'none' | 'failed'> {
    if (!this.sw?.isEnabled) return 'failed';
    try {
      return (await this.sw.checkForUpdate()) ? 'found' : 'none';
    } catch {
      return 'failed';
    }
  }

  /** Switches to the downloaded version. */
  async reload(): Promise<void> {
    try {
      await this.sw?.activateUpdate();
    } catch {
      // Reloading picks up the new version anyway.
    }
    document.location.reload();
  }

  dismissUpdated(): void {
    this.justUpdatedTo.set(null);
  }
}
