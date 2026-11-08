import { I18n } from '../core/I18n.js';
import { formatDistance, activeUnits } from '../core/units.js';
import type { AppStore, AppState } from '../core/AppStore.js';
import type { StorageManager, ProviderName } from 'ts-cloud-storage-manager';
import type { Vehicle } from '../domain/Vehicle.js';
import { componentStyles } from './componentStyles.js';
import { escapeHtml } from './format.js';
import { VehicleDetailView } from './VehicleDetailView.js';
import type { CostSubTab, Tab } from './VehicleDetailView.js';
import { SimulatorView } from './SimulatorView.js';
import { FuelStationsView } from './FuelStationsView.js';
import { ADD_ICON, CAR_ICON, VAN_ICON, MOTORCYCLE_ICON, SETTINGS_ICON, LOGOUT_ICON, SIMULATOR_ICON, IMPORT_ICON, EXPORT_ICON, FUEL_ICON, BATTERY_ICON, MENU_ICON, HELP_ICON, VEHICLES_ICON } from './icons.js';

const CSS = `
.vehicle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-md);
}
.vehicle-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  cursor: pointer;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}
.vehicle-card:hover {
  border-color: var(--accent);
}
.vehicle-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}
.vehicle-card-icon { display: inline-flex; color: var(--text-main); }
.vehicle-card-icon svg { width: 2.6rem; height: 2.6rem; }
.vehicle-card-name {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.vehicle-card-meta {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
.vehicle-energy-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  padding: 2px var(--space-sm);
  border-radius: var(--radius-pill);
  background: var(--color-accent-soft);
  color: var(--accent);
  white-space: nowrap;
}
.vehicle-energy-chip svg { width: 1.1rem; height: 1.1rem; }
.vehicle-add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  min-height: 7rem;
  border-style: dashed;
  color: var(--text-muted);
}
.vehicle-add-card:hover { color: var(--accent); }
.vehicle-add-icon svg { width: 28px; height: 28px; }
.breadcrumb {
  padding: var(--space-xs) var(--space-md) 0;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}
.breadcrumb + .main-content { padding-top: var(--space-sm); }
.breadcrumb a { color: var(--accent); text-decoration: none; cursor: pointer; }
.breadcrumb a:hover { text-decoration: underline; }
.breadcrumb .bc-sep { margin: 0 var(--space-xs); }
/* While a vehicle detail is open, the content area must not scroll — the
   detail page manages its own internal scroll region. */
.main-content.detail-mode { overflow: hidden; }
.inspection-chip {
  display: inline-block;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.inspection-chip.ok { background: rgba(16, 185, 129, 0.15); color: var(--color-ok); }
.inspection-chip.soon { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
.inspection-chip.overdue { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
.inspection-chip.none { background: var(--hover-bg); color: var(--text-muted); }
.connect-card {
  max-width: 28rem;
  margin: var(--space-xl) auto;
  text-align: center;
}
.connect-card .provider-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin: var(--space-lg) 0;
}
.connect-card .demo-link {
  display: inline-block;
  margin-top: var(--space-sm);
  color: var(--accent);
  text-decoration: none;
}
.connect-error {
  color: var(--danger);
  margin-bottom: var(--space-md);
}
/* Provider buttons may carry a note in their bottom-right corner —
   symmetric block padding keeps the label vertically centered. */
.provider-btn {
  position: relative;
  padding-block: 1.5rem;
}
.provider-btn .btn-note {
  position: absolute;
  right: 0.6rem;
  bottom: 0.3rem;
  font-size: var(--font-size-xs);
  font-weight: normal;
  opacity: 0.75;
}
.empty-state {
  text-align: center;
  color: var(--text-muted);
  padding: var(--space-2xl) 0;
}
`;

const VEHICLE_TYPE_ICONS: Record<string, string> = {
  car: CAR_ICON,
  utility: VAN_ICON,
  motorcycle: MOTORCYCLE_ICON
};

/** Energy stream icons shown on the card's chip (hybrid shows both). */
const ENERGY_STREAM_ICONS: Record<string, string> = {
  fuel: FUEL_ICON,
  electric: BATTERY_ICON,
  hybrid: `${FUEL_ICON}${BATTERY_ICON}`
};

/** The screen currently occupying the content area — driven by the URL. */
type Screen = { kind: 'list' } | { kind: 'vehicle'; id: string } | { kind: 'simulator' } | { kind: 'stations' };

