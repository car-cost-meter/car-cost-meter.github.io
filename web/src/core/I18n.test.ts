import { describe, test, expect } from 'bun:test';
import { I18n } from './I18n.js';
import { fr } from '../i18n/fr.js';
import { en } from '../i18n/en.js';

describe('I18n', () => {
  test('translates keys and interpolates params', () => {
    I18n.setLanguage('fr');
    expect(I18n.t('common.save')).toBe('Enregistrer');
    I18n.setLanguage('en');
    expect(I18n.t('common.save')).toBe('Save');
  });

  test('returns the key itself for unknown keys', () => {
    I18n.setLanguage('fr');
    expect(I18n.t('no.such.key')).toBe('no.such.key');
  });

  test('fr and en dictionaries expose the same keys', () => {
    const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === 'object' && v !== null
          ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
          : [`${prefix}${k}`]);
    const frKeys = flatten(fr as Record<string, unknown>).sort();
    const enKeys = flatten(en as Record<string, unknown>).sort();
    expect(frKeys).toEqual(enKeys);
  });

  test('formatAmount renders the configured currency', () => {
    I18n.setLanguage('en');
    expect(I18n.formatAmount(1234.5, 'USD')).toContain('$');
    I18n.setLanguage('fr');
    expect(I18n.formatAmount(1234.5, 'EUR')).toContain('€');
  });
});
