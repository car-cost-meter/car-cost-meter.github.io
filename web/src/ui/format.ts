import { I18n } from '../core/I18n.js';
import { Settings } from '../core/settings.js';

/** Escapes user-provided text for interpolation into innerHTML. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => `&#${c.codePointAt(0)};`);
}

/** Formats a money amount with the configured currency. */
export function formatAmount(amount: number): string {
  return I18n.formatAmount(amount, Settings.load().get('currency'));
}
