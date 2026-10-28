import { describe, test, expect } from 'bun:test';
import { AppStore } from './AppStore.js';
import { exportPayload, hydrateVehicles, defaultData } from '../domain/payload.js';
import type { ExportPayload } from '../domain/payload.js';
import type { StorageManager } from 'ts-cloud-storage-manager';

/** Duck-typed StorageManager double — the real one needs providers +
 *  browser storage, neither exists under bun test. */
function fakeManager(loadData: ExportPayload | null = null) {
  const saved: unknown[] = [];
  const manager = {
    syncEngine: null,
    currentProvider: { isReadOnly: () => true },
    onStatus: () => {},
    onData: () => {},
    useProvider: () => {},
    initialize: async () => true,
    getStatus: async () => ({ isConnected: true, providerName: 'Read-only' }),
    authenticate: async () => true,
    disconnect: async () => {},
    load: async () => loadData ? { data: loadData, rev: 'r1' } : null,
    save: async (data: unknown) => { saved.push(data); return { status: 'saved', rev: null }; },
    getRemoteRevision: async () => null,
    _saved: saved
  };
  return manager as unknown as StorageManager & { _saved: unknown[] };
}

describe('AppStore', () => {
  test('init hydrates vehicles from the remote payload', async () => {
    const raw: ExportPayload = {
      version: '1.0',
      vehicles: [{
        id: 'v1', name: 'Zoe', energyType: 'electric', vehicleType: 'car',
        acquisitionDate: '2024-01-15', initialOdometerKm: 12000,
        purchasePrice: 25000, inspectionPeriodMonths: 24,
        resaleValues: [], fuelUps: [], charges: [], loanPeriods: [],
        costs: [], updatedAt: '2024-01-15T00:00:00Z'
      }]
    };
    const store = new AppStore(fakeManager(raw));
    await store.init();
    expect(store.state.isAuthenticated).toBe(true);
    expect(store.state.vehicles).toHaveLength(1);
    expect(store.state.vehicles[0].name).toBe('Zoe');
  });

  test('save round-trips the current vehicles into the payload', async () => {
    const manager = fakeManager();
    const store = new AppStore(manager);
    await store.init();
    const vehicle = await store.addVehicle({ name: 'Golf', energyType: 'fuel' });
    const payload = manager._saved.at(-1) as ExportPayload;
    expect(payload.version).toBe('1.0');
    expect(payload.vehicles).toHaveLength(1);
    expect(payload.vehicles[0].name).toBe('Golf');
    expect(store.findVehicle(vehicle.id)).toBe(vehicle);
  });

  test('removeVehicle drops it from state and payload', async () => {
    const store = new AppStore(fakeManager());
    await store.init();
    const vehicle = await store.addVehicle({ name: 'Golf', energyType: 'fuel' });
    await store.removeVehicle(vehicle.id);
    expect(store.state.vehicles).toHaveLength(0);
  });

  test('hydrateVehicles tolerates missing collections', () => {
    const vehicles = hydrateVehicles({
      version: '1.0',
      vehicles: [{ id: 'v1', name: 'Golf', energyType: 'fuel' } as never]
    });
    expect(vehicles).toHaveLength(1);
    expect(vehicles[0].data.inspectionPeriodMonths).toBe(24);
    expect(vehicles[0].data.costs).toEqual([]);
  });

  test('exportPayload of an empty store is the default data', () => {
    expect(exportPayload([])).toEqual(defaultData());
  });
});
