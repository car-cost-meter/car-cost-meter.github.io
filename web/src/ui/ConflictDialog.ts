import type { ConflictInfo } from 'ts-cloud-storage-manager';
import { I18n } from '../core/I18n.js';
import { conflictName, entryCount } from '../domain/conflicts.js';
import type { VehicleData } from '../domain/Vehicle.js';
import { bindOverlayClose } from './overlayClose.js';
import { componentStyles } from './componentStyles.js';
import { escapeHtml } from './format.js';

const CSS = `
.conflict-dialog-body {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: var(--space-sm);
}
.conflict-dialog-intro { margin: 0 0 var(--space-md); font-size: var(--font-size-sm); color: var(--text-muted); }
.conflict-row {
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-sm);
}
.conflict-row h5 { margin: 0 0 var(--space-xs); font-size: var(--font-size-base); }
.conflict-choice {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  padding: 2px 0;
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.conflict-choice small { color: var(--text-muted); }
`;

type Side = 'local' | 'remote';

/**
 * Resolution dialog for several conflicting vehicles: one choice per
 * vehicle, local or cloud. Applying only some of them is fine — the others
 * stay in conflict and the banner keeps asking.
 */
export class ConflictDialog {
  /**
   * @param conflicts the conflicting vehicles, as reported by the sync status.
   * @param onApply receives the choices made, by vehicle id.
   * @param container where the modal is mounted.
   */
  static open(
    conflicts: ConflictInfo[],
    onApply: (choices: Record<string, Side>) => void,
    container: HTMLElement = document.body
  ): void {
    componentStyles('conflict-dialog', CSS);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 560px;">
        <h3 style="margin-top: 0;">${I18n.t('conflictDialog.title')}</h3>
        <div class="conflict-dialog-body">
          <p class="conflict-dialog-intro">${I18n.t('conflictDialog.intro')}</p>
          ${conflicts.map((c, i) => `
            <div class="conflict-row">
              <h5>${escapeHtml(conflictName(c))}</h5>
              ${ConflictDialog.choice(i, 'local', c.local)}
              ${ConflictDialog.choice(i, 'remote', c.remote)}
            </div>`).join('')}
        </div>
        <div class="modal-actions">
          <div class="modal-actions-left">
            <button type="button" class="btn-secondary" id="conflict-all-local">${I18n.t('conflictDialog.keepAllLocal')}</button>
            <button type="button" class="btn-secondary" id="conflict-all-remote">${I18n.t('conflictDialog.keepAllCloud')}</button>
          </div>
          <button type="button" class="btn-secondary" id="conflict-cancel">${I18n.t('common.cancel')}</button>
          <button type="button" class="btn-primary" id="conflict-apply" disabled>${I18n.t('conflictDialog.apply')}</button>
        </div>
      </div>
    `;
    container.appendChild(overlay);

    const radios = [...overlay.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    const apply = overlay.querySelector<HTMLButtonElement>('#conflict-apply')!;
    const chosen = (): Record<string, Side> => {
      const choices: Record<string, Side> = {};
      for (const radio of radios) {
        if (radio.checked) choices[conflicts[Number(radio.dataset.index)].id] = radio.value as Side;
      }
      return choices;
    };
    const refresh = (): void => { apply.disabled = Object.keys(chosen()).length === 0; };
    const pickAll = (side: Side): void => {
      for (const radio of radios) radio.checked = radio.value === side;
      refresh();
    };

    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') close(); };
    const close = (): void => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
    };
    document.addEventListener('keydown', onKey);

    radios.forEach(radio => radio.addEventListener('change', refresh));
    overlay.querySelector('#conflict-all-local')!.addEventListener('click', () => pickAll('local'));
    overlay.querySelector('#conflict-all-remote')!.addEventListener('click', () => pickAll('remote'));
    overlay.querySelector('#conflict-cancel')!.addEventListener('click', close);
    apply.addEventListener('click', () => {
      const choices = chosen();
      close();
      onApply(choices);
    });
    bindOverlayClose(overlay, close);
  }

  /** One radio option: which side, and a hint of what that version holds. */
  private static choice(index: number, side: Side, version: unknown): string {
    const hint = version === null
      ? I18n.t('conflictDialog.deleted')
      : I18n.t('conflictDialog.entries', { count: entryCount(version as VehicleData) });
    const label = I18n.t(side === 'local' ? 'conflictDialog.local' : 'conflictDialog.cloud');
    return `
      <label class="conflict-choice">
        <input type="radio" name="conflict-${index}" value="${side}" data-index="${index}">
        <span>${label}</span> <small>${hint}</small>
      </label>`;
  }
}
