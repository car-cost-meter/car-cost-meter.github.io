/**
 * Generates the demo dataset:
 *   demo/demo.json — a realistic multi-vehicle fleet for the read-only demo
 *     mode: a Diesel Golf with monthly fill-ups (one loan period, one
 *     amount-only top-up), a Zoe EV charged weekly, and a recently bought
 *     Captur E-Tech hybrid with both energy streams — plus insurance,
 *     maintenance, technical inspections, acquisition (loan) payments and
 *     dated resale-value estimates.
 *
 * Deterministic (seeded hash noise, no randomness, no network).
 * Run from the repo root: bun scripts/make_demo_data.ts
 * Writes demo/demo.json (to publish on the public Gist) and a bundled copy
 * web/demo.json used as fallback while the gist is unreachable.
 */

import { mkdirSync, writeFileSync } from 'node:fs';

const DAY = 86400000;
const iso = (t: number): string => new Date(t).toISOString().slice(0, 10);
const utc = (s: string): number => Date.parse(`${s}T00:00:00Z`);
const addDays = (s: string, n: number): string => iso(utc(s) + n * DAY);
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Deterministic noise in [-amp, +amp) from an integer seed. */
const noise = (i: number, amp = 1): number => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 * amp - amp;
};

const TODAY = iso(Date.now());

let seq = 0;
const id = (): string => `demo-${(seq++).toString(36)}`;

// ---------------------------------------------------------------- builders

interface FuelUp { id: string; date: string; odometerKm?: number; volumeLitres?: number; amount?: number; full: boolean; }
interface Charge { id: string; date: string; odometerKm?: number; kwh?: number; amount?: number; full?: boolean; }
interface Cost { id: string; date: string; category: string; amount: number; comment?: string; odometerKm?: number; }
interface LoanPeriod { id: string; from: string; to: string; note?: string; }
interface DatedValue { date: string; value: number; }

/**
 * Regular fill-ups every ~`everyDays` between two dates. The odometer runs
 * `kmPerDay` on average; volume follows `litresPerDay` with a bit of noise.
 * A fraction of fill-ups are partial (not full); `noVolumeAt` indices carry
 * an amount but no volume (reconstructed history).
 */
function fuelUps(opts: {
  from: string; to: string; everyDays: number; startKm: number;
  kmPerDay: number; litresPerDay: number; pricePerLitre: number;
  skipFrom?: string; skipTo?: string; noVolumeAt?: number[];
}): { entries: FuelUp[]; endKm: number } {
  const entries: FuelUp[] = [];
  let km = opts.startKm;
  let litres = 0;
  let i = 0;
  for (let t = utc(opts.from); t <= utc(opts.to); t += opts.everyDays * DAY, i++) {
    const date = iso(t);
    if (opts.skipFrom && opts.skipTo && date >= opts.skipFrom && date <= opts.skipTo) {
      km += opts.kmPerDay * opts.everyDays;
      continue;
    }
    const j = i * 7 + 3;
    km += opts.kmPerDay * opts.everyDays * (1 + noise(j, 0.25));
    litres += opts.litresPerDay * opts.everyDays * (1 + noise(j + 1, 0.2));
    const full = i % 5 !== 4; // ~1 partial in 5
    const volume = full ? Math.round(litres * 10) / 10 : Math.round(litres * 3) / 10;
    litres = 0;
    const entry: FuelUp = {
      id: id(), date,
      odometerKm: Math.round(km),
      amount: round2(volume * opts.pricePerLitre * (1 + noise(j + 2, 0.04))),
      full
    };
    if (!opts.noVolumeAt?.includes(i)) entry.volumeLitres = volume;
    entries.push(entry);
  }
  return { entries, endKm: Math.round(km) };
}

