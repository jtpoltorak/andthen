import type { BackupFile } from '@andthen/core';
import { ApiError, OfflineError, type SignedInDevice, type SyncApiClient } from './sync-api';
import type { SyncingHabitRepository } from './syncing-habit-repository';

/** How many changes go up in one request. The server takes at most 1000. */
export const PUSH_BATCH = 1000;
/** Wait this long after an edit before syncing, so a burst of taps goes up together. */
export const EDIT_DELAY_MS = 3000;
/** While the app is open, sync this often even if nothing happened here. */
export const POLL_MS = 5 * 60 * 1000;
/** A safety stop for one sync, in round trips. Each one moves up to 1000 changes each way. */
const MAX_ROUNDS = 100;

export type SyncPhase = 'off' | 'idle' | 'syncing' | 'offline' | 'error';

/** What screens show about sync. */
export interface SyncState {
  phase: SyncPhase;
  email?: string;
  lastSyncedAt?: number;
  /** Shown under the sync status when something went wrong. */
  problem: string;
  /** Set when the server signed this device out (session expired or removed elsewhere). */
  signedOutNotice: boolean;
  /** Set right after this device deleted the account. */
  accountDeleted: boolean;
}

export interface SyncEngineOptions {
  /** Null when there's no on-device database (some tests); every call then does nothing. */
  repo: SyncingHabitRepository | null;
  api: SyncApiClient;
  /** Called after changes from other devices were saved here, so screens can reload. */
  onRemoteApplied?: () => Promise<void> | void;
  /**
   * Sync this often while running. 0 turns the timer off, for places where timers
   * don't survive, such as an extension's background worker (it uses alarms instead).
   */
  pollMs?: number;
  /** Shown in the account's list of signed-in devices. Defaults to a guess from the browser. */
  deviceName?: string;
}

/**
 * Keeps this device in step with the account, in the background. No framework:
 * the web app wraps it in an Angular service, and the browser extension uses it
 * directly from its background worker.
 *
 * Think of the outbox as a stack of letters by the door: each sync posts them,
 * then collects the mail that arrived since the last visit (the cursor).
 * A sync runs at start, when the page comes back to the screen, when the
 * device comes back online, a few seconds after an edit, and on a timer.
 */
export class SyncEngine {
  private readonly repo: SyncingHabitRepository | null;
  private readonly api: SyncApiClient;
  private readonly onRemoteApplied?: () => Promise<void> | void;
  private readonly pollMs: number;
  private readonly name?: string;

  private current: SyncState = {
    phase: 'off',
    problem: '',
    signedOutNotice: false,
    accountDeleted: false,
  };
  private readonly listeners = new Set<(state: SyncState) => void>();

