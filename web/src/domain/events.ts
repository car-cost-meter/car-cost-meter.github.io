import { compareDates } from '../core/dates.js';

/**
 * Domain event types — the dated collections attached to a vehicle.
 * Events carry no id: the merge policy reconciles each collection as a
 * whole (same collection changed on both sides → conflict).
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

/** Loan/lease payment frequency. */
export type LoanKind =
  /** Credit — instalments finance a purchase: excluded from costs
   *  (the depreciation anchor covers the whole invested amount). */
  | 'credit'
  /** Lease — LLD/LOA rental: rents are real costs (plus amortized initial
   *  payment) unless the LOA buyout is exercised. */
  | 'lease';

/** A compact loan/lease schedule, expanded into dated payments by the
 *  cost engine (`loanPayments` in domain/costs.ts). */
export interface LoanSchedule {
  /** 'credit' (default when absent) or 'lease' (LLD/LOA). */
  kind?: LoanKind;
  periodicity: LoanPeriodicity;
  /** Amount of each instalment. */
  amount: number;
  /** Number of instalments. */
  count: number;
  firstPaymentDate: string;
  /** LOA only: price of the buyout option, paid at contract end. */
  optionAmount?: number;
  /** LOA only: the buyout option is exercised — the vehicle is kept
   *  (owned regime) rather than returned (rented regime). */
  optionExercised?: boolean;
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
  date: string;
  odometerKm?: number;
  volumeLitres?: number;
  amount?: number;
  full: boolean;
}

/** A battery charge (electric / hybrid vehicles). Same optionality rules
 *  as FuelUp — `full` marks a complete charge. */
export interface Charge {
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
  from: string;
  to: string;
  note?: string;
}

/** A dated expense in one of the fixed categories. */
export interface Cost {
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

/** Inserts a dated entry, replacing `replaced` (same object reference)
 *  when provided, and keeping the list sorted. */
export function recordEntry<T extends { date: string }>(entries: T[], entry: T, replaced?: T): T[] {
  const rest = replaced === undefined ? entries : entries.filter(e => e !== replaced);
  rest.push(entry);
  return sortByDate(rest);
}

/** New id for a domain entity — random, collision-free in practice. */
export function newId(): string {
  return crypto.randomUUID();
}
