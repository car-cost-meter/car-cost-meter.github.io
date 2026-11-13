import { I18n } from '../core/I18n.js';
import { componentStyles } from './componentStyles.js';
import { escapeHtml } from './format.js';
import { COPY_ICON } from './icons.js';
import { bindOverlayClose } from './overlayClose.js';
import type { Station } from '../domain/fuelStations.js';

const CSS = `
.report-copy-btn {
  display: inline-flex; background: none; border: none; padding: 2px;
  color: var(--text-muted); cursor: pointer; vertical-align: -0.15em;
}
.report-copy-btn svg { width: 0.95rem; height: 0.95rem; }
.report-copy-btn:hover { color: var(--accent); }
`;

const CONTACT_URL = 'https://www.prix-carburants.gouv.fr/contact/';
const OSM_URL = 'https://www.openstreetmap.org/';
/** fuel2gist republishes stations.json hourly — a file older than that
 *  may already contain upstream fixes, so it should be refreshed before
 *  reporting. */
const STALE_WARN_HOURS = 1;

/**
 * "Report wrong data" dialog opened from a station card: shows the
 * government station id the official contact form asks for, the data
 * generation time, and where to report (prix-carburants.gouv.fr, or
 * OpenStreetMap for brand/position). Info-only — no submission here;
 * the layout leaves room for a future crowdsourced correction flow.
 * Translated sentences embed {formLink}/{osmLink} placeholders filled
 * with the actual anchors (labels stay translated via their own keys).
 */
export class StationReportDialog {
  static show(station: Station, dataTs: number | undefined): void {
    componentStyles('station-report-dialog', CSS);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const generated = dataTs === undefined ? ''
      : `<p class="station-report-meta">${escapeHtml(I18n.t('fuel.reportGenerated', {
          date: new Date(dataTs * 60000).toLocaleString(I18n.locale, { dateStyle: 'short', timeStyle: 'short' })
        }))}</p>`;
    const ageH = dataTs === undefined ? undefined : (Date.now() - dataTs * 60000) / 3600000;
    const staleWarn = ageH !== undefined && ageH > STALE_WARN_HOURS
      ? `<p class="form-alert">${escapeHtml(I18n.t('fuel.reportStale'))}</p>` : '';
    const formLink = `<a href="${CONTACT_URL}" target="_blank" rel="noopener">${escapeHtml(I18n.t('fuel.reportForm'))}</a>`;
    const osmLink = `<a href="${OSM_URL}" target="_blank" rel="noopener">OpenStreetMap</a>`;
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 480px;">
        <h3 style="margin: 0 0 var(--space-xs);">${escapeHtml(I18n.t('fuel.reportTitle'))}</h3>
        ${station.brand !== undefined || station.address !== ''
          ? `<p style="margin: 0 0 var(--space-sm); color: var(--text-muted);">${escapeHtml([station.brand, station.address].filter(Boolean).join(' — '))}</p>` : ''}
        <p style="margin: 0 0 var(--space-xs);">${escapeHtml(I18n.t('fuel.reportId'))} <code>${station.id}</code>
          <button type="button" class="report-copy-btn" id="report-copy" title="${escapeHtml(I18n.t('fuel.reportCopy'))}" aria-label="${escapeHtml(I18n.t('fuel.reportCopy'))}">${COPY_ICON}</button></p>
        ${generated}${staleWarn}
        <p>${I18n.t('fuel.reportHowForm', { formLink })}</p>
        <p>${I18n.t('fuel.reportHowOsm', { osmLink })}</p>
        <div class="modal-actions">
          <span></span>
          <button type="button" class="btn-secondary" id="report-close">${escapeHtml(I18n.t('common.close'))}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const cleanup = (): void => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') cleanup();
    };
    document.addEventListener('keydown', onKey);
    bindOverlayClose(overlay, cleanup);
    overlay.querySelector('#report-close')?.addEventListener('click', cleanup);
    overlay.querySelector('#report-copy')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      try {
        await navigator.clipboard.writeText(String(station.id));
        btn.title = I18n.t('fuel.reportCopied');
        setTimeout(() => { btn.title = I18n.t('fuel.reportCopy'); }, 1500);
      } catch { /* clipboard unavailable — the id stays selectable */ }
    });
  }
}