/** Weekly-ish charges of `kwh` on average (¼ flagged full). */
function charges(opts: {
  from: string; to: string; everyDays: number; startKm: number;
  kmPerDay: number; kwhPerDay: number; pricePerKwh: number;
}): { entries: Charge[]; endKm: number } {
  const entries: Charge[] = [];
  let km = opts.startKm;
  let i = 0;
  for (let t = utc(opts.from); t <= utc(opts.to); t += opts.everyDays * DAY, i++) {
    const j = i * 11 + 5;
    km += opts.kmPerDay * opts.everyDays * (1 + noise(j, 0.3));
    const kwh = Math.round(opts.kwhPerDay * opts.everyDays * (1 + noise(j + 1, 0.3)) * 10) / 10;
    entries.push({
      id: id(), date: iso(t),
      odometerKm: Math.round(km),
      kwh,
      amount: round2(kwh * opts.pricePerKwh * (1 + noise(j + 2, 0.15))),
      full: i % 4 === 0
    });
  }
  return { entries, endKm: Math.round(km) };
}

/** Yearly cost entries on `monthDay` from `fromYear` to `toYear`. */
function yearlyCosts(opts: {
  fromYear: number; toYear: number; monthDay: string;
  category: string; amount: number; driftPerYear?: number; comment?: string;
}): Cost[] {
  const out: Cost[] = [];
  for (let y = opts.fromYear; y <= opts.toYear; y++) {
    const date = `${y}-${opts.monthDay}`;
    if (date > TODAY) break;
    out.push({
      id: id(), date, category: opts.category,
      amount: round2(opts.amount + (opts.driftPerYear ?? 0) * (y - opts.fromYear)),
      comment: opts.comment
    });
  }
  return out;
}

// ---------------------------------------------------------------- vehicles

// 1. Golf TDI — bought second-hand in March 2021, ~110 km/day weekday use.
const golfLoan: LoanPeriod = {
  id: id(), from: '2023-07-10', to: '2023-08-05', note: 'Prêt à mon frère (déménagement)'
};
const golfFill = fuelUps({
  from: '2021-03-20', to: TODAY, everyDays: 23, startKm: 42000,
  kmPerDay: 45, litresPerDay: 2.3, pricePerLitre: 1.72,
  skipFrom: golfLoan.from, skipTo: golfLoan.to, noVolumeAt: [30]
});
const golf: Record<string, unknown> = {
  id: 'veh-golf', name: 'Golf TDI', vehicleType: 'car', energyType: 'fuel',
  acquisitionDate: '2021-03-15', initialOdometerKm: 42000,
  acquisition: {
    initialAmount: 18500,
    registrationFee: 380,
    loan: { periodicity: 'monthly', amount: 285, count: 60, firstPaymentDate: '2021-04-05' }
  },
  inspectionPeriodMonths: 24,
  resaleValues: [
    { date: '2022-03-15', value: 17200 }, { date: '2023-03-15', value: 16000 },
    { date: '2024-03-15', value: 14500 }, { date: '2025-03-15', value: 12900 },
    { date: '2026-03-15', value: 11600 }
  ],
  fuelUps: golfFill.entries,
  charges: [],
  loanPeriods: [golfLoan],
  costs: [
    ...yearlyCosts({ fromYear: 2021, toYear: 2026, monthDay: '04-01', category: 'insurance', amount: 720, driftPerYear: 15, comment: 'Assurance tous risques' }),
    { id: id(), date: '2021-03-22', category: 'acquisition', amount: 59, comment: 'Frais de dossier' },
    { id: id(), date: '2021-10-12', category: 'maintenance', amount: 149.9, comment: 'Vidange + filtres', odometerKm: 55000 },
    { id: id(), date: '2022-05-30', category: 'maintenance', amount: 412, comment: 'Pneus avant', odometerKm: 78000 },
    { id: id(), date: '2022-09-20', category: 'inspection', amount: 78.5, comment: 'Contrôle technique', odometerKm: 89000 },
    { id: id(), date: '2023-02-14', category: 'maintenance', amount: 233.4, comment: 'Plaquettes de frein', odometerKm: 105000 },
    { id: id(), date: '2024-06-18', category: 'maintenance', amount: 186.2, comment: 'Vidange + filtres', odometerKm: 138000 },
    { id: id(), date: '2024-09-22', category: 'inspection', amount: 82, comment: 'Contrôle technique', odometerKm: 152000 },
    { id: id(), date: '2025-04-08', category: 'maintenance', amount: 640, comment: 'Distribution', odometerKm: 172000 },
    { id: id(), date: '2025-11-25', category: 'maintenance', amount: 390, comment: 'Pneus 4 saisons', odometerKm: 190000 },
    { id: id(), date: '2026-08-30', category: 'other', amount: 96.5, comment: 'Vignette + péages vacances' }
  ],
  updatedAt: '2026-09-01T08:30:00.000Z'
};

