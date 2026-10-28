import type { Vehicle } from './Vehicle.js';
import type { CostCategory } from './events.js';
import { COST_CATEGORIES } from './events.js';
import { compareDates, utcDate, yearOf, yearStart, yearEnd, todayString } from '../core/dates.js';

/**
 * Cost engine — pure functions over a Vehicle's dated collections.
 * All amounts are nominal (currency of their date); inflation adjustment
 * is a display-side multiplier applied by the views (core/inflation.ts).
 */

/**
 * Linear interpolation between date-sorted points — the value extracted by
 * `value` varies linearly with time between adjacent points. Outside the
 * range the result is clamped to the extreme values; identical dates
 * resolve to the last point.
 */
function interpolate<T extends { date: string }>(
  points: T[], date: string, value: (p: T) => number
): number {
  const first = points[0];
  const last = points.at(-1)!;
  if (compareDates(date, first.date) <= 0) return value(first);
  if (compareDates(date, last.date) >= 0) return value(last);
  const i = points.findIndex(p => compareDates(date, p.date) <= 0);
  const a = points[i - 1];
  const b = points[i];
  if (compareDates(a.date, b.date) === 0) return value(b);
  const t = (utcDate(date) - utcDate(a.date)) / (utcDate(b.date) - utcDate(a.date));
  return value(a) + t * (value(b) - value(a));
}

/**
 * Resale value at a date: linear interpolation between the dated
 * `resaleValues` estimates, anchored by (acquisitionDate, purchasePrice).
 * Before the first anchor → purchasePrice ; after the last → last estimate.
 * TODO: linear interpolation between known points is an approximation.
 */
export function resaleValueAt(vehicle: Vehicle, date: string): number {
  const points = [
    { date: vehicle.data.acquisitionDate, value: vehicle.data.purchasePrice },
    ...vehicle.data.resaleValues
  ].sort((a, b) => compareDates(a.date, b.date));
  return interpolate(points, date, p => p.value);
}

/**
 * Odometer reading at a date: linear interpolation between every known
 * reading (initial odometer at acquisition + all dated odometers carried
 * by fill-ups, charges and costs). Bounded by the extreme readings.
 */
export function odometerAt(vehicle: Vehicle, date: string): number {
  return interpolate(odometerPoints(vehicle), date, p => p.km);
}

/** Kilometres driven between two dates, from interpolated odometers.
 *  undefined when the span is not covered by known readings. */
export function kmInPeriod(vehicle: Vehicle, from: string, to: string): number | undefined {
  const points = odometerPoints(vehicle);
  if (points.length < 2) return undefined;
  if (compareDates(to, points[0].date) <= 0 || compareDates(from, points.at(-1)!.date) >= 0) {
    return undefined; // period entirely outside the known odometer range
  }
  const km = odometerAt(vehicle, to) - odometerAt(vehicle, from);
  return Math.max(0, Math.round(km));
}

function odometerPoints(vehicle: Vehicle): { date: string; km: number }[] {
  const points: { date: string; km: number }[] = [
    { date: vehicle.data.acquisitionDate, km: vehicle.data.initialOdometerKm }
  ];
  for (const e of vehicle.data.fuelUps) if (e.odometerKm !== undefined) points.push({ date: e.date, km: e.odometerKm });
  for (const e of vehicle.data.charges) if (e.odometerKm !== undefined) points.push({ date: e.date, km: e.odometerKm });
  for (const e of vehicle.data.costs) if (e.odometerKm !== undefined) points.push({ date: e.date, km: e.odometerKm });
  return points.sort((a, b) => compareDates(a.date, b.date) || a.km - b.km);
}

/** Display-side price-level multiplier (1 = nominal euros). */
export type PriceFactor = (date: string) => number;

const NOMINAL: PriceFactor = () => 1;

/** Sum of cost entries inside [from, to], optionally filtered by category.
 *  Fill-ups and charges count as 'fuel' costs — their amounts are energy
 *  spend. Each amount is multiplied by `factor(date)` (constant-euros). */
