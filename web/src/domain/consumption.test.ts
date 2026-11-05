import { describe, test, expect } from 'bun:test';
import { createVehicle } from './payload.js';
import { fuelUpConsumption, chargeConsumption, windowConsumption } from './consumption.js';

const v = createVehicle({
  name: 'Golf', energyType: 'fuel',
  acquisitionDate: '2021-03-15', initialOdometerKm: 42000
});
// f0 — full bound at 42 500 km (its 50 L were burned before 42 500)
v.recordFuelUp({ date: '2021-04-01', odometerKm: 42500, volumeLitres: 50, full: true });
// f1 — partial top-up inside the window
v.recordFuelUp({ date: '2021-04-15', odometerKm: 43000, volumeLitres: 20, full: false });
// f2 — full close of the window: (20 + 40) L over 1 000 km → 6 L/100km
v.recordFuelUp({ date: '2021-05-01', odometerKm: 43500, volumeLitres: 40, full: true });

describe('windowConsumption', () => {
  test('sums volumes strictly after the previous full, current included', () => {
    const w = windowConsumption(v.data.fuelUps, 2, f => f.volumeLitres);
    expect(w?.per100km).toBeCloseTo(6);
    expect(w?.fromDate).toBe('2021-04-01');
    expect(w?.toDate).toBe('2021-05-01');
  });

  test('undefined when the current entry is not full or has no odometer', () => {
    expect(windowConsumption(v.data.fuelUps, 1, f => f.volumeLitres)).toBeUndefined();
    expect(windowConsumption([{ date: '2021-05-01', volumeLitres: 40, full: true }], 0, f => f.volumeLitres)).toBeUndefined();
  });

  test('undefined without a previous full entry', () => {
    expect(windowConsumption(v.data.fuelUps, 0, f => f.volumeLitres)).toBeUndefined();
  });

  test('undefined when an in-between entry misses its volume', () => {
    const entries = [
      { date: '2021-04-01', odometerKm: 42500, volumeLitres: 50, full: true },
      { date: '2021-04-20', odometerKm: 43200, full: false }, // no volume
      { date: '2021-05-01', odometerKm: 43500, volumeLitres: 40, full: true }
    ];
    expect(windowConsumption(entries, 2, e => e.volumeLitres)).toBeUndefined();
  });

  test('a full entry without odometer is skipped as bound but its volume counts', () => {
    const entries = [
      { date: '2021-04-01', odometerKm: 42500, volumeLitres: 50, full: true },
      { date: '2021-04-15', volumeLitres: 20, full: true }, // full, no odo
      { date: '2021-05-01', odometerKm: 43500, volumeLitres: 40, full: true }
    ];
    expect(windowConsumption(entries, 2, e => e.volumeLitres)?.per100km).toBeCloseTo(6);
  });

  test('the bound own volume is not needed', () => {
    const entries = [
      { date: '2021-04-01', odometerKm: 42500, full: true }, // no volume: fine
      { date: '2021-05-01', odometerKm: 43500, volumeLitres: 40, full: true }
    ];
    expect(windowConsumption(entries, 1, e => e.volumeLitres)?.per100km).toBeCloseTo(4);
  });

  test('undefined on non-positive km delta', () => {
    const entries = [
      { date: '2021-04-01', odometerKm: 43500, volumeLitres: 50, full: true },
      { date: '2021-05-01', odometerKm: 43500, volumeLitres: 40, full: true }
    ];
    expect(windowConsumption(entries, 1, e => e.volumeLitres)).toBeUndefined();
  });
});

describe('fuelUpConsumption', () => {
  test('computes L/100km over a fully-known window', () => {
    expect(fuelUpConsumption(v.data, 2)?.per100km).toBeCloseTo(6);
  });

  test('unknown when a fuel cost sits inside the window', () => {
    const w = createVehicle({ name: 'T', energyType: 'fuel' });
    w.data.fuelUps = v.data.fuelUps.map(f => ({ ...f }));
    w.recordCost({ date: '2021-04-20', category: 'fuel', amount: 30 });
    expect(fuelUpConsumption(w.data, 2)).toBeUndefined();
    // Outside the window → still known
    const w2 = createVehicle({ name: 'T', energyType: 'fuel' });
    w2.data.fuelUps = v.data.fuelUps.map(f => ({ ...f }));
    w2.recordCost({ date: '2021-03-20', category: 'fuel', amount: 30 });
    expect(fuelUpConsumption(w2.data, 2)?.per100km).toBeCloseTo(6);
  });

  test('unknown when a loan period overlaps the window', () => {
    const w = createVehicle({ name: 'T', energyType: 'fuel' });
    w.data.fuelUps = v.data.fuelUps.map(f => ({ ...f }));
    w.recordLoanPeriod({ from: '2021-04-10', to: '2021-04-20' });
    expect(fuelUpConsumption(w.data, 2)).toBeUndefined();
    // Disjoint loan → still known
    const w2 = createVehicle({ name: 'T', energyType: 'fuel' });
    w2.data.fuelUps = v.data.fuelUps.map(f => ({ ...f }));
    w2.recordLoanPeriod({ from: '2021-06-01', to: '2021-06-20' });
    expect(fuelUpConsumption(w2.data, 2)?.per100km).toBeCloseTo(6);
  });
});

describe('chargeConsumption', () => {
  test('computes kWh/100km over a fully-known window', () => {
    const w = createVehicle({ name: 'EV', energyType: 'electric' });
    w.recordCharge({ date: '2024-01-01', odometerKm: 1000, kwh: 40, full: true });
    w.recordCharge({ date: '2024-01-10', odometerKm: 1200, kwh: 15, full: false });
    w.recordCharge({ date: '2024-01-20', odometerKm: 1400, kwh: 25, full: true });
    // (15 + 25) kWh over 400 km → 10 kWh/100km
    expect(chargeConsumption(w.data, 2)?.per100km).toBeCloseTo(10);
  });

  test('unknown when a charge in the window misses its kWh', () => {
    const w = createVehicle({ name: 'EV', energyType: 'electric' });
    w.recordCharge({ date: '2024-01-01', odometerKm: 1000, kwh: 40, full: true });
    w.recordCharge({ date: '2024-01-10', odometerKm: 1200, full: false });
    w.recordCharge({ date: '2024-01-20', odometerKm: 1400, kwh: 25, full: true });
    expect(chargeConsumption(w.data, 2)).toBeUndefined();
  });
});
