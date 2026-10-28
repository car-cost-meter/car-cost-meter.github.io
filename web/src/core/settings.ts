/**
 * User settings, persisted in localStorage (they never enter the cloud
 * data file). A storage backend is injectable for tests and for
 * environments without localStorage (memory fallback).
 */

export type Theme = 'system' | 'light' | 'dark';
export type UnitSystem = 'metric' | 'imperial';
export type Language = 'fr' | 'en';

export interface AppSettings {
  /** undefined → detected from navigator.language. */
  language?: Language;
  /** Default 'system' — follows prefers-color-scheme. */
  theme: Theme;
  /** undefined → derived from the language (fr→metric, en→imperial). */
  units?: UnitSystem;
  /** ISO 4217 currency code used for display (no conversion). Default 'EUR'. */
  currency: string;
  /** INSEE CPI series idbank for constant-euros display (France only). */
  cpiSeries?: string;
}

const STORAGE_KEY = 'ccm.settings';

const DEFAULTS: AppSettings = {
  theme: 'system',
  currency: 'EUR'
};

/** Minimal key-value contract shared by localStorage and the test double. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

class MemoryStore implements KeyValueStore {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

function defaultStore(): KeyValueStore {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch { /* access can throw in sandboxed frames */ }
  return new MemoryStore();
}

export class Settings {
  private constructor(
    private readonly store: KeyValueStore,
    private readonly values: AppSettings
  ) {}

  static load(store: KeyValueStore = defaultStore()): Settings {
    let values = { ...DEFAULTS };
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (raw) values = { ...values, ...(JSON.parse(raw) as Partial<AppSettings>) };
    } catch { /* corrupted payload → defaults */ }
    return new Settings(store, values);
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.values[key];
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.values[key] = value;
    try {
      this.store.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch { /* quota / privacy mode — keep the in-memory value */ }
  }
}
