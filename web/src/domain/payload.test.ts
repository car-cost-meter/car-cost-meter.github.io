import { describe, test, expect } from 'bun:test';
import { hydrateVehicles, vehicleGrains, PAYLOAD_VERSION } from './payload.js';
import type { ExportPayload } from './payload.js';
import { conflictName, entryCount } from './conflicts.js';

const vehicle = (id: string, over: Record<string, unknown> = {}) => ({
  id, name: `V-${id}`, energyType: 'fuel', vehicleType: 'car',
  acquisitionDate: '2024-01-01', initialOdometerKm: 0, inspectionPeriodMonths: 24,
  resaleValues: [], fuelUps: [], charges: [], loanPeriods: [], costs: [],
  ...over
});

const payload = (...vehicles: unknown[]) => ({ version: PAYLOAD_VERSION, vehicles }) as ExportPayload;

describe('vehicleGrains', () => {
  test('splits a payload into one grain per vehicle, in file order', () => {
    const grains = vehicleGrains.split(payload(vehicle('b'), vehicle('a')));
    expect([...grains.keys()]).toEqual(['b', 'a']);
  });

  test('knows no grain for missing or malformed data', () => {
    expect(vehicleGrains.split(null).size).toBe(0);
    expect(vehicleGrains.split({}).size).toBe(0);
    expect(vehicleGrains.split('junk').size).toBe(0);
  });

  test('join rebuilds the payload from the grains', () => {
    const grains = vehicleGrains.split(payload(vehicle('a'), vehicle('b')));
    expect(vehicleGrains.join(grains)).toEqual(payload(vehicle('a'), vehicle('b')));
  });

  test('a 1.0 file loses its updatedAt stamp and event ids before reaching a grain', () => {
    const legacy = vehicle('a', {
      updatedAt: '2024-01-01T00:00:00Z',
      costs: [{ id: 'e1', date: '2024-02-01', category: 'insurance', amount: 1 }]
    });
    const grain = vehicleGrains.split({ version: '1.0', vehicles: [legacy] }).get('a')!;
    expect(grain).toEqual(vehicle('a', { costs: [{ date: '2024-02-01', category: 'insurance', amount: 1 }] }));
  });

  test('defaults and sorting do not make a stored vehicle look edited', () => {
    const stored = vehicle('a', { resaleValues: undefined, costs: [
      { date: '2024-03-01', category: 'insurance', amount: 1 },
      { date: '2024-02-01', category: 'insurance', amount: 2 }
    ] });
    const hydrated = hydrateVehicles({ vehicles: [stored as never] })[0].data;
    const grain = vehicleGrains.split(payload(stored)).get('a');
    expect(grain).toEqual(hydrated);
    expect(hydrated.costs.map(c => c.date)).toEqual(['2024-02-01', '2024-03-01']);
  });
});

describe('conflict helpers', () => {
  test('name the vehicle from whichever side still has it', () => {
    const v = hydrateVehicles({ vehicles: [vehicle('a', { name: 'Golf' }) as never] })[0].data;
    expect(conflictName({ id: 'a', local: v, remote: null })).toBe('Golf');
    expect(conflictName({ id: 'a', local: null, remote: v })).toBe('Golf');
  });

  test('count the recorded entries of a version', () => {
    const v = hydrateVehicles({ vehicles: [vehicle('a', {
      fuelUps: [{ date: '2024-01-02', volumeLitres: 40, full: true }],
      costs: [{ date: '2024-01-03', category: 'other', amount: 5 }]
    }) as never] })[0].data;
    expect(entryCount(v)).toBe(2);
  });
});
