import { describe, test, expect } from 'bun:test';
import { parseRoute, listPath, simulatorPath, stationsPath, vehiclePath, connectPath } from './route.js';

describe('parseRoute', () => {
  test('app root and /app/veh → list', () => {
    expect(parseRoute('/app/')).toEqual({ kind: 'list' });
    expect(parseRoute('/app')).toEqual({ kind: 'list' });
    expect(parseRoute('/app/veh')).toEqual({ kind: 'list' });
    expect(parseRoute('/app/veh/')).toEqual({ kind: 'list' });
  });

  test('vehicle detail', () => {
    expect(parseRoute('/app/veh/abc-123')).toEqual({ kind: 'vehicle', id: 'abc-123' });
    expect(parseRoute('/app/veh/abc-123/')).toEqual({ kind: 'vehicle', id: 'abc-123' });
  });

  test('simulator', () => {
    expect(parseRoute('/app/calc')).toEqual({ kind: 'simulator' });
  });

  test('stations', () => {
    expect(parseRoute('/app/fuel')).toEqual({ kind: 'stations' });
  });

  test('unknown paths → list', () => {
    expect(parseRoute('/app/foo')).toEqual({ kind: 'list' });
    expect(parseRoute('/')).toEqual({ kind: 'list' });
  });
});

describe('paths', () => {
  test('round-trip', () => {
    expect(parseRoute(listPath())).toEqual({ kind: 'list' });
    expect(parseRoute(simulatorPath())).toEqual({ kind: 'simulator' });
    expect(parseRoute(stationsPath())).toEqual({ kind: 'stations' });
    expect(parseRoute(connectPath())).toEqual({ kind: 'connect' });
    expect(parseRoute(vehiclePath('a b'))).toEqual({ kind: 'vehicle', id: 'a b' });
  });
});
