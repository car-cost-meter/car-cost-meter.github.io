/**
 * Helpers for ISO `YYYY-MM-DD` dates — the form every dated entry uses,
 * which sorts correctly as a plain string.
 */

/** Today's date in ISO form (YYYY-MM-DD). */
export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

/** Compares two ISO dates for ascending sort. */
export function compareDates(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/** Adds `months` to an ISO date, clamping the day at the end of month. */
export function addMonths(date: string, months: number): string {
  const d = new Date(`${date}T12:00:00`);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d.toISOString().split('T')[0];
}

/** Milliseconds timestamp of an ISO date (UTC midnight). */
export function utcDate(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

/** The year of an ISO date. */
export function yearOf(date: string): number {
  return Number.parseInt(date.slice(0, 4), 10);
}

/** ISO date of January 1st / December 31st of a year. */
export function yearStart(year: number): string {
  return `${year}-01-01`;
}
export function yearEnd(year: number): string {
  return `${year}-12-31`;
}
