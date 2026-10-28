import { UNRECONCILABLE } from 'ts-cloud-storage-manager';
import type { ExportPayload } from './payload.js';
import type { VehicleData } from './Vehicle.js';

/**
 * Application merge policy — the SyncEngine calls it with the last-synced
 * base, the local working copy and the freshly downloaded remote data.
 *
 * Merge grain = the vehicle (spec: simultaneous edits on different
 * vehicles reconcile automatically). Within a vehicle, the dated event
 * collections union by `id` (create/delete honored per side); scalar
 * fields (name, params) merge field-by-field — a scalar changed on both
 * sides to different values parks the whole merge (UNRECONCILABLE).
 * For same-id events edited differently on both sides, the vehicle's
 * `updatedAt` picks the fresher side (events carry no per-entry revision).
 */

const COLLECTIONS = ['resaleValues', 'fuelUps', 'charges', 'loanPeriods', 'costs'] as const;
type CollectionName = typeof COLLECTIONS[number];

const SCALARS = [
  'name', 'energyType', 'vehicleType', 'acquisitionDate',
  'initialOdometerKm', 'purchasePrice', 'inspectionPeriodMonths',
  'firstInspectionDate', 'inspectionExempt'
] as const;

function asPayload(data: unknown): ExportPayload | undefined {
  if (data && typeof data === 'object' && Array.isArray((data as ExportPayload).vehicles)) {
    return data as ExportPayload;
  }
  return undefined;
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

type ScalarName = typeof SCALARS[number];

/** Structural shape covering every dated collection element. */
interface MergeEntry {
  id?: string;
  date?: string;
  from?: string;
  [k: string]: unknown;
}

/** 3-way merge of one dated collection: union by id, honoring deletions. */
function mergeCollection(
  base: MergeEntry[] | undefined, local: MergeEntry[] | undefined,
  remote: MergeEntry[] | undefined, prefer: 'local' | 'remote'
): MergeEntry[] {
  const key = (e: MergeEntry): string => e.id ?? e.date!;
  const baseMap = new Map((base ?? []).map(e => [key(e), e]));
  const localMap = new Map((local ?? []).map(e => [key(e), e]));
  const remoteMap = new Map((remote ?? []).map(e => [key(e), e]));

  const merged = new Map<string, MergeEntry>();
  for (const k of new Set([...localMap.keys(), ...remoteMap.keys()])) {
    const l = localMap.get(k);
    const r = remoteMap.get(k);
    const b = baseMap.get(k);
    if (l === undefined) {
      // Remote-only: deleted locally when it existed in base, else created remotely.
      if (b === undefined) merged.set(k, r!);
    } else if (r === undefined) {
      // Local-only: deleted remotely when it existed in base, else created locally.
      if (b === undefined) merged.set(k, l);
    } else if (deepEqual(l, r)) {
      merged.set(k, l);
    } else if (b !== undefined && deepEqual(l, b)) {
      merged.set(k, r); // only the remote side changed it
    } else if (b !== undefined && deepEqual(r, b)) {
      merged.set(k, l); // only the local side changed it
    } else {
      merged.set(k, prefer === 'local' ? l : r); // both changed → fresher vehicle wins
    }
  }
  const values = [...merged.values()];
  values.sort((a, b) => {
    const da = a.date ?? a.from!;
    const db = b.date ?? b.from!;
    return da < db ? -1 : da > db ? 1 : 0;
  });
  return values;
}

/** 3-way merge of one vehicle, or UNRECONCILABLE on scalar conflicts. */
function mergeVehicle(
  base: VehicleData | undefined, local: VehicleData, remote: VehicleData
): VehicleData | typeof UNRECONCILABLE {
  if (deepEqual(local, remote)) return local;

  const prefer: 'local' | 'remote' =
    (local.updatedAt ?? '') >= (remote.updatedAt ?? '') ? 'local' : 'remote';

  const merged = deepClone(prefer === 'local' ? local : remote);
  const out = merged as unknown as Record<string, unknown>;

  for (const field of SCALARS as readonly ScalarName[]) {
    const l = local[field];
    const r = remote[field];
    const b = base?.[field];
    if (deepEqual(l, r)) {
      out[field] = l;
    } else if (deepEqual(l, b)) {
      out[field] = r;
    } else if (deepEqual(r, b)) {
      out[field] = l;
    } else {
      return UNRECONCILABLE; // same field edited differently on both sides
    }
  }

  for (const name of COLLECTIONS as readonly CollectionName[]) {
    out[name] = mergeCollection(
      base?.[name] as MergeEntry[] | undefined,
      local[name] as MergeEntry[] | undefined,
      remote[name] as MergeEntry[] | undefined,
      prefer);
  }

  merged.updatedAt = prefer === 'local' ? local.updatedAt : remote.updatedAt;
  return merged;
}

export function mergePolicy(ctx: { base: unknown; local: unknown; remote: unknown }): unknown {
  const base = asPayload(ctx.base);
  const local = asPayload(ctx.local);
  const remote = asPayload(ctx.remote);
  if (local === undefined || remote === undefined) return UNRECONCILABLE;

  const baseVehicles = new Map((base?.vehicles ?? []).map(v => [v.id, v]));
  const localVehicles = new Map(local.vehicles.map(v => [v.id, v]));
  const remoteVehicles = new Map(remote.vehicles.map(v => [v.id, v]));

  const mergedVehicles = new Map<string, VehicleData>();
  const allIds = new Set([...localVehicles.keys(), ...remoteVehicles.keys()]);

  for (const id of allIds) {
    const l = localVehicles.get(id);
    const r = remoteVehicles.get(id);
    const b = baseVehicles.get(id);
    if (l === undefined) {
      if (b === undefined) {
        mergedVehicles.set(id, r!);                        // created remotely
      } else if (deepEqual(r, b)) {
        // Deleted locally, untouched remotely → deletion wins.
      } else {
        return UNRECONCILABLE; // deleted locally but edited remotely
      }
    } else if (r === undefined) {
      if (b === undefined) {
        mergedVehicles.set(id, l);                         // created locally
      } else if (deepEqual(l, b)) {
        // Deleted remotely, untouched locally → deletion wins.
      } else {
        return UNRECONCILABLE; // deleted remotely but edited locally
      }
    } else {
      const merged = mergeVehicle(b, l, r);
      if (merged === UNRECONCILABLE) return UNRECONCILABLE;
      mergedVehicles.set(id, merged);
    }
  }

  // Keep the local ordering, then append vehicles that only exist remotely.
  const ordered = [
    ...local.vehicles.filter(v => mergedVehicles.has(v.id)).map(v => mergedVehicles.get(v.id)!),
    ...remote.vehicles.filter(v => mergedVehicles.has(v.id) && !localVehicles.has(v.id)).map(v => mergedVehicles.get(v.id)!)
  ];

  return {
    version: remote.version ?? local.version,
    vehicles: ordered
  };
}
