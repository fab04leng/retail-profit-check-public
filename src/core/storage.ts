/**
 * localStorage wrapper. Every access is in try/catch: storage can be blocked
 * (private mode, file://, browser settings) and the app must work without it.
 * Only settings, column mappings, the chosen day/month order and review notes are stored — never file contents.
 */
const PREFIX = 'rpc.v1.';

export function loadJSON<T = unknown>(key: string): T | null {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveJSON(key: string, value: unknown): boolean {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    globalThis.localStorage?.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Remove everything this app stored (settings, mappings, reviews). */
export function clearAll(): void {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return;
    const keys: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) ls.removeItem(k);
  } catch {
    /* ignore */
  }
}
