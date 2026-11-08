/**
 * Progressive enhancement on the static help pages: when a storage session
 * exists, fills the "data location" slot in the storage FAQ (same
 * StorageManager.getDataLocation() the removed HelpModal used). Without JS
 * or without a session the slot simply stays hidden — the page remains
 * fully readable and crawlable.
 */
import { StorageManager } from 'ts-cloud-storage-manager';
import { STORAGE_CONFIG } from './core/storageConfig.js';

const slot = document.getElementById('help-data-location');
if (slot) {
  void (async () => {
    try {
      const manager = new StorageManager(STORAGE_CONFIG);
      if (await manager.initialize()) {
        const location = await manager.getDataLocation();
        const code = slot.querySelector('code');
        if (location && code) {
          code.textContent = location;
          slot.hidden = false;
        }
      }
    } catch { /* no session or provider unreachable — the slot stays hidden */ }
  })();
}
