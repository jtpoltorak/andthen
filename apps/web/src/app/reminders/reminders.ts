import { Injectable, Injector, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  type PlannedReminder,
  type ReminderLead,
  type ReminderPrefs,
  DEFAULT_REMINDER_PREFS,
  dueReminders,
  minutesOf,
  nextReminderMinutes,
  parseReminderPrefs,
  planReminders,
  reminderMessage,
  toDayKey,
} from '@andthen/core';
import { HabitStore } from '../data/habit-store';
import { readJson, writeJson } from '../data/local-store';
import { Notifier, type NotifyPermission } from './notifier';

const PREFS_KEY = 'andthen.reminders';
const SENT_KEY = 'andthen.reminders.sent';
/** Wake up at least this often, so sleep, clock changes and midnight are picked up. */
const MAX_WAIT_MS = 15 * 60 * 1000;

const minutesSinceMidnight = (d: Date) => d.getHours() * 60 + d.getMinutes();

/**
 * Gentle, opt-in reminders around each routine's usual time.
 *
 * These are a per-device preference (notification permission is per device too),
 * so they live in localStorage rather than in habit data or backups.
 * Browsers give web apps no way to wake themselves up, so a reminder can only go
 * out while AndThen is open in a tab or installed window. The settings screen says so.
 */
@Injectable({ providedIn: 'root' })
export class Reminders {
  private readonly store = inject(HabitStore);
  private readonly notifier = inject(Notifier);
  private readonly injector = inject(Injector);
  private timer?: ReturnType<typeof setTimeout>;
  private started = false;

  readonly prefs = signal<ReminderPrefs>(parseReminderPrefs(readJson(PREFS_KEY)));
  readonly permission = signal<NotifyPermission>(this.notifier.permission());
  /** Reminders are on and the browser will actually show them. */
  readonly active = computed(() => this.prefs().enabled && this.permission() === 'granted');
  readonly planned = computed(() => planReminders(this.store.chains(), this.prefs()));

  /** Starts watching the clock. Call once, when the app boots. */
  start(): void {
    if (this.started) return;
    this.started = true;
    effect(
      () => {
        // Re-plan whenever today's chains, the prefs or the permission change.
        this.planned();
        this.active();
        untracked(() => this.tick());
      },
      { injector: this.injector },
    );
  }

  /** Turns reminders on, asking the browser for permission if it hasn't been asked yet. */
  async enable(): Promise<NotifyPermission> {
    let permission = this.notifier.permission();
    if (permission === 'default') permission = await this.notifier.requestPermission();
    this.permission.set(permission);
    if (permission === 'granted') this.update({ enabled: true });
    return permission;
  }

  disable(): void {
    this.update({ enabled: false });
  }

  setLead(leadMinutes: ReminderLead): void {
    this.update({ leadMinutes });
  }

  setRoutineMuted(routineId: string, muted: boolean): void {
    const others = this.prefs().mutedRoutineIds.filter((id) => id !== routineId);
    this.update({ mutedRoutineIds: muted ? [...others, routineId] : others });
  }

  isMuted(routineId: string): boolean {
    return this.prefs().mutedRoutineIds.includes(routineId);
  }

  /** Back to the defaults (reminders off). Used by "Reset everything", which clears storage itself. */
  reset(): void {
    this.prefs.set({ ...DEFAULT_REMINDER_PREFS });
  }

  /** Re-reads the browser permission, e.g. after the person changed it in site settings. */
  refreshPermission(): void {
    this.permission.set(this.notifier.permission());
  }

  /** Sends a sample reminder right away so the person can see what one looks like. */
  async sendTest(): Promise<boolean> {
    const chain = this.store.chains().find((c) => c.total > 0 && !c.complete);
    const { title, body } = chain
      ? reminderMessage(chain)
      : { title: 'AndThen', body: 'This is what a reminder looks like.' };
    return this.notifier.show(title, body, 'andthen-test');
  }

  /** Sends anything due now and schedules the next check. Public for tests. */
  async check(now = new Date()): Promise<PlannedReminder[]> {
    this.store.refreshDay(now);
    if (!this.active()) return [];
    const day = toDayKey(now);
    const sent = this.sentToday(day);
    const due = dueReminders(this.planned(), minutesSinceMidnight(now), sent);
    if (due.length) {
      writeJson(SENT_KEY, { day, routineIds: [...sent, ...due.map((d) => d.routineId)] });
      for (const r of due) await this.notifier.show(r.title, r.body, `andthen-${r.routineId}`);
    }
    return due;
  }

  private tick(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.active()) return;
    void this.check().then(() => this.schedule());
  }

  private schedule(): void {
    clearTimeout(this.timer);
    if (!this.active()) return;
    const now = new Date();
    const nowMinutes = minutesSinceMidnight(now);
    const next = nextReminderMinutes(this.planned(), nowMinutes, this.sentToday(toDayKey(now)));
    const untilNext =
      next === undefined
        ? MAX_WAIT_MS
        : (next - nowMinutes) * 60_000 - now.getSeconds() * 1000 - now.getMilliseconds();
    this.timer = setTimeout(() => this.tick(), Math.max(1000, Math.min(untilNext, MAX_WAIT_MS)));
  }

  private sentToday(day: string): string[] {
    const sent = readJson(SENT_KEY) as { day?: unknown; routineIds?: unknown } | undefined;
    if (sent?.day !== day || !Array.isArray(sent.routineIds)) return [];
    return sent.routineIds.filter((id): id is string => typeof id === 'string');
  }

  private update(change: Partial<ReminderPrefs>): void {
    const next = { ...this.prefs(), ...change };
    this.prefs.set(next);
    writeJson(PREFS_KEY, next);
  }
}

/** "07:30" as the person's local time format, e.g. "7:30 AM". */
export function formatUsualTime(time: string | undefined): string {
  const minutes = minutesOf(time);
  if (minutes === undefined) return '';
  const d = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
