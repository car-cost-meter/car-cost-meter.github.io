import { describe, test, expect } from 'bun:test';
import { Settings } from './settings.js';
import type { KeyValueStore } from './settings.js';

class FakeStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

describe('Settings', () => {
  test('defaults', () => {
    const s = Settings.load(new FakeStore());
    expect(s.get('theme')).toBe('system');
    expect(s.get('currency')).toBe('EUR');
    expect(s.get('language')).toBeUndefined();
    expect(s.get('units')).toBeUndefined();
  });

  test('set persists and a fresh load reads it back', () => {
    const store = new FakeStore();
    const s = Settings.load(store);
    s.set('theme', 'light');
    s.set('language', 'en');
    s.set('units', 'imperial');
    s.set('currency', 'USD');

    const reloaded = Settings.load(store);
    expect(reloaded.get('theme')).toBe('light');
    expect(reloaded.get('language')).toBe('en');
    expect(reloaded.get('units')).toBe('imperial');
    expect(reloaded.get('currency')).toBe('USD');
  });

  test('corrupted payload falls back to defaults', () => {
    const store = new FakeStore();
    store.setItem('ccm.settings', '{not json');
    const s = Settings.load(store);
    expect(s.get('theme')).toBe('system');
  });
});