export class DashboardView {
  /** The provider picker hands the picked name here (wired by main.ts). */
  onProviderPick?: (name: ProviderName) => Promise<void>;
  /** Clicked vehicle cards surface here (wired by main.ts → navigate). */
  onVehicleOpen?: (id: string) => void;
  /** Back to the vehicle list (breadcrumb, toolbar icon). */
  onHome?: () => void;
  /** The open vehicle id is unknown — main.ts normalizes the URL. */
  onVehicleGone?: () => void;
  onVehicleAdd?: () => void;
  onLogout?: () => void;
  onDemo?: () => void;
  onSimulator?: () => void;
  onStations?: () => void;
  onSettings?: () => void;
  /** Help button — receives the active screen kind so main.ts can point
   *  to the matching help chapter. */
  onHelp?: (kind: Screen['kind']) => void;
  onImport?: () => void;
  onExport?: () => void;

  private readonly root: HTMLElement;
  private readonly store: AppStore;
  private readonly storage: StorageManager;
  private loading = false;
  private connectFailed = false;
  /** The "early version" banner once dismissed — session-only, a reload
   *  shows it again. */
  private prelimDismissed = false;
  /** Provider names shown disabled in the picker — wired by main.ts
   *  (e.g. a provider whose OAuth app is not registered yet). */
  comingSoonProviders: ReadonlySet<string> = new Set();

  constructor(root: HTMLElement, store: AppStore, storage: StorageManager) {
    this.root = root;
    this.store = store;
    this.storage = storage;
    componentStyles('dashboard', CSS);
  }

  /** Static shell — banner slots + top bar + content host. */
  renderShell(): void {
    this.root.innerHTML = `
      <div id="demo-banner-root"></div>
      <div id="sync-banner-root"></div>
      <header class="top-bar">
        <div class="top-bar-menu" id="top-bar-menu"></div>
        <h1><img src="favicon.svg" class="top-bar-logo" alt="">${I18n.t('app.title')}</h1>
        <div class="top-bar-actions" id="top-bar-actions"></div>
      </header>
      <nav class="breadcrumb" id="breadcrumb-root" hidden></nav>
      <main class="main-content" id="dashboard-content"></main>`;
    this.renderTopBarActions();
  }

