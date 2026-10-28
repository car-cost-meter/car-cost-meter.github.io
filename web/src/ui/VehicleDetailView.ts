import { I18n } from '../core/I18n.js';
import { evalFormula } from '../core/Formula.js';
import { defaultUnits, formatDistance, litresToDisplay, volumeUnit } from '../core/units.js';
import { LOAN_PERIODICITIES } from '../domain/events.js';
import { formatAmount } from './format.js';
import { componentStyles } from './componentStyles.js';
import { openChargeEditor, openCostEditor, openFuelUpEditor, openResaleEditor } from './EventEditors.js';
import { CostsView } from './CostsView.js';
import { FUEL_ICON, BATTERY_ICON, MAINTENANCE_ICON, REPAIR_ICON, INSPECTION_ICON, INSURANCE_ICON, ACQUISITION_ICON, OTHER_ICON, RESALE_ICON } from './icons.js';
import { VehicleEditor } from './VehicleEditor.js';
import type { AppStore } from '../core/AppStore.js';
import type { Vehicle } from '../domain/Vehicle.js';
import type { AcquisitionData, CostCategory, LoanPeriodicity } from '../domain/events.js';

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
.acq-form {
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-sm);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
}
.acq-grid {
  display: grid;
  /* Columns are capped so fields don't stretch across a wide screen —
   * leftover space stays empty on the right. */
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 12.5rem));
  gap: var(--space-xs) var(--space-md);
  align-items: end;
}
/* The hidden attribute loses against display:grid — reassert it. */
.acq-grid[hidden] { display: none; }
/* On narrow screens the fields stack full-width. */
@media (max-width: 640px) {
  .acq-grid { grid-template-columns: 1fr; }
}
.acq-form .form-group { margin-bottom: var(--space-xs); }
.acq-form .form-group label {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-bottom: 2px;
}
.acq-loan-check label { display: flex; align-items: center; gap: var(--space-xs); padding-bottom: 0.35rem; }
.acq-actions { display: flex; justify-content: flex-end; margin-top: var(--space-xs); }
.acq-other-title { font-size: var(--font-size-sm); color: var(--text-muted); margin: var(--space-sm) 0; }

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

