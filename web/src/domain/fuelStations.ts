/**
 * Nearby fuel stations — official French pump prices condensed hourly by
 * the fuel2gist pipeline into a ~1 MB `stations.json` on a GitHub Gist
 * (same underlying source: data.economie.gouv.fr instantaneous feed).
 *
 * The whole file is cached in a dedicated Cache Storage area. Freshness
 * rule: a version generated today is never re-downloaded without an
 * explicit user action; an older (or missing) version is refreshed in the
 * background at app startup — even if the stations screen is never opened
 * — so the data stays usable offline. The file's generation timestamp is
 * kept as a response header so freshness checks don't parse the payload.
 * Pure logic, no DOM — the view only geolocates and renders.
 */

const GIST_URL = 'https://gist.githubusercontent.com/fathzer/fd0545d020573481d86e9966a48e51fa/raw/stations.json';
const CACHE_NAME = 'fuel-stations';
/** Response header carrying the file's generation ts (minutes, UTC). */
const TS_HEADER = 'x-fuel-ts';

/** Canonical ordering of the fuel selector (extra names go last). */
export const FUEL_ORDER = ['Gazole', 'SP95', 'E85', 'GPLc', 'E10', 'SP98', 'SP95-E10'];

/** One day of a weekly schedule: null = closed, [] = open all day,
 *  [open, close, ...] = minute pairs since midnight. */
export type DayHours = number[] | null;

export interface FuelPrice { name: string; euros: number; updated: string }
export interface Station {
  address: string;
  lat: number;
  lon: number;
  h24: boolean;
  prices: FuelPrice[];
  /** Fuel names under (temporary) shortage — priced or not. */
  soldOut: Set<string>;
  /** Weekly schedule (Mon..Sun) when published — hidden for 24/7 stations. */
  week?: DayHours[];
  /** OSM-derived brand (TotalEnergies, Carrefour…) when mapped. */
  brand?: string;
  /** Coordinates come from the unverified government geocoding (no OSM
   *  match) — shown as an approximate-location hint. */
  geoUncertain: boolean;
  /** Motorway service area (location type "A"), vs regular road. */
  motorway: boolean;
}
export interface NearbyStation extends Station {
  /** Distance from the searched point, in km. */
  km: number;
}

/** The parsed gist file: `ts` is generation time, minutes since epoch UTC. */
export interface FuelData {
  ts: number;
  fuels: string[];
  stations: Station[];
}

/** Raw gist payload — stations are positional arrays (see fuel2gist):
 *  [id, lat, lon, address, city, cp, h24, oh, pricedFuels, shortages,
 *  brandIdx, geoUncertain, locationType]. */
interface GistData {
  ts: number;
  fuels: string[];
  brands?: string[];
  stations: unknown[][];
}

/** Parses the condensed file into FuelData (throws on garbage). */
export function parseFuelData(raw: unknown): FuelData {
  const data = raw as GistData;
  const fuels = Array.isArray(data.fuels) ? data.fuels : [];
  const brands = Array.isArray(data.brands) ? data.brands : [];
  const stations = (Array.isArray(data.stations) ? data.stations : [])
    .map(s => parseGistStation(s, fuels, brands))
    .filter(s => s !== undefined);
  return { ts: Number(data.ts) || 0, fuels, stations };
}

function parseGistStation(s: unknown[], fuels: string[], brands: string[]): Station | undefined {
  const [, lat, lon, addr, city, cp, h24, oh, priced, out, brandIdx, geoGouv, place] = s;
  if (typeof lat !== 'number' || typeof lon !== 'number') return undefined;
  const prices: FuelPrice[] = [];
  if (Array.isArray(priced)) {
    for (const e of priced) {
      // [fuelIdx, price (thousandths of €/L), updated (minutes, UTC)]
      const [fi, price, upd] = e as unknown[];
      const name = typeof fi === 'number' ? fuels[fi] : undefined;
      if (name !== undefined && typeof price === 'number') {
        prices.push({ name, euros: price / 1000, updated: minutesToDate(upd) });
      }
    }
  }
  const soldOut = new Set<string>();
  if (Array.isArray(out)) {
    for (const fi of out) {
      if (typeof fi === 'number' && fuels[fi] !== undefined) soldOut.add(fuels[fi]);
    }
  }
  return {
    address: [addr, cp, city].filter(v => typeof v === 'string' && v !== '').join(' '),
    lat, lon,
    h24: h24 === 1,
    prices, soldOut,
    week: Array.isArray(oh) ? oh as DayHours[] : undefined,
    brand: typeof brandIdx === 'number' ? brands[brandIdx] : undefined,
    geoUncertain: geoGouv === 1,
    motorway: place === 'A'
  };
}

