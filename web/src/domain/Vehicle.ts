import { addMonths, compareDates, todayString } from '../core/dates.js';
import { recordEntry, sortByDate } from './events.js';
import type {
  AcquisitionData, Charge, Cost, DatedValue, EnergyType, FuelUp, LoanPeriod
} from './events.js';

export const DEFAULT_INSPECTION_PERIOD_MONTHS = 24;

/** Serialized vehicle shape — the sync grain inside car-cost-meter.json. */
export interface VehicleData {
  id: string;
  name: string;
  /** Body type — drives the card icon (car, utility, motorcycle). */
  vehicleType: 'car' | 'utility' | 'motorcycle';
  /** Which energy stream(s) the vehicle consumes: litres, kWh, or both. */
  energyType: EnergyType;
  acquisitionDate: string;
  initialOdometerKm: number;
  /** Acquisition block — initial amount (depreciation anchor) + optional
   *  loan/lease schedule. Absent until filled in the Acquisition tab. */
  acquisition?: AcquisitionData;
  /** Months between technical inspections (contrôle technique). */
  inspectionPeriodMonths: number;
  /** Due date of the first inspection when none was recorded yet
   *  (default: acquisition + 4 years for a vehicle bought new). */
  firstInspectionDate?: string;
  /** Exempt from technical inspection (collector vehicles, etc.) —
   *  disables the reminder entirely. */
  inspectionExempt?: boolean;
  /** Dated resale-value estimates, sorted by date. */
  resaleValues: DatedValue[];
  fuelUps: FuelUp[];
  charges: Charge[];
  loanPeriods: LoanPeriod[];
  costs: Cost[];
}

export class Vehicle {
  readonly data: VehicleData;

  constructor(data: VehicleData) {
    this.data = data;
    sortByDate(this.data.resaleValues);
    sortByDate(this.data.fuelUps);
    sortByDate(this.data.charges);
    sortByDate(this.data.costs);
  }

  get id(): string { return this.data.id; }
  get name(): string { return this.data.name; }

  /** Whether the vehicle uses the litre stream (fuel, hybrid). */
  usesFuel(): boolean { return this.data.energyType !== 'electric'; }

  /** Whether the vehicle uses the kWh stream (electric, hybrid). */
  usesElectricity(): boolean { return this.data.energyType !== 'fuel'; }

  /** Records a fuel fill-up — replaces `replace` (the edited entry) when
   *  provided. */
  recordFuelUp(entry: FuelUp, replace?: FuelUp): void {
    this.data.fuelUps = recordEntry(this.data.fuelUps, entry, replace);
  }

  recordCharge(entry: Charge, replace?: Charge): void {
    this.data.charges = recordEntry(this.data.charges, entry, replace);
  }

  recordCost(entry: Cost, replace?: Cost): void {
    this.data.costs = recordEntry(this.data.costs, entry, replace);
  }

  /** Records a dated resale-value estimate (one per date — an entry on an
   *  existing date replaces it). */
  recordResaleValue(entry: DatedValue): void {
    const rest = this.data.resaleValues.filter(v => v.date !== entry.date);
    rest.push(entry);
    this.data.resaleValues = sortByDate(rest);
  }

  recordLoanPeriod(entry: LoanPeriod, replace?: LoanPeriod): void {
    const rest = replace === undefined
      ? this.data.loanPeriods
      : this.data.loanPeriods.filter(p => p !== replace);
    rest.push(entry);
    rest.sort((a, b) => compareDates(a.from, b.from));
    this.data.loanPeriods = rest;
  }

  /** Removes the resale-value estimate pinned at `date`, if any. */
  removeResaleValue(date: string): void {
    const next = this.data.resaleValues.filter(v => v.date !== date);
    if (next.length === this.data.resaleValues.length) return;
    this.data.resaleValues = next;
  }

  /** Removes an event (same object reference), whatever collection it
   *  belongs to. */
  removeEvent(entry: FuelUp | Charge | Cost | LoanPeriod): void {
    const drop = <T extends object>(list: T[]): T[] => list.filter(e => e !== entry);
    this.data.fuelUps = drop(this.data.fuelUps);
    this.data.charges = drop(this.data.charges);
    this.data.costs = drop(this.data.costs);
    this.data.loanPeriods = drop(this.data.loanPeriods);
  }

  /** Date of the last recorded technical inspection, if any — the latest
   *  cost entry in the 'inspection' category. */
  lastInspectionDate(): string | undefined {
    const inspections = this.data.costs.filter(c => c.category === 'inspection');
    return inspections.length === 0
      ? undefined
      : inspections.at(-1)!.date;
  }

  /** Date when the next technical inspection is due: last recorded
   *  inspection + period, else the declared first-inspection date.
   *  undefined for exempt vehicles. */
  nextInspectionDate(): string | undefined {
    if (this.data.inspectionExempt) return undefined;
    const last = this.lastInspectionDate();
    if (last !== undefined) return addMonths(last, this.data.inspectionPeriodMonths);
    return this.data.firstInspectionDate;
  }

  /**
   * Inspection urgency: 'none' (never recorded or no date), 'ok',
   * 'soon' (due within `soonThresholdDays`), 'overdue'.
   */
  inspectionStatus(today: string = todayString(), soonThresholdDays = 30): 'none' | 'ok' | 'soon' | 'overdue' {
    const next = this.nextInspectionDate();
    if (next === undefined) return 'none';
    if (compareDates(next, today) < 0) return 'overdue';
    const soon = new Date(`${today}T12:00:00`);
    soon.setDate(soon.getDate() + soonThresholdDays);
    return compareDates(next, soon.toISOString().split('T')[0]) <= 0 ? 'soon' : 'ok';
  }

  /** Latest known odometer reading across all dated sources. */
  lastKnownOdometerKm(): number | undefined {
    let best: { date: string; km: number } | undefined;
    const consider = (date: string, km: number | undefined): void => {
      if (km !== undefined && (best === undefined || compareDates(date, best.date) >= 0)) {
        best = { date, km };
      }
    };
    for (const f of this.data.fuelUps) consider(f.date, f.odometerKm);
    for (const c of this.data.charges) consider(c.date, c.odometerKm);
    for (const c of this.data.costs) consider(c.date, c.odometerKm);
    return best?.km;
  }
}