export type Tab = 'edit' | 'analysis' | 'consumption';
export type CostSubTab = 'energy' | CostCategory | 'resale';
const COST_SUBTABS: CostSubTab[] = ['energy', 'maintenance', 'repair', 'inspection', 'insurance', 'acquisition', 'resale', 'other'];

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
    initialTab?: Tab,
    initialCostSubTab?: CostSubTab
  ) {
    componentStyles('vehicle-detail', CSS);
    this.tab = initialTab ?? 'edit';
    if (initialCostSubTab) this.costSubTab = initialCostSubTab;
  }

  /** Currently selected tab — lets the dashboard restore it after a
   *  state-driven re-render (e.g. save). */
  get currentTab(): Tab {
    return this.tab;
  }

  /** Currently selected Costs sub-tab — restored like `currentTab`. */
  get currentCostSubTab(): CostSubTab {
    return this.costSubTab;
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
    return ['edit', 'analysis', 'consumption'];
  }

  private renderTabs(): void {
    const host = this.host.querySelector('#detail-tabs')!;
    host.innerHTML = this.visibleTabs().map(t => {
      const label = I18n.t(`detail.tabs.${t}`);
      return `<button class="detail-tab ${t === this.tab ? 'active' : ''}" data-tab="${t}">${label}</button>`;
    }).join('');
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
      case 'edit':
        this.renderCosts(host);
        return;
    }
  }

  /* ---------------------------------------------------------------- costs */

  private costSubTabIcon(t: CostSubTab): string {
    if (t === 'energy') return this.energyIcons();
    if (t === 'resale') return RESALE_ICON;
    return CATEGORY_ICONS[t];
  }

  private costSubTabLabel(t: CostSubTab): string {
    if (t === 'resale') return I18n.t('detail.tabs.resale');
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
            ${this.costSubTabIcon(t)}${this.costSubTabLabel(t)}
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
    if (this.costSubTab === 'resale') { this.renderResale(scroll); return; }
    if (this.costSubTab === 'acquisition') {
      this.renderAcquisitionForm(fixed);
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

  /** Acquisition form (fixed zone): initial amount + optional loan/lease
   *  schedule. Saved as `vehicle.data.acquisition` through updateVehicle. */
  private renderAcquisitionForm(fixed: HTMLElement): void {
    const acq = this.vehicle.data.acquisition;
    const loan = acq?.loan;
    const periodOptions = LOAN_PERIODICITIES.map(p => {
      const label = I18n.t(`detail.acq${p[0].toUpperCase()}${p.slice(1)}`);
      return `<option value="${p}" ${loan?.periodicity === p ? 'selected' : ''}>${label}</option>`;
    }).join('');
    fixed.innerHTML = `
      <div class="acq-form">
        <div class="acq-grid">
          <div class="form-group">
            <label for="acq-initial">${I18n.t('detail.acqInitialAmount')}</label>
            <input id="acq-initial" class="form-control" type="text" inputmode="decimal" data-formula
                   value="${acq?.initialAmount ?? ''}" />
          </div>
          <div class="form-group">
            <label for="acq-reg">${I18n.t('detail.acqRegistrationFee')}</label>
            <input id="acq-reg" class="form-control" type="text" inputmode="decimal" data-formula
                   value="${acq?.registrationFee ?? ''}" />
          </div>
          <div class="form-group acq-loan-check">
            <label><input id="acq-loan" type="checkbox" ${loan ? 'checked' : ''} /> ${I18n.t('detail.acqLoan')}</label>
          </div>
        </div>
        <div class="acq-grid" id="acq-loan-fields" ${loan ? '' : 'hidden'}>
          <div class="form-group">
            <label for="acq-period">${I18n.t('detail.acqPeriodicity')}</label>
            <select id="acq-period" class="form-control">${periodOptions}</select>
          </div>
          <div class="form-group">
            <label for="acq-amount">${I18n.t('detail.acqAmount')}</label>
            <input id="acq-amount" class="form-control" type="text" inputmode="decimal" data-formula
                   value="${loan?.amount ?? ''}" />
          </div>
          <div class="form-group">
            <label for="acq-count">${I18n.t('detail.acqCount')}</label>
            <input id="acq-count" class="form-control" type="number" min="1" step="1"
                   value="${loan?.count ?? ''}" />
          </div>
          <div class="form-group">
            <label for="acq-first">${I18n.t('detail.acqFirstDate')}</label>
            <input id="acq-first" class="form-control" type="date" value="${loan?.firstPaymentDate ?? ''}" />
          </div>
        </div>
        <div class="acq-actions">
          <button id="acq-save" class="btn-primary">${I18n.t('common.save')}</button>
        </div>
      </div>`;

    const $ = <T extends HTMLElement>(sel: string): T => fixed.querySelector(sel) as T;
    const initialInput = $<HTMLInputElement>('#acq-initial');
    const regInput = $<HTMLInputElement>('#acq-reg');
    const loanBox = $<HTMLInputElement>('#acq-loan');
    const loanFields = $<HTMLDivElement>('#acq-loan-fields');
    const periodSelect = $<HTMLSelectElement>('#acq-period');
    const amountInput = $<HTMLInputElement>('#acq-amount');
    const countInput = $<HTMLInputElement>('#acq-count');
    const firstInput = $<HTMLInputElement>('#acq-first');
    const saveBtn = $<HTMLButtonElement>('#acq-save');

    const amountOk = (el: HTMLInputElement): boolean => {
      const v = el.value.trim();
      if (v === '') return true;
      const n = evalFormula(v);
      return Number.isFinite(n) && n >= 0;
    };
    /** Dirty detection — the save button stays invisible (but space is
     *  reserved, so nothing shifts) until the form differs from its
     *  initial state; it is then enabled only when every field is valid. */
    const snapshot = (): string => JSON.stringify([
      initialInput.value.trim(), regInput.value.trim(), loanBox.checked,
      periodSelect.value, amountInput.value.trim(),
      countInput.value.trim(), firstInput.value
    ]);
    const baseline = snapshot();
    const validate = (): void => {
      const checks: [HTMLInputElement, boolean][] = [
        [initialInput, amountOk(initialInput)],
        [regInput, amountOk(regInput)],
        [amountInput, !loanBox.checked || amountOk(amountInput)],
        [countInput, !loanBox.checked || Number.parseInt(countInput.value, 10) > 0],
        [firstInput, !loanBox.checked || firstInput.value.length > 0]
      ];
      let ok = true;
      for (const [input, valid] of checks) {
        input.classList.toggle('invalid-amount', !valid);
        if (!valid) ok = false;
      }
      saveBtn.style.visibility = snapshot() === baseline ? 'hidden' : 'visible';
      saveBtn.disabled = !ok;
    };
    for (const el of [initialInput, regInput, amountInput, countInput, firstInput]) {
      el.addEventListener('input', validate);
    }
    periodSelect.addEventListener('change', validate);
    loanBox.addEventListener('change', () => { loanFields.hidden = !loanBox.checked; validate(); });
    validate();

    saveBtn.addEventListener('click', () => {
      const next: AcquisitionData = {};
      const initial = evalFormula(initialInput.value);
      const reg = evalFormula(regInput.value);
      if (Number.isFinite(initial) && initial > 0) next.initialAmount = initial;
      if (Number.isFinite(reg) && reg > 0) next.registrationFee = reg;
      if (loanBox.checked) {
        next.loan = {
          periodicity: periodSelect.value as LoanPeriodicity,
          amount: evalFormula(amountInput.value),
          count: Number.parseInt(countInput.value, 10),
          firstPaymentDate: firstInput.value
        };
      }
      void this.store.updateVehicle(
        this.vehicle.id,
        { acquisition: Object.keys(next).length > 0 ? next : undefined }
      );
    });
  }

  /** Acquisition list: one-off acquisition costs (carte grise, options…)
   *  — the initial amount and loan schedule live in the fixed form above. */
  private renderAcquisition(host: HTMLElement): void {
    const rows = this.vehicle.data.costs
      .filter(c => c.category === 'acquisition')
      .sort((a, b) => b.date.localeCompare(a.date)) // newest first
      .map(c => this.costRow(c.id, 'acquisition', c.date, c.odometerKm, c.comment ?? '', c.amount));
    host.innerHTML = `<p class="acq-other-title">${I18n.t('detail.acqOtherCosts')}</p>` +
      this.rowsWithFab(rows, 'cost-sub-add');
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
    host.innerHTML = this.rowsWithFab(rows, 'resale-add');
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
    const fullKey = isCharge ? 'events.fullCharge' : 'events.fullTank';
    const main = e.full ? `✓ ${I18n.t(fullKey)}` : (e.comment ?? '');
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
