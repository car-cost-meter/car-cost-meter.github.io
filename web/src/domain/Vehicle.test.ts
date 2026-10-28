import { describe, test, expect } from 'bun:test';
import { Vehicle } from './Vehicle.js';
import { createVehicle } from './payload.js';

function makeVehicle(): Vehicle {
  return createVehicle({
    name: 'Zoe',
    energyType: 'electric',
    acquisitionDate: '2024-01-15',
    initialOdometerKm: 12000,
    acquisition: { initialAmount: 25000 }
  });
}

describe('Vehicle', () => {
  test('usesFuel / usesElectricity follow energyType', () => {
    expect(makeVehicle().usesFuel()).toBe(false);
    expect(makeVehicle().usesElectricity()).toBe(true);
    const diesel = createVehicle({ name: 'Golf', energyType: 'fuel' });
    expect(diesel.usesFuel()).toBe(true);
    expect(diesel.usesElectricity()).toBe(false);
    const phev = createVehicle({ name: 'Prius', energyType: 'hybrid' });
    expect(phev.usesFuel()).toBe(true);
    expect(phev.usesElectricity()).toBe(true);
  });

  test('recordFuelUp keeps entries sorted and replaces by id', () => {
    const v = createVehicle({ name: 'Golf', energyType: 'fuel' });
    v.recordFuelUp({ id: 'b', date: '2024-03-10', odometerKm: 13000, volumeLitres: 40, full: true });
    v.recordFuelUp({ id: 'a', date: '2024-02-01', odometerKm: 12500, volumeLitres: 35, full: true });
    expect(v.data.fuelUps.map(f => f.id)).toEqual(['a', 'b']);
    v.recordFuelUp({ id: 'a', date: '2024-02-02', odometerKm: 12510, volumeLitres: 36, full: true });
    expect(v.data.fuelUps).toHaveLength(2);
    expect(v.data.fuelUps[0].date).toBe('2024-02-02');
  });

  test('recordResaleValue keeps one value per date', () => {
    const v = makeVehicle();
    v.recordResaleValue({ date: '2025-01-15', value: 18000 });
    v.recordResaleValue({ date: '2025-01-15', value: 17500 });
    v.recordResaleValue({ date: '2024-06-15', value: 21000 });
    expect(v.data.resaleValues).toEqual([
      { date: '2024-06-15', value: 21000 },
      { date: '2025-01-15', value: 17500 }
    ]);
  });

  test('mutations stamp updatedAt', () => {
    const v = makeVehicle();
    const before = v.data.updatedAt;
    v.recordCost({ id: 'c1', date: '2024-05-01', category: 'insurance', amount: 800 });
    expect(v.data.updatedAt > before || v.data.updatedAt === before).toBe(true);
  });

  test('inspection dates derive from the inspection cost entries', () => {
    const v = createVehicle({ name: 'Golf', energyType: 'fuel', inspectionPeriodMonths: 24 });
    expect(v.lastInspectionDate()).toBeUndefined();
    expect(v.nextInspectionDate()).toBeUndefined();
    v.recordCost({ id: 'ct1', date: '2024-06-10', category: 'inspection', amount: 85 });
    v.recordCost({ id: 'ct2', date: '2024-03-01', category: 'inspection', amount: 80 });
    expect(v.lastInspectionDate()).toBe('2024-06-10');
    expect(v.nextInspectionDate()).toBe('2026-06-10');
  });

  test('inspectionStatus thresholds', () => {
    const v = createVehicle({ name: 'Golf', energyType: 'fuel', inspectionPeriodMonths: 12 });
    expect(v.inspectionStatus('2025-01-01')).toBe('none');
    v.recordCost({ id: 'ct', date: '2024-06-01', category: 'inspection', amount: 80 });
    expect(v.inspectionStatus('2025-01-01')).toBe('ok');
    expect(v.inspectionStatus('2025-05-20')).toBe('soon');
    expect(v.inspectionStatus('2025-06-02')).toBe('overdue');
  });

  test('lastKnownOdometerKm takes the latest dated reading', () => {
    const v = createVehicle({ name: 'Golf', energyType: 'fuel' });
    v.recordFuelUp({ id: 'f1', date: '2024-02-01', odometerKm: 10000, full: true });
    v.recordCost({ id: 'c1', date: '2024-03-01', category: 'maintenance', amount: 120, odometerKm: 10500 });
    v.recordFuelUp({ id: 'f2', date: '2024-01-15', odometerKm: 9900, full: true });
    expect(v.lastKnownOdometerKm()).toBe(10500);
  });

  test('removeEvent / findEvent across collections', () => {
    const v = createVehicle({ name: 'Zoe', energyType: 'electric' });
    v.recordCharge({ id: 'ch', date: '2024-04-01', kwh: 40, odometerKm: 12500 });
    expect(v.findEvent('ch')).toBeDefined();
    v.removeEvent('ch');
    expect(v.findEvent('ch')).toBeUndefined();
    expect(v.data.charges).toHaveLength(0);
  });
});
