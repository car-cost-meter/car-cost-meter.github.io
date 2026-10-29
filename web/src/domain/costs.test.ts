import { describe, test, expect } from 'bun:test';
import { createVehicle } from './payload.js';
import { resaleValueAt, odometerAt, kmInPeriod, costsInPeriod, costsByCategory, depreciation, yearlyReport, loanPayments, expensesInPeriod, isRented, totalInvested } from './costs.js';
import { newId } from './events.js';
import { todayString, yearOf } from '../core/dates.js';

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

  test('credit instalments are excluded from costs but counted as expenses', () => {
    const v = golf();
    v.data.acquisition = {
      initialAmount: 18500,
      loan: { kind: 'credit', periodicity: 'monthly', amount: 285, count: 3, firstPaymentDate: '2021-04-05' }
    };
    // Credit: financing is carried by depreciation, not by cost entries.
    expect(costsInPeriod(v, '2021-01-01', '2021-12-31', new Set(['acquisition']))).toBe(0);
    // …but the cash outflows are real: initial + 3 instalments.
    expect(expensesInPeriod(v, '2021-01-01', '2021-12-31', new Set(['acquisition'])))
      .toBe(18500 + 855);
    expect(isRented(v)).toBe(false);
    expect(totalInvested(v)).toBe(19355);
  });

  test('lease instalments count as costs, with the initial payment amortized', () => {
    const v = golf();
    v.data.acquisition = {
      initialAmount: 900,
      loan: { kind: 'lease', periodicity: 'monthly', amount: 300, count: 3, firstPaymentDate: '2021-04-05' }
    };
    // LLD: each instalment costs 300 + 900/3 = 600 → 3 × 600 = 1800.
    expect(isRented(v)).toBe(true);
    expect(costsInPeriod(v, '2021-01-01', '2021-12-31', new Set(['acquisition']))).toBe(1800);
    // No depreciation for a rented vehicle.
    expect(depreciation(v, '2021-01-01', '2021-12-31')).toBe(0);
    // Expenses reflect real outflows: initial lump + raw instalments.
    expect(expensesInPeriod(v, '2021-01-01', '2021-12-31', new Set(['acquisition']))).toBe(900 + 900);
    expect(costsByCategory(v, '2021-01-01', '2021-12-31').get('acquisition')).toBe(1800);
  });

  test('LOA buyout counts in the invested amount when exercised', () => {
    const v = golf();
    v.data.acquisition = {
      initialAmount: 2000,
      loan: { kind: 'lease', periodicity: 'monthly', amount: 300, count: 3, firstPaymentDate: '2021-04-05', optionAmount: 8000, optionExercised: true }
    };
    expect(isRented(v)).toBe(false); // exercised → owned
    expect(totalInvested(v)).toBe(2000 + 900 + 8000);
    // The buyout is an outflow on the last instalment date (2021-06-05).
    expect(expensesInPeriod(v, '2021-06-01', '2021-06-30', new Set(['acquisition']))).toBe(300 + 8000);
    // …and not a cost entry.
    expect(costsInPeriod(v, '2021-01-01', '2021-12-31', new Set(['acquisition']))).toBe(0);
  });

  test('a finished credit does not truncate the yearly report', () => {
    const v = golf(); // costs in 2021 and 2022
    // One-year credit ended mid-2021 — rows after the contract end must
    // still report real costs and a positive depreciation.
    v.data.acquisition = {
      initialAmount: 18500,
      loan: { kind: 'credit', periodicity: 'monthly', amount: 285, count: 12, firstPaymentDate: '2020-07-05' }
    };
    const report = yearlyReport(v, undefined, yearOf(todayString()) > 2022 ? 2022 : yearOf(todayString()));
    const y2022 = report.find(r => r.year === 2022)!;
    expect(y2022.costs).toBe(780); // 720 insurance + 60€ fill-up
    expect(y2022.expenses).toBeGreaterThanOrEqual(780);
    expect(y2022.depreciation).toBeGreaterThanOrEqual(0);
  });

  test('registration fee: expense everywhere, cost only when rented', () => {
    const v = golf();
    // Owned: the fee is a cash outflow, never a cost entry.
    v.data.acquisition = { initialAmount: 18500, registrationFee: 380 };
    expect(costsInPeriod(v, '2021-03-01', '2021-03-31', new Set(['acquisition']))).toBe(0);
    expect(expensesInPeriod(v, '2021-03-01', '2021-03-31', new Set(['acquisition']))).toBe(380 + 18500);
    // Rented: no depreciation carries it — it stays a cost.
    v.data.acquisition = {
      initialAmount: 900, registrationFee: 380,
      loan: { kind: 'lease', periodicity: 'monthly', amount: 300, count: 3, firstPaymentDate: '2021-04-05' }
    };
    expect(costsInPeriod(v, '2021-03-01', '2021-03-31', new Set(['acquisition']))).toBe(380);
  });
});
