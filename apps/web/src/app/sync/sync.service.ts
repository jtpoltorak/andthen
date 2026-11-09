import { Injectable, computed, inject, signal } from '@angular/core';
import type { BackupFile } from '@andthen/core';
import {
  SyncEngine,
  SyncingHabitRepository,
  type SignedInDevice,
  type SyncPhase,
  type SyncState,
} from '@andthen/data';
import { HabitStore } from '../data/habit-store';
import { SyncApi } from './sync-api';

export { EDIT_DELAY_MS, POLL_MS, PUSH_BATCH, type SyncPhase } from '@andthen/data';

/**
 * Keeps this device in step with the account, in the background.
 *
 * The work happens in `SyncEngine` (packages/data), which has no framework so the
 * browser extension can share it. This service hands the engine Angular's pieces
 * and mirrors its state into signals for the screens.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly store = inject(HabitStore);
  private readonly engine = new SyncEngine({
    // Optional so screens can be tested with an in-memory repository.
    repo: inject(SyncingHabitRepository, { optional: true }),
    api: inject(SyncApi),
    onRemoteApplied: () => this.store.reload(),
  });

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

  constructor() {
    this.engine.subscribe((state) => this.mirror(state));
  }

  /** Call once at app start. Reads the saved state and, if sync is on, syncs. */
  start(): Promise<void> {
    return this.engine.start();
  }

  /** Stops timers. Only tests need this. */
  stop(): void {
    this.engine.stop();
  }

  /** Asks the server to email a sign-in code. */
  sendCode(email: string): Promise<void> {
    return this.engine.sendCode(email);
  }

  /**
   * Signs in with an emailed code, turns sync on and runs the first sync.
   * Throws (and leaves sync off) when the code is wrong or the server can't be reached.
   */
  signIn(email: string, code: string): Promise<void> {
    return this.engine.signIn(email, code);
  }

  /**
   * Turns sync off on this device and signs it out. Data on this device stays,
   * and so does the account's copy on the server and other devices.
   */
  turnOff(): Promise<void> {
    return this.engine.turnOff();
  }

  /** A copy of everything the account holds on the server, as a backup file. */
  exportAccount(): Promise<BackupFile> {
    return this.engine.exportAccount();
  }

  /** The devices signed in to the account, this one first, then the most recently active. */
  devices(): Promise<SignedInDevice[]> {
    return this.engine.devices();
  }

  /** Signs another device out of the account. A device that's already gone counts as done. */
  signOutDevice(id: string): Promise<void> {
    return this.engine.signOutDevice(id);
  }

  /** Deletes the account on the server. Sync turns off here; data on this and other devices stays. */
  deleteAccount(): Promise<void> {
    return this.engine.deleteAccount();
  }

  /** Syncs in a few seconds, so several quick edits go up together. */
  syncSoon(): void {
    this.engine.syncSoon();
  }

  /** Syncs now. If a sync is already running, one more runs after it. */
  syncNow(): Promise<void> {
    return this.engine.syncNow();
  }

  private mirror(state: SyncState): void {
    this.phase.set(state.phase);
    this.email.set(state.email);
    this.lastSyncedAt.set(state.lastSyncedAt);
    this.problem.set(state.problem);
    this.signedOutNotice.set(state.signedOutNotice);
    this.accountDeleted.set(state.accountDeleted);
  }
}
