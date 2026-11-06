/**
 * Monthly consumer-price index series (INSEE, base 2025) fetched lazily from
 * a GitHub Gist kept up to date by a scheduled workflow (same data source as
 * mon-patrimoine). France-only feature: the index is the INSEE CPI.
 *
 * All amounts stored and computed by the application stay in nominal
 * "euros of the time"; this module only produces a multiplicative factor
 * used to express a historical amount in current euros for display. The
 * "current euros" base is the latest published month, not the calendar
 * month (the current month is generally not published yet).
 */

export interface InflationSourceData {
  source: { id: string; title: string; origin: string; url: string; lastUpdate: string };
  index: Record<string, string>;
}

const GIST_RAW =
  'https://gist.githubusercontent.com/fathzer/5646b5558f759655717914400cc50a03/raw';

/** INSEE CPI series published on the Gist (idbank → file). */
export const CPI_SERIES = {
  /** Ensemble hors tabac — default. */
  horsTabac: '011814056',
  /** Ensemble y compris tabac. */
  tabac: '011814630',
  /** Ensemble hors tabac et alcool. */
  horsTabacAlcool: '011814080'
} as const;
export type CpiSeries = keyof typeof CPI_SERIES;

export class InflationIndex {
  readonly sourceId: string;
  readonly title: string;
  private readonly _months: string[];
  private readonly _values: Map<string, number>;
  private readonly _latestMonth: string;

  constructor(data: InflationSourceData) {
    this.sourceId = data.source.id;
    this.title = data.source.title;
    this._months = Object.keys(data.index).sort((a, b) => a.localeCompare(b));
    this._values = new Map(this._months.map(m => [m, Number.parseFloat(data.index[m])]));
    this._latestMonth = this._months.at(-1)!;
  }

  get latestMonth(): string { return this._latestMonth; }
  get latestValue(): number { return this._values.get(this._latestMonth)!; }
  get firstMonth(): string { return this._months[0]; }

  /** Index value for the greatest published month <= the YYYY-MM of `date`
   *  (dates before the first month resolve to the first month). */
  valueAt(date: string): number {
    const ym = date.slice(0, 7);
    let lo = 0;
    let hi = this._months.length - 1;
    let res = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this._months[mid] <= ym) { res = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return this._values.get(this._months[res])!;
  }

  /** Factor to display an amount dated `date` in current euros. */
  factorFor(date: string): number {
    const v = this.valueAt(date);
    return v > 0 ? this.latestValue / v : 1;
  }
}

const cache = new Map<string, Promise<InflationIndex>>();

/** Fetches (and memoizes) an INSEE CPI series from the public Gist. */
export function loadInflationIndex(series: CpiSeries = 'horsTabac'): Promise<InflationIndex> {
  const idbank = CPI_SERIES[series];
  let pending = cache.get(idbank);
  if (pending === undefined) {
    pending = fetch(`${GIST_RAW}/insee-${idbank}.json`)
      .then(r => {
        if (!r.ok) throw new Error(`INSEE index fetch failed: HTTP ${r.status}`);
        return r.json() as Promise<InflationSourceData>;
      })
      .then(data => new InflationIndex(data));
    cache.set(idbank, pending);
  }
  return pending;
}
