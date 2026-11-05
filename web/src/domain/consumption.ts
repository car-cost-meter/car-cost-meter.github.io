import type { VehicleData } from './Vehicle.js';

/**
 * Consumption windows between two "full" energy entries (fill-ups or
 * charges). A window is computable only when every top-up between the
 * two bounds is quantified — a missing volume, a fuel-category cost or
 * an overlapping loan period means unrecorded energy, and the window is
 * "unknown" (no extrapolation, ever).
 */

/** Minimal shape shared by fill-ups and charges for window walking. */
interface EnergyEntry {
  date: string;
  odometerKm?: number;
  full?: boolean;
}

/** A computable consumption window between two full entries. */
export interface ConsumptionWindow {
  /** Energy burned per 100 km over the window (litres or kWh). */
  per100km: number;
  /** Date of the older bound — its own volume is excluded (burned
   *  before its odometer reading). */
  fromDate: string;
  /** Date of the entry closing the window. */
  toDate: string;
}

/**
 * Consumption over the window ending at `entries[index]` (entries sorted
 * by ascending date). Defined only when:
 *  - the current entry is `full` and carries an odometer reading;
 *  - walking back, a previous `full` entry with an odometer is found
 *    (full entries without odometer are skipped as bounds — their
 *    volume still counts in the window);
 *  - every entry between the two — current included — has a known
 *    volume.
 */
export function windowConsumption<E extends EnergyEntry>(
  entries: E[], index: number, volumeOf: (e: E) => number | undefined
): ConsumptionWindow | undefined {
  const current = entries[index];
  if (current?.full !== true || current.odometerKm === undefined) {
    return undefined;
  }
  let total = volumeOf(current);
  if (total === undefined) return undefined;
  for (let i = index - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.full === true && e.odometerKm !== undefined) {
      const km = current.odometerKm - e.odometerKm;
      return km > 0
        ? { per100km: total * 100 / km, fromDate: e.date, toDate: current.date }
        : undefined;
    }
    const v = volumeOf(e);
    if (v === undefined) return undefined;
    total += v;
  }
  return undefined;
}

/**
 * Fuel consumption (L/100km) over the window ending at
 * `fuelUps[index]`, or undefined when the window is unknown.
 */
export function fuelUpConsumption(data: VehicleData, index: number): ConsumptionWindow | undefined {
  const w = windowConsumption(data.fuelUps, index, f => f.volumeLitres);
  return w !== undefined && !hasUnrecordedEnergy(data, w, true) ? w : undefined;
}

/**
 * Electric consumption (kWh/100km) over the window ending at
 * `charges[index]`, or undefined when the window is unknown.
 */
export function chargeConsumption(data: VehicleData, index: number): ConsumptionWindow | undefined {
  const w = windowConsumption(data.charges, index, c => c.kwh);
  return w !== undefined && !hasUnrecordedEnergy(data, w, false) ? w : undefined;
}

/** Gaps that make a window "unknown": an overlapping loan period (energy
 *  added by third parties is not recorded) and, for the fuel stream, a
 *  fuel-category cost inside the window (an amount-only top-up). */
function hasUnrecordedEnergy(data: VehicleData, w: ConsumptionWindow, fuel: boolean): boolean {
  return data.loanPeriods.some(p => p.from <= w.toDate && p.to >= w.fromDate)
    || (fuel && data.costs.some(c => c.category === 'fuel' && c.date > w.fromDate && c.date <= w.toDate));
}
