import { describe, test, expect } from 'bun:test';
import { mergePolicy } from './mergePolicy.js';
import { UNRECONCILABLE } from 'ts-cloud-storage-manager';
import type { ExportPayload } from './payload.js';
import type { VehicleData } from './Vehicle.js';

function vehicle(id: string, over: Partial<VehicleData> = {}): VehicleData {
  return {
    id, name: `V-${id}`, energyType: 'fuel', vehicleType: 'car',
    acquisitionDate: '2024-01-01', initialOdometerKm: 0, purchasePrice: 10000,
    inspectionPeriodMonths: 24,
    resaleValues: [], fuelUps: [], charges: [], loanPeriods: [], costs: [],
    updatedAt: '2024-01-01T00:00:00Z',
    ...over
  };
}

const payload = (...vehicles: VehicleData[]): ExportPayload => ({ version: '1.0', vehicles });
const merge = (base: unknown, local: unknown, remote: unknown) =>
  mergePolicy({ base, local, remote }) as ExportPayload | typeof UNRECONCILABLE;

describe('mergePolicy', () => {
  test('non-payload inputs are unreconcilable', () => {
    expect(merge(null, null, null)).toBe(UNRECONCILABLE);
    expect(merge({}, { vehicles: [] }, 'x')).toBe(UNRECONCILABLE);
  });

  test('edits on different vehicles merge automatically', () => {
    const base = payload(vehicle('a'), vehicle('b'));
    const local = payload(
      vehicle('a', { name: 'A local', updatedAt: '2024-02-01T00:00:00Z' }),
      vehicle('b'));
    const remote = payload(
      vehicle('a'),
      vehicle('b', { purchasePrice: 12000, updatedAt: '2024-02-02T00:00:00Z' }));
    const merged = merge(base, local, remote) as ExportPayload;
    expect(merged.vehicles[0].name).toBe('A local');
    expect(merged.vehicles[1].purchasePrice).toBe(12000);
  });

  test('vehicles created on either side are kept', () => {
    const base = payload(vehicle('a'));
    const local = payload(vehicle('a'), vehicle('l'));
    const remote = payload(vehicle('a'), vehicle('r'));
    const merged = merge(base, local, remote) as ExportPayload;
    expect(merged.vehicles.map(v => v.id)).toEqual(['a', 'l', 'r']);
  });

  test('deletion on one side wins when the other side did not touch it', () => {
    const base = payload(vehicle('a'), vehicle('b'));
    const merged = merge(base, payload(vehicle('a')), base);
    expect((merged as ExportPayload).vehicles.map(v => v.id)).toEqual(['a']);
  });

  test('delete-vs-edit on the same vehicle parks the merge', () => {
    const base = payload(vehicle('a'));
    const remote = payload(vehicle('a', { name: 'edited', updatedAt: '2024-02-01T00:00:00Z' }));
    expect(merge(base, payload(), remote)).toBe(UNRECONCILABLE);
  });

  test('same-vehicle event collections union by id', () => {
    const base = payload(vehicle('a'));
    const local = payload(vehicle('a', {
      fuelUps: [{ id: 'f1', date: '2024-02-01', volumeLitres: 40, full: true }],
      updatedAt: '2024-02-01T00:00:00Z'
    }));
    const remote = payload(vehicle('a', {
      costs: [{ id: 'c1', date: '2024-02-02', category: 'insurance', amount: 700 }],
      updatedAt: '2024-02-02T00:00:00Z'
    }));
    const merged = merge(base, local, remote) as ExportPayload;
    expect(merged.vehicles[0].fuelUps.map(f => f.id)).toEqual(['f1']);
    expect(merged.vehicles[0].costs.map(c => c.id)).toEqual(['c1']);
  });

  test('event deleted on one side, untouched on the other, is dropped', () => {
    const e = { id: 'f1', date: '2024-02-01', volumeLitres: 40, full: true };
    const base = payload(vehicle('a', { fuelUps: [e, { id: 'f2', date: '2024-02-05', volumeLitres: 41, full: true }] }));
    const local = payload(vehicle('a', { fuelUps: [{ id: 'f2', date: '2024-02-05', volumeLitres: 41, full: true }], updatedAt: '2024-02-06T00:00:00Z' }));
    const merged = merge(base, local, base) as ExportPayload;
    expect(merged.vehicles[0].fuelUps.map(f => f.id)).toEqual(['f2']);
  });

  test('same field edited differently on both sides parks the merge', () => {
    const base = payload(vehicle('a', { name: 'orig' }));
    const local = payload(vehicle('a', { name: 'L', updatedAt: '2024-03-01T00:00:00Z' }));
    const remote = payload(vehicle('a', { name: 'R', updatedAt: '2024-03-02T00:00:00Z' }));
    expect(merge(base, local, remote)).toBe(UNRECONCILABLE);
  });

  test('scalar edited on one side only is taken from that side', () => {
    const base = payload(vehicle('a', { name: 'orig' }));
    const remote = payload(vehicle('a', { name: 'new', updatedAt: '2024-03-02T00:00:00Z' }));
    const merged = merge(base, base, remote) as ExportPayload;
    expect(merged.vehicles[0].name).toBe('new');
  });

  test('same-id event edited on both sides: fresher vehicle wins', () => {
    const e1 = { id: 'f1', date: '2024-02-01', volumeLitres: 40, full: true };
    const e2 = { id: 'f1', date: '2024-02-01', volumeLitres: 42, full: true };
    const base = payload(vehicle('a', { fuelUps: [e1] }));
    const local = payload(vehicle('a', { fuelUps: [e2], updatedAt: '2024-03-01T00:00:00Z' }));
    const remote = payload(vehicle('a', {
      fuelUps: [{ id: 'f1', date: '2024-02-01', volumeLitres: 45, full: true }],
      updatedAt: '2024-03-02T00:00:00Z' // remote is fresher
    }));
    const merged = merge(base, local, remote) as ExportPayload;
    expect(merged.vehicles[0].fuelUps[0].volumeLitres).toBe(45);
  });
});
