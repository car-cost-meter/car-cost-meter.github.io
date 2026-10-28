import { I18n } from '../core/I18n.js';
import { defaultUnits, formatDistance, litresToDisplay, volumeUnit } from '../core/units.js';
import { formatAmount } from './format.js';
import { componentStyles } from './componentStyles.js';
import { openChargeEditor, openCostEditor, openFuelUpEditor, openResaleEditor } from './EventEditors.js';
import { CostsView } from './CostsView.js';
import { FUEL_ICON, BATTERY_ICON, MAINTENANCE_ICON, REPAIR_ICON, INSPECTION_ICON, INSURANCE_ICON, ACQUISITION_ICON, OTHER_ICON } from './icons.js';
import { VehicleEditor } from './VehicleEditor.js';
import type { AppStore } from '../core/AppStore.js';
import type { Vehicle } from '../domain/Vehicle.js';
import type { CostCategory } from '../domain/events.js';

const CSS = `
.detail-tabs, .cost-subtabs {
  display: flex;
  gap: var(--space-xs);
  border-bottom: 1px solid var(--card-border);
  margin-bottom: var(--space-md);
  overflow-x: auto;
}
.detail-tab, .cost-subtab {
  border: none;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}
.detail-tab svg, .cost-subtab svg { width: 1rem; height: 1rem; }
.detail-tab.active, .cost-subtab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.event-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
}
.event-row:hover { background: var(--hover-bg); }
.event-row .event-date { color: var(--text-muted); min-width: 4.8rem; }
.event-row .event-km {
  min-width: 5.5rem;
  text-align: right;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.event-row .event-qty {
  min-width: 4.5rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.event-row .event-main { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.event-row .event-amount { font-weight: var(--font-weight-semibold); white-space: nowrap; }
.category-chip {
  display: inline-block;
  padding: 0 var(--space-sm);
  border-radius: var(--radius-pill);
  background: var(--hover-bg);
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}
.detail-empty { color: var(--text-muted); padding: var(--space-lg) 0; text-align: center; }
.detail-add { margin-top: var(--space-sm); }
.detail-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}
.detail-header h2 { margin: 0; font-size: var(--font-size-xl); }
.detail-title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
}
.inspection-alert {
  padding: 2px var(--space-sm);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}
.inspection-alert.overdue { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
.inspection-alert.soon { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
.purchase-price {
  display: flex;
  justify-content: space-between;
  padding: var(--space-sm);
  margin-bottom: var(--space-sm);
  border: 1px dashed var(--card-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}
.purchase-price .pp-label { color: var(--text-muted); }
.purchase-price .pp-value { font-weight: var(--font-weight-semibold); }

/* Page layout: header + tabs fixed, only the list scrolls. The page is
   bounded to the scroll container's visible height — its children can
   overflow only inside .detail-scroll. */
.detail-page { height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.detail-body { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.detail-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding-bottom: var(--space-md);
}
/* Floating "+" — sticky to the bottom of the scroll area: sits right under
   a short list, pinned to the viewport corner when the list overflows. */
.fab-row {
  position: sticky;
  bottom: var(--space-md);
  align-self: flex-end;
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}
.fab {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 1.6rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}
.fab svg { width: 22px; height: 22px; }
.fab:hover { filter: brightness(1.15); }
`;

type Tab = 'costs' | 'resale' | 'analysis' | 'consumption';
type CostSubTab = 'energy' | CostCategory;
const COST_SUBTABS: CostSubTab[] = ['energy', 'maintenance', 'repair', 'inspection', 'insurance', 'acquisition', 'other'];

/** Category icons shown at the start of each row. */
const CATEGORY_ICONS: Record<CostCategory, string> = {
  acquisition: ACQUISITION_ICON,
  maintenance: MAINTENANCE_ICON,
  repair: REPAIR_ICON,
  inspection: INSPECTION_ICON,
  insurance: INSURANCE_ICON,
  fuel: FUEL_ICON,
  other: OTHER_ICON
};

/**
 * Full-page vehicle detail: top tabs Costs / Resale / Summary /
 * Consumption (placeholder). The Costs tab itself splits into sub-tabs —
 * energy entries (fill-ups / charges) plus one sub-tab per cost category;
 * Acquisition also shows the read-only purchase price.
 */
export class VehicleDetailView {
  private tab: Tab;
  private costSubTab: CostSubTab = 'energy';

