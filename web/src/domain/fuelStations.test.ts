import { describe, test, expect } from 'bun:test';
import { haversineKm, nearestStations, orderedFuelNames, parseFuelData } from './fuelStations.js';

/** Positional record like the gist: [id, lat, lon, addr, city, cp, h24, oh, priced, out]. */
const station = (over: Partial<Record<number, unknown>> = {}): unknown[] => {
  const s: unknown[] = [1, 48.861, 2.341, '10 Rue Bailleul', 'Paris', '75001', 0, null, [], []];
  for (const [i, v] of Object.entries(over)) s[Number(i)] = v;
  return s;
};

const data = (stations: unknown[][]): unknown =>
  ({ v: 1, ts: 30_000_000, fuels: ['E10', 'E85', 'Gazole', 'SP98'], stations });

describe('parseFuelData', () => {
  test('parses stations, prices, shortages and hours', () => {
    const week = [[480, 1140], null, [], null, [360, 1320], null, []];
    const parsed = parseFuelData(data([
      station({
        8: [[0, 1990, 30_000_000], [2, 2250, 30_000_000]],
        9: [3],
        7: week,
        6: 1
      })
    ]));
    expect(parsed.ts).toBe(30_000_000);
    const s = parsed.stations[0];
    expect(s.address).toBe('10 Rue Bailleul 75001 Paris');
    expect(s.h24).toBe(true);
    expect(s.week).toEqual(week);
    expect(s.prices.map(p => p.name)).toEqual(['E10', 'Gazole']);
    expect(s.prices[0].euros).toBeCloseTo(1.99);
    expect(s.prices[0].updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.soldOut.has('SP98')).toBe(true);
  });

  test('skips stations without coordinates', () => {
    expect(parseFuelData(data([station({ 1: 'x' }), station()])).stations).toHaveLength(1);
  });

  test('missing fuels/stations arrays degrade to empty', () => {
    expect(parseFuelData({}).stations).toHaveLength(0);
  });
});

describe('nearestStations', () => {
  test('filters by radius and sorts by distance', () => {
    const near = station();                                   // ~1.4 km from from-point
    const far = station({ 1: 50, 2: 3, 0: 2 });               // ~200 km away
    const { stations } = parseFuelData(data([far, near]));
    const from = { lat: 48.85, lon: 2.35 };
    const res = nearestStations(stations, from, 10);
    expect(res).toHaveLength(1);
    expect(res[0].km).toBeCloseTo(1.4, 0);
    expect(nearestStations(stations, from, 500)[0].km).toBeCloseTo(1.4, 0);
  });
});

describe('haversineKm', () => {
  test('~111 km per degree of latitude', () => {
    expect(haversineKm({ lat: 48, lon: 0 }, { lat: 49, lon: 0 })).toBeCloseTo(111, 0);
  });
});

describe('orderedFuelNames', () => {
  test('canonical order first, extras alphabetically last', () => {
    const { stations } = parseFuelData({
      ts: 1,
      fuels: ['E10', 'Gazole', 'Xfuel'],
      stations: [station({ 8: [[0, 1, 1], [1, 1, 1], [2, 1, 1]] })]
    });
    expect(orderedFuelNames(stations)).toEqual(['Gazole', 'E10', 'Xfuel']);
  });
});
