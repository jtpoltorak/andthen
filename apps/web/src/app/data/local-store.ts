/**
 * Small per-device settings live in localStorage under keys that start with
 * `andthen.`. Habit data does not: it lives in IndexedDB (see DexieHabitRepository).
 */
export const LOCAL_KEY_PREFIX = 'andthen.';

export function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); the setting still works for this visit.
  }
}

/** Removes every AndThen setting from this browser's localStorage. */
export function clearLocalSettings(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LOCAL_KEY_PREFIX)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // Nothing stored, nothing to clear.
  }
}