  constructor(
    private readonly host: HTMLElement,
    private readonly store: AppStore,
    private readonly vehicle: Vehicle,
    initialTab?: Tab
  ) {
    componentStyles('vehicle-detail', CSS);
    this.tab = initialTab ?? 'costs';
  }

  /** Currently selected tab — lets the dashboard restore it after a
   *  state-driven re-render (e.g. save). */
  get currentTab(): Tab {
    return this.tab;
  }

  render(): void {
    this.host.innerHTML = `
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-title">
            <h2>${this.vehicle.name}</h2>
            ${this.inspectionAlertHtml()}
          </div>
          <button class="btn-secondary" id="detail-edit-vehicle">${I18n.t('detail.editVehicle')}</button>
        </div>
        <div class="detail-tabs" id="detail-tabs"></div>
        <div class="detail-body" id="detail-body"></div>
      </div>`;
    this.host.querySelector('#detail-edit-vehicle')!.addEventListener('click', () => {
      VehicleEditor.open(this.store, this.vehicle);
    });
    this.renderTabs();
    this.renderList();
  }

  /** Small badge next to the vehicle name: red when the inspection is
   *  overdue, orange when due within a month — nothing otherwise. */
  private inspectionAlertHtml(): string {
    const status = this.vehicle.inspectionStatus();
    const next = this.vehicle.nextInspectionDate();
    if (next === undefined || (status !== 'overdue' && status !== 'soon')) return '';
    const key = status === 'overdue' ? 'vehicles.inspection.overdue' : 'vehicles.inspection.due';
    return `<span class="inspection-alert ${status}">${I18n.t(key, { date: I18n.formatDate(next) })}</span>`;
  }

  private readonly save = async (): Promise<void> => {
    await this.store.save();
    this.render(); // re-render header too (inspection alert, updated name)
  };

  private visibleTabs(): Tab[] {
    return ['costs', 'resale', 'analysis', 'consumption'];
  }

