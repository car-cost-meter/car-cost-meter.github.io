import { I18n } from '../core/I18n.js';
import { bindOverlayClose } from './overlayClose.js';
import { componentStyles } from './componentStyles.js';

const CSS = `
.help-popover-btn {
  width: 1.05rem;
  height: 1.05rem;
  margin-left: var(--space-xs);
  padding: 0;
  border: 1px solid var(--text-muted);
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.7rem;
  line-height: 1;
  vertical-align: middle;
  cursor: pointer;
}
.help-popover-content { position: relative; padding-right: 2rem; }
.help-popover-close {
  position: absolute;
  top: 0;
  right: 0;
  width: 1.6rem;
  height: 1.6rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}
.help-popover-close:hover { background: var(--accent-soft); color: var(--text); }
`;

/**
 * Circled "?" button opening a small help dialog — an inline equivalent
 * of mon-patrimoine's HelpPopover. Usage:
 *   html: `${HelpPopover.getHtml('myKey')}` next to a label;
 *   wire: `HelpPopover.bind(host, key => ({ title, body }))`;
 * or `HelpPopover.open(title, body)` directly.
 */
export class HelpPopover {
  /** Emits the circled "?" button carrying `data-help-key`. */
  static getHtml(key: string): string {
    componentStyles('help-popover', CSS);
    return `<button type="button" class="help-popover-btn" data-help-key="${key}" aria-label="?">?</button>`;
  }

  /** Wires every `.help-popover-btn` inside `host`; `resolve` maps each
   *  button's key to the dialog title and body. */
  static bind(host: ParentNode, resolve: (key: string) => { title: string; body: string }): void {
    host.querySelectorAll<HTMLElement>('.help-popover-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = resolve(btn.dataset.helpKey!);
        HelpPopover.open(c.title, c.body);
      });
    });
  }

  /** Opens the small dialog immediately. */
  static open(title: string, body: string): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content help-popover-content" style="max-width: 420px;">
        <button type="button" class="help-popover-close" id="hp-close" aria-label="${I18n.t('common.close')}">×</button>
        <h3 style="margin-top: 0;">${title}</h3>
        <p>${body}</p>
      </div>`;
    document.body.appendChild(overlay);
    const close = (): void => overlay.remove();
    bindOverlayClose(overlay, close);
    overlay.querySelector('#hp-close')!.addEventListener('click', close);
  }
}
