/**
 * Tiny router: the SPA lives under /app/ and maps paths to screens —
 * `/app/veh` the vehicle list, `/app/veh/<id>` a vehicle detail,
 * `/app/calc` the simulator. The bare `/app/` root resumes the last
 * visited screen (persisted in settings). Deep links are served
 * app/index.html by the host (404.html on GitHub Pages, fallback in the
 * dev server); the app is always deployed at the domain root, so app
 * paths are absolute.
 */
export type Route =
  | { kind: 'list' }
  | { kind: 'vehicle'; id: string }
  | { kind: 'simulator' }
  | { kind: 'stations' };

export const APP_ROOT = '/app/';

/** Parses a URL path into an app route — unknown paths fall back to the list. */
export function parseRoute(pathname: string): Route {
  const rel = pathname.replace(/^\/app\/?/, '');
  if (rel === 'calc') return { kind: 'simulator' };
  if (rel === 'fuel') return { kind: 'stations' };
  const veh = /^veh(?:\/([^/]+))?\/?$/.exec(rel)?.[1];
  if (veh !== undefined) return { kind: 'vehicle', id: decodeURIComponent(veh) };
  return { kind: 'list' };
}

/** The bare app root — it redirects to the last visited screen instead. */
export const isAppRoot = (pathname: string): boolean => pathname === '/app' || pathname === '/app/';

export const listPath = (): string => `${APP_ROOT}veh`;
export const simulatorPath = (): string => `${APP_ROOT}calc`;
export const stationsPath = (): string => `${APP_ROOT}fuel`;
export const vehiclePath = (id: string): string => `${APP_ROOT}veh/${encodeURIComponent(id)}`;
