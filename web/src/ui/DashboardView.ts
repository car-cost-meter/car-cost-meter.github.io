import { I18n } from '../core/I18n.js';
import { formatDistance, defaultUnits } from '../core/units.js';
import type { AppStore, AppState } from '../core/AppStore.js';
import type { StorageManager, ProviderName } from 'ts-cloud-storage-manager';
import type { Vehicle } from '../domain/Vehicle.js';
import { componentStyles } from './componentStyles.js';
import { VehicleDetailView } from './VehicleDetailView.js';
import { ADD_ICON, CAR_ICON, VAN_ICON, MOTORCYCLE_ICON, SETTINGS_ICON, LOGOUT_ICON, SIMULATOR_ICON, IMPORT_ICON, EXPORT_ICON, FUEL_ICON, BATTERY_ICON, MENU_ICON, HELP_ICON } from './icons.js';

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

export class DashboardView {
  /** The provider picker hands the picked name here (wired by main.ts). */
  onProviderPick?: (name: ProviderName) => Promise<void>;
  /** Clicked vehicle cards surface here (wired by main.ts → detail view). */
  onVehicleOpen?: (id: string) => void;
  onVehicleAdd?: () => void;
  onLogout?: () => void;
  onDemo?: () => void;
  onSimulator?: () => void;
  onSettings?: () => void;
  onHelp?: () => void;
  onImport?: () => void;
  onExport?: () => void;

  private root: HTMLElement;
  private store: AppStore;
  private storage: StorageManager;
  private loading = false;
  private connectFailed = false;

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
    const logoutBtn = authed ? `<button id="logout" class="btn-secondary" title="${I18n.t('vehicles.logout')}">${LOGOUT_ICON}</button>` : '';
    const ioBtns = authed
      ? `<button id="export" class="btn-secondary" title="${I18n.t('tools.export')}">${EXPORT_ICON}</button>
         <button id="import" class="btn-secondary" title="${I18n.t('tools.import')}">${IMPORT_ICON}</button>`
      : '';
    host.innerHTML = `
      <button id="simulator" class="btn-secondary" title="${I18n.t('sim.button')}">${SIMULATOR_ICON}</button>
      ${ioBtns}
      <button id="settings" class="btn-secondary" title="${I18n.t('tools.settings')}">${SETTINGS_ICON}</button>
      <button id="help" class="btn-secondary" title="${I18n.t('tools.help')}">${HELP_ICON}</button>
      ${logoutBtn}`;
    host.querySelector('#simulator')?.addEventListener('click', () => this.onSimulator?.());
    host.querySelector('#export')?.addEventListener('click', () => this.onExport?.());
    host.querySelector('#import')?.addEventListener('click', () => this.onImport?.());
    host.querySelector('#settings')?.addEventListener('click', () => this.onSettings?.());
    host.querySelector('#help')?.addEventListener('click', () => this.onHelp?.());
    host.querySelector('#logout')?.addEventListener('click', () => this.onLogout?.());

    // Mobile menu — same actions, labelled with the button tooltips.
    const menuHost = this.root.querySelector('#top-bar-menu');
    if (menuHost) {
      const items = [
        { id: 'simulator', icon: SIMULATOR_ICON, label: I18n.t('sim.button') },
        ...(authed ? [
          { id: 'export', icon: EXPORT_ICON, label: I18n.t('tools.export') },
          { id: 'import', icon: IMPORT_ICON, label: I18n.t('tools.import') }
        ] : []),
        { id: 'settings', icon: SETTINGS_ICON, label: I18n.t('tools.settings') },
        { id: 'help', icon: HELP_ICON, label: I18n.t('tools.help') },
        ...(authed ? [{ id: 'logout', icon: LOGOUT_ICON, label: I18n.t('vehicles.logout') }] : [])
      ];
      menuHost.innerHTML = `
        <button id="menu-btn" class="btn-secondary" title="Menu">${MENU_ICON}</button>
        <div class="menu-dropdown" hidden>
          ${items.map(i => `<button class="menu-item" data-action="${i.id}">${i.icon}<span>${i.label}</span></button>`).join('')}
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
      simulator: this.onSimulator,
      export: this.onExport,
      import: this.onImport,
      settings: this.onSettings,
      help: this.onHelp,
      logout: this.onLogout
    };
    handlers[action]?.();
  }

  /** Demo/read-only banner, shown while the active provider is read-only. */
  renderDemoBanner(): void {
    const host = this.root.querySelector('#demo-banner-root');
    if (!host) return;
    host.innerHTML = this.storage.currentProvider.isReadOnly()
      ? `<div class="demo-banner">${I18n.t('demo.banner')}</div>`
      : '';
  }

  showLoading(isLoading: boolean): void {
    this.loading = isLoading;
    if (isLoading) {
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
          ${providers.map(p => `<button class="btn-primary" data-provider="${p.name}">${p.label}</button>`).join('')}
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

  /** Full re-render on state change. */
  /** Id of the vehicle whose detail page is open, if any — re-rendered
   *  in place on state:changed instead of falling back to the list. */
  private openVehicleId?: string;
  private detailView?: VehicleDetailView;

  /** Shows a vehicle detail page with breadcrumb "Véhicules / name". */
  showVehicle(vehicle: Vehicle, tab?: 'costs' | 'resale' | 'analysis' | 'consumption'): void {
    this.openVehicleId = vehicle.id;
    const bc = this.root.querySelector('#breadcrumb-root') as HTMLElement;
    bc.hidden = false;
    bc.innerHTML = `<a id="bc-list">${I18n.t('nav.vehicles')}</a><span class="bc-sep">/</span><span>${vehicle.name}</span>`;
    bc.querySelector('#bc-list')!.addEventListener('click', () => {
      this.openVehicleId = undefined;
      this.render(this.store.state);
    });
    const content = this.root.querySelector('#dashboard-content') as HTMLElement;
    content.classList.add('detail-mode');
    this.detailView = new VehicleDetailView(content, this.store, vehicle, tab);
    this.detailView.render();
  }

  render(state: AppState): void {
    if (!this.root.querySelector('#dashboard-content')) this.renderShell();
    this.renderDemoBanner();
    this.renderTopBarActions();
    if (this.loading) return;
    if (!state.isAuthenticated) {
      this.openVehicleId = undefined;
      this.showProviderPicker();
      return;
    }
    // A detail page stays open across state changes (saves) — the list is
    // only shown again when the vehicle disappears (deleted remotely).
    if (this.openVehicleId) {
      const vehicle = state.vehicles.find(v => v.id === this.openVehicleId);
      if (vehicle) {
        this.showVehicle(vehicle, this.detailView?.currentTab);
        return;
      }
      this.openVehicleId = undefined;
    }
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
    const units = defaultUnits(I18n.language);
    const odometer = vehicle.lastKnownOdometerKm();
    const energy = ENERGY_STREAM_ICONS[vehicle.data.energyType] ?? '';
    return `
      <article class="vehicle-card" data-vehicle-id="${vehicle.id}">
        <div class="vehicle-card-header">
          <span class="vehicle-card-icon">${icon}</span>
          <h3 class="vehicle-card-name">${vehicle.name}</h3>
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
