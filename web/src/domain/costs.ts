import type { Vehicle } from './Vehicle.js';
import type { CostCategory } from './events.js';
import { COST_CATEGORIES, LOAN_PERIOD_MONTHS } from './events.js';
import { addMonths, compareDates, utcDate, yearOf, yearStart, yearEnd, todayString } from '../core/dates.js';

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
 * `resaleValues` estimates, anchored by (acquisitionDate, initialAmount).
 * Before the first anchor → initialAmount ; after the last → last estimate.
 * TODO: linear interpolation between known points is an approximation.
 */
export function resaleValueAt(vehicle: Vehicle, date: string): number {
  const invested = isRented(vehicle) ? 0 : totalInvested(vehicle);
  const points = [
    // Owned vehicles anchor the curve at the invested amount; without a
    // declared amount the first resale estimate starts the curve.
    ...(invested > 0 ? [{ date: vehicle.data.acquisitionDate, value: invested }] : []),
    ...vehicle.data.resaleValues
  ].sort((a, b) => compareDates(a.date, b.date));
  if (points.length === 0) return 0;
  return interpolate(points, date, p => p.value);
}

/**
 * Loan/lease instalments expanded from the vehicle's acquisition schedule:
 * `count` payments of `amount`, `firstPaymentDate` then +periodicity each.
 * Returns [] when no loan is declared.
 */
export function loanPayments(vehicle: Vehicle): { date: string; amount: number }[] {
  const loan = vehicle.data.acquisition?.loan;
  if (!loan || loan.count <= 0 || loan.amount <= 0) return [];
  const step = LOAN_PERIOD_MONTHS[loan.periodicity] ?? 1;
  const out: { date: string; amount: number }[] = [];
  for (let i = 0; i < loan.count; i++) {
    out.push({ date: addMonths(loan.firstPaymentDate, i * step), amount: loan.amount });
  }
  return out;
}

/** Acquisition regime: 'rented' for a lease whose LOA buyout is not
 *  exercised (LLD, LOA returned) — no depreciation, rents are costs.
 *  'owned' otherwise (cash, credit, LOA exercised). */
export function isRented(vehicle: Vehicle): boolean {
  const loan = vehicle.data.acquisition?.loan;
  return loan?.kind === 'lease' && !loan.optionExercised;
}

/** Total invested in the vehicle — depreciation anchor for owned
 *  vehicles: initial payment + every instalment (+ LOA buyout when
 *  exercised). The instalments include interest, so the anchor is
 *  deliberately the amount invested rather than the sticker price. */
export function totalInvested(vehicle: Vehicle): number {
  const acq = vehicle.data.acquisition;
  if (!acq) return 0;
  let sum = acq.initialAmount ?? 0;
  const loan = acq.loan;
  if (loan && loan.count > 0 && loan.amount > 0) {
    sum += loan.amount * loan.count;
    if (loan.kind === 'lease' && loan.optionExercised) {
      sum += loan.optionAmount ?? 0;
    }
  }
  return sum;
}

/** Date of the last schedule instalment (LOA buyout date). */
function lastPaymentDate(vehicle: Vehicle): string | undefined {
  const loan = vehicle.data.acquisition?.loan;
  if (!loan || loan.count <= 0) return undefined;
  return addMonths(loan.firstPaymentDate, (loan.count - 1) * (LOAN_PERIOD_MONTHS[loan.periodicity] ?? 1));
}

/** Contract end — one period after the last instalment, or undefined
 *  without a schedule. Extends the yearly table for rentals so the LOA
 *  buyout (and the whole lease span) is visible. */
