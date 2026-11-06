import { I18n } from '../core/I18n.js';
import { bindOverlayClose } from './overlayClose.js';
import { componentStyles } from './componentStyles.js';

const CSS = `
.help-modal-body {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: var(--space-sm);
}
.help-section { margin-bottom: var(--space-lg); }
.help-section:last-child { margin-bottom: var(--space-sm); }
.help-section h4 {
  margin: 0 0 var(--space-sm);
  font-size: var(--font-size-md);
}
.help-faq-card {
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-sm);
}
.help-faq-card h5 { margin: 0 0 var(--space-sm); font-size: var(--font-size-base); }
.help-faq-card p, .help-section p { margin: 0 0 var(--space-sm); font-size: var(--font-size-sm); }
.help-provider { margin: 0 0 var(--space-sm); }
.help-provider strong { display: block; margin-bottom: 2px; font-size: var(--font-size-sm); }
.help-provider p { margin: 0; font-size: var(--font-size-sm); color: var(--text-muted); }
.help-disclaimer {
  border-left: 3px solid var(--danger);
  padding-left: var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}
.help-modal-body a, .help-modal-footer a { color: var(--accent); }
#help-data-location { font-size: var(--font-size-sm); }
#help-data-location code { font-size: var(--font-size-sm); }
.help-modal-footer { align-items: center; }
.help-modal-footer p { margin: 0; font-size: var(--font-size-sm); }
`;

interface DataLocationProvider {
  getDataLocation(): Promise<string | null>;
}

const GITHUB_REPO = 'https://github.com/fathzer/car-cost-meter.github.io';
const GITHUB_ISSUES = `${GITHUB_REPO}/issues`;
const INSEE_GIST = 'https://gist.github.com/fathzer/5646b5558f759655717914400cc50a03';

/** Help & information modal — security notes, FAQ, data sources, disclaimer. */
export class HelpModal {
  static open(container: HTMLElement = document.body, provider?: DataLocationProvider): void {
    componentStyles('help-modal', CSS);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 560px;">
        <h3 style="margin-top: 0;">ℹ️ ${I18n.t('help.title')}</h3>
        <div class="help-modal-body">
          <section class="help-section">
            <h4>${I18n.t('help.securityTitle')}</h4>
            <p>${I18n.t('help.securityClientSide')}</p>
            <p>${I18n.t('help.securityStorage')}</p>
          </section>
          <section class="help-section">
            <h4>${I18n.t('help.faqTitle')}</h4>
            <div class="help-faq-card">
              <h5>${I18n.t('help.faqStorageQ')}</h5>
              <p id="help-data-location" hidden></p>
              <div class="help-provider">
                <strong>• Dropbox</strong>
                <p>${I18n.t('help.faqStorageDropbox')}</p>
              </div>
              <div class="help-provider">
                <strong>• Microsoft OneDrive</strong>
                <p>${I18n.t('help.faqStorageOneDrive')}</p>
              </div>
            </div>
            <div class="help-faq-card">
              <h5>${I18n.t('help.faqBugQ')}</h5>
              <p>${I18n.t('help.faqBugIntro')}
                <a href="${GITHUB_ISSUES}" target="_blank" rel="noopener noreferrer">${I18n.t('help.issuesLink')}</a>.
              </p>
              <p>${I18n.t('help.faqBugTips')}</p>
            </div>
            <div class="help-faq-card">
              <h5>${I18n.t('help.faqSourceQ')}</h5>
              <p>${I18n.t('help.faqSourceText')}
                <a href="${GITHUB_REPO}" target="_blank" rel="noopener noreferrer">${I18n.t('help.githubLink')}</a>.
              </p>
            </div>
          </section>
          <section class="help-section">
            <h4>${I18n.t('help.sourcesTitle')}</h4>
            <p>${I18n.t('help.sourcesText')}</p>
            <p>${I18n.t('help.sourcesGistPre')}
              <a href="${INSEE_GIST}" target="_blank" rel="noopener noreferrer">${I18n.t('help.gistLink')}</a>
              ${I18n.t('help.sourcesGistPost')}</p>
          </section>
          <section class="help-section">
            <h4>${I18n.t('help.disclaimerTitle')}</h4>
            <div class="help-disclaimer"><p>${I18n.t('help.disclaimerText')}</p></div>
          </section>
        </div>
        <div class="modal-actions help-modal-footer">
          <div class="modal-actions-left">
            <p>
              <a href="privacy.html" target="_blank" rel="noopener noreferrer">${I18n.t('help.privacy')}</a>
              &nbsp;•&nbsp;
              <a href="terms.html" target="_blank" rel="noopener noreferrer">${I18n.t('help.terms')}</a>
            </p>
          </div>
          <div class="modal-actions-right">
            <button type="button" id="help-close" class="btn-primary">${I18n.t('common.close')}</button>
          </div>
        </div>
      </div>`;
    container.appendChild(overlay);
    const close = (): void => overlay.remove();
    overlay.querySelector('#help-close')!.addEventListener('click', close);
    bindOverlayClose(overlay, close);

    // Live data location (provider + account + file), when a session is active.
    provider?.getDataLocation().then(location => {
      if (!location) return;
      const el = overlay.querySelector<HTMLElement>('#help-data-location');
      if (!el) return;
      const label = document.createElement('strong');
      label.textContent = I18n.t('help.dataLocation');
      const value = document.createElement('code');
      value.textContent = location;
      el.append(label, value);
      el.hidden = false;
    }).catch((error: unknown) => console.error('Failed to get data location:', error));
  }
}
