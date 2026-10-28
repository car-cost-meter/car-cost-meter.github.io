import { compareDates } from '../core/dates.js';

/**
 * Domain event types — the dated collections attached to a vehicle.
 * Every event carries a stable `id` so the merge policy can union the
 * collections across devices (edits keep the id, deletions remove it).
 */

export type EnergyType = 'fuel' | 'electric' | 'hybrid';

/** Body type — drives the vehicle card icon. */
export type VehicleType = 'car' | 'utility' | 'motorcycle';

export const VEHICLE_TYPES: VehicleType[] = ['car', 'utility', 'motorcycle'];

export type CostCategory =
  'acquisition' | 'maintenance' | 'repair' | 'inspection' | 'insurance' | 'fuel' | 'other';

/** Loan/lease payment frequency. */
export type LoanPeriodicity = 'monthly' | 'quarterly' | 'yearly';

export const LOAN_PERIODICITIES: LoanPeriodicity[] = ['monthly', 'quarterly', 'yearly'];

/** Months between two payments for a given periodicity. */
export const LOAN_PERIOD_MONTHS: Record<LoanPeriodicity, number> = {
  monthly: 1, quarterly: 3, yearly: 12
};

/** A compact loan/lease schedule, expanded into dated payments by the
 *  cost engine (`loanPayments` in domain/costs.ts). */
export interface LoanSchedule {
  periodicity: LoanPeriodicity;
  /** Amount of each instalment. */
  amount: number;
  /** Number of instalments. */
  count: number;
  firstPaymentDate: string;
}

/** Acquisition block declared on the vehicle: the initial amount paid
 *  (depreciation anchor, replaces the former `purchasePrice` field) plus
 *  an optional credit/lease schedule. Other one-off acquisition costs
 *  (carte grise, options...) stay in `costs` under 'acquisition'. */
export interface AcquisitionData {
  initialAmount?: number;
  /** Carte grise / registration fee — a one-off acquisition cost dated
   *  on the acquisition date. */
  registrationFee?: number;
  loan?: LoanSchedule;
}

export const COST_CATEGORIES: CostCategory[] = [
  'acquisition', 'maintenance', 'repair', 'inspection', 'insurance', 'fuel', 'other'
];

/** A dated estimate — e.g. the resale value of the vehicle. */
export interface DatedValue {
  date: string;
  value: number;
}

/** A fuel fill-up. `full` marks a complete tank fill — the only reliable
 *  consumption bound. `volumeLitres` may be absent (amount-only top-ups,
 *  e.g. reconstructed history); such entries make the surrounding
 *  consumption windows "unknown". */
export interface FuelUp {
  id: string;
  date: string;
  odometerKm?: number;
  volumeLitres?: number;
  amount?: number;
  full: boolean;
}

/** A battery charge (electric / hybrid vehicles). Same optionality rules
 *  as FuelUp — `full` marks a complete charge. */
export interface Charge {
  id: string;
  date: string;
  odometerKm?: number;
  kwh?: number;
  amount?: number;
  full?: boolean;
}

/** A period during which the vehicle was out of the owner's hands (loan,
 *  rental, theft): third-party fuel/charges are not recorded, so the
 *  overlapping consumption windows are reported as "unknown". */
export interface LoanPeriod {
  id: string;
  from: string;
  to: string;
  note?: string;
}

/** A dated expense in one of the fixed categories. */
export interface Cost {
  id: string;
  date: string;
  category: CostCategory;
  amount: number;
  comment?: string;
  odometerKm?: number;
}

/** Sorts dated entries ascending, in place; returns the array. */
export function sortByDate<T extends { date: string }>(entries: T[]): T[] {
  return entries.sort((a, b) => compareDates(a.date, b.date));
}

/** Inserts or replaces (same id) a dated entry, keeping the list sorted. */
export function recordById<T extends { id: string; date: string }>(entries: T[], entry: T): T[] {
  const rest = entries.filter(e => e.id !== entry.id);
  rest.push(entry);
  return sortByDate(rest);
}

/** New id for a domain entity — random, collision-free in practice. */
export function newId(): string {
  return crypto.randomUUID();
}
