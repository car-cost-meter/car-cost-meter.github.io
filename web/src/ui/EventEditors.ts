import { I18n } from '../core/I18n.js';
import { evalFormula } from '../core/Formula.js';
import { defaultUnits, displayToKm, kmToDisplay, distanceUnit, litresToDisplay, volumeUnit, formatDistance } from '../core/units.js';
import { odometerViolations } from '../domain/odometer.js';
import { todayString } from '../core/dates.js';
import { newId } from '../domain/events.js';
import type { Charge, Cost, CostCategory, FuelUp, LoanPeriod } from '../domain/events.js';
import type { Vehicle } from '../domain/Vehicle.js';
import { bindOverlayClose } from './overlayClose.js';
import { ConfirmDialog } from './ConfirmDialog.js';

/**
 * Modal editors for the dated event collections of a vehicle. Every editor
 * is a small form overlay returning through a save callback; odometers and
 * volumes are shown in the user's units and converted back to metric on save.
 */

interface ModalOpts {
  title: string;
  fieldsHtml: string;
  container?: HTMLElement;
  /** Selectors of required inputs — flagged invalid and the save button
   *  stays disabled while any of them is empty (re-validated live). */
  required?: string[];
  /** Existing-entry deletions ask for confirmation first. */
  onDelete?: () => Promise<void> | void;
  /** Return false to keep the modal open (validation failed). */
  onSave: (root: HTMLElement) => boolean;
}

