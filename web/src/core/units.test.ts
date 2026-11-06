import { describe, test, expect } from 'bun:test';
import { I18n } from './I18n.js';
import {
  defaultUnits, kmToDisplay, displayToKm, formatDistance,
  litresToDisplay, formatFuelConsumption, formatElecConsumption
} from './units.js';

describe('units', () => {
  test('default units follow the language', () => {
    expect(defaultUnits('fr')).toBe('metric');
    expect(defaultUnits('en')).toBe('imperial');
  });

  test('km/mi conversions are reciprocal', () => {
    expect(kmToDisplay(160.9344, 'imperial')).toBeCloseTo(100, 5);
    expect(displayToKm(100, 'imperial')).toBeCloseTo(160.9344, 5);
    expect(kmToDisplay(160.9344, 'metric')).toBe(160.9344);
  });

  test('formatDistance', () => {
    I18n.setLanguage('en');
    expect(formatDistance(160.9344, 'imperial')).toBe('100 mi');
    expect(formatDistance(100, 'metric')).toBe('100 km');
  });

  test('litres → US gallons', () => {
    expect(litresToDisplay(37.85411784, 'imperial')).toBeCloseTo(10, 5);
    expect(litresToDisplay(50, 'metric')).toBe(50);
  });

  test('fuel consumption: L/100km ↔ US mpg', () => {
    I18n.setLanguage('en');
    // 235.215 / mpg = L/100km → 10 L/100km ≈ 23.5 mpg
    expect(formatFuelConsumption(10, 'imperial')).toBe('23.5 mpg');
    expect(formatFuelConsumption(10, 'metric')).toBe('10 L/100km');
    expect(formatFuelConsumption(0, 'metric')).toBeUndefined();
  });

  test('electric consumption: kWh/100km ↔ kWh/mi', () => {
    I18n.setLanguage('en');
    expect(formatElecConsumption(16.09344, 'imperial')).toBe('0.1 kWh/mi');
    expect(formatElecConsumption(15, 'metric')).toBe('15 kWh/100km');
    expect(formatElecConsumption(-1, 'imperial')).toBeUndefined();
  });
});
