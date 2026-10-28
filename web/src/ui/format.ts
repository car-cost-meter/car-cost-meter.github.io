import { I18n } from '../core/I18n.js';
import { Settings } from '../core/settings.js';

/** Formats a money amount with the configured currency. */
export function formatAmount(amount: number): string {
  return I18n.formatAmount(amount, Settings.load().get('currency'));
}
