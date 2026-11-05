import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { OfflineError, type SignedInDevice } from './sync-api';
import { SyncService } from './sync.service';

/**
 * "Last active today" and the like. The server only notes a device's activity
 * about once a day, so anything finer than a day would be a guess.
 */
export function lastActive(iso: string, now = new Date()): string {
  const seen = new Date(iso);
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(seen)) / 86_400_000);
  if (days <= 0) return 'Active today';
  if (days === 1) return 'Last active yesterday';
  if (days < 7) return `Last active ${days} days ago`;
  const sameYear = seen.getFullYear() === now.getFullYear();
  const date = seen.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `Last active ${date}`;
}

/**
 * The devices signed in to the sync account, with a way to sign out the ones
 * you no longer use (an old phone, a borrowed laptop).
 */
@Component({
  selector: 'app-devices-list',
  template: `
    @if (devices(); as list) {
      <ul class="devices">
        @for (d of list; track d.id) {
          <li>
            <div class="info">
              <span class="name">
                {{ d.deviceName || 'Unnamed device' }}
                @if (d.current) {
                  <span class="tag">This device</span>
                }
              </span>
              <span class="when">
                {{ d.current ? 'Signed in ' + since(d.createdAt) : lastActive(d.lastSeenAt) }}
              </span>
            </div>
            @if (!d.current) {
              @if (confirming() === d.id) {
                <div class="row">
                  <button
                    type="button"
                    class="btn-text danger"
                    [disabled]="busy()"
                    (click)="signOut(d)"
                  >
                    Sign out
                  </button>
                  <button
                    type="button"
                    class="btn-text"
                    [disabled]="busy()"
                    (click)="confirming.set(undefined)"
                  >
                    Keep
                  </button>
                </div>
              } @else {
                <button
                  type="button"
                  class="btn-text"
                  [disabled]="busy()"
                  [attr.aria-label]="'Sign out ' + (d.deviceName || 'unnamed device') + '…'"
                  (click)="confirming.set(d.id)"
                >
                  Sign out…
                </button>
              }
            }
          </li>
        }
      </ul>
      @if (list.length === 1) {
        <p class="hint">Only this device so far. Sign in on another with the same email.</p>
      }
    } @else if (!error()) {
      <p class="hint" role="status">Loading devices…</p>
    }
    @if (notice()) {
      <p class="hint" role="status">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
      <button type="button" class="btn-text retry" [disabled]="busy()" (click)="load()">
        Try again
      </button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .devices {
      list-style: none;
      margin: 0;
      padding: 0;
      border: 1.5px solid var(--input-border);
      border-radius: 14px;
    }
    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 6px 8px 14px;
    }
    li + li {
      border-top: 1px solid var(--input-border);
    }
    .info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .name {
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .tag {
      display: inline-block;
      margin-left: 6px;
      padding: 1px 8px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent-ink);
      font-size: 12px;
      font-weight: 700;
      vertical-align: 1px;
    }
    .when,
    .hint {
      color: var(--muted);
      font-size: 14px;
    }
    .row {
      display: flex;
      flex-shrink: 0;
    }
    .btn-text {
      flex-shrink: 0;
      min-height: 44px;
      padding: 0 10px;
      border: none;
      background: none;
      color: var(--accent-ink);
      font-size: 15px;
      font-weight: 700;
    }
    .danger {
      color: var(--danger);
    }
    .retry {
      align-self: flex-start;
      padding: 0;
    }
    .error {
      font-size: 14px;
      color: var(--danger);
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevicesList implements OnInit {
  private readonly sync = inject(SyncService);
  protected readonly devices = signal<SignedInDevice[] | undefined>(undefined);
  protected readonly confirming = signal<string | undefined>(undefined);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly lastActive = (iso: string) => lastActive(iso);

  ngOnInit(): void {
    void this.load();
  }

  protected since(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  async load(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      this.devices.set(await this.sync.devices());
    } catch (error) {
      this.error.set(
        error instanceof OfflineError
          ? "You're offline, so the list of devices can't load right now."
          : "Couldn't load your devices just now.",
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async signOut(device: SignedInDevice): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.sync.signOutDevice(device.id);
      this.devices.update((list) => list?.filter((d) => d.id !== device.id));
      this.confirming.set(undefined);
      this.notice.set(
        `Signed out ${device.deviceName || 'that device'}. Its data stays on it, but it won't sync any more.`,
      );
    } catch (error) {
      this.error.set(
        error instanceof OfflineError
          ? "You're offline, so that device couldn't be signed out. Try again when you're back online."
          : "Couldn't sign that device out just now. Try again.",
      );
    } finally {
      this.busy.set(false);
    }
  }
}
