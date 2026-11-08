/**
 * Shared inline SVG icons — toolbar buttons and vehicle cards.
 * `currentColor` driven so icons follow the theme.
 */

const svg = (body: string, size = 18): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ADD_ICON = svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>');

export const SETTINGS_ICON = svg(
  '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>');

export const LOGOUT_ICON = svg(
  '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>');

export const CHART_ICON = svg(
  '<line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="18" y1="20" x2="18" y2="9"/><line x1="3" y1="20" x2="21" y2="20"/>', 14);

export const SIMULATOR_ICON = svg(
  '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8" y2="11.01"/><line x1="12" y1="11" x2="12" y2="11.01"/><line x1="16" y1="11" x2="16" y2="11.01"/><line x1="8" y1="15" x2="8" y2="15.01"/><line x1="12" y1="15" x2="12" y2="15.01"/><line x1="16" y1="15" x2="16" y2="15.01"/><line x1="8" y1="19" x2="8" y2="19.01"/><line x1="12" y1="19" x2="12" y2="19.01"/><line x1="16" y1="19" x2="16" y2="19.01"/>');

export const IMPORT_ICON = svg(
  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>');

export const EXPORT_ICON = svg(
  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>');

const svgEmoji = (body: string, size = 24): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** Vehicle-type icons (card header) — side silhouettes facing right. */
export const CAR_ICON = svgEmoji(
  '<circle cx="7.2" cy="16" r="2.3"/><circle cx="16.8" cy="16" r="2.3"/>' +
  '<path d="M2.5 13.5 L6 7.8 Q6.5 7 7.6 7 L13.5 7 Q16 7 17 9.5 L18.5 12.5 L21.5 13.5"/>' +
  '<path d="M2.5 16 H5 M9.5 16 H14.5 M19 16 H21.5"/><path d="M21.5 13.5 V16"/>');

export const VAN_ICON = svgEmoji(
  '<path d="M3 16V7a1 1 0 0 1 1-1h9v10"/><path d="M13 9h4.2a2 2 0 0 1 1.7 1l2.1 3.4V16"/><path d="M3 16h18"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/>');

export const MOTORCYCLE_ICON = svgEmoji(
  '<circle cx="5.2" cy="16.8" r="2.9"/><circle cx="18.8" cy="16.8" r="2.9"/>' +
  '<path d="M5.2 16.8 L10.5 12.8 L15.5 12.8 L18.8 16.8"/>' +
  '<path d="M10.5 12.8 L11.8 16.8"/>' +
  '<path d="M4.2 10.2 L10 10.2 Q13 10.2 15 12"/>' +
  '<path d="M15 12 L17.3 8.4 L18.8 16.8"/>' +
  '<path d="M17.3 8.4 L14.8 6.6"/><path d="M16.6 6.9 L16 5.2"/>');

/** Energy-stream icons (tabs, editor titles). */
export const FUEL_ICON = svgEmoji(
  '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M4 21h12"/><path d="M7 6h6v5H7z"/><path d="M15 9h2.5a1.5 1.5 0 0 1 1.5 1.5V18a1.2 1.2 0 0 0 2.4 0v-7.4a2 2 0 0 0-.6-1.4L18 6.4"/>');

export const BATTERY_ICON = svgEmoji(
  '<rect x="2" y="8" width="17" height="9" rx="2"/><line x1="22" y1="11" x2="22" y2="14"/><polyline points="11 9.5 8.5 12.5 12.5 12.5 10 15.5"/>');

/** "Open in maps" icon (station cards) — map pin. */
export const GEO_ICON = svg(
  '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>');

/** "Approximate location" (station cards) — map pin with a question
 *  mark, for unverified government geocoding. */
export const GEO_UNCERTAIN_ICON = svg(
  '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/>' +
  '<path d="M9.9 8.9a2.1 2.1 0 0 1 4.2 0c0 1.1-2.1 1.5-2.1 2.8"/>' +
  '<line x1="12" y1="13.4" x2="12" y2="13.41"/>');

/** "Motorway" (station cards) — French motorway sign: two carriageways
 *  diverging toward the horizon crossed by an overpass, dashed median. */
export const MOTORWAY_ICON = svg(
  '<path d="M6 20 10 4"/><path d="M18 20 14 4"/>' +
  '<line x1="4" y1="10" x2="20" y2="10"/>' +
  '<line x1="12" y1="4" x2="12" y2="20" stroke-dasharray="2.5 3"/>');

/** Direction indicator (station cards) — a fixed "N" marking north at
 *  the top and a single solid arrow rotated to the given bearing in
 *  degrees, 0 = north. Taller than square so the N stays readable. */
export const dirIcon = (deg: number): string =>
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="19" viewBox="0 0 24 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<text x="12" y="9.5" font-size="10" font-weight="bold" font-family="inherit" text-anchor="middle" fill="currentColor" stroke="none">N</text>' +
  `<g transform="rotate(${deg.toFixed(0)} 12 21.5)">` +
  '<polygon points="12 13 16 28.5 12 26 8 28.5" fill="currentColor" stroke="none"/>' +
  '</g></svg>';

/** "Back to vehicles" icon (toolbar, mobile menu) — a fleet: two
 *  front-view cars, one offset behind the other. */
const VEHICLE_SHAPE =
  '<path d="M5.5 10.5 7 6.8A2 2 0 0 1 8.9 5.5h6.2a2 2 0 0 1 1.9 1.3l1.5 3.7"/>' +
  '<rect x="3" y="10.5" width="18" height="6.5" rx="2"/>' +
  '<line x1="7.2" y1="13.7" x2="7.2" y2="13.71"/><line x1="16.8" y1="13.7" x2="16.8" y2="13.71"/>' +
  '<path d="M5 17v2.2M19 17v2.2"/>';
export const VEHICLES_ICON = svg(
  `<g transform="translate(-2.5,-3)">${VEHICLE_SHAPE}</g>` +
  `<g transform="translate(2,2.5)">${VEHICLE_SHAPE}</g>`);

export const MENU_ICON = svgEmoji(
  '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>');

export const HELP_ICON = svgEmoji(
  '<circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 4"/><line x1="12" y1="17" x2="12" y2="17.01"/>');

/** Cost-category icons (cost sub-tabs and rows). */
export const MAINTENANCE_ICON = svgEmoji(
  '<path d="M5 21V8a2 2 0 0 1 2-2h7l5 5v10H5z"/><path d="M8 6V3h6v3"/><path d="M12 11c-2.4 3-3 4.4-3 5.7a3 3 0 0 0 6 0c0-1.3-.6-2.7-3-5.7z"/>', 16);

export const REPAIR_ICON = svgEmoji(
  '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>', 16);

export const INSPECTION_ICON = svgEmoji(
  '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 13.5 2 2 4-4"/>', 16);

export const INSURANCE_ICON = svgEmoji(
  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 11.5 2 2 4-4.5"/>', 16);

export const ACQUISITION_ICON = svgEmoji(
  '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>', 16);

export const OTHER_ICON = svgEmoji(
  '<path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8l-7.2 7.2a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6z"/><circle cx="7.5" cy="7.5" r="1.5"/>', 16);

export const RESALE_ICON = svgEmoji(
  '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>', 16);
