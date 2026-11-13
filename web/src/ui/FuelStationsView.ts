import { I18n } from '../core/I18n.js';
import { activeUnits, distanceUnit, kmToDisplay, formatDistance, formatFuelPrice } from '../core/units.js';
import { Settings } from '../core/settings.js';
import { escapeHtml } from './format.js';
import { componentStyles } from './componentStyles.js';
import { GEO_ICON, GEO_UNCERTAIN_ICON, MOTORWAY_ICON, REPORT_ICON, dirIcon } from './icons.js';
import { StationReportDialog } from './StationReportDialog.js';
import { bearingDeg, downloadFuelData, isOpenAt, loadFuelData, nearestStations, orderedFuelNames } from '../domain/fuelStations.js';
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
.fuel-data-ts { font-size: var(--font-size-xs); color: var(--text-muted); white-space: nowrap; }
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
.station-card.dimmed { opacity: .5; }
.station-head {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}
.station-addr { font-weight: var(--font-weight-semibold); }
.station-dist { margin-left: auto; color: var(--text-muted); font-size: var(--font-size-sm); white-space: nowrap; }
.station-geo { display: inline-flex; color: var(--accent); }
.station-geo svg { width: 1.1rem; height: 1.1rem; }
.station-dir { display: inline-flex; vertical-align: -0.12em; }
.station-dir svg { width: auto; height: 1.4rem; color: var(--accent); }
.station-brand { font-weight: var(--font-weight-semibold); color: var(--accent); margin-bottom: var(--space-xs); }
.station-icon { display: inline-flex; color: var(--text-muted); }
.station-icon svg { width: 1rem; height: 1rem; }
.station-report {
  display: inline-flex; background: none; border: none; padding: 0;
  color: var(--text-muted); cursor: pointer;
}
.station-report svg { width: 1rem; height: 1rem; }
.station-report:hover { color: var(--accent); }
.station-geo.uncertain { color: var(--text-main); }
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
.fuel-filters {
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-md);
  background: var(--color-surface-elevated);
}
.fuel-filter-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-sm) var(--space-md); }
.fuel-filter-row .form-control { width: auto; }
.fuel-open { display: inline-flex; align-items: center; gap: var(--space-xs); }
.brand-menu { position: relative; }
.brand-panel {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 10;
  min-width: 12rem; max-height: 14rem; overflow-y: auto;
  background: var(--color-surface-elevated);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  box-shadow: 0 4px 16px rgba(0, 0, 0, .25);
}
.brand-panel-actions { display: flex; gap: var(--space-sm); margin-bottom: var(--space-xs); }
.brand-panel-actions button {
  background: none; border: none; color: var(--accent);
  cursor: pointer; font-size: var(--font-size-sm); padding: 0;
}
.brand-item {
  display: flex; align-items: center; gap: var(--space-xs);
  font-size: var(--font-size-sm);
  padding: 2px 0; cursor: pointer; white-space: nowrap;
}
.brand-item input { accent-color: var(--accent); margin: 0; }
#brands-toggle .badge:empty { display: none; }
#brands-toggle .badge {
  background: var(--color-accent-soft);
  color: var(--accent);
  border-radius: var(--radius-pill);
  padding: 0 .45em;
  font-size: var(--font-size-xs);
}
.chevron { display: inline-block; transition: transform .15s; }
.chevron.open { transform: rotate(180deg); }
.fuel-count { font-size: var(--font-size-sm); color: var(--text-muted); margin: 0 0 var(--space-sm); }
.fuel-acc { font-size: var(--font-size-xs); color: var(--text-muted); margin: 0 0 var(--space-xs); }
.fuel-acc.warn { color: var(--color-warning); }
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
  private coords?: { lat: number; lon: number; acc?: number };
  private radiusKm = Settings.load().get('fuelRadiusKm') ?? 10;
  private readonly hiddenBrands = new Set(Settings.load().get('fuelHiddenBrands') ?? []);
  private hideUnbranded = Settings.load().get('fuelHideUnbranded') ?? false;
  private motorway: 'all' | 'motorway' | 'road' = Settings.load().get('fuelMotorway') ?? 'all';
  private openOnly = Settings.load().get('fuelOpenOnly') ?? false;
  private collapsed = Settings.load().get('fuelFiltersCollapsed') ?? false;
  /** Generation time (minutes, UTC) of the loaded stations file. */
  private dataTs?: number;

  constructor(private readonly host: HTMLElement) {
    componentStyles('fuel-stations', CSS);
  }

  render(): void {
    const radii = [5, 10, 20, 50];
    const units = activeUnits();
    // The stored radius stays metric; the option label converts to the
    // active unit system (5/10/20/50 km → 3/6/12/31 mi).
    const radiusLabel = (r: number): string => `${I18n.formatNumber(kmToDisplay(r, units), { maximumFractionDigits: 0 })} ${distanceUnit(units)}`;
    this.host.innerHTML = `
      <div class="fuel-screen" data-tool="stations">
        <div class="fuel-toolbar">
          <button class="btn-secondary" id="filters-toggle" aria-expanded="${!this.collapsed}">
            ${I18n.t('fuel.filters')} <span class="chevron${this.collapsed ? '' : ' open'}">▾</span>
          </button>
          <button class="btn-secondary" id="fuel-refresh" hidden>${I18n.t('fuel.refresh')}</button>
          <span id="fuel-data-ts" class="fuel-data-ts"></span>
        </div>
        <div class="fuel-filters" id="fuel-filters" ${this.collapsed ? 'hidden' : ''}>
          <div class="fuel-filter-row">
            <label for="fuel-radius">${I18n.t('fuel.radius')}
              <select id="fuel-radius" class="form-control">
                ${radii.map(r => `<option value="${r}" ${r === this.radiusKm ? 'selected' : ''}>${radiusLabel(r)}</option>`).join('')}
              </select></label>
            <label for="fuel-kind" class="fuel-kind" hidden>${I18n.t('fuel.fuelLabel')}
              <select id="fuel-kind" class="form-control"></select></label>
            <label for="fuel-mw">${I18n.t('fuel.mwLabel')}
              <select id="fuel-mw" class="form-control">
                <option value="all" ${this.motorway === 'all' ? 'selected' : ''}>${I18n.t('fuel.mwAll')}</option>
                <option value="motorway" ${this.motorway === 'motorway' ? 'selected' : ''}>${I18n.t('fuel.motorway')}</option>
                <option value="road" ${this.motorway === 'road' ? 'selected' : ''}>${I18n.t('fuel.mwRoad')}</option>
              </select></label>
            <label class="fuel-open"><input type="checkbox" id="fuel-open" ${this.openOnly ? 'checked' : ''}> ${I18n.t('fuel.openOnly')}</label>
            <div class="brand-menu" id="brand-menu" hidden>
              <button type="button" class="btn-secondary" id="brands-toggle" aria-expanded="false">
                ${I18n.t('fuel.brands')}<span id="brands-count" class="badge"></span> <span class="chevron">▾</span>
              </button>
              <div class="brand-panel" id="brand-panel" hidden>
                <div class="brand-panel-actions">
                  <button type="button" id="brands-all">${I18n.t('fuel.all')}</button>
                  <button type="button" id="brands-none">${I18n.t('fuel.selectNone')}</button>
                </div>
                <div id="brand-list"></div>
              </div>
            </div>
          </div>
        </div>
        <div id="fuel-body"></div>
        <p class="fuel-source">${I18n.t('fuel.source')}</p>
      </div>`;
    this.host.querySelector('#filters-toggle')!.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      Settings.load().set('fuelFiltersCollapsed', this.collapsed);
      (this.host.querySelector('#fuel-filters') as HTMLElement).hidden = this.collapsed;
      this.host.querySelector('#filters-toggle')!.setAttribute('aria-expanded', String(!this.collapsed));
      this.host.querySelector('#filters-toggle .chevron')!.classList.toggle('open', !this.collapsed);
    });
    this.host.querySelector('#fuel-radius')!.addEventListener('change', (e) => {
      this.radiusKm = Number((e.target as HTMLSelectElement).value);
      Settings.load().set('fuelRadiusKm', this.radiusKm);
      if (this.coords) void this.fetchStations(this.coords.lat, this.coords.lon, this.coords.acc);
    });
    this.host.querySelector('#fuel-refresh')!.addEventListener('click', () => this.refresh());
    this.host.querySelector('#fuel-kind')!.addEventListener('change', (e) => {
      this.selectedFuel = (e.target as HTMLSelectElement).value;
      Settings.load().set('fuelKind', this.selectedFuel);
      this.renderStations();
    });
    this.host.querySelector('#fuel-mw')!.addEventListener('change', (e) => {
      this.motorway = (e.target as HTMLSelectElement).value as FuelStationsView['motorway'];
      Settings.load().set('fuelMotorway', this.motorway);
      this.renderStations();
    });
    this.host.querySelector('#fuel-open')!.addEventListener('change', (e) => {
      this.openOnly = (e.target as HTMLInputElement).checked;
      Settings.load().set('fuelOpenOnly', this.openOnly);
      this.renderStations();
    });
    this.host.querySelector('#brands-toggle')!.addEventListener('click', () => {
      this.toggleBrandPanel();
    });
    this.host.querySelector('#brands-all')!.addEventListener('click', () => {
      this.hiddenBrands.clear();
      this.hideUnbranded = false;
      this.persistBrands();
      this.renderBrandFilter();
      this.renderStations();
    });
    this.host.querySelector('#brands-none')!.addEventListener('click', () => {
      for (const b of this.brandNames()) this.hiddenBrands.add(b);
      this.hideUnbranded = true;
      this.persistBrands();
      this.renderBrandFilter();
      this.renderStations();
    });
    // Delegated on the stable container — station cards are re-rendered
    // into #fuel-body without re-binding their buttons.
    this.host.querySelector('#fuel-body')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('.station-report');
      if (btn === null) return;
      const s = this.stations.find(st => st.id === Number(btn.dataset.id));
      if (s !== undefined) StationReportDialog.show(s, this.dataTs);
    });
    this.locate();
  }

  /** False once the screen has been wiped/remounted — stale async
   *  continuations (geolocation, cache, download) must then bail out. */
  private get mounted(): boolean {
    return this.host.isConnected && this.host.querySelector('#fuel-body') !== null;
  }

  private status(html: string): void {
    if (!this.mounted) return;
    (this.host.querySelector('#fuel-body') as HTMLElement).innerHTML = `<p class="fuel-status">${html}</p>`;
  }

  private locate(): void {
    this.status(escapeHtml(I18n.t('fuel.locating')));
    if (!('geolocation' in navigator)) {
      this.showError();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => { void this.fetchStations(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy); },
      () => this.showError(),
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  private showError(): void {
    this.status(`${escapeHtml(I18n.t('fuel.geoDenied'))}<br><button class="btn-primary" id="fuel-retry">${I18n.t('fuel.retry')}</button>`);
    this.host.querySelector('#fuel-retry')?.addEventListener('click', () => this.locate());
  }

  private async fetchStations(lat: number, lon: number, acc?: number): Promise<void> {
    this.coords = { lat, lon, acc };
    this.status(escapeHtml(I18n.t('fuel.loading')));
    try {
      // Whatever is cached is used as-is — the file only refreshes at
      // startup (stale) or through the explicit Refresh button.
      const data = await loadFuelData();
      this.dataTs = data.ts;
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
      this.dataTs = data.ts;
      this.stations = nearestStations(data.stations, this.coords, this.radiusKm);
      this.showResults();
    } catch {
      if (this.mounted) {
        this.status(`${escapeHtml(I18n.t('fuel.loadError'))}<br><button class="btn-primary" id="fuel-retry">${I18n.t('fuel.retry')}</button>`);
        this.host.querySelector('#fuel-retry')?.addEventListener('click', () => this.refresh());
      }
    }
  }

  private showResults(): void {
    if (!this.mounted) return;
    const fuels = orderedFuelNames(this.stations);
    if (fuels.length > 0 && !fuels.includes(this.selectedFuel)) this.selectedFuel = fuels[0];
    const select = this.host.querySelector<HTMLSelectElement>('#fuel-kind')!;
    select.innerHTML = fuels.map(f => `<option value="${f}" ${f === this.selectedFuel ? 'selected' : ''}>${f}</option>`).join('');
    select.parentElement!.hidden = fuels.length === 0;
    const refreshBtn = this.host.querySelector('#fuel-refresh') as HTMLButtonElement;
    refreshBtn.hidden = false;
    // Global data timestamp next to the button; the hourly pipeline makes
    // a refresh pointless while the file is less than an hour old.
    const tsEl = this.host.querySelector('#fuel-data-ts') as HTMLElement;
    if (this.dataTs) {
      tsEl.textContent = I18n.t('fuel.dataFrom', {
        date: new Date(this.dataTs * 60000).toLocaleString(I18n.locale, { dateStyle: 'short', timeStyle: 'short' })
      });
      const ageH = (Date.now() - this.dataTs * 60000) / 3600000;
      const fresh = ageH <= 1;
      refreshBtn.disabled = fresh;
      refreshBtn.title = fresh ? I18n.t('fuel.refreshFresh') : '';
    } else {
      tsEl.textContent = '';
      refreshBtn.disabled = false;
    }
    this.renderBrandFilter();
    this.renderStations();
  }

  /** Distinct brand names present in the current results, sorted. */
  private brandNames(): string[] {
    return [...new Set(this.stations.map(s => s.brand).filter((b): b is string => b !== undefined))]
      .sort((a, b) => a.localeCompare(b));
  }

  private persistBrands(): void {
    const settings = Settings.load();
    settings.set('fuelHiddenBrands', [...this.hiddenBrands]);
    settings.set('fuelHideUnbranded', this.hideUnbranded);
  }

  /** Clicking outside the menu closes it (clicks inside keep it open —
   *  the panel is a multi-select, not a one-shot picker). Attached only
   *  while the panel is open, so dead view instances don't leak listeners. */
  private readonly closeBrandPanelOnOutside = (e: MouseEvent): void => {
    const menu = this.host.querySelector('#brand-menu');
    if (menu !== null && !menu.contains(e.target as Node)) this.setBrandPanel(false);
  };

  private toggleBrandPanel(): void {
    const panel = this.host.querySelector('#brand-panel') as HTMLElement;
    this.setBrandPanel(panel.hidden !== false);
  }

  private setBrandPanel(open: boolean): void {
    const panel = this.host.querySelector('#brand-panel') as HTMLElement | null;
    if (panel === null) return;
    panel.hidden = !open;
    const toggle = this.host.querySelector('#brands-toggle')!;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.chevron')!.classList.toggle('open', open);
    if (open) {
      document.addEventListener('click', this.closeBrandPanelOnOutside);
    } else {
      document.removeEventListener('click', this.closeBrandPanelOnOutside);
    }
  }

  /** Brand checkboxes (one per brand + "unbranded") — rebuilt each time
   *  stations are (re)loaded; checked state survives via hiddenBrands. */
  private renderBrandFilter(): void {
    if (!this.mounted) return;
    const brands = this.brandNames();
    const hasUnbranded = this.stations.some(s => s.brand === undefined);
    (this.host.querySelector('#brand-menu') as HTMLElement).hidden = brands.length === 0 && !hasUnbranded;
    const row = (key: string, label: string, hidden: boolean): string =>
      `<label class="brand-item"><input type="checkbox" data-brand="${escapeHtml(key)}"${hidden ? '' : ' checked'}> ${escapeHtml(label)}</label>`;
    const list = this.host.querySelector('#brand-list') as HTMLElement;
    list.innerHTML = brands.map(b => row(b, b, this.hiddenBrands.has(b))).join('')
      + (hasUnbranded ? row('', I18n.t('fuel.unbranded'), this.hideUnbranded) : '');
    // Badge: selected/total among the brands present in the results
    // (stale hidden entries outside the results don't count).
    const total = brands.length + (hasUnbranded ? 1 : 0);
    const hiddenHere = brands.filter(b => this.hiddenBrands.has(b)).length + (this.hideUnbranded ? 1 : 0);
    const badge = this.host.querySelector('#brands-count') as HTMLElement;
    badge.textContent = ` ${total - hiddenHere}/${total}`;
    badge.title = hiddenHere > 0 ? I18n.t('fuel.brandsHidden', { count: hiddenHere }) : '';
    list.querySelectorAll<HTMLInputElement>('input').forEach(cb => {
      cb.addEventListener('change', () => {
        const key = cb.dataset.brand!;
        if (key === '') this.hideUnbranded = !cb.checked;
        else if (cb.checked) this.hiddenBrands.delete(key);
        else this.hiddenBrands.add(key);
        this.persistBrands();
        this.renderBrandFilter(); // refresh the badge
        this.renderStations();
      });
    });
  }

  /** Whether the station sells the selected fuel (priced, or out of stock
   *  but normally available) — the eligibility baseline, not a filter. */
  private sellsFuel(s: NearbyStation): boolean {
    return s.prices.some(p => p.name === this.selectedFuel) || s.soldOut.has(this.selectedFuel);
  }

  private passesFilters(s: NearbyStation, now: Date): boolean {
    if (this.motorway === 'motorway' && !s.motorway) return false;
    if (this.motorway === 'road' && s.motorway) return false;
    if (s.brand !== undefined ? this.hiddenBrands.has(s.brand) : this.hideUnbranded) return false;
    if (this.openOnly && !isOpenAt(s.week, s.h24, now)) return false;
    return true;
  }

  private priceOf(s: NearbyStation, fuel: string): number | undefined {
    return s.prices.find(p => p.name === fuel && !s.soldOut.has(fuel))?.euros;
  }

  /** Today's schedule text — '' when nothing is published for today.
   *  `now` is the timestamp shared by the whole render (filters + cards),
   *  so all decisions use the same day even across midnight. */
  private todayHours(week: DayHours[] | undefined, now: Date): string {
    if (!week) return '';
    // JS getDay(): 0=Sun..6=Sat → index 0=Mon..6=Sun.
    const day = week[(now.getDay() + 6) % 7];
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
    if (!this.mounted) return;
    const units = activeUnits();
    const radiusDist = formatDistance(this.radiusKm, units);
    const now = new Date();
    // Two-step: eligibility = sells the selected fuel; filters = the
    // explicit user filters (brands, location, open-only).
    const eligible = this.stations.filter(s => this.sellsFuel(s));
    const filtered = eligible.filter(s => this.passesFilters(s, now));
    const sorted = [...filtered].sort((a, b) => {
      const pa = this.priceOf(a, this.selectedFuel) ?? Number.POSITIVE_INFINITY;
      const pb = this.priceOf(b, this.selectedFuel) ?? Number.POSITIVE_INFINITY;
      return pa === pb ? a.km - b.km : pa - pb;
    });
    const body = this.host.querySelector('#fuel-body') as HTMLElement;
    if (this.stations.length === 0) {
      body.innerHTML = `<p class="fuel-status">${I18n.t('fuel.none', { dist: radiusDist })}</p>`;
      return;
    }
    if (filtered.length === 0) {
      const msg = eligible.length === 0
        ? I18n.t('fuel.noFuel', { dist: radiusDist })
        : I18n.t('fuel.noneFiltered');
      body.innerHTML = `<p class="fuel-status">${msg}</p>`;
      return;
    }
    const count = I18n.t('fuel.found', { shown: Math.min(filtered.length, MAX_RESULTS), count: filtered.length, dist: radiusDist });
    // Position accuracy is shown only from 500 m up — below that it adds
    // no information; an amber tone flags accuracy worse than the radius.
    const acc = this.coords?.acc;
    const accNote = acc === undefined || acc < 500 ? ''
      : `<p class="fuel-acc${acc > this.radiusKm * 1000 ? ' warn' : ''}">${
          I18n.t('fuel.accuracy', { dist: `${I18n.formatNumber(kmToDisplay(acc / 1000, units), { maximumFractionDigits: 1 })} ${distanceUnit(units)}` })
        }</p>`;
    body.innerHTML = `
      ${accNote}
      <p class="fuel-count">${count}</p>
      ${sorted.slice(0, MAX_RESULTS).map(s => this.stationCard(s, units, now)).join('')}`;
  }

  private stationCard(s: NearbyStation, units: ReturnType<typeof activeUnits>, now: Date): string {
    const chips = [
      ...s.prices.map(p => {
        const cls = `${p.name === this.selectedFuel && !s.soldOut.has(p.name) ? ' sel' : ''}${s.soldOut.has(p.name) ? ' out' : ''}`;
        return `<span class="fuel-chip${cls}">${escapeHtml(p.name)} ${formatFuelPrice(p.euros, units)}</span>`;
      }),
      ...[...s.soldOut].filter(n => !s.prices.some(p => p.name === n))
        .map(n => `<span class="fuel-chip out">${escapeHtml(n)} ${I18n.t('fuel.soldOut')}</span>`)
    ].join('');
    const latest = s.prices.map(p => p.updated).filter(d => d !== '').sort((a, b) => a.localeCompare(b)).pop();
    const dist = `${I18n.formatNumber(kmToDisplay(s.km, units), { maximumFractionDigits: 1 })} ${distanceUnit(units)}`;
    // Compass arrow rotated to the station's bearing — the letter code
    // stays available as a tooltip.
    const deg = this.coords === undefined ? undefined : bearingDeg(this.coords, s);
    const dir = deg === undefined ? ''
      : ` <span class="station-dir" title="${I18n.t('fuel.dirs').split(' ')[Math.round(deg / 22.5) % 16]}">${dirIcon(deg)}</span>`;
    const hours = s.h24 ? '' : this.todayHours(s.week, now);
    // Closed now, or the selected fuel out of stock → dimmed card.
    const dimmed = !isOpenAt(s.week, s.h24, now)
      || s.soldOut.has(this.selectedFuel);
    return `<article class="station-card${dimmed ? ' dimmed' : ''}">
      ${s.brand !== undefined ? `<div class="station-brand">${escapeHtml(s.brand)}</div>` : ''}
      <div class="station-head">
        <span class="station-addr">${escapeHtml(s.address)}</span>
        ${s.h24 ? `<span class="station-h24">${I18n.t('fuel.h24')}</span>` : ''}
        ${s.motorway ? `<span class="station-icon" title="${I18n.t('fuel.motorway')}">${MOTORWAY_ICON}</span>` : ''}
        ${s.geoUncertain
          ? `<a class="station-geo uncertain" href="geo:${s.lat},${s.lon}" title="${I18n.t('fuel.geoUncertain')} — ${I18n.t('fuel.openMap')}">${GEO_UNCERTAIN_ICON}</a>`
          : `<a class="station-geo" href="geo:${s.lat},${s.lon}" title="${I18n.t('fuel.openMap')}">${GEO_ICON}</a>`}
        <span class="station-dist">${dist}${dir}</span>
      </div>
      ${hours ? `<div class="station-hours">${hours}</div>` : ''}
      <div class="station-prices">${chips}</div>
      <div class="station-updated">${latest ? `${I18n.t('fuel.updatedAt', { date: new Date(latest).toLocaleString(I18n.locale, { dateStyle: 'short', timeStyle: 'short' }) })} ` : ''}<button type="button" class="station-report" data-id="${s.id}" title="${escapeHtml(I18n.t('fuel.reportTitle'))}" aria-label="${escapeHtml(I18n.t('fuel.reportTitle'))}">${REPORT_ICON}</button></div>
    </article>`;
  }
}
