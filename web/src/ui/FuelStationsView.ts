import { I18n } from '../core/I18n.js';
import { defaultUnits, distanceUnit, kmToDisplay } from '../core/units.js';
import { Settings } from '../core/settings.js';
import { escapeHtml } from './format.js';
import { componentStyles } from './componentStyles.js';
import { GEO_ICON } from './icons.js';
import { downloadFuelData, loadFuelData, nearestStations, orderedFuelNames } from '../domain/fuelStations.js';
import type { DayHours, NearbyStation } from '../domain/fuelStations.js';

const CSS = `
.fuel-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}
.fuel-toolbar .form-control { width: auto; }
.fuel-toolbar #fuel-refresh { margin-left: auto; }
.fuel-status {
  text-align: center;
  color: var(--text-muted);
  padding: var(--space-2xl) 0;
}
.fuel-status .btn-primary { margin-top: var(--space-md); }
.station-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-bottom: var(--space-sm);
}
.station-head {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}
.station-addr { font-weight: var(--font-weight-semibold); }
.station-dist { margin-left: auto; color: var(--text-muted); font-size: var(--font-size-sm); white-space: nowrap; }
.station-geo { display: inline-flex; color: var(--accent); }
.station-geo svg { width: 1.1rem; height: 1.1rem; }
.station-hours { margin-top: var(--space-xs); font-size: var(--font-size-xs); color: var(--text-muted); }
.station-h24 {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-pill);
  background: var(--color-accent-soft);
  color: var(--accent);
  white-space: nowrap;
}
.station-prices {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}
.fuel-chip {
  font-size: var(--font-size-sm);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-pill);
  border: 1px solid var(--card-border);
  color: var(--text-muted);
  white-space: nowrap;
}
.fuel-chip.sel { border-color: var(--accent); color: var(--accent); font-weight: var(--font-weight-semibold); }
.fuel-chip.out { opacity: 0.6; text-decoration: line-through; }
.station-updated { margin-top: var(--space-xs); font-size: var(--font-size-xs); color: var(--text-muted); }
.fuel-source { margin-top: var(--space-lg); font-size: var(--font-size-xs); color: var(--text-muted); text-align: center; }
.fuel-count { font-size: var(--font-size-sm); color: var(--text-muted); margin: 0 0 var(--space-sm); }
`;

/** How many station cards are shown — the full in-radius count is
 *  displayed above the list so the search radius visibly matters. */
const MAX_RESULTS = 30;

/**
 * Nearby fuel stations screen (`/app/fuel`): geolocates the user and lists
 * the closest stations with official pump prices (France only — see
 * domain/fuelStations.ts for the API access and record parsing).
 * Standalone — no account needed. The view is mounted once per visit so a
 * state:changed re-render never wipes the results or the selected fuel.
 */
export class FuelStationsView {
  private stations: NearbyStation[] = [];
  private selectedFuel = Settings.load().get('fuelKind') ?? 'Gazole';
  private coords?: { lat: number; lon: number };
  private radiusKm = Settings.load().get('fuelRadiusKm') ?? 10;

  constructor(private readonly host: HTMLElement) {
    componentStyles('fuel-stations', CSS);
  }

  render(): void {
    const radii = [5, 10, 20, 50];
    this.host.innerHTML = `
      <div class="fuel-screen" data-tool="stations">
        <div class="fuel-toolbar">
          <label for="fuel-radius">${I18n.t('fuel.radius')}
            <select id="fuel-radius" class="form-control">
              ${radii.map(r => `<option value="${r}" ${r === this.radiusKm ? 'selected' : ''}>${r} km</option>`).join('')}
            </select></label>
          <label for="fuel-kind" class="fuel-kind" hidden>${I18n.t('fuel.fuelLabel')}
            <select id="fuel-kind" class="form-control"></select></label>
          <button class="btn-secondary" id="fuel-refresh" hidden>${I18n.t('fuel.refresh')}</button>
        </div>
        <div id="fuel-body"></div>
        <p class="fuel-source">${I18n.t('fuel.source')}</p>
      </div>`;
    this.host.querySelector('#fuel-radius')!.addEventListener('change', (e) => {
      this.radiusKm = Number((e.target as HTMLSelectElement).value);
      Settings.load().set('fuelRadiusKm', this.radiusKm);
      if (this.coords) void this.fetchStations(this.coords.lat, this.coords.lon);
    });
    this.host.querySelector('#fuel-refresh')!.addEventListener('click', () => this.refresh());
    this.host.querySelector('#fuel-kind')!.addEventListener('change', (e) => {
      this.selectedFuel = (e.target as HTMLSelectElement).value;
      Settings.load().set('fuelKind', this.selectedFuel);
      this.renderStations();
    });
    this.locate();
  }

  private status(html: string): void {
    (this.host.querySelector('#fuel-body') as HTMLElement).innerHTML = `<p class="fuel-status">${html}</p>`;
  }

  private locate(): void {
    this.status(escapeHtml(I18n.t('fuel.locating')));
    if (!('geolocation' in navigator)) {
      this.showError();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => { void this.fetchStations(pos.coords.latitude, pos.coords.longitude); },
      () => this.showError(),
      { timeout: 10000 }
    );
  }

  private showError(): void {
    this.status(`${escapeHtml(I18n.t('fuel.geoDenied'))}<br><button class="btn-primary" id="fuel-retry">${I18n.t('fuel.retry')}</button>`);
    this.host.querySelector('#fuel-retry')?.addEventListener('click', () => this.locate());
  }

