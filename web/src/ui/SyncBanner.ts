import { I18n } from '../core/I18n.js';
import type { ConflictInfo, StorageManager, SyncStatus } from 'ts-cloud-storage-manager';
import { conflictName } from '../domain/conflicts.js';
import { ConflictDialog } from './ConflictDialog.js';
import { escapeHtml } from './format.js';

/**
 * Top-of-screen alert strip driven by the managed SyncEngine's status
 * channel. Three states, by priority: parked conflict (one vehicle: the
 * user picks a side in the banner; several: a dialog decides vehicle by
 * vehicle), failed save awaiting retry (with the next attempt time), remote
 * update detected (pull button). Empty — hidden — while nothing needs
 * attention.
 */
export class SyncBanner {
  _root: HTMLElement;
  _storage: StorageManager;

  constructor(root: HTMLElement, storage: StorageManager) {
    this._root = root;
    this._storage = storage;
    storage.onStatus(s => this.render(s));
  }

  render(status: SyncStatus): void {
    // Demo sessions pause the engine — its stale account-side status
    // (e.g. pending edits) must not alarm while browsing demo data.
    if (this._storage.currentProvider.isReadOnly()) {
      this._root.innerHTML = '';
      return;
    }
    if (status.conflict) {
      this._renderConflicts(status.conflicts ?? []);
      return;
    }
    if (status.pending && (status.lastError || status.nextRetryAt)) {
      const time = status.nextRetryAt
        ? I18n.t('syncBanner.retryAt', {
            time: new Date(status.nextRetryAt).toLocaleTimeString(I18n.locale, { hour: '2-digit', minute: '2-digit' })
          })
        : I18n.t('syncBanner.retrySoon');
      this._root.innerHTML = `
        <div class="sync-banner sync-warning">
          <span>${I18n.t('syncBanner.savePending', { time })}</span>
        </div>`;
      return;
    }
    if (status.remoteChanged) {
      this._root.innerHTML = `
        <div class="sync-banner sync-warning">
          <span>${I18n.t('syncBanner.remoteUpdate')}</span>
          <button id="sync-pull" class="btn-secondary">${I18n.t('syncBanner.update')}</button>
        </div>`;
      this._onClick('sync-pull', () => this._storage.pull());
      return;
    }
    this._root.innerHTML = '';
  }

  /** One conflicting vehicle: name it and offer the two versions right
   *  here. Several: a generic message and a dialog deciding vehicle by
   *  vehicle. */
  _renderConflicts(conflicts: ConflictInfo[]): void {
    if (conflicts.length === 1) {
      const { id } = conflicts[0];
      this._root.innerHTML = `
        <div class="sync-banner sync-warning">
          <span>${I18n.t('syncBanner.conflictOne', { name: escapeHtml(conflictName(conflicts[0])) })}</span>
          <button id="sync-keep-local" class="btn-secondary">${I18n.t('syncBanner.keepLocal')}</button>
          <button id="sync-keep-remote" class="btn-secondary">${I18n.t('syncBanner.keepCloud')}</button>
        </div>`;
      this._onClick('sync-keep-local', () => this._storage.resolveConflict({ [id]: 'local' }));
      this._onClick('sync-keep-remote', () => this._storage.resolveConflict({ [id]: 'remote' }));
      return;
    }
    this._root.innerHTML = `
      <div class="sync-banner sync-warning">
        <span>${I18n.t('syncBanner.conflictMany', { count: conflicts.length })}</span>
        <button id="sync-resolve" class="btn-secondary">${I18n.t('syncBanner.resolve')}</button>
      </div>`;
    this._onClick('sync-resolve', () => {
      ConflictDialog.open(conflicts, choices => { void this._storage.resolveConflict(choices); });
    });
  }

  _onClick(id: string, action: () => unknown): void {
    this._root.querySelector(`#${id}`)?.addEventListener('click', () => { void action(); });
  }
}
