import { describe, test, expect } from 'bun:test';
import { createVehicle } from './payload.js';
import { resaleValueAt, odometerAt, kmInPeriod, costsInPeriod, costsByCategory, depreciation, yearlyReport, loanPayments } from './costs.js';
import { newId } from './events.js';

function golf(): ReturnType<typeof createVehicle> {
  const v = createVehicle({
    name: 'Golf', energyType: 'fuel',
    acquisitionDate: '2021-03-15', initialOdometerKm: 42000,
    acquisition: { initialAmount: 18500 }
  });
  v.recordResaleValue({ date: '2022-03-15', value: 17200 });
  v.recordResaleValue({ date: '2024-03-15', value: 14500 });
  v.recordFuelUp({ id: newId(), date: '2021-06-15', odometerKm: 45000, volumeLitres: 50, amount: 50, full: true });
  v.recordFuelUp({ id: newId(), date: '2022-06-15', odometerKm: 60000, volumeLitres: 50, amount: 60, full: true });
  v.recordCost({ id: newId(), date: '2021-06-01', category: 'insurance', amount: 700 });
  v.recordCost({ id: newId(), date: '2021-09-10', category: 'maintenance', amount: 300 });
  v.recordCost({ id: newId(), date: '2022-04-01', category: 'insurance', amount: 720 });
  return v;
}

describe('costs engine', () => {
  test('resaleValueAt anchors on purchase price then interpolates', () => {
    const v = golf();
    expect(resaleValueAt(v, '2021-03-15')).toBe(18500);            // anchor
    expect(resaleValueAt(v, '2021-01-01')).toBe(18500);            // before
    expect(resaleValueAt(v, '2022-03-15')).toBe(17200);            // known point
    expect(resaleValueAt(v, '2023-03-15')).toBeCloseTo(15852, 0);  // ~mid 17200→14500 (day-exact)
    expect(resaleValueAt(v, '2025-01-01')).toBe(14500);            // after last
  });

  test('odometerAt interpolates between readings', () => {
    const v = golf();
    expect(odometerAt(v, '2021-03-15')).toBe(42000);
    expect(odometerAt(v, '2021-06-15')).toBe(45000);
    expect(odometerAt(v, '2021-09-15')).toBeCloseTo(48781, 0);     // 45000→60000, 92/365 of the span
    expect(odometerAt(v, '2026-01-01')).toBe(60000);               // after last reading
  });

  test('kmInPeriod is undefined outside known odometer range', () => {
    const v = golf();
    expect(kmInPeriod(v, '2021-06-15', '2022-06-15')).toBe(15000);
    expect(kmInPeriod(v, '2023-01-01', '2023-12-31')).toBeUndefined();
  });

  test('costsInPeriod filters by category and date range', () => {
    const v = golf();
    expect(costsInPeriod(v, '2021-01-01', '2021-12-31')).toBe(1050);
    expect(costsInPeriod(v, '2021-01-01', '2021-12-31', new Set(['insurance']))).toBe(700);
    const byCat = costsByCategory(v, '2021-01-01', '2021-12-31');
    expect(byCat.get('maintenance')).toBe(300);
    // The 2021 fill-up's 50€ lands in the 'fuel' bucket
    expect(byCat.get('fuel')).toBe(50);
  });

  test('depreciation between interpolated anchors', () => {
    const v = golf();
    // 2021-03-15→2022-03-15: 18500 → 17200
    expect(depreciation(v, '2021-03-15', '2022-03-15')).toBeCloseTo(1300, 0);
  });

  test('yearlyReport covers acquisition year → current year', () => {
    const v = golf();
    const report = yearlyReport(v, undefined, 2022);
    expect(report).toHaveLength(2);
    const [y2021, y2022] = report;
    expect(y2021.costs).toBe(1050); // 1000 recorded + 50€ fuel-up
    // 2021-03-15 (18500) → 2021-12-31 (interpolated ~17464)
    expect(y2021.depreciation).toBeCloseTo(1036, 0);
    expect(y2021.tco).toBeCloseTo(2086, 0);
    // Odometer 42000 → ~53181 (interpolated at 2021-12-31)
    expect(y2021.km).toBeCloseTo(11181, -2);
    expect(y2022.costs).toBe(780); // 720 insurance + 60€ fuel-up
    // 2022: from 2022-01-01 (interp ~17453) to 2022-12-31 (interp ~16038)
    expect(y2022.depreciation).toBeGreaterThan(0);
  });

  test('loanPayments expands the schedule at each periodicity', () => {
    const v = golf();
    // Monthly: 3 × 285 from 2021-04-05 → 04-05, 05-05, 06-05.
    v.data.acquisition = { loan: { periodicity: 'monthly', amount: 285, count: 3, firstPaymentDate: '2021-04-05' } };
    expect(loanPayments(v)).toEqual([
      { date: '2021-04-05', amount: 285 },
      { date: '2021-05-05', amount: 285 },
      { date: '2021-06-05', amount: 285 }
    ]);
    // Yearly: 2 payments 12 months apart.
    v.data.acquisition = { loan: { periodicity: 'yearly', amount: 1200, count: 2, firstPaymentDate: '2021-04-05' } };
    expect(loanPayments(v).map(p => p.date)).toEqual(['2021-04-05', '2022-04-05']);
    // No loan → no payments.
    v.data.acquisition = { initialAmount: 18500 };
    expect(loanPayments(v)).toEqual([]);
  });

  test('loan instalments count as acquisition costs', () => {
    const v = golf();
    v.data.acquisition = {
      initialAmount: 18500,
      loan: { periodicity: 'monthly', amount: 285, count: 3, firstPaymentDate: '2021-04-05' }
    };
    // The 3 instalments (Apr/May/Jun 2021) fall in 2021, none in 2022.
    expect(costsInPeriod(v, '2021-01-01', '2021-12-31', new Set(['acquisition']))).toBe(855);
    expect(costsInPeriod(v, '2022-01-01', '2022-12-31', new Set(['acquisition']))).toBe(0);
    expect(costsByCategory(v, '2021-01-01', '2021-12-31').get('acquisition')).toBe(855);
  });

  test('registration fee counts as an acquisition cost on the purchase date', () => {
    const v = golf();
    v.data.acquisition = { initialAmount: 18500, registrationFee: 380 };
    expect(costsInPeriod(v, '2021-03-01', '2021-03-31', new Set(['acquisition']))).toBe(380);
    expect(costsInPeriod(v, '2021-04-01', '2021-04-30', new Set(['acquisition']))).toBe(0);
  });
});