function openFormModal(opts: ModalOpts): void {
  const container = opts.container ?? document.body;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 480px;">
      <h3 style="margin-top: 0;">${opts.title}</h3>
      ${opts.fieldsHtml}
      <div class="form-alert" id="ev-alert" hidden></div>
      <div class="modal-actions">
        <div class="modal-actions-left">
          ${opts.onDelete ? `<button class="btn-danger" id="ev-delete">${I18n.t('common.delete')}</button>` : ''}
        </div>
        <div class="modal-actions-right">
          <button class="btn-secondary" id="ev-cancel">${I18n.t('common.cancel')}</button>
          <button class="btn-primary" id="ev-save">${I18n.t('common.save')}</button>
        </div>
      </div>
    </div>`;
  container.appendChild(overlay);

  const close = (): void => overlay.remove();
  const saveBtn = overlay.querySelector('#ev-save') as HTMLButtonElement;

  /** Flags empty required inputs and malformed formula inputs (any
   *  `data-formula` field whose content doesn't evaluate to a finite
   *  number); disables save while anything is invalid. */
  const validate = (): boolean => {
    const requiredSels = opts.required ?? [];
    let ok = true;
    overlay.querySelectorAll<HTMLInputElement>('input.form-control').forEach(input => {
      const required = requiredSels.some(sel => input.matches(sel));
      const v = input.value.trim();
      let invalid = required && v === '';
      if (!invalid && input.dataset.formula !== undefined && v !== '') {
        invalid = !Number.isFinite(evalFormula(v));
      }
      input.classList.toggle('invalid-amount', invalid);
      if (invalid) ok = false;
    });
    saveBtn.disabled = !ok;
    return ok;
  };
  overlay.querySelectorAll('input.form-control').forEach(input => {
    input.addEventListener('input', validate);
  });
  validate();

  overlay.querySelector('#ev-cancel')!.addEventListener('click', close);
  bindOverlayClose(overlay, close);
  saveBtn.addEventListener('click', () => {
    if (validate() && opts.onSave(overlay)) close();
  });
  overlay.querySelector('#ev-delete')?.addEventListener('click', () => {
    void ConfirmDialog.ask(I18n.t('events.deleteConfirm'), container).then(ok => {
      if (ok) { void opts.onDelete?.(); close(); }
    });
  });
}

const num = (root: HTMLElement, sel: string): number | undefined => {
  const v = Number.parseFloat((root.querySelector(sel) as HTMLInputElement).value);
  return Number.isFinite(v) ? v : undefined;
};
/** Amount fields accept infix formulas (`1000*(1+5%)`, `12,50`). */
const amount = (root: HTMLElement, sel: string): number | undefined => {
  const v = evalFormula((root.querySelector(sel) as HTMLInputElement).value);
  return Number.isFinite(v) ? v : undefined;
};
const str = (root: HTMLElement, sel: string): string =>
  (root.querySelector(sel) as HTMLInputElement).value.trim();
const checked = (root: HTMLElement, sel: string): boolean =>
  (root.querySelector(sel) as HTMLInputElement).checked;

const field = (id: string, label: string, inner: string): string => `
  <div class="form-group"><label for="${id}">${label}</label>${inner}</div>`;
const dateField = (value?: string): string =>
  `<input id="ev-date" class="form-control" type="date" required value="${value ?? todayString()}" />`;
const odoField = (label: string, km: number | undefined, units: ReturnType<typeof defaultUnits>): string =>
  field('ev-odo', `${label} (${distanceUnit(units)})`,
    `<input id="ev-odo" class="form-control" type="number" min="0" step="1"
       value="${km !== undefined ? Math.round(kmToDisplay(km, units)) : ''}" />`);
const amountField = (value: number | undefined): string =>
  field('ev-amount', I18n.t('events.amount'),
    `<input id="ev-amount" class="form-control" type="text" inputmode="decimal" data-formula value="${value ?? ''}" />`);
const odo = (root: HTMLElement, units: ReturnType<typeof defaultUnits>): number | undefined => {
  const input = root.querySelector('#ev-odo') as HTMLInputElement | null;
  if (!input) return undefined; // field hidden for this category (acquisition)
  const v = Number.parseFloat(input.value);
  return Number.isFinite(v) ? Math.round(displayToKm(v, units)) : undefined;
};

/** Kind labels used in the odometer-regression alert. */
function readingLabel(r: { kind: string; category?: string }): string {
  switch (r.kind) {
    case 'initial': return I18n.t('vehicles.initialOdometer');
    case 'fuelUp': return I18n.t('categories.fuelUps');
    case 'charge': return I18n.t('categories.charges');
    default: return I18n.t(`categories.${r.category ?? 'other'}`);
  }
}

/**
 * Odometer-monotonicity check: when `km` is provided, verifies it does not
 * go backwards (or forwards) relative to the chronologically adjacent
 * known readings. Violations are listed in the dialog's alert block —
 * returns false so the caller can keep the modal open.
 */
function checkOdometer(root: HTMLElement, vehicle: Vehicle, date: string, km: number | undefined, excludeId?: string): boolean {
  const alert = root.querySelector('#ev-alert') as HTMLElement;
  if (km === undefined) { alert.hidden = true; return true; }
  const units = defaultUnits(I18n.language);
  const violations = odometerViolations(vehicle, date, km, excludeId);
  if (violations.length === 0) { alert.hidden = true; return true; }
  alert.innerHTML = `
    <strong>${I18n.t('events.odoRegression')}</strong>
    <ul>${violations.map(r =>
      `<li>${readingLabel(r)} — ${I18n.formatDate(r.date)} : ${formatDistance(r.km, units)}</li>`).join('')}
    </ul>`;
  alert.hidden = false;
  return false;
}

/** Fuel fill-up editor (new or existing entry). */
export function openFuelUpEditor(vehicle: Vehicle, save: () => Promise<void>, entry?: FuelUp): void {
  const units = defaultUnits(I18n.language);
  // Volume precision: centilitres in metric, milli-gallons in imperial
  // (both match fuel-pump resolutions).
  const volDecimals = units === 'imperial' ? 3 : 2;
  openFormModal({
    title: I18n.t(entry ? 'events.fuelUp.editTitle' : 'events.fuelUp.newTitle'),
    fieldsHtml:
      field('ev-date', I18n.t('events.date'), dateField(entry?.date)) +
      odoField(I18n.t('events.odometer'), entry?.odometerKm, units) +
      field('ev-volume', `${I18n.t('events.volume')} (${volumeUnit(units)})`,
        `<input id="ev-volume" class="form-control" type="number" min="0" step="${1 / 10 ** volDecimals}"
           value="${entry?.volumeLitres !== undefined ? litresToDisplay(entry.volumeLitres, units).toFixed(volDecimals) : ''}" />`) +
      `<div class="form-group"><label><input id="ev-full" type="checkbox" ${entry?.full !== false ? 'checked' : ''} /> ${I18n.t('events.fullTank')}</label></div>` +
      amountField(entry?.amount),
    required: ['#ev-date'],
    onDelete: entry ? async () => { vehicle.removeEvent(entry.id); await save(); } : undefined,
    onSave: (root) => {
      const date = str(root, '#ev-date');
      if (!date) return false;
      const vol = num(root, '#ev-volume');
      const litresPerUnit = units === 'imperial' ? 3.785411784 : 1;
      const odoKm = odo(root, units);
      if (!checkOdometer(root, vehicle, date, odoKm, entry?.id)) return false;
      vehicle.recordFuelUp({
        id: entry?.id ?? newId(),
        date,
        odometerKm: odoKm,
        volumeLitres: vol === undefined ? undefined : vol * litresPerUnit,
        amount: amount(root, '#ev-amount'),
        full: checked(root, '#ev-full')
      });
      void save();
      return true;
    }
  });
}

/** Battery charge editor (electric / hybrid). */
export function openChargeEditor(vehicle: Vehicle, save: () => Promise<void>, entry?: Charge): void {
  const units = defaultUnits(I18n.language);
  openFormModal({
    title: I18n.t(entry ? 'events.charge.editTitle' : 'events.charge.newTitle'),
    fieldsHtml:
      field('ev-date', I18n.t('events.date'), dateField(entry?.date)) +
      odoField(I18n.t('events.odometer'), entry?.odometerKm, units) +
      field('ev-kwh', 'kWh',
        `<input id="ev-kwh" class="form-control" type="number" min="0" step="0.01" value="${entry?.kwh ?? ''}" />`) +
      `<div class="form-group"><label><input id="ev-full" type="checkbox" ${entry?.full ? 'checked' : ''} /> ${I18n.t('events.fullCharge')}</label></div>` +
      amountField(entry?.amount),
    required: ['#ev-date'],
    onDelete: entry ? async () => { vehicle.removeEvent(entry.id); await save(); } : undefined,
    onSave: (root) => {
      const date = str(root, '#ev-date');
      if (!date) return false;
      const odoKm = odo(root, units);
      if (!checkOdometer(root, vehicle, date, odoKm, entry?.id)) return false;
      vehicle.recordCharge({
        id: entry?.id ?? newId(),
        date,
        odometerKm: odoKm,
        kwh: num(root, '#ev-kwh'),
        amount: amount(root, '#ev-amount'),
        full: checked(root, '#ev-full') || undefined
      });
      void save();
      return true;
    }
  });
}

/** Cost entry editor — the category is fixed (shown in the title, like
 *  the fill-up editor) and passed via `preset` or taken from `entry`.
 *  Optional odometer field. */
export function openCostEditor(
  vehicle: Vehicle, save: () => Promise<void>, entry?: Cost,
  preset?: { category: CostCategory }
): void {
  const units = defaultUnits(I18n.language);
  const category = entry?.category ?? preset?.category ?? 'other';
  const categoryLabel = I18n.t(`categories.${category}`);
  const titleSuffix = I18n.t(entry ? 'events.cost.editTitle' : 'events.cost.newTitle');
  const title = `${categoryLabel} — ${titleSuffix}`;
  openFormModal({
    title,
    fieldsHtml:
      field('ev-date', I18n.t('events.date'), dateField(entry?.date)) +
      amountField(entry?.amount) +
      // Odometer is meaningless for acquisition and insurance costs — hidden.
      ((category === 'acquisition' || category === 'insurance') ? '' : odoField(I18n.t('events.odometer'), entry?.odometerKm, units)) +
      field('ev-comment', I18n.t('events.comment'),
        `<input id="ev-comment" class="form-control" type="text" value="${entry?.comment ?? ''}" />`),
    required: ['#ev-date', '#ev-amount'],
    onDelete: entry ? async () => { vehicle.removeEvent(entry.id); await save(); } : undefined,
    onSave: (root) => {
      const date = str(root, '#ev-date');
      const amountVal = amount(root, '#ev-amount');
      if (!date || amountVal === undefined) return false;
      const comment = str(root, '#ev-comment');
      const odoKm = odo(root, units);
      if (!checkOdometer(root, vehicle, date, odoKm, entry?.id)) return false;
      vehicle.recordCost({
        id: entry?.id ?? newId(),
        date,
        category,
        amount: amountVal,
        odometerKm: odoKm,
        comment: comment || undefined
      });
      void save();
      return true;
    }
  });
}

/** Dated resale-value estimate editor (one value per date — re-saving a
 *  date replaces it). */
export function openResaleEditor(vehicle: Vehicle, save: () => Promise<void>, entry?: { date: string; value: number }): void {
  openFormModal({
    title: I18n.t(entry ? 'events.resale.editTitle' : 'events.resale.newTitle'),
    fieldsHtml:
      field('ev-date', I18n.t('events.date'), dateField(entry?.date)) +
      field('ev-value', I18n.t('events.resaleValue'),
        `<input id="ev-value" class="form-control" type="text" inputmode="decimal" data-formula value="${entry?.value ?? ''}" />`),
    required: ['#ev-date', '#ev-value'],
    onDelete: entry ? async () => { vehicle.removeResaleValue(entry.date); await save(); } : undefined,
    onSave: (root) => {
      const d = str(root, '#ev-date');
      const value = amount(root, '#ev-value');
      if (!d || value === undefined) return false;
      vehicle.recordResaleValue({ date: d, value });
      void save();
      return true;
    }
  });
}

/** Loan/rental period editor. */
export function openLoanEditor(vehicle: Vehicle, save: () => Promise<void>, entry?: LoanPeriod): void {
  openFormModal({
    title: I18n.t(entry ? 'events.loan.editTitle' : 'events.loan.newTitle'),
    fieldsHtml:
      field('ev-from', I18n.t('events.from'),
        `<input id="ev-from" class="form-control" type="date" required value="${entry?.from ?? todayString()}" />`) +
      field('ev-to', I18n.t('events.to'),
        `<input id="ev-to" class="form-control" type="date" required value="${entry?.to ?? todayString()}" />`) +
      field('ev-note', I18n.t('events.note'),
        `<input id="ev-note" class="form-control" type="text" value="${entry?.note ?? ''}" />`),
    required: ['#ev-from', '#ev-to'],
    onDelete: entry ? async () => { vehicle.removeEvent(entry.id); await save(); } : undefined,
    onSave: (root) => {
      const from = str(root, '#ev-from');
      const to = str(root, '#ev-to');
      if (!from || !to || to < from) return false;
      const note = str(root, '#ev-note');
      vehicle.recordLoanPeriod({
        id: entry?.id ?? newId(),
        from, to,
        note: note || undefined
      });
      void save();
      return true;
    }
  });
}
