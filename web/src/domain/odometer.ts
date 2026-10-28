import type { Vehicle } from './Vehicle.js';
import type { CostCategory } from './events.js';

/** A known odometer reading: the initial odometer or any dated event
 *  carrying one (fill-up, charge, cost). */
export interface OdometerReading {
  kind: 'initial' | 'fuelUp' | 'charge' | 'cost';
  /** Cost category when kind === 'cost'. */
  category?: CostCategory;
  date: string;
  km: number;
}

/** All known odometer readings of the vehicle, sorted by date.
 *  `excludeId` skips an event (useful when editing it). */
export function odometerReadings(vehicle: Vehicle, excludeId?: string): OdometerReading[] {
  const out: OdometerReading[] = [
    { kind: 'initial', date: vehicle.data.acquisitionDate, km: vehicle.data.initialOdometerKm }
  ];
  for (const f of vehicle.data.fuelUps) {
    if (f.odometerKm !== undefined && f.id !== excludeId) out.push({ kind: 'fuelUp', date: f.date, km: f.odometerKm });
  }
  for (const c of vehicle.data.charges) {
    if (c.odometerKm !== undefined && c.id !== excludeId) out.push({ kind: 'charge', date: c.date, km: c.odometerKm });
  }
  for (const c of vehicle.data.costs) {
    if (c.odometerKm !== undefined && c.id !== excludeId) out.push({ kind: 'cost', category: c.category, date: c.date, km: c.odometerKm });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km);
}

/**
 * Readings that contradict the (date, km) pair monotonicity: a reading
 * strictly earlier with a higher km, or strictly later with a lower km.
 * Same-date readings are ignored — several events in one day legitimately
 * carry different odometers (two fill-ups morning/evening), and dates
 * alone cannot order them. An empty result means the entry is consistent.
 */
export function odometerViolations(
  vehicle: Vehicle, date: string, km: number, excludeId?: string
): OdometerReading[] {
  return odometerReadings(vehicle, excludeId).filter(r =>
    (r.date < date && r.km > km) || (r.date > date && r.km < km));
}
