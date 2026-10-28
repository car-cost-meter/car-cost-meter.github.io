import { Vehicle } from './Vehicle.js';
import { DEFAULT_INSPECTION_PERIOD_MONTHS } from './Vehicle.js';
import type { VehicleData } from './Vehicle.js';
import { newId } from './events.js';
import { todayString } from '../core/dates.js';

export const PAYLOAD_VERSION = '1.0';

/** The whole car-cost-meter.json file. */
export interface ExportPayload {
  version: string;
  vehicles: VehicleData[];
}

export function defaultData(): ExportPayload {
  return { version: PAYLOAD_VERSION, vehicles: [] };
}

/** Builds a new vehicle with sane defaults. */
export function createVehicle(input: {
  name: string;
  energyType: VehicleData['energyType'];
  vehicleType?: VehicleData['vehicleType'];
  acquisitionDate?: string;
  initialOdometerKm?: number;
  purchasePrice?: number;
  inspectionPeriodMonths?: number;
  firstInspectionDate?: string;
  inspectionExempt?: boolean;
}): Vehicle {
  const data: VehicleData = {
    id: newId(),
    name: input.name,
    vehicleType: input.vehicleType ?? 'car',
    energyType: input.energyType,
    acquisitionDate: input.acquisitionDate ?? todayString(),
    initialOdometerKm: input.initialOdometerKm ?? 0,
    purchasePrice: input.purchasePrice ?? 0,
    inspectionPeriodMonths: input.inspectionPeriodMonths ?? DEFAULT_INSPECTION_PERIOD_MONTHS,
    resaleValues: [],
    fuelUps: [],
    charges: [],
    loanPeriods: [],
    costs: [],
    updatedAt: new Date().toISOString()
  };
  if (input.firstInspectionDate) data.firstInspectionDate = input.firstInspectionDate;
  if (input.inspectionExempt) data.inspectionExempt = true;
  return new Vehicle(data);
}

/**
 * Hydrates vehicles from a raw payload — tolerates missing collections and
 * fills defaults so older/partial files load cleanly.
 */
export function hydrateVehicles(raw: Partial<ExportPayload> | null | undefined): Vehicle[] {
  const list = raw?.vehicles;
  if (!Array.isArray(list)) return [];
  return list
    .filter(v => v && typeof v === 'object' && typeof v.id === 'string')
    .map(v => new Vehicle({
      ...v,
      resaleValues: v.resaleValues ?? [],
      fuelUps: v.fuelUps ?? [],
      charges: v.charges ?? [],
      loanPeriods: v.loanPeriods ?? [],
      costs: v.costs ?? [],
      inspectionPeriodMonths: v.inspectionPeriodMonths ?? DEFAULT_INSPECTION_PERIOD_MONTHS,
      updatedAt: v.updatedAt ?? new Date(0).toISOString()
    }));
}

export function exportPayload(vehicles: Vehicle[]): ExportPayload {
  return { version: PAYLOAD_VERSION, vehicles: vehicles.map(v => v.data) };
}