export function costsInPeriod(
  vehicle: Vehicle, from: string, to: string,
  categories?: ReadonlySet<CostCategory>, factor: PriceFactor = NOMINAL
): number {
  const filter = categories ?? new Set(COST_CATEGORIES);
  let sum = vehicle.data.costs
    .filter(c => c.date >= from && c.date <= to && filter.has(c.category))
    .reduce((acc, c) => acc + c.amount * factor(c.date), 0);
  if (filter.has('fuel')) {
    for (const f of vehicle.data.fuelUps) {
      if (f.amount !== undefined && f.date >= from && f.date <= to) sum += f.amount * factor(f.date);
    }
    for (const c of vehicle.data.charges) {
      if (c.amount !== undefined && c.date >= from && c.date <= to) sum += c.amount * factor(c.date);
    }
  }
  return sum;
}

/** Per-category sums inside [from, to], amounts scaled by `factor`.
 *  Fill-up and charge amounts are merged into 'fuel'. */
export function costsByCategory(vehicle: Vehicle, from: string, to: string, factor: PriceFactor = NOMINAL): Map<CostCategory, number> {
  const out = new Map<CostCategory, number>();
  const add = (cat: CostCategory, amount: number): void => {
    out.set(cat, (out.get(cat) ?? 0) + amount);
  };
  for (const c of vehicle.data.costs) {
    if (c.date >= from && c.date <= to) add(c.category, c.amount * factor(c.date));
  }
  for (const f of vehicle.data.fuelUps) {
    if (f.amount !== undefined && f.date >= from && f.date <= to) add('fuel', f.amount * factor(f.date));
  }
  for (const c of vehicle.data.charges) {
    if (c.amount !== undefined && c.date >= from && c.date <= to) add('fuel', c.amount * factor(c.date));
  }
  return out;
}

/** Depreciation between two dates: drop of the interpolated resale value
 *  (≥ 0 for a normal depreciation curve). In constant euros each bound is
 *  deflated by its own factor. */
export function depreciation(vehicle: Vehicle, from: string, to: string, factor: PriceFactor = NOMINAL): number {
  return resaleValueAt(vehicle, from) * factor(from) - resaleValueAt(vehicle, to) * factor(to);
}

/** One row of the yearly report. */
export interface YearReport {
  year: number;
  /** Dated costs recorded in the year (filtered categories). */
  costs: number;
  /** Resale-value drop over the year (acquisition cost of the period). */
  depreciation: number;
  /** costs + depreciation — total cost of ownership for the year. */
  tco: number;
  /** Kilometres driven in the year, when covered by known readings. */
  km?: number;
  /** tco / km when both are known. */
  costPerKm?: number;
}

/**
 * Yearly report for the vehicle, from the acquisition year to `toYear`
 * (default: current year). The acquisition year starts on
 * `acquisitionDate`; the current year ends today.
 */
export function yearlyReport(
  vehicle: Vehicle,
  categories?: ReadonlySet<CostCategory>,
  toYear: number = yearOf(todayString()),
  factor: PriceFactor = NOMINAL
): YearReport[] {
  const filter = categories ?? new Set(COST_CATEGORIES);
  const firstYear = yearOf(vehicle.data.acquisitionDate);
  const today = todayString();
  const reports: YearReport[] = [];
  for (let y = firstYear; y <= toYear; y++) {
    const from = y === firstYear ? vehicle.data.acquisitionDate : yearStart(y);
    const to = y === toYear && compareDates(yearEnd(y), today) > 0 ? today : yearEnd(y);
    const costs = costsInPeriod(vehicle, from, to, filter, factor);
    const dep = filter.has('acquisition') ? depreciation(vehicle, from, to, factor) : 0;
    const km = kmInPeriod(vehicle, from, to);
    const tco = costs + dep;
    reports.push({
      year: y, costs, depreciation: dep, tco, km,
      costPerKm: km !== undefined && km > 0 ? tco / km : undefined
    });
  }
  return reports;
}
