import { EventBus } from './EventBus.js';
import { Vehicle } from '../domain/Vehicle.js';
import { createVehicle, defaultData, exportPayload, hydrateVehicles } from '../domain/payload.js';
import type { ExportPayload } from '../domain/payload.js';
import type { VehicleData } from '../domain/Vehicle.js';
import type { StorageManager, SyncStatus } from 'ts-cloud-storage-manager';
import { ReadOnlyProvider } from 'ts-cloud-storage-manager';

/** Public Gist URL serving the demo dataset — published from demo/demo.json
 *  (scripts/make_demo_data.ts). The bundled web/demo.json copy serves as
 *  fallback while the gist is unreachable (or not yet published). */
export const DEMO_GIST_URL =
  'https://gist.githubusercontent.com/fathzer/TODO-demo-gist/raw/demo.json';
const DEMO_FALLBACK_URL = 'demo.json';

export type AppStoreEvents = {
  'state:changed': AppState;
  'state:loading': boolean;
  'save:error': Error;
  'load:error': Error;
};

export interface AppState {
  isAuthenticated: boolean;
  isLoading: boolean;
  vehicles: Vehicle[];
}

export class AppStore extends EventBus<AppStoreEvents> {
  storageManager: StorageManager;
  state: AppState;
  /** Latest sync status, kept by subscription for init decisions. */
  _syncStatus?: SyncStatus;

  constructor(storageManager: StorageManager) {
    super();
    this.storageManager = storageManager;
    if (storageManager.syncEngine) {
      storageManager.onStatus(s => { this._syncStatus = s; });
      storageManager.onData(d => this._applySyncedData(d));
    }
    this.state = {
      isAuthenticated: false,
      isLoading: true,
      vehicles: []
    };
  }

  async init(): Promise<void> {
    this.emit('state:loading', true);
    await this.storageManager.initialize();
    const status = await this.storageManager.getStatus();
    this.state.isAuthenticated = status.isConnected;
    if (this.state.isAuthenticated) {
      const rawData = await this._loadInitialData();
      if (rawData != null && typeof rawData === 'object') {
        this._hydrateState(rawData);
      }
    }
    this.state.isLoading = false;
    this.emit('state:loading', false);
    this.emit('state:changed', this.state);
  }

  /**
   * The data to hydrate from on init. Through the engine when one is
   * managed (it already pulled remote + local state inside initialize()),
   * seeding a default file only when the remote is confirmed absent — a
   * load failure must never seed over an existing remote file. Read-only
   * demo sessions take the raw load path: nothing is ever seeded.
   */
  async _loadInitialData(): Promise<Partial<ExportPayload> | null> {
    const engine = this.storageManager.currentProvider.isReadOnly() ? null : this.storageManager.syncEngine;
    if (engine) {
      const local = engine.getLocal() as Partial<ExportPayload> | null;
      if (local == null) {
        if (this._syncStatus?.lastError) {
          this.emit('load:error', new Error(this._syncStatus.lastError));
        } else {
          const seeded = defaultData();
          await this.storageManager.save(seeded);
          return seeded;
        }
      }
      return local;
    }
    try {
      const remote = await this.storageManager.load();
      return remote?.data as Partial<ExportPayload> | null;
    } catch (error) {
      console.error('Failed to load data:', error);
      this.emit('load:error', error as Error);
      return null;
    }
  }

  async login(): Promise<void> {
    const ok = await this.storageManager.authenticate();
    if (ok) await this.init();
  }

  async loginDemo(): Promise<void> {
    // Probe the gist once; the bundled copy keeps the demo usable when it
    // is unreachable (offline dev, gist not yet published).
    let url = DEMO_GIST_URL;
    try {
      const res = await fetch(DEMO_GIST_URL, { method: 'HEAD' });
      if (!res.ok) url = DEMO_FALLBACK_URL;
    } catch {
      url = DEMO_FALLBACK_URL;
    }
    this.storageManager.useProvider(new ReadOnlyProvider(url));
    await this.init();
  }

  async logout(): Promise<void> {
    await this.storageManager.disconnect();
    window.location.replace('./');
  }

  async save(): Promise<void> {
    try {
      await this.storageManager.save(this.getExportPayload());
    } catch (error) {
      console.error('Save failed:', error);
      this.emit('save:error', error as Error);
    }
  }

  getExportPayload(): ExportPayload {
    return exportPayload(this.state.vehicles);
  }

  /**
   * Replaces all data with an imported payload (validated first — throws
   * on malformed files). Persists and notifies.
   */
  async importData(raw: unknown): Promise<void> {
    if (!raw || typeof raw !== 'object' || !Array.isArray((raw as ExportPayload).vehicles)) {
      throw new Error('Invalid payload');
    }
    this._hydrateState(raw as Partial<ExportPayload>);
    await this.save();
    this.emit('state:changed', this.state);
  }

  findVehicle(id: string): Vehicle | undefined {
    return this.state.vehicles.find(v => v.id === id);
  }

  async addVehicle(input: Parameters<typeof createVehicle>[0]): Promise<Vehicle> {
    const vehicle = createVehicle(input);
    this.state.vehicles.push(vehicle);
    await this.save();
    this.emit('state:changed', this.state);
    return vehicle;
  }

  async updateVehicle(id: string, patch: Partial<VehicleData>): Promise<void> {
    const vehicle = this.findVehicle(id);
    if (!vehicle) return;
    Object.assign(vehicle.data, patch);
    vehicle.data.updatedAt = new Date().toISOString();
    await this.save();
    this.emit('state:changed', this.state);
  }

  async removeVehicle(id: string): Promise<void> {
    this.state.vehicles = this.state.vehicles.filter(v => v.id !== id);
    await this.save();
    this.emit('state:changed', this.state);
  }

  _hydrateState(rawData: Partial<ExportPayload>): void {
    this.state.vehicles = hydrateVehicles(rawData);
  }

  /** Remote data adopted by the sync engine — rehydrate + notify. */
  _applySyncedData(data: unknown): void {
    this._hydrateState(data as Partial<ExportPayload>);
    this.emit('state:changed', this.state);
  }
}