  private renderTabs(): void {
    const host = this.host.querySelector('#detail-tabs')!;
    host.innerHTML = this.visibleTabs().map(t =>
      `<button class="detail-tab ${t === this.tab ? 'active' : ''}" data-tab="${t}">${I18n.t(`detail.tabs.${t}`)}</button>`
    ).join('');
    host.querySelectorAll<HTMLButtonElement>('.detail-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.tab as Tab;
        this.renderTabs();
        this.renderList();
      });
    });
  }

  private renderList(): void {
    const host = this.host.querySelector('#detail-body') as HTMLElement;
    switch (this.tab) {
      case 'analysis':
        host.innerHTML = '<div class="detail-scroll"></div>';
        new CostsView(this.vehicle, host.querySelector('.detail-scroll') as HTMLElement);
        return;
      case 'consumption':
        host.innerHTML = `<div class="detail-scroll"><p class="detail-empty">${I18n.t('detail.notImplemented')}</p></div>`;
        return;
      case 'resale':
        this.renderResale(host);
        return;
      case 'costs':
        this.renderCosts(host);
        return;
    }
  }

  /* ---------------------------------------------------------------- costs */

  private costSubTabLabel(t: CostSubTab): string {
    if (t !== 'energy') return I18n.t(`categories.${t}`);
    switch (this.vehicle.data.energyType) {
      case 'electric': return I18n.t('categories.charges');
      case 'hybrid': return `${I18n.t('categories.fuelUps')} + ${I18n.t('categories.charges')}`;
      default: return I18n.t('categories.fuelUps');
    }
  }

  private renderCosts(host: HTMLElement): void {
    host.innerHTML = `
      <div class="cost-subtabs">
        ${COST_SUBTABS.map(t => `
          <button class="cost-subtab ${t === this.costSubTab ? 'active' : ''}" data-subtab="${t}">
            ${t === 'energy' ? this.energyIcons() : CATEGORY_ICONS[t as CostCategory]}${this.costSubTabLabel(t)}
          </button>`).join('')}
      </div>
      <div id="cost-fixed"></div>
      <div class="detail-scroll" id="cost-scroll"></div>`;
    host.querySelectorAll<HTMLButtonElement>('.cost-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.costSubTab = btn.dataset.subtab as CostSubTab;
        this.renderCosts(host);
      });
    });
    this.renderCostSubTab(
      host.querySelector('#cost-fixed') as HTMLElement,
      host.querySelector('#cost-scroll') as HTMLElement
    );
  }

  private energyIcons(): string {
    if (this.vehicle.data.energyType === 'electric') return BATTERY_ICON;
    if (this.vehicle.data.energyType === 'hybrid') return `${FUEL_ICON}${BATTERY_ICON}`;
    return FUEL_ICON;
  }

  private renderCostSubTab(fixed: HTMLElement, scroll: HTMLElement): void {
    fixed.innerHTML = '';
    if (this.costSubTab === 'energy') { this.renderEnergy(scroll); return; }
    if (this.costSubTab === 'acquisition') {
      fixed.innerHTML = `
        <div class="purchase-price">
          <span class="pp-label">${I18n.t('detail.purchasePriceReadonly')}</span>
          <span class="pp-value">${formatAmount(this.vehicle.data.purchasePrice)}</span>
        </div>`;
      this.renderAcquisition(scroll);
      return;
    }
    const cat = this.costSubTab;
    const rows = this.vehicle.data.costs
      .filter(c => c.category === cat)
      .sort((a, b) => b.date.localeCompare(a.date)) // newest first
      .map(c => this.costRow(c.id, cat, c.date, c.odometerKm, c.comment ?? '', c.amount));
    scroll.innerHTML = this.rowsWithFab(rows, 'cost-sub-add');
    scroll.querySelector('#cost-sub-add')!.addEventListener('click', () =>
      openCostEditor(this.vehicle, this.save, undefined, { category: cat }));
    this.bindRows(scroll, id => {
      const e = this.vehicle.data.costs.find(c => c.id === id);
      openCostEditor(this.vehicle, this.save, e);
    });
  }

  /** Fill-ups + charges (hybrid shows both), merged and date-sorted,
   *  each opening its own editor. */
  private renderEnergy(host: HTMLElement): void {
    const rows = [
      ...this.vehicle.data.fuelUps.map(f => ({ date: f.date, html: this.energyRow(`fuelUp:${f.id}`, f) })),
      ...this.vehicle.data.charges.map(c => ({ date: c.date, html: this.energyRow(`charge:${c.id}`, c) })),
      // Fuel costs recorded without a fill-up entry stay visible here too.
      ...this.vehicle.data.costs.filter(c => c.category === 'fuel')
        .map(c => ({ date: c.date, html: this.energyRow(`cost:${c.id}`, c) }))
    ].sort((a, b) => b.date.localeCompare(a.date)).map(r => r.html); // newest first
    const addLabel = this.vehicle.data.energyType === 'electric'
      ? I18n.t('detail.addCharge')
      : I18n.t('detail.addFuelUp');
    const fabs = this.vehicle.data.energyType === 'hybrid'
      ? `<button class="fab" id="add-fuel" title="${I18n.t('detail.addFuelUp')}">${FUEL_ICON}</button>
         <button class="fab" id="add-charge" title="${I18n.t('detail.addCharge')}">${BATTERY_ICON}</button>`
      : `<button class="fab" id="add-energy" title="${addLabel}">${this.energyIcons()}</button>`;
    host.innerHTML = `
      ${rows.length === 0 ? `<p class="detail-empty">${I18n.t('detail.empty')}</p>` : `<div>${rows.join('')}</div>`}
      <div class="fab-row">${fabs}</div>`;
    host.querySelector('#add-energy')?.addEventListener('click', () => {
      if (this.vehicle.data.energyType === 'electric') {
        openChargeEditor(this.vehicle, this.save);
      } else {
        openFuelUpEditor(this.vehicle, this.save);
      }
    });
    host.querySelector('#add-fuel')?.addEventListener('click', () => openFuelUpEditor(this.vehicle, this.save));
    host.querySelector('#add-charge')?.addEventListener('click', () => openChargeEditor(this.vehicle, this.save));
    this.bindRows(host, rawId => {
      const [kind, id] = rawId.split(':', 2);
      if (kind === 'fuelUp') openFuelUpEditor(this.vehicle, this.save, this.vehicle.data.fuelUps.find(f => f.id === id));
      else if (kind === 'charge') openChargeEditor(this.vehicle, this.save, this.vehicle.data.charges.find(c => c.id === id));
      else openCostEditor(this.vehicle, this.save, this.vehicle.data.costs.find(c => c.id === id));
    });
  }

  /** Acquisition: loan/lease payments (purchase price sits in the fixed zone). */
  private renderAcquisition(host: HTMLElement): void {
    const rows = this.vehicle.data.costs
      .filter(c => c.category === 'acquisition')
      .sort((a, b) => b.date.localeCompare(a.date)) // newest first
      .map(c => this.costRow(c.id, 'acquisition', c.date, c.odometerKm, c.comment ?? '', c.amount));
    host.innerHTML = this.rowsWithFab(rows, 'cost-sub-add');
    host.querySelector('#cost-sub-add')!.addEventListener('click', () =>
      openCostEditor(this.vehicle, this.save, undefined, { category: 'acquisition' }));
    this.bindRows(host, id => {
      const e = this.vehicle.data.costs.find(c => c.id === id);
      openCostEditor(this.vehicle, this.save, e);
    });
  }

  private renderResale(host: HTMLElement): void {
    const rows = [...this.vehicle.data.resaleValues]
      .sort((a, b) => b.date.localeCompare(a.date)) // newest first
      .map(v =>
      `<div class="event-row" data-id="${v.date}">
        <span class="event-date">${I18n.formatDate(v.date)}</span>
        <span class="event-main"></span>
        <span class="event-amount">${formatAmount(v.value)}</span>
      </div>`);
    host.innerHTML = `<div class="detail-scroll">${this.rowsWithFab(rows, 'resale-add')}</div>`;
    host.querySelector('#resale-add')!.addEventListener('click', () =>
      openResaleEditor(this.vehicle, this.save));
    this.bindRows(host, date =>
      openResaleEditor(this.vehicle, this.save, this.vehicle.data.resaleValues.find(r => r.date === date)));
  }

  /* ------------------------------------------------------------- helpers */

  /** Rows + a sticky circular "+" button at the bottom of the scroll area. */
  private rowsWithFab(rows: string[], addId: string): string {
    return `
      ${rows.length === 0 ? `<p class="detail-empty">${I18n.t('detail.empty')}</p>` : `<div>${rows.join('')}</div>`}
      <div class="fab-row"><button class="fab" id="${addId}" title="${I18n.t('common.add')}">+</button></div>`;
  }

  private bindRows(host: HTMLElement, open: (id: string) => void): void {
    host.querySelectorAll<HTMLElement>('.event-row').forEach(row => {
      row.addEventListener('click', () => open(row.dataset.id!));
    });
  }

  /** km column shared by energy and cost rows (empty when unknown). */
  private kmCell(odometerKm: number | undefined): string {
    const units = defaultUnits(I18n.language);
    return `<span class="event-km">${odometerKm !== undefined ? formatDistance(odometerKm, units) : ''}</span>`;
  }

  /** Energy row (fill-up, charge or fuel cost): icon + date + km +
   *  volume/kWh column + main + amount. */
  private energyRow(id: string, e: {
    date: string; odometerKm?: number; amount?: number;
    volumeLitres?: number; kwh?: number; full?: boolean; comment?: string;
  }): string {
    const units = defaultUnits(I18n.language);
    const isCharge = e.kwh !== undefined || (e.volumeLitres === undefined && this.vehicle.data.energyType === 'electric');
    let qty = '';
    if (e.volumeLitres !== undefined) {
      qty = `${I18n.formatNumber(litresToDisplay(e.volumeLitres, units), { maximumFractionDigits: units === 'imperial' ? 3 : 2 })} ${volumeUnit(units)}`;
    } else if (e.kwh !== undefined) {
      qty = `${I18n.formatNumber(e.kwh, { maximumFractionDigits: 1 })} kWh`;
    }
    const main = e.full ? `✓ ${I18n.t(isCharge ? 'events.fullCharge' : 'events.fullTank')}` : (e.comment ?? '');
    return `<div class="event-row" data-id="${id}">
      <span class="event-date">${I18n.formatDate(e.date)}</span>
      ${this.kmCell(e.odometerKm)}
      <span class="event-qty">${qty}</span>
      <span class="event-main">${main}</span>
      <span class="event-amount">${e.amount !== undefined ? formatAmount(e.amount) : ''}</span>
    </div>`;
  }

  /** Cost row: date + km (when the category can hold one) + comment + amount. */
  private costRow(id: string, category: CostCategory, date: string, odometerKm: number | undefined, comment: string, amount: number): string {
    // Acquisition and insurance have no odometer field — no km column.
    const km = category === 'acquisition' || category === 'insurance' ? '' : this.kmCell(odometerKm);
    return `<div class="event-row" data-id="${id}">
      <span class="event-date">${I18n.formatDate(date)}</span>
      ${km}
      <span class="event-main">${comment}</span>
      <span class="event-amount">${formatAmount(amount)}</span>
    </div>`;
  }
}
