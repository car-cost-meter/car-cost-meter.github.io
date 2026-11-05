import type { ConflictInfo } from 'ts-cloud-storage-manager';
import type { VehicleData } from './Vehicle.js';

/** The vehicle a sync conflict is about — read from whichever side still has it. */
export function conflictVehicle(conflict: ConflictInfo): VehicleData | null {
  return (conflict.local ?? conflict.remote) as VehicleData | null;
}

/** Name to show for a conflicting vehicle (its id when the data carries none). */
export function conflictName(conflict: ConflictInfo): string {
  return conflictVehicle(conflict)?.name ?? conflict.id;
}

/** Number of recorded entries of a vehicle version — a hint to tell the two
 *  versions of a conflict apart. */
export function entryCount(vehicle: VehicleData): number {
  return vehicle.fuelUps.length + vehicle.charges.length + vehicle.costs.length
    + vehicle.loanPeriods.length + vehicle.resaleValues.length;
}
