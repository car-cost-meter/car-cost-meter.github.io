import { I18n } from '../core/I18n.js';
import { Settings } from '../core/settings.js';
import type { Language, Theme, UnitSystem } from '../core/settings.js';
import { bindOverlayClose } from './overlayClose.js';

/**
 * Settings modal — language, theme, units, currency. Every change applies
 * immediately through the `onChange` callback wired by the caller.
 */
export class SettingsModal {
  static open(
    settings: Settings,
    onChange: (patch: { language?: Language; theme?: Theme; units?: UnitSystem; currency?: string }) => void,
    container: HTMLElement = document.body
  ): void {
    const select = (id: string, label: string, options: { value: string; label: string }[], current: string): string => `
      <div class="form-group"><label for="${id}">${label}</label>
        <select id="${id}" class="form-control">
          ${options.map(o => `<option value="${o.value}" ${o.value === current ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>`;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 420px;">
        <h3 style="margin-top: 0;">${I18n.t('settings.title')}</h3>
        ${select('set-lang', I18n.t('settings.language'), [
          { value: '', label: I18n.t('settings.languageAuto') },
          { value: 'fr', label: 'Français' },
          { value: 'en', label: 'English' }
        ], settings.get('language') ?? '')}
        ${select('set-theme', I18n.t('settings.theme'), [
          { value: 'system', label: I18n.t('settings.themeSystem') },
          { value: 'light', label: I18n.t('settings.themeLight') },
          { value: 'dark', label: I18n.t('settings.themeDark') }
        ], settings.get('theme'))}
        ${select('set-units', I18n.t('settings.units'), [
          { value: '', label: I18n.t('settings.unitsAuto') },
          { value: 'metric', label: I18n.t('settings.unitsMetric') },
          { value: 'imperial', label: I18n.t('settings.unitsImperial') }
        ], settings.get('units') ?? '')}
        <div class="form-group"><label for="set-currency">${I18n.t('settings.currency')}</label>
          <select id="set-currency" class="form-control">
            ${['EUR', 'USD', 'GBP', 'CHF'].map(c => `<option value="${c}" ${settings.get('currency') === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="modal-actions">
          <div class="modal-actions-left"></div>
          <div class="modal-actions-right">
            <button class="btn-primary" id="set-close">${I18n.t('common.close')}</button>
          </div>
        </div>
      </div>`;
    container.appendChild(overlay);

    const close = (): void => overlay.remove();
    overlay.querySelector('#set-close')!.addEventListener('click', close);
    bindOverlayClose(overlay, close);

    overlay.querySelector('#set-lang')!.addEventListener('change', (e) => {
      const v = (e.target as HTMLSelectElement).value as Language | '';
      settings.set('language', v || undefined);
      onChange({ language: v || undefined });
    });
    overlay.querySelector('#set-theme')!.addEventListener('change', (e) => {
      const v = (e.target as HTMLSelectElement).value as Theme;
      settings.set('theme', v);
      onChange({ theme: v });
    });
    overlay.querySelector('#set-units')!.addEventListener('change', (e) => {
      const v = (e.target as HTMLSelectElement).value as UnitSystem | '';
      settings.set('units', v || undefined);
      onChange({ units: v || undefined });
    });
    overlay.querySelector('#set-currency')!.addEventListener('change', (e) => {
      const v = (e.target as HTMLSelectElement).value;
      settings.set('currency', v);
      onChange({ currency: v });
    });
  }
}
