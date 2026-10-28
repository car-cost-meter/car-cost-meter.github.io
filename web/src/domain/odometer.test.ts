import { describe, test, expect } from 'bun:test';
import { createVehicle } from './payload.js';
import { newId } from './events.js';
import { odometerReadings, odometerViolations } from './odometer.js';

const v = createVehicle({
  name: 'Golf', energyType: 'fuel',
  acquisitionDate: '2021-03-15', initialOdometerKm: 42000
});
v.recordFuelUp({ id: 'f1', date: '2021-06-15', odometerKm: 45000, full: true });
v.recordFuelUp({ id: 'f2', date: '2022-06-15', odometerKm: 60000, full: true });
v.recordCost({ id: 'c1', date: '2021-12-01', category: 'maintenance', amount: 100, odometerKm: 50000 });

describe('odometer readings & violations', () => {
  test('readings include initial + all event odometers, sorted', () => {
    const readings = odometerReadings(v);
    expect(readings.map(r => r.km)).toEqual([42000, 45000, 50000, 60000]);
    expect(readings[0].kind).toBe('initial');
    expect(readings[2].kind).toBe('cost');
  });

  test('consistent entry yields no violation', () => {
    expect(odometerViolations(v, '2021-09-01', 47000)).toEqual([]);
    expect(odometerViolations(v, '2021-06-15', 45000)).toEqual([]); // same point as f1
  });

  test('backwards km reports the contradicting readings', () => {
    // 44 000 km after the 45 000 km fill-up → contradicts f1 only
    const bad = odometerViolations(v, '2021-07-01', 44000);
    expect(bad.map(r => r.km)).toEqual([45000]);
    // 65 000 km before the 60 000 km fill-up → contradicts f1, c1 and f2
    const ahead = odometerViolations(v, '2021-05-01', 65000);
    expect(ahead.map(r => r.km)).toEqual([45000, 50000, 60000]);
  });

  test('same date with different km is consistent (two fill-ups in one day)', () => {
    expect(odometerViolations(v, '2021-06-15', 46000)).toEqual([]);
    expect(odometerViolations(v, '2021-06-15', 44000)).toEqual([]);
  });

  test('excludeId skips the entry being edited', () => {
    expect(odometerViolations(v, '2021-06-15', 46000, 'f1')).toEqual([]);
  });
});