  private running?: Promise<void>;
  private again = false;
  private editTimer?: ReturnType<typeof setTimeout>;
  private pollTimer?: ReturnType<typeof setInterval>;
  private started = false;
  private readonly onOnline = () => void this.syncNow();
  private readonly onVisible = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible')
      void this.syncNow();
  };

  constructor(options: SyncEngineOptions) {
    this.repo = options.repo;
    this.api = options.api;
    this.onRemoteApplied = options.onRemoteApplied;
    this.pollMs = options.pollMs ?? POLL_MS;
    this.name = options.deviceName ?? guessDeviceName();
  }

  get state(): Readonly<SyncState> {
    return this.current;
  }

  /** Calls `listener` on every change. Returns a function that stops it. */
  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Call once at start. Reads the saved state and, if sync is on, syncs. */
  async start(): Promise<void> {
    if (!this.repo || this.started) return;
    this.started = true;
    this.repo.onLocalChange = () => this.syncSoon();
    if (typeof addEventListener === 'function') addEventListener('online', this.onOnline);
    if (typeof document !== 'undefined')
      document.addEventListener('visibilitychange', this.onVisible);
    if (this.pollMs > 0) this.pollTimer = setInterval(this.onVisible, this.pollMs);
    const status = await this.repo.status();
    if (status.enabled && status.email) {
      this.set({ email: status.email, phase: 'idle' });
      await this.syncNow();
    }
  }

  /** Stops timers and listeners. */
  stop(): void {
    clearTimeout(this.editTimer);
    clearInterval(this.pollTimer);
    if (typeof removeEventListener === 'function') removeEventListener('online', this.onOnline);
    if (typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', this.onVisible);
    if (this.repo) this.repo.onLocalChange = undefined;
    this.started = false;
  }

  /** Clears the "signed out" and "account deleted" notices once they've been seen. */
  dismissNotices(): void {
    this.set({ signedOutNotice: false, accountDeleted: false });
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
    const { token, account } = await this.api.verifyEmail(email.trim(), code, this.name);
    const previous = await this.repo.token();
    await this.repo.enable({ email: account.email, token });
    if (previous) void this.api.logout(previous).catch(() => undefined);
    this.set({
      email: account.email,
      signedOutNotice: false,
      accountDeleted: false,
      problem: '',
      phase: 'idle',
    });
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
   * The devices signed in to the account, this one first, then the most recently active.
   * If the server says this device is signed out, sync turns off here.
   */
  async devices(): Promise<SignedInDevice[]> {
    const token = await this.repo?.token();
    if (!token) throw new Error('Sync is off.');
    const account = await this.signedOutOn401(this.api.me(token));
    return [...account.sessions].sort(
      (a, b) => Number(b.current) - Number(a.current) || b.lastSeenAt.localeCompare(a.lastSeenAt),
    );
  }

  /**
   * Signs another device out of the account. It stops syncing the next time it
   * tries; its data stays on it. A device that's already gone counts as done.
   */
  async signOutDevice(id: string): Promise<void> {
    const token = await this.repo?.token();
    if (!token) throw new Error('Sync is off.');
    try {
      await this.signedOutOn401(this.api.revokeSession(token, id));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return;
      throw error;
    }
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
    this.set({ accountDeleted: true });
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
    if (!this.repo || this.current.phase === 'off') return Promise.resolve();
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.run(this.repo!);
        } while (this.again && this.current.phase !== 'off');
      } finally {
        this.running = undefined;
      }
    })();
    return this.running;
  }

  private set(change: Partial<SyncState>): void {
    this.current = { ...this.current, ...change };
    for (const listener of this.listeners) listener(this.current);
  }

  /** Passes the answer through, but a 401 means this device was signed out, so sync turns off. */
  private async signedOutOn401<T>(request: Promise<T>): Promise<T> {
    try {
      return await request;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await this.turnOff();
        this.set({ signedOutNotice: true });
      }
      throw error;
    }
  }

  /** Sync off on this device, and the screens told. */
  private async stopLocally(repo: SyncingHabitRepository): Promise<void> {
    clearTimeout(this.editTimer);
    await repo.disable();
    this.set({ phase: 'off', email: undefined, lastSyncedAt: undefined, problem: '' });
  }

  private async run(repo: SyncingHabitRepository): Promise<void> {
    clearTimeout(this.editTimer);
    this.set({ phase: 'syncing' });
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
      this.set({ lastSyncedAt: Date.now(), problem: '', phase: 'idle' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // The session ended (expired, or this device was signed out from another one).
        await this.turnOff();
        this.set({ signedOutNotice: true });
        return;
      }
      if (error instanceof OfflineError) {
        this.set({ phase: 'offline', problem: '' });
      } else {
        this.set({ phase: 'error', problem: syncErrorMessage(error) });
      }
    } finally {
      // Show what other devices changed, even if a later round failed.
      if (applied > 0) await this.onRemoteApplied?.();
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
export function guessDeviceName(userAgent = globalThis.navigator?.userAgent): string | undefined {
  if (!userAgent) return undefined;
  const ua = userAgent;
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
