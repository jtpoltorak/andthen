import {
  DEFAULT_REMINDER_PREFS,
  WEEK_STARTS,
  parseReminderPrefs,
  type DayKey,
  type ReminderPrefs,
  type WeekStart,
} from '@andthen/core';

/**
 * Settings the popup and the background worker both read. They live in the
 * extension's own storage (chrome.storage.local), because the background worker
 * can't see the popup's localStorage.
 */
export interface ExtSettings {
  /** Reminders at each routine's usual time. Off until the person turns them on. */
  reminders: ReminderPrefs;
  /** Show how many habits are left today on the toolbar icon. */
  badge: boolean;
  /** Copied from the popup's preferences, so "N times a week" habits count the right week. */
  weekStartsOn: WeekStart;
}

export const DEFAULT_EXT_SETTINGS: ExtSettings = {
  reminders: { ...DEFAULT_REMINDER_PREFS },
  badge: true,
  weekStartsOn: 1,
};

const SETTINGS_KEY = 'settings';
const SENT_KEY = 'remindersSent';

/** Reminders already sent today, so each routine reminds once. */
export interface SentToday {
  day: DayKey;
  routineIds: string[];
}

/**
 * The extension APIs, or undefined in tests and anywhere else that isn't an extension.
 * Firefox's `browser` is preferred where it exists: it's the one built on promises.
 */
export function extensionApi(): typeof chrome | undefined {
  const g = globalThis as { browser?: typeof chrome; chrome?: typeof chrome };
  const api = g.browser?.storage?.local ? g.browser : g.chrome;
  return api?.storage?.local ? api : undefined;
}

/** Reads stored settings defensively; anything odd falls back to the defaults. */
export function parseExtSettings(raw: unknown): ExtSettings {
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_EXT_SETTINGS);
  const r = raw as Record<string, unknown>;
  const week = r['weekStartsOn'];
  return {
    reminders: parseReminderPrefs(r['reminders']),
    badge: r['badge'] !== false,
    weekStartsOn: WEEK_STARTS.find((w) => w === week) ?? 1,
  };
}

/** Kept in memory where there's no extension storage (tests). */
let fallback: ExtSettings = structuredClone(DEFAULT_EXT_SETTINGS);

export async function loadExtSettings(): Promise<ExtSettings> {
  const api = extensionApi();
  if (!api) return structuredClone(fallback);
  const stored = await api.storage.local.get(SETTINGS_KEY);
  return parseExtSettings(stored[SETTINGS_KEY]);
}

export async function saveExtSettings(change: Partial<ExtSettings>): Promise<ExtSettings> {
  const next = { ...(await loadExtSettings()), ...change };
  const api = extensionApi();
  if (api) await api.storage.local.set({ [SETTINGS_KEY]: next });
  else fallback = structuredClone(next);
  return next;
}

/** Only tests need this. */
export function resetExtSettingsForTests(): void {
  fallback = structuredClone(DEFAULT_EXT_SETTINGS);
}

export async function loadSentToday(day: DayKey): Promise<string[]> {
  const api = extensionApi();
  if (!api) return [];
  const sent = (await api.storage.local.get(SENT_KEY))[SENT_KEY] as Partial<SentToday> | undefined;
  if (sent?.day !== day || !Array.isArray(sent.routineIds)) return [];
  return sent.routineIds.filter((id): id is string => typeof id === 'string');
}

export async function saveSentToday(sent: SentToday): Promise<void> {
  await extensionApi()?.storage.local.set({ [SENT_KEY]: sent });
}

/** Tells the background worker the habits changed, so the badge catches up straight away. */
export function notifyHabitsChanged(): void {
  extensionApi()
    ?.runtime.sendMessage({ type: 'andthen:changed' })
    .catch(() => undefined);
}
