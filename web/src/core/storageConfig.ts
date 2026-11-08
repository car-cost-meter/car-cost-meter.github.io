import type { StorageConfig } from 'ts-cloud-storage-manager';
import { vehicleGrains } from '../domain/payload.js';

// OAuth app credentials — register the app in the Dropbox and Microsoft
// Entra consoles (PKCE public clients), see README. Placeholders until then.
const DROPBOX_APP_KEY = 'oz68n4s2g6onj3e';
export const ONEDRIVE_CLIENT_ID = 'TODO-onedrive-client-id';

// Shared by the app entry point (main.ts) and the help pages' session
// probe (help.ts) — both wrap a StorageManager on the same namespace.
export const STORAGE_CONFIG: StorageConfig = {
  // Storage namespace: isolates this app's sessions/sync state from other
  // apps sharing the origin (dev port, *.github.io project pages).
  namespace: 'car-cost-meter',
  fileName: 'car-cost-meter.json',
  dropbox: { appKey: DROPBOX_APP_KEY },
  oneDrive: { clientId: ONEDRIVE_CLIENT_ID },
  // Offline-first sync with per-vehicle merge (one grain per vehicle);
  // remote updates wait for the banner's update button instead of
  // reloading data under the user's eyes.
  sync: { grains: vehicleGrains, eagerPull: false }
};
