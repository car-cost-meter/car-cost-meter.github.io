import { I18n } from '../core/I18n.js';
import { evalFormula } from '../core/Formula.js';
import { defaultUnits, displayToKm, distanceUnit } from '../core/units.js';
import { formatAmount } from './format.js';
import { Settings } from '../core/settings.js';
import { bindOverlayClose } from './overlayClose.js';
import { componentStyles } from './componentStyles.js';
import { todayString, addMonths } from '../core/dates.js';

const CSS = `
.sim-results {
  margin-top: var(--space-md);
  border-top: 1px solid var(--card-border);
  padding-top: var(--space-md);
}
.sim-results .sim-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  border-bottom: 1px dashed var(--card-border);
  font-size: var(--font-size-sm);
}
.sim-results .sim-row strong { color: var(--accent); }
`;

/**
 * Pre-purchase cost simulator: hypotheses (purchase price, resale value at a
 * horizon date, km/year, loan, monthly payment, running costs, energy price)
 * → projected annual cost of ownership and cost per unit of distance.
 * Standalone — not tied to any recorded vehicle.
 */
export class SimulatorView {
  static open(container: HTMLElement = document.body): void {
    new SimulatorView(container).show();
  }

  private overlay!: HTMLElement;

  private constructor(private readonly container: HTMLElement) {
    componentStyles('simulator', CSS);
  }

  private show(): void {
    const units = defaultUnits(I18n.language);
    const du = distanceUnit(units);
    const currency = Settings.load().get('currency');
    // `money` fields accept infix formulas (data-formula + text input).
    const inputType = (money: boolean, step: string): string =>
      money ? 'type="text" inputmode="decimal" data-formula' : `type="number" min="0" step="${step}"`;
    const field = (id: string, label: string, value: string | number = '', step = '0.01', money = false): string => `
      <div class="form-group"><label for="${id}">${label}</label>
        <input id="${id}" class="form-control" ${inputType(money, step)} value="${value}" /></div>`;
    const dateField = (id: string, label: string, value: string): string => `
      <div class="form-group"><label for="${id}">${label}</label>
        <input id="${id}" class="form-control" type="date" value="${value}" /></div>`;

    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = `
      <div class="modal-content" style="max-width: 520px;">
        <h3 style="margin-top:0;">${I18n.t('sim.title')}</h3>
        ${field('sim-price', `${I18n.t('sim.purchasePrice')} (${currency})`, '20000', '1', true)}
        ${dateField('sim-resale-date', I18n.t('sim.resaleDate'), addMonths(todayString(), 60))}
        ${field('sim-resale', `${I18n.t('sim.resaleValue')} (${currency})`, '12000', '1', true)}
        ${field('sim-km-year', `${I18n.t('sim.kmPerYear')} (${du})`, '15000', '100')}
        <div class="form-section"><div class="form-section-title">${I18n.t('sim.yearlyCosts')}</div>
          ${field('sim-insurance', `${I18n.t('categories.insurance')} (${currency}/an)`, '700', '1', true)}
          ${field('sim-maintenance', `${I18n.t('categories.maintenance')} (${currency}/an)`, '400', '1', true)}
          ${field('sim-loan', `${I18n.t('sim.loanMonthly')} (${currency}/mois, 0 si aucun)`, '0', '1', true)}
        </div>
        <div class="form-section"><div class="form-section-title">${I18n.t('sim.energy')}</div>
          ${field('sim-conso', `${I18n.t('sim.consumption')} (L/100km, mpg ou kWh/100km)`, '6.5', '0.1')}
          ${field('sim-energy-price', `${I18n.t('sim.energyPrice')} (${currency}/L ou kWh)`, '1.80', '0.01', true)}
        </div>
        <div class="sim-results" id="sim-results"></div>
        <div class="modal-actions">
          <div class="modal-actions-left"></div>
          <div class="modal-actions-right">
            <button class="btn-secondary" id="sim-close">${I18n.t('common.close')}</button>
            <button class="btn-primary" id="sim-run">${I18n.t('sim.run')}</button>
          </div>
        </div>
      </div>`;
    this.container.appendChild(this.overlay);
    this.overlay.querySelector('#sim-close')!.addEventListener('click', () => this.overlay.remove());
    bindOverlayClose(this.overlay, () => this.overlay.remove());
    this.overlay.querySelector('#sim-run')!.addEventListener('click', () => this.compute(units, currency));
  }

  private num(id: string): number {
    // Amount fields accept formulas; NaN evaluates to 0.
    const v = evalFormula((this.overlay.querySelector(`#${id}`) as HTMLInputElement).value);
    return Number.isFinite(v) ? v : 0;
  }

  private compute(units: ReturnType<typeof defaultUnits>, currency: string): void {
    const price = this.num('sim-price');
    const resale = this.num('sim-resale');
    const resaleDate = (this.overlay.querySelector('#sim-resale-date') as HTMLInputElement).value;
    const kmYear = displayToKm(this.num('sim-km-year'), units);
    const insurance = this.num('sim-insurance');
    const maintenance = this.num('sim-maintenance');
    const loanMonthly = this.num('sim-loan');
    const conso = this.num('sim-conso'); // per 100 units
    const energyPrice = this.num('sim-energy-price');

    // Horizon in years (fractional, day-exact) from today to resale date.
    const days = Math.max(1, (Date.parse(`${resaleDate}T00:00:00Z`) - Date.parse(`${todayString()}T00:00:00Z`)) / 86400000);
    const years = days / 365.25;

    const depreciationPerYear = years > 0 ? (price - resale) / years : 0;
    const energyPerYear = (conso / 100) * kmYear * energyPrice;
    const annual = depreciationPerYear + insurance + maintenance + loanMonthly * 12 + energyPerYear;
    const perKm = kmYear > 0 ? annual / kmYear : undefined;
    const monthly = annual / 12;

    const row = (label: string, value: string, strong = false): string => {
      const cell = strong ? `<strong>${value}</strong>` : `<span>${value}</span>`;
      return `<div class="sim-row"><span>${label}</span>${cell}</div>`;
    };

    this.overlay.querySelector('#sim-results')!.innerHTML = `
      ${row(I18n.t('sim.depreciationYear'), formatAmount(depreciationPerYear))}
      ${row(I18n.t('sim.energyYear'), formatAmount(energyPerYear))}
      ${row(I18n.t('sim.fixedYear'), formatAmount(insurance + maintenance + loanMonthly * 12))}
      ${row(I18n.t('sim.annualTotal'), formatAmount(annual), true)}
      ${row(I18n.t('sim.monthlyTotal'), formatAmount(monthly), true)}
      ${perKm !== undefined ? row(I18n.t('sim.perDistance', { unit: distanceUnit(units) }), formatAmount(perKm), true) : ''}`;
  }
}