  private async fetchStations(lat: number, lon: number): Promise<void> {
    this.coords = { lat, lon };
    this.status(escapeHtml(I18n.t('fuel.loading')));
    try {
      // Whatever is cached is used as-is — the file only refreshes at
      // startup (stale) or through the explicit Refresh button.
      const data = await loadFuelData();
      this.stations = nearestStations(data.stations, this.coords, this.radiusKm);
      this.showResults();
    } catch {
      this.status(`${escapeHtml(I18n.t('fuel.loadError'))}<br><button class="btn-primary" id="fuel-retry">${I18n.t('fuel.retry')}</button>`);
      this.host.querySelector('#fuel-retry')?.addEventListener('click', () => this.locate());
    }
  }

  /** Explicit user action — re-downloads the (hourly) file. */
  private async refresh(): Promise<void> {
    if (!this.coords) { this.locate(); return; }
    this.status(escapeHtml(I18n.t('fuel.loading')));
    try {
      const data = await downloadFuelData();
      this.stations = nearestStations(data.stations, this.coords, this.radiusKm);
      this.showResults();
    } catch {
      this.renderStations();
    }
  }

  private showResults(): void {
    const fuels = orderedFuelNames(this.stations);
    if (fuels.length > 0 && !fuels.includes(this.selectedFuel)) this.selectedFuel = fuels[0];
    const select = this.host.querySelector<HTMLSelectElement>('#fuel-kind')!;
    select.innerHTML = fuels.map(f => `<option value="${f}" ${f === this.selectedFuel ? 'selected' : ''}>${f}</option>`).join('');
    select.parentElement!.hidden = fuels.length === 0;
    (this.host.querySelector('#fuel-refresh') as HTMLElement).hidden = false;
    this.renderStations();
  }

  private priceOf(s: NearbyStation, fuel: string): number | undefined {
    return s.prices.find(p => p.name === fuel && !s.soldOut.has(fuel))?.euros;
  }

  /** Today's schedule text — '' when nothing is published for today. */
  private todayHours(week: DayHours[] | undefined): string {
    if (!week) return '';
    // JS getDay(): 0=Sun..6=Sat → index 0=Mon..6=Sun.
    const day = week[(new Date().getDay() + 6) % 7];
    if (day === null) return I18n.t('fuel.closedToday');
    const fmt = (m: number): string =>
      `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
    if (day.length === 0 || (day.length === 2 && day[0] === 0 && day[1] === 0)) {
      return I18n.t('fuel.hoursToday', { hours: '24h' });
    }
    const slots: string[] = [];
    for (let i = 0; i + 1 < day.length; i += 2) slots.push(`${fmt(day[i])}–${fmt(day[i + 1])}`);
    return I18n.t('fuel.hoursToday', { hours: slots.join(' · ') });
  }

  /** Stations carrying the selected fuel come first, cheapest first —
   *  the others stay behind in distance order. */
  private renderStations(): void {
    const units = defaultUnits(I18n.language);
    const sorted = [...this.stations].sort((a, b) => {
      const pa = this.priceOf(a, this.selectedFuel) ?? Number.POSITIVE_INFINITY;
      const pb = this.priceOf(b, this.selectedFuel) ?? Number.POSITIVE_INFINITY;
      return pa === pb ? a.km - b.km : pa - pb;
    });
    const body = this.host.querySelector('#fuel-body') as HTMLElement;
    if (this.stations.length === 0) {
      body.innerHTML = `<p class="fuel-status">${I18n.t('fuel.none', { km: this.radiusKm })}</p>`;
      return;
    }
    body.innerHTML = `
      <p class="fuel-count">${I18n.t('fuel.found', { count: this.stations.length, km: this.radiusKm })}</p>
      ${sorted.slice(0, MAX_RESULTS).map(s => this.stationCard(s, units)).join('')}`;
  }

  private stationCard(s: NearbyStation, units: ReturnType<typeof defaultUnits>): string {
    const chips = [
      ...s.prices.map(p => {
        const cls = `${p.name === this.selectedFuel && !s.soldOut.has(p.name) ? ' sel' : ''}${s.soldOut.has(p.name) ? ' out' : ''}`;
        return `<span class="fuel-chip${cls}">${escapeHtml(p.name)} ${I18n.formatNumber(p.euros, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}&nbsp;€/L</span>`;
      }),
      ...[...s.soldOut].filter(n => !s.prices.some(p => p.name === n))
        .map(n => `<span class="fuel-chip out">${escapeHtml(n)} ${I18n.t('fuel.soldOut')}</span>`)
    ].join('');
    const latest = s.prices.map(p => p.updated).filter(d => d !== '').sort((a, b) => a.localeCompare(b)).pop();
    const dist = `${I18n.formatNumber(kmToDisplay(s.km, units), { maximumFractionDigits: 1 })} ${distanceUnit(units)}`;
    const hours = s.h24 ? '' : this.todayHours(s.week);
    return `<article class="station-card">
      <div class="station-head">
        <span class="station-addr">${escapeHtml(s.address)}</span>
        ${s.h24 ? `<span class="station-h24">${I18n.t('fuel.h24')}</span>` : ''}
        <a class="station-geo" href="geo:${s.lat},${s.lon}" title="${I18n.t('fuel.openMap')}">${GEO_ICON}</a>
        <span class="station-dist">${dist}</span>
      </div>
      ${hours ? `<div class="station-hours">${hours}</div>` : ''}
      <div class="station-prices">${chips}</div>
      ${latest ? `<div class="station-updated">${I18n.t('fuel.updatedAt', { date: I18n.formatDate(latest) })}</div>` : ''}
    </article>`;
  }
}