// 2. Zoe — bought in June 2023, urban use ~35 km/day.
const zoeCharges = charges({
  from: '2023-06-08', to: TODAY, everyDays: 6, startKm: 5000,
  kmPerDay: 35, kwhPerDay: 5.6, pricePerKwh: 0.18
});
const zoe: Record<string, unknown> = {
  id: 'veh-zoe', name: 'Zoe', vehicleType: 'car', energyType: 'electric',
  firstInspectionDate: '2027-06-01', // bought second-hand, first CT ~4y after 1st registration
  acquisitionDate: '2023-06-01', initialOdometerKm: 5000,
  acquisition: { initialAmount: 22000 },
  inspectionPeriodMonths: 24,
  resaleValues: [
    { date: '2024-06-01', value: 17800 }, { date: '2025-06-01', value: 14900 },
    { date: '2026-06-01', value: 12500 }
  ],
  fuelUps: [],
  charges: zoeCharges.entries,
  loanPeriods: [],
  costs: [
    ...yearlyCosts({ fromYear: 2023, toYear: 2026, monthDay: '07-01', category: 'insurance', amount: 560, driftPerYear: 12 }),
    { id: id(), date: '2024-03-20', category: 'maintenance', amount: 95, comment: 'Révision annuelle', odometerKm: 16000 },
    { id: id(), date: '2025-03-18', category: 'maintenance', amount: 110, comment: 'Révision annuelle', odometerKm: 28000 },
    { id: id(), date: '2026-03-22', category: 'maintenance', amount: 118, comment: 'Révision annuelle', odometerKm: 40000 },
    { id: id(), date: '2025-12-04', category: 'other', amount: 59, comment: 'Badge télépéage' }
  ],
  updatedAt: '2026-10-20T18:00:00.000Z'
};

// 3. Captur E-Tech — hybrid bought new in Sept 2024, mixed use.
const capturFill = fuelUps({
  from: '2024-09-10', to: TODAY, everyDays: 31, startKm: 0,
  kmPerDay: 52, litresPerDay: 1.6, pricePerLitre: 1.79
});
const capturCharges = charges({
  from: '2024-09-10', to: TODAY, everyDays: 5, startKm: 0,
  kmPerDay: 52, kwhPerDay: 2.8, pricePerKwh: 0.17
});
const captur: Record<string, unknown> = {
  id: 'veh-captur', name: 'Captur E-Tech', vehicleType: 'car', energyType: 'hybrid',
  firstInspectionDate: '2028-09-01', // new vehicle: first CT 4 years after purchase
  acquisitionDate: '2024-09-01', initialOdometerKm: 0,
  acquisition: { initialAmount: 27000 },
  inspectionPeriodMonths: 24,
  resaleValues: [
    { date: '2025-09-01', value: 22600 }, { date: '2026-09-01', value: 20300 }
  ],
  fuelUps: capturFill.entries,
  charges: capturCharges.entries,
  loanPeriods: [],
  costs: [
    ...yearlyCosts({ fromYear: 2024, toYear: 2026, monthDay: '09-20', category: 'insurance', amount: 690, driftPerYear: 10 }),
    { id: id(), date: '2025-09-05', category: 'maintenance', amount: 240, comment: 'Révision 1 an', odometerKm: 18000 },
    { id: id(), date: '2026-09-04', category: 'maintenance', amount: 255, comment: 'Révision 2 ans', odometerKm: 37000 }
  ],
  updatedAt: '2026-10-15T19:45:00.000Z'
};

// ---------------------------------------------------------------- payload

const payload = {
  version: '1.0',
  vehicles: [golf, zoe, captur]
};

mkdirSync('demo', { recursive: true });
writeFileSync('demo/demo.json', JSON.stringify(payload, null, 2));
mkdirSync('web', { recursive: true });
writeFileSync('web/demo.json', JSON.stringify(payload));
console.log('Wrote demo/demo.json (gist) and web/demo.json (bundled fallback)');