export function contractEndDate(vehicle: Vehicle): string | undefined {
  const loan = vehicle.data.acquisition?.loan;
  if (!loan || loan.count <= 0) return undefined;
  return addMonths(loan.firstPaymentDate, loan.count * (LOAN_PERIOD_MONTHS[loan.periodicity] ?? 1));
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

/** Every cost-bearing entry of the vehicle as {category, date, amount}:
 *  recorded costs, fill-up/charge amounts (bucket 'fuel'), and loan
 *  instalments expanded from the acquisition schedule ('acquisition'). */
function* costEntries(vehicle: Vehicle): Generator<{ category: CostCategory; date: string; amount: number }> {
  const rented = isRented(vehicle);
  for (const c of vehicle.data.costs) {
    // Owned vehicles: NOTHING acquisition-related is a cost — the
    // depreciation column carries every invested amount, and 'acquisition'
    // entries stay pure expenses. Rented vehicles keep them as costs.
    if (c.category === 'acquisition' && !rented) continue;
    yield { category: c.category, date: c.date, amount: c.amount };
  }
  for (const f of vehicle.data.fuelUps) {
    if (f.amount !== undefined) yield { category: 'fuel', date: f.date, amount: f.amount };
  }
  for (const c of vehicle.data.charges) {
    if (c.amount !== undefined) yield { category: 'fuel', date: c.date, amount: c.amount };
  }
  // Owned vehicles: NOTHING in the acquisition block is a cost — every
  // part of it is an expense (cash outflow) while the depreciation
  // column carries the investment. Rented vehicles have no depreciation
  // to carry it, so the registration fee, the rents and the amortized
  // initial payment are costs — the initial is spread on the same
  // dates as the instalments.
  if (rented) {
    const regFee = vehicle.data.acquisition?.registrationFee;
    if (regFee !== undefined && regFee > 0) {
      yield { category: 'acquisition', date: vehicle.data.acquisitionDate, amount: regFee };
    }
  }
  const loan = vehicle.data.acquisition?.loan;
  if (rented && loan && loan.count > 0 && loan.amount > 0) {
    const perPayment = loan.amount + (vehicle.data.acquisition?.initialAmount ?? 0) / loan.count;
    for (const p of loanPayments(vehicle)) {
      yield { category: 'acquisition', date: p.date, amount: perPayment };
    }
  }
}

/** Financing outflows of the acquisition block: registration fee, the
 *  initial payment, instalments and the LOA buyout (last instalment). */
function* acquisitionExpenses(vehicle: Vehicle): Generator<{ category?: CostCategory; date: string; amount: number }> {
  const acq = vehicle.data.acquisition;
  const acqDate = vehicle.data.acquisitionDate;
  if (acq?.registrationFee !== undefined && acq.registrationFee > 0) {
    yield { category: 'acquisition', date: acqDate, amount: acq.registrationFee };
  }
  if (acq?.initialAmount !== undefined && acq.initialAmount > 0) {
    yield { category: 'acquisition', date: acqDate, amount: acq.initialAmount };
  }
  for (const p of loanPayments(vehicle)) {
    yield { category: 'acquisition', date: p.date, amount: p.amount };
  }
  const loan = acq?.loan;
  if (loan?.kind === 'lease' && loan.optionExercised && loan.optionAmount !== undefined && loan.optionAmount > 0) {
    const d = lastPaymentDate(vehicle);
    if (d !== undefined) yield { category: 'acquisition', date: d, amount: loan.optionAmount };
  }
}

/** Every real cash outflow, whatever the acquisition regime: recorded
 *  costs, energy amounts, and the acquisition financing outflows. */
function* expenseEntries(vehicle: Vehicle): Generator<{ category?: CostCategory; date: string; amount: number }> {
  for (const c of vehicle.data.costs) {
    yield { category: c.category, date: c.date, amount: c.amount };
  }
  for (const f of vehicle.data.fuelUps) {
    if (f.amount !== undefined) yield { category: 'fuel', date: f.date, amount: f.amount };
  }
  for (const c of vehicle.data.charges) {
    if (c.amount !== undefined) yield { category: 'fuel', date: c.date, amount: c.amount };
  }
  yield* acquisitionExpenses(vehicle);
}

/** Sum of cost entries inside [from, to], optionally filtered by category.
 *  Fill-ups and charges count as 'fuel' costs — their amounts are energy
 *  spend. Each amount is multiplied by `factor(date)` (constant-euros). */
export function costsInPeriod(
  vehicle: Vehicle, from: string, to: string,
  categories?: ReadonlySet<CostCategory>, factor: PriceFactor = NOMINAL
): number {
  const filter = categories ?? new Set(COST_CATEGORIES);
  let sum = 0;
  for (const e of costEntries(vehicle)) {
    if (e.date >= from && e.date <= to && filter.has(e.category)) {
      sum += e.amount * factor(e.date);
    }
  }
  return sum;
}

/** Per-category sums inside [from, to], amounts scaled by `factor`.
 *  Fill-up and charge amounts are merged into 'fuel'. */
export function costsByCategory(vehicle: Vehicle, from: string, to: string, factor: PriceFactor = NOMINAL): Map<CostCategory, number> {
  const out = new Map<CostCategory, number>();
  for (const e of costEntries(vehicle)) {
    if (e.date >= from && e.date <= to) {
      out.set(e.category, (out.get(e.category) ?? 0) + e.amount * factor(e.date));
    }
  }
  return out;
}

/** Real cash outflows inside [from, to] ("Dépenses"): every expense
 *  entry, scaled by `factor`. Financing outflows (initial, instalments,
 *  buyout) count under 'acquisition' for the category filter. */
export function expensesInPeriod(
  vehicle: Vehicle, from: string, to: string,
  categories?: ReadonlySet<CostCategory>, factor: PriceFactor = NOMINAL
): number {
  const filter = categories ?? new Set(COST_CATEGORIES);
  let sum = 0;
  for (const e of expenseEntries(vehicle)) {
    if (e.date >= from && e.date <= to && (e.category === undefined || filter.has(e.category))) {
      sum += e.amount * factor(e.date);
    }
  }
  return sum;
}

/** Depreciation between two dates: drop of the interpolated resale value
 *  (≥ 0 for a normal depreciation curve). In constant euros each bound is
 *  deflated by its own factor. */
export function depreciation(vehicle: Vehicle, from: string, to: string, factor: PriceFactor = NOMINAL): number {
  if (isRented(vehicle)) return 0; // no asset owned — no depreciation
  const nominal = resaleValueAt(vehicle, from) - resaleValueAt(vehicle, to);
  // The period's nominal decline is restated in current euros at the
  // factor of its start (1/1 or the acquisition date). Deflating each
  // bound separately would wrongly add the inflation erosion of the
  // residual value to the year's depreciation.
  return nominal * factor(from);
}

/** One row of the yearly report. */
export interface YearReport {
  year: number;
  /** Real cash outflows of the year ("Dépenses"). */
  expenses: number;
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
 * Yearly report for the vehicle, from the acquisition year to the latest
 * of `toYear` (default: current year) and the contract end — a lease
 * therefore shows its whole span, including the LOA buyout year.
 * The acquisition year starts on `acquisitionDate`; the last row ends on
 * the contract end (or today when there is no schedule).
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
  const contractEnd = contractEndDate(vehicle);
  // Table horizon: today, extended to the contract end only while the
  // schedule is still running — a finished credit must not clamp `to`
  // before `from` on later rows (empty costs, backwards depreciation).
  const end = contractEnd !== undefined && compareDates(contractEnd, today) > 0 ? contractEnd : today;
  const lastYear = Math.max(toYear, contractEnd !== undefined ? yearOf(end) : toYear);
  const reports: YearReport[] = [];
  for (let y = firstYear; y <= lastYear; y++) {
    const from = y === firstYear ? vehicle.data.acquisitionDate : yearStart(y);
    const to = compareDates(end, yearEnd(y)) < 0 ? end : yearEnd(y);
    const costs = costsInPeriod(vehicle, from, to, filter, factor);
    const expenses = expensesInPeriod(vehicle, from, to, filter, factor);
    const dep = filter.has('acquisition') ? depreciation(vehicle, from, to, factor) : 0;
    const km = kmInPeriod(vehicle, from, to);
    const tco = costs + dep;
    reports.push({
      year: y, expenses, costs, depreciation: dep, tco, km,
      costPerKm: km !== undefined && km > 0 ? tco / km : undefined
    });
  }
  return reports;
}
