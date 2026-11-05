import { Vehicle, DEFAULT_INSPECTION_PERIOD_MONTHS, type VehicleData } from './Vehicle.js';
import { newId } from './events.js';
import type { AcquisitionData } from './events.js';
import { todayString } from '../core/dates.js';
import type { GrainCodec } from 'ts-cloud-storage-manager';

export const PAYLOAD_VERSION = '1.1';

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
  acquisition?: AcquisitionData;
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
    inspectionPeriodMonths: input.inspectionPeriodMonths ?? DEFAULT_INSPECTION_PERIOD_MONTHS,
    resaleValues: [],
    fuelUps: [],
    charges: [],
    loanPeriods: [],
    costs: []
  };
  if (input.acquisition) data.acquisition = input.acquisition;
  if (input.firstInspectionDate) data.firstInspectionDate = input.firstInspectionDate;
  if (input.inspectionExempt) data.inspectionExempt = true;
  return new Vehicle(data);
}

/** Legacy migration aid (format 1.0 → 1.1): events carried a per-entry
 *  `id` used by the former merge policy — silently dropped on load so the
 *  file is rewritten id-less on the next save. Throwaway code: remove once
 *  no 1.0 file remains. */
function stripEventIds<T>(entries: T[] | undefined): T[] {
  return (entries ?? []).map(e => {
    if (e !== null && typeof e === 'object' && 'id' in e) {
      const { id: _dropped, ...rest } = e as { id: unknown } & Record<string, unknown>;
      return rest as T;
    }
    return e;
  });
}

/** Legacy migration aid (format 1.0 → 1.1): vehicles carried an `updatedAt`
 *  stamp that the hash-based sync does not need — dropped on load so the
 *  file is rewritten without it. Throwaway code: remove once no 1.0 file
 *  remains. */
function withoutUpdatedAt(v: VehicleData): VehicleData {
  const { updatedAt: _updatedAt, ...rest } = v as VehicleData & { updatedAt?: unknown };
  return rest as VehicleData;
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
      ...withoutUpdatedAt(v),
      resaleValues: [...(v.resaleValues ?? [])],
      fuelUps: stripEventIds(v.fuelUps),
      charges: stripEventIds(v.charges),
      loanPeriods: stripEventIds(v.loanPeriods),
      costs: stripEventIds(v.costs),
      inspectionPeriodMonths: v.inspectionPeriodMonths ?? DEFAULT_INSPECTION_PERIOD_MONTHS
    }));
}

export function exportPayload(vehicles: Vehicle[]): ExportPayload {
  return { version: PAYLOAD_VERSION, vehicles: vehicles.map(v => v.data) };
}

/**
 * Sync grains: one per vehicle, keyed by id, in display order. Grains go
 * through `hydrateVehicles`, so what the sync engine hashes is the
 * normalized vehicle on both sides — files written by an older format (sync
 * metadata, missing defaults, unsorted events) never look edited on this
 * device just because of how they were stored.
 */
export const vehicleGrains: GrainCodec = {
  split: data => new Map(hydrateVehicles(data as Partial<ExportPayload> | null).map(v => [v.id, v.data])),
  join: grains => ({ version: PAYLOAD_VERSION, vehicles: [...grains.values()] as VehicleData[] })
};