  private renderTopBarActions(): void {
    const host = this.root.querySelector('#top-bar-actions');
    if (!host) return;
    const authed = this.store.state.isAuthenticated;
    // A screen's own toolbar icon is hidden while that screen is shown —
    // the "vehicles" icon covers every non-vehicle screen.
    const inVehicle = this.screen.kind === 'list' || this.screen.kind === 'vehicle';
    const homeBtn = inVehicle ? ''
      : `<button id="nav-home" class="btn-secondary" title="${I18n.t('nav.vehicles')}">${VEHICLES_ICON}</button>`;
    const simBtn = this.screen.kind === 'simulator' ? ''
      : `<button id="simulator" class="btn-secondary" title="${I18n.t('sim.button')}">${SIMULATOR_ICON}</button>`;
    const stationsBtn = this.screen.kind === 'stations' ? ''
      : `<button id="stations" class="btn-secondary" title="${I18n.t('nav.stations')}">${FUEL_ICON}</button>`;
    const logoutBtn = authed ? `<button id="logout" class="btn-secondary" title="${I18n.t('vehicles.logout')}">${LOGOUT_ICON}</button>` : '';
    const ioBtns = authed
      ? `<button id="export" class="btn-secondary" title="${I18n.t('tools.export')}">${EXPORT_ICON}</button>
         <button id="import" class="btn-secondary" title="${I18n.t('tools.import')}">${IMPORT_ICON}</button>`
      : '';
    host.innerHTML = `
      ${homeBtn}
      ${simBtn}
      ${stationsBtn}
      ${ioBtns}
      <button id="settings" class="btn-secondary" title="${I18n.t('tools.settings')}">${SETTINGS_ICON}</button>
      <button id="help" class="btn-secondary" title="${I18n.t('tools.help')}">${HELP_ICON}</button>
      ${logoutBtn}`;
    host.querySelector('#nav-home')?.addEventListener('click', () => this.onHome?.());
    host.querySelector('#simulator')?.addEventListener('click', () => this.onSimulator?.());
    host.querySelector('#stations')?.addEventListener('click', () => this.onStations?.());
    host.querySelector('#export')?.addEventListener('click', () => this.onExport?.());
    host.querySelector('#import')?.addEventListener('click', () => this.onImport?.());
    host.querySelector('#settings')?.addEventListener('click', () => this.onSettings?.());
    host.querySelector('#help')?.addEventListener('click', () => this.onHelp?.(this.screen.kind));
    host.querySelector('#logout')?.addEventListener('click', () => this.onLogout?.());

    // Mobile menu — same actions, labelled with the button tooltips; all
    // items stay listed, grouped by kind with separators between groups.
    const menuHost = this.root.querySelector('#top-bar-menu');
    if (menuHost) {
      const groups = [
        [
          { id: 'home', icon: VEHICLES_ICON, label: I18n.t('nav.vehicles') },
          { id: 'simulator', icon: SIMULATOR_ICON, label: I18n.t('sim.button') },
          { id: 'stations', icon: FUEL_ICON, label: I18n.t('nav.stations') }
        ],
        ...(authed ? [[
          { id: 'export', icon: EXPORT_ICON, label: I18n.t('tools.export') },
          { id: 'import', icon: IMPORT_ICON, label: I18n.t('tools.import') }
        ]] : []),
        [
          { id: 'settings', icon: SETTINGS_ICON, label: I18n.t('tools.settings') },
          { id: 'help', icon: HELP_ICON, label: I18n.t('tools.help') }
        ],
        ...(authed ? [[{ id: 'logout', icon: LOGOUT_ICON, label: I18n.t('vehicles.logout') }]] : [])
      ];
      const itemHtml = (i: { id: string; icon: string; label: string }): string =>
        `<button class="menu-item" data-action="${i.id}">${i.icon}<span>${i.label}</span></button>`;
      menuHost.innerHTML = `
        <button id="menu-btn" class="btn-secondary" title="Menu">${MENU_ICON}</button>
        <div class="menu-dropdown" hidden>
          ${groups.map(g => g.map(itemHtml).join('')).join('<div class="menu-sep"></div>')}
        </div>`;
      const dropdown = menuHost.querySelector<HTMLElement>('.menu-dropdown')!;
      const btn = menuHost.querySelector('#menu-btn')!;
      const closeMenu = (): void => { dropdown.hidden = true; document.removeEventListener('click', onDocClick); };
      const onDocClick = (e: Event): void => {
        if (!menuHost.contains(e.target as Node)) closeMenu();
      };
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdown.hidden) {
          dropdown.hidden = false;
          document.addEventListener('click', onDocClick);
        } else {
          closeMenu();
        }
      });
      dropdown.querySelectorAll<HTMLElement>('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
          closeMenu();
          this.onMenuAction?.(item.dataset.action ?? '');
        });
      });
    }
  }

  /** Dispatches a mobile-menu action to the same callbacks as the buttons. */
  private onMenuAction(action: string): void {
    const handlers: Record<string, (() => void) | undefined> = {
      home: this.onHome,
      simulator: this.onSimulator,
      stations: this.onStations,
      export: this.onExport,
      import: this.onImport,
      settings: this.onSettings,
      help: () => this.onHelp?.(this.screen.kind),
      logout: this.onLogout
    };
    handlers[action]?.();
  }

  /** Top strips: the always-on "early version" banner plus the
   *  demo/read-only banner while the active provider is read-only. */
  renderDemoBanner(): void {
    const host = this.root.querySelector('#demo-banner-root');
    if (!host) return;
    const demo = this.storage.currentProvider.isReadOnly()
      ? `<div class="demo-banner">${I18n.t('demo.banner')}</div>`
      : '';
    const close = I18n.t('common.close');
    const prelim = this.prelimDismissed ? ''
      : `<div class="demo-banner">${I18n.t('app.preliminary')}<button class="banner-close" title="${close}" aria-label="${close}">×</button></div>`;
    host.innerHTML = `${prelim}${demo}`;
    host.querySelector('.banner-close')?.addEventListener('click', () => {
      this.prelimDismissed = true;
      this.renderDemoBanner();
    });
  }

  showLoading(isLoading: boolean): void {
    this.loading = isLoading;
    if (isLoading) {
      // Tool screens (simulator, stations) don't depend on the session —
      // they stay mounted while auth resolves in the background; only
      // auth-dependent content is replaced by the connecting placeholder.
      if (this.screen.kind === 'simulator' || this.screen.kind === 'stations') return;
      const content = this.root.querySelector('#dashboard-content');
      if (content) content.innerHTML = `<p class="empty-state">${I18n.t('auth.connecting')}</p>`;
    }
  }

  showConnectFailed(): void {
    this.connectFailed = true;
    this.showProviderPicker();
  }

  /** The unauthenticated screen: provider picker + demo entry. */
  showProviderPicker(): void {
    const content = this.root.querySelector('#dashboard-content');
    if (!content) return;
    const providers = this.storage.availableProviders();
    content.innerHTML = `
      <div class="card connect-card">
        <h2>${I18n.t('auth.chooseProvider')}</h2>
        ${this.connectFailed ? `<p class="connect-error">${I18n.t('auth.connectFailed')}</p>` : ''}
        <div class="provider-buttons">
          ${providers.map(p => {
            const soon = this.comingSoonProviders.has(p.name);
            const note = soon ? `<span class="btn-note">${I18n.t('auth.comingSoon')}</span>` : '';
            return `<button class="btn-primary provider-btn" data-provider="${p.name}" ${soon ? 'disabled' : ''}>${p.label}${note}</button>`;
          }).join('')}
        </div>
        <a href="#" class="demo-link" id="demo-entry">${I18n.t('landing.tryDemo')}</a>
      </div>`;
    content.querySelectorAll<HTMLButtonElement>('[data-provider]').forEach(btn => {
      btn.addEventListener('click', () => this.onProviderPick?.(btn.dataset.provider as ProviderName));
    });
    content.querySelector('#demo-entry')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.onDemo?.();
    });
  }

  private screen: Screen = { kind: 'list' };
  /** Language+units the mounted tool screen was rendered with — a
   *  settings change remounts it so its labels refresh. */
  private toolRenderKey?: string;
  private detailView?: VehicleDetailView;

  /** Vehicle list screen — `/app/`. */
  showList(): void {
    this.screen = { kind: 'list' };
    this.render(this.store.state);
  }

  /** Vehicle detail screen — `/app/veh/<id>`; unknown ids fall back to
   *  the list (and the URL is normalized through onVehicleGone). */
  showVehicleById(id: string): void {
    this.screen = { kind: 'vehicle', id };
    this.render(this.store.state);
  }

  /** Simulator screen — `/app/calc`; usable without an account. */
  showSimulator(): void {
    this.screen = { kind: 'simulator' };
    this.render(this.store.state);
  }

  /** Fuel stations screen — `/app/fuel`; usable without an account. */
  showStations(): void {
    this.screen = { kind: 'stations' };
    this.render(this.store.state);
  }

  /** Shows a vehicle detail page with breadcrumb "Véhicules / name". */
  private showVehicle(vehicle: Vehicle, tab?: Tab, costSubTab?: CostSubTab): void {
    const bc = this.root.querySelector('#breadcrumb-root') as HTMLElement;
    bc.hidden = false;
    bc.innerHTML = `<a id="bc-list">${I18n.t('nav.vehicles')}</a><span class="bc-sep">/</span><span>${escapeHtml(vehicle.name)}</span>`;
    bc.querySelector('#bc-list')!.addEventListener('click', () => this.onHome?.());
    const content = this.root.querySelector('#dashboard-content') as HTMLElement;
    content.classList.add('detail-mode');
    this.detailView = new VehicleDetailView(content, this.store, vehicle, tab, costSubTab);
    this.detailView.render();
  }

  /** Tool screen host (simulator, stations): no vehicle breadcrumb —
   *  the toolbar "vehicles" icon is the way back. The tool is re-mounted
   *  only when its marker disappeared: state:changed re-renders keep it
   *  (typed fields, results survive), while a showLoading wipe or a
   *  screen change rebuilds it. */
  private renderTool(kind: 'simulator' | 'stations', mount: (content: HTMLElement) => void): void {
    const bc = this.root.querySelector('#breadcrumb-root') as HTMLElement;
    bc.hidden = true;
    bc.innerHTML = '';
    const content = this.root.querySelector('#dashboard-content') as HTMLElement;
    content.classList.remove('detail-mode');
    // A language/units change also remounts — the tool's labels were
    // rendered with the previous settings and state:changed keeps the DOM.
    const renderKey = `${I18n.language}|${activeUnits()}`;
    if ((content.firstElementChild as HTMLElement | null)?.dataset.tool !== kind
      || this.toolRenderKey !== renderKey) {
      mount(content);
      this.toolRenderKey = renderKey;
    }
  }

  render(state: AppState): void {
    if (!this.root.querySelector('#dashboard-content')) this.renderShell();
    this.renderDemoBanner();
    this.renderTopBarActions();
    if (this.loading) return;
    const screen = this.screen;
    // Tool screens are usable without an account.
    if (screen.kind === 'simulator') {
      this.renderTool('simulator', c => new SimulatorView(c).render());
      return;
    }
    if (screen.kind === 'stations') {
      this.renderTool('stations', c => new FuelStationsView(c).render());
      return;
    }
    if (!state.isAuthenticated) {
      // Keep the requested screen — a deep link resumes after login.
      this.detailView = undefined;
      const bc = this.root.querySelector('#breadcrumb-root') as HTMLElement;
      bc.hidden = true;
      bc.innerHTML = '';
      this.showProviderPicker();
      return;
    }
    // A detail page stays open across state changes (saves) — the list is
    // only shown again when the vehicle disappears (deleted remotely).
    if (screen.kind === 'vehicle') {
      const vehicle = state.vehicles.find(v => v.id === screen.id);
      if (vehicle) {
        this.showVehicle(vehicle, this.detailView?.currentTab, this.detailView?.currentCostSubTab);
        return;
      }
      this.screen = { kind: 'list' };
      if (this.onVehicleGone) {
        this.onVehicleGone();
        return;
      }
    }
    this.detailView = undefined;
    const bc = this.root.querySelector('#breadcrumb-root') as HTMLElement | null;
    if (bc) { bc.hidden = true; bc.innerHTML = ''; }
    this.root.querySelector('#dashboard-content')?.classList.remove('detail-mode');
    this.connectFailed = false;
    const content = this.root.querySelector('#dashboard-content');
    if (!content) return;
    if (state.vehicles.length === 0) {
      content.innerHTML = `
        <p class="empty-state">${I18n.t('vehicles.empty')}</p>
        <div class="vehicle-grid">
          ${this.addCardHtml()}
        </div>`;
    } else {
      content.innerHTML = `
        <div class="vehicle-grid">
          ${state.vehicles.map(v => this.cardHtml(v)).join('')}
          ${this.addCardHtml()}
        </div>`;
    }
    content.querySelectorAll<HTMLElement>('.vehicle-card').forEach(card => {
      card.addEventListener('click', () => this.onVehicleOpen?.(card.dataset.vehicleId!));
    });
    content.querySelector('#add-vehicle')?.addEventListener('click', () => this.onVehicleAdd?.());
  }

  /** Dashed "add" card sitting in the grid next to the vehicles. */
  private addCardHtml(): string {
    return `
      <article class="vehicle-card vehicle-add-card" id="add-vehicle">
        <span class="vehicle-add-icon">${ADD_ICON}</span>
        <span class="vehicle-card-meta">${I18n.t('vehicles.add')}</span>
      </article>`;
  }

  private cardHtml(vehicle: Vehicle): string {
    const icon = VEHICLE_TYPE_ICONS[vehicle.data.vehicleType] ?? CAR_ICON;
    const units = activeUnits();
    const odometer = vehicle.lastKnownOdometerKm();
    const energy = ENERGY_STREAM_ICONS[vehicle.data.energyType] ?? '';
    return `
      <article class="vehicle-card" data-vehicle-id="${vehicle.id}">
        <div class="vehicle-card-header">
          <span class="vehicle-card-icon">${icon}</span>
          <h3 class="vehicle-card-name">${escapeHtml(vehicle.name)}</h3>
          <span class="vehicle-energy-chip">${energy}</span>
        </div>
        <div class="vehicle-card-meta">
          <span>${odometer !== undefined ? formatDistance(odometer, units) : '—'}</span>
          ${this.inspectionChipHtml(vehicle)}
        </div>
      </article>`;
  }

  /** Inspection due-date chip: green ok / amber soon / red overdue. */
  private inspectionChipHtml(vehicle: Vehicle): string {
    const status = vehicle.inspectionStatus();
    const next = vehicle.nextInspectionDate();
    let text: string;
    if (status === 'none') {
      text = I18n.t('vehicles.inspection.none');
    } else {
      const key = status === 'overdue' ? 'vehicles.inspection.overdue' : 'vehicles.inspection.due';
      text = I18n.t(key, { date: I18n.formatDate(next!) });
    }
    return `<span class="inspection-chip ${status}">${text}</span>`;
  }
}
