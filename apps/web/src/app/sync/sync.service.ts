import { Injectable, computed, inject, signal } from '@angular/core';
import type { BackupFile } from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { SyncingHabitRepository } from '../data/syncing-habit-repository';
import { ApiError, OfflineError, SyncApi } from './sync-api';

/** How many changes go up in one request. The server takes at most 1000. */
export const PUSH_BATCH = 1000;
/** Wait this long after an edit before syncing, so a burst of taps goes up together. */
export const EDIT_DELAY_MS = 3000;
/** While the app is open, sync this often even if nothing happened here. */
export const POLL_MS = 5 * 60 * 1000;
/** A safety stop for one sync, in round trips. Each one moves up to 1000 changes each way. */
const MAX_ROUNDS = 100;

export type SyncPhase = 'off' | 'idle' | 'syncing' | 'offline' | 'error';

/**
 * Keeps this device in step with the account, in the background.
 *
 * Think of the outbox as a stack of letters by the door: each sync posts them,
 * then collects the mail that arrived since the last visit (the cursor).
 * A sync runs when the app opens, when it comes back to the screen, when the
 * device comes back online, a few seconds after an edit, and every five minutes.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  // Optional so screens can be tested with an in-memory repository.
  private readonly repo = inject(SyncingHabitRepository, { optional: true });
  private readonly api = inject(SyncApi);
  private readonly store = inject(HabitStore);

  readonly phase = signal<SyncPhase>('off');
  readonly email = signal<string | undefined>(undefined);
  readonly lastSyncedAt = signal<number | undefined>(undefined);
  /** Shown under the sync status when something went wrong. */
  readonly problem = signal('');
  /** Set when the server signed this device out (session expired or removed elsewhere). */
  readonly signedOutNotice = signal(false);
  /** Set right after this device deleted the account. */
  readonly accountDeleted = signal(false);
  readonly enabled = computed(() => this.phase() !== 'off');

  private running?: Promise<void>;
  private again = false;
  private editTimer?: ReturnType<typeof setTimeout>;
  private pollTimer?: ReturnType<typeof setInterval>;
  private started = false;
  private readonly onOnline = () => void this.syncNow();
  private readonly onVisible = () => {
    if (document.visibilityState === 'visible') void this.syncNow();
  };

  /** Call once at app start. Reads the saved state and, if sync is on, syncs. */
  async start(): Promise<void> {
    if (!this.repo || this.started) return;
    this.started = true;
    this.repo.onLocalChange = () => this.syncSoon();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnline);
      document.addEventListener('visibilitychange', this.onVisible);
      this.pollTimer = setInterval(this.onVisible, POLL_MS);
    }
    const status = await this.repo.status();
    if (status.enabled && status.email) {
      this.email.set(status.email);
      this.phase.set('idle');
      await this.syncNow();
    }
  }

  /** Stops timers. Only tests need this. */
  stop(): void {
    clearTimeout(this.editTimer);
    clearInterval(this.pollTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnline);
      document.removeEventListener('visibilitychange', this.onVisible);
    }
    if (this.repo) this.repo.onLocalChange = undefined;
    this.started = false;
  }

  /** Asks the server to email a sign-in code. */
  sendCode(email: string): Promise<void> {
    return this.api.startEmail(email.trim());
  }

  /**
   * Signs in with an emailed code, turns sync on and runs the first sync.
   * Throws (and leaves sync off) when the code is wrong or the server can't be reached.
   */
  async signIn(email: string, code: string): Promise<void> {
    if (!this.repo) throw new Error('Sync is not available.');
    const { token, account } = await this.api.verifyEmail(email.trim(), code, deviceName());
    const previous = await this.repo.token();
    await this.repo.enable({ email: account.email, token });
    if (previous) void this.api.logout(previous).catch(() => undefined);
    this.email.set(account.email);
    this.signedOutNotice.set(false);
    this.accountDeleted.set(false);
    this.problem.set('');
    this.phase.set('idle');
    await this.syncNow();
  }

  /**
   * Turns sync off on this device and signs it out. Data on this device stays,
   * and so does the account's copy on the server and other devices.
   */
  async turnOff(): Promise<void> {
    if (!this.repo) return;
    const token = await this.repo.token();
    await this.stopLocally(this.repo);
    // Best effort: if this fails, the session simply expires on the server.
    if (token) await this.api.logout(token).catch(() => undefined);
  }

  /** A copy of everything the account holds on the server, as a backup file. */
  async exportAccount(): Promise<BackupFile> {
    const token = await this.repo?.token();
    if (!token) throw new Error('Sync is off.');
    return this.api.exportData(token);
  }

  /**
   * Deletes the account on the server: its copy of the data and every signed-in
   * device. Sync turns off here; data on this and other devices stays.
   */
  async deleteAccount(): Promise<void> {
    if (!this.repo) return;
    const token = await this.repo.token();
    if (token) await this.api.deleteAccount(token);
    await this.stopLocally(this.repo);
    this.accountDeleted.set(true);
  }

  /** Sync off on this device, and the screens told. */
  private async stopLocally(repo: SyncingHabitRepository): Promise<void> {
    clearTimeout(this.editTimer);
    await repo.disable();
    this.phase.set('off');
    this.email.set(undefined);
    this.lastSyncedAt.set(undefined);
    this.problem.set('');
  }

  /** Syncs in a few seconds, so several quick edits go up together. */
  syncSoon(): void {
    clearTimeout(this.editTimer);
    this.editTimer = setTimeout(() => this.syncNow(), EDIT_DELAY_MS);
  }

  /**
   * Syncs now. If a sync is already running, one more runs after it, so
   * nothing edited in the meantime waits for the next trigger.
   */
  syncNow(): Promise<void> {
    if (!this.repo || this.phase() === 'off') return Promise.resolve();
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.run(this.repo!);
        } while (this.again && this.phase() !== 'off');
      } finally {
        this.running = undefined;
      }
    })();
    return this.running;
  }

  private async run(repo: SyncingHabitRepository): Promise<void> {
    clearTimeout(this.editTimer);
    this.phase.set('syncing');
    let applied = 0;
    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const [status, token] = await Promise.all([repo.status(), repo.token()]);
        if (!status.enabled || !token || !status.deviceId) return;
        const sent = (await repo.pendingChanges()).slice(0, PUSH_BATCH);
        const res = await this.api.sync(token, {
          deviceId: status.deviceId,
          cursor: status.cursor,
          changes: sent,
        });
        await repo.acknowledge(sent);
        applied += await repo.applyRemote(res.changes, res.cursor);
        if (!res.more && (await repo.status()).pending === 0) break;
      }
      this.lastSyncedAt.set(Date.now());
      this.problem.set('');
      this.phase.set('idle');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // The session ended (expired, or this device was signed out from another one).
        await this.turnOff();
        this.signedOutNotice.set(true);
        return;
      }
      if (error instanceof OfflineError) {
        this.phase.set('offline');
        this.problem.set('');
      } else {
        this.phase.set('error');
        this.problem.set(syncErrorMessage(error));
      }
    } finally {
      // Show what other devices changed, even if a later round failed.
      if (applied > 0) await this.store.reload();
    }
  }
}

function syncErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'bad_change')
      return "Some data on this device couldn't be synced. Check the device's date and time.";
    if (error.status === 429) return 'Syncing too often. It will try again shortly.';
    if (error.status >= 500) return "The sync server is having trouble. It'll try again shortly.";
  }
  return "Couldn't sync. It'll try again shortly.";
}

/** A rough name for this device, shown later in the list of signed-in devices. */
function deviceName(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : /Linux/.test(ua)
              ? 'Linux'
              : '';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : '';
  return [browser, os].filter(Boolean).join(' on ') || undefined;
}
