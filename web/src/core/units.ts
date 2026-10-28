import { I18n } from './I18n.js';
import type { Language, UnitSystem } from './settings.js';

/**
 * Unit conversions and localized formatting. All stored values are metric
 * (km, litres, kWh); imperial figures only ever appear at format time.
 */

const KM_PER_MILE = 1.609344;
const LITRES_PER_US_GAL = 3.785411784;
/** L/100km × mpg(US) constant: mpg = K / (L/100km). */
const L100_TO_MPG = 100 * LITRES_PER_US_GAL / KM_PER_MILE; // ≈ 235.215

/** Unit system derived from the language when the user did not pick one. */
export function defaultUnits(language: Language): UnitSystem {
  return language === 'en' ? 'imperial' : 'metric';
}

export function kmToDisplay(km: number, units: UnitSystem): number {
  return units === 'imperial' ? km / KM_PER_MILE : km;
}

export function displayToKm(value: number, units: UnitSystem): number {
  return units === 'imperial' ? value * KM_PER_MILE : value;
}

export function distanceUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'mi' : 'km';
}

export function formatDistance(km: number, units: UnitSystem): string {
  return `${I18n.formatNumber(kmToDisplay(km, units), { maximumFractionDigits: 0 })} ${distanceUnit(units)}`;
}

export function litresToDisplay(litres: number, units: UnitSystem): number {
  return units === 'imperial' ? litres / LITRES_PER_US_GAL : litres;
}

export function volumeUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'gal' : 'L';
}

/**
 * Fuel consumption for display. `lPer100km` is the canonical metric value;
 * imperial renders US mpg (K / l100). Returns undefined when l100 is not
 * strictly positive (no meaningful conversion).
 */
export function formatFuelConsumption(lPer100km: number, units: UnitSystem): string | undefined {
  if (lPer100km <= 0) return undefined;
  if (units === 'imperial') {
    const mpg = L100_TO_MPG / lPer100km;
    return `${I18n.formatNumber(mpg, { maximumFractionDigits: 1 })} mpg`;
  }
  return `${I18n.formatNumber(lPer100km, { maximumFractionDigits: 2 })} L/100km`;
}

export function formatElecConsumption(kwhPer100km: number, units: UnitSystem): string | undefined {
  if (kwhPer100km <= 0) return undefined;
  if (units === 'imperial') {
    const perMile = kwhPer100km / 100 / KM_PER_MILE;
    return `${I18n.formatNumber(perMile, { maximumFractionDigits: 2 })} kWh/mi`;
  }
  return `${I18n.formatNumber(kwhPer100km, { maximumFractionDigits: 1 })} kWh/100km`;
}
