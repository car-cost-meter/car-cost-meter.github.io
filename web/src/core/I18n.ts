import { fr } from '../i18n/fr.js';
import { en } from '../i18n/en.js';
import type { Language } from './settings.js';

export type { Language };
export type I18nParams = Record<string, string | number>;

type Dictionary = Record<string, unknown>;

export const SUPPORTED_LANGUAGES: Language[] = ['fr', 'en'];

/** BCP-47 tag used for Intl formatting per supported language. */
const LOCALES: Record<Language, string> = { fr: 'fr-FR', en: 'en-GB' };

export class I18n {
  private static _language: Language = 'fr';
  static readonly dictionaries: Record<Language, Dictionary> = { fr, en };

  static get language(): Language {
    return this._language;
  }

  static get locale(): string {
    return LOCALES[this._language];
  }

  /** Sets the active language and mirrors it on <html lang>. */
  static setLanguage(language: Language): void {
    this._language = language;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }

  /** Language detected from the browser, defaulting to French. */
  static detectLanguage(): Language {
    const nav = typeof navigator !== 'undefined' ? navigator.language : '';
    return nav.toLowerCase().startsWith('en') ? 'en' : 'fr';
  }

  static t(key: string, params: I18nParams = {}): string {
    const keys = key.split('.');
    let translation: unknown = this.dictionaries[this._language];

    for (const k of keys) {
      if (translation && typeof translation === 'object' && (translation as Dictionary)[k] !== undefined) {
        translation = (translation as Dictionary)[k];
      } else {
        return key;
      }
    }

    if (typeof translation === 'string') {
      let result = translation;
      Object.keys(params).forEach(param => {
        result = result.replace(`{${param}}`, String(params[param]));
      });
      return result;
    }

    return translation as string;
  }

  /** Formats a YYYY-MM-DD date in the current locale (e.g. 31/12/2025). */
  static formatDate(dateStr: string): string {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString(this.locale);
  }

  /** Formats a plain number in the current locale. */
  static formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale, options).format(value);
  }

  /** Formats an amount with the configured ISO currency code. Falls back to
   *  a plain number + code when the code is not a valid ISO 4217. */
  static formatAmount(value: number, currency: string, options?: Intl.NumberFormatOptions): string {
    try {
      return new Intl.NumberFormat(this.locale, {
        style: 'currency', currency, ...options
      }).format(value);
    } catch {
      return `${new Intl.NumberFormat(this.locale, options).format(value)} ${currency}`;
    }
  }
}