const minutesToDate = (m: unknown): string =>
  typeof m === 'number' ? new Date(m * 60000).toISOString().slice(0, 10) : '';

/** True when the file's generation day equals today (local time). */
export const fuelDataIsToday = (ts: number): boolean =>
  new Date(ts * 60000).toDateString() === new Date().toDateString();

/** Great-circle distance in km between two WGS84 points. */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Initial bearing from a to b, in degrees 0-360 (0 = north). */
export function bearingDeg(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLon = (b.lon - a.lon) * rad;
  const y = Math.sin(dLon) * Math.cos(b.lat * rad);
  const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad)
    - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/** All stations within radiusKm of a point, nearest first — the view
 *  slices what it shows and reports the total count. */
export function nearestStations(
  stations: Station[], from: { lat: number; lon: number }, radiusKm: number
): NearbyStation[] {
  return stations
    .map(s => ({ ...s, km: haversineKm(from, s) }))
    .filter(s => s.km <= radiusKm)
    .sort((a, b) => a.km - b.km);
}

/** Whether a station is open at a given instant: 24/7 stations and
 *  unpublished schedules count as open; [0,0] slots mean all-day. */
export function isOpenAt(week: DayHours[] | undefined, h24: boolean, when: Date): boolean {
  if (h24 || week === undefined) return true;
  const day = week[(when.getDay() + 6) % 7]; // JS: 0=Sun..6=Sat → 0=Mon..6=Sun
  if (day === null) return false;
  if (day.length === 0) return true;
  const m = when.getHours() * 60 + when.getMinutes();
  for (let i = 0; i + 1 < day.length; i += 2) {
    if (day[i] === 0 && day[i + 1] === 0) return true; // 00:00–00:00 = all day
    if (m >= day[i] && m < day[i + 1]) return true;
  }
  return false;
}

/** Fuel names present in a station list, canonical order first. */
export function orderedFuelNames(stations: Station[]): string[] {
  const names = new Set(stations.flatMap(s => s.prices.map(p => p.name)));
  return [
    ...FUEL_ORDER.filter(f => names.has(f)),
    ...[...names].filter(f => !FUEL_ORDER.includes(f)).sort((a, b) => a.localeCompare(b))
  ];
}

const cacheMatch = async (): Promise<Response | undefined> =>
  typeof caches === 'undefined' ? undefined : (await caches.open(CACHE_NAME)).match(GIST_URL);

/** Whatever is cached — any age (the view decides what to do with it);
 *  downloads only when nothing is stored. */
export async function loadFuelData(): Promise<FuelData> {
  const cached = await cacheMatch();
  if (cached !== undefined) return parseFuelData(await cached.json());
  return downloadFuelData();
}

/** Explicit download — writes the dedicated cache and returns the data. */
export async function downloadFuelData(): Promise<FuelData> {
  const res = await fetch(GIST_URL, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const data = parseFuelData(JSON.parse(text));
  if (typeof caches !== 'undefined') {
    await (await caches.open(CACHE_NAME)).put(GIST_URL, new Response(text, {
      headers: { 'Content-Type': 'application/json', [TS_HEADER]: String(data.ts) }
    }));
  }
  return data;
}

/** Startup refresh: downloads only when the cached file is not from
 *  today (or missing) — silent failure keeps whatever is cached. */
export async function refreshFuelDataIfStale(): Promise<void> {
  try {
    const cached = await cacheMatch();
    const ts = cached !== undefined ? Number(cached.headers.get(TS_HEADER)) : undefined;
    if (ts !== undefined && fuelDataIsToday(ts)) return;
    await downloadFuelData();
  } catch { /* offline or parse failure — the cached copy stays in place */ }
}
