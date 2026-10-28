import { I18n } from '../core/I18n.js';
import { defaultUnits, displayToKm, kmToDisplay, distanceUnit } from '../core/units.js';
import { addMonths } from '../core/dates.js';
import { bindOverlayClose } from './overlayClose.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import type { AppStore } from '../core/AppStore.js';
import type { Vehicle } from '../domain/Vehicle.js';
import type { EnergyType, VehicleType } from '../domain/events.js';
import { VEHICLE_TYPES } from '../domain/events.js';

const ENERGY_TYPES: EnergyType[] = ['fuel', 'electric', 'hybrid'];
/** Months after purchase for the first inspection: 4y for a vehicle bought
 *  new (odometer 0/empty), 2y for a used one. */
const FIRST_INSPECTION_MONTHS_NEW = 48;
const FIRST_INSPECTION_MONTHS_USED = 24;

/**
 * Vehicle create/edit modal. The odometer is displayed in the user's unit
 * system and converted back to km on save. Required fields (name,
 * acquisition date) are validated live — the save button stays disabled
 * while something is missing.
 */
export class VehicleEditor {
  static open(store: AppStore, vehicle?: Vehicle, container: HTMLElement = document.body): void {
    const units = defaultUnits(I18n.language);
    const editing = vehicle !== undefined;
    const typeOptions = VEHICLE_TYPES.map(t => {
      const label = I18n.t(`vehicleType.${t}`);
      return `<option value="${t}" ${vehicle?.data.vehicleType === t ? 'selected' : ''}>${label}</option>`;
    }).join('');
    const energyOptions = ENERGY_TYPES.map(t => {
      const label = I18n.t(`energy.${t}`);
      return `<option value="${t}" ${vehicle?.data.energyType === t ? 'selected' : ''}>${label}</option>`;
    }).join('');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 480px;">
        <h3 style="margin-top: 0;">${I18n.t(editing ? 'vehicles.editTitle' : 'vehicles.newTitle')}</h3>
        <div class="form-group">
          <label for="veh-name">${I18n.t('vehicles.name')} *</label>
          <input id="veh-name" class="form-control" type="text" required
                 value="${vehicle?.name ?? ''}" />
        </div>
        <div class="form-group">
          <label for="veh-type">${I18n.t('vehicles.vehicleType')}</label>
          <select id="veh-type" class="form-control">
            ${typeOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="veh-energy">${I18n.t('vehicles.energyType')}</label>
          <select id="veh-energy" class="form-control">
            ${energyOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="veh-date">${I18n.t('vehicles.acquisitionDate')} *</label>
          <input id="veh-date" class="form-control" type="date" required
                 value="${vehicle?.data.acquisitionDate ?? ''}" />
        </div>
        <div class="form-group">
          <label for="veh-odo">${I18n.t('vehicles.initialOdometer')} (${distanceUnit(units)})</label>
          <input id="veh-odo" class="form-control" type="number" min="0" step="1"
                 value="${vehicle ? kmToDisplay(vehicle.data.initialOdometerKm, units) : ''}" />
        </div>
        <div class="form-group">
          <label><input id="veh-ct-exempt" type="checkbox" ${vehicle?.data.inspectionExempt ? 'checked' : ''} /> ${I18n.t('vehicles.inspectionExempt')}</label>
        </div>
        <div id="veh-ct-fields">
          <div class="form-group">
            <label for="veh-ct-first">${I18n.t('vehicles.firstInspection')}</label>
            <input id="veh-ct-first" class="form-control" type="date"
                   value="${vehicle?.data.firstInspectionDate ?? ''}" />
          </div>
          <div class="form-group">
            <label for="veh-ct">${I18n.t('vehicles.inspectionPeriod')}</label>
            <input id="veh-ct" class="form-control" type="number" min="1" step="1"
                   value="${vehicle?.data.inspectionPeriodMonths ?? 24}" />
          </div>
        </div>
        <div class="modal-actions">
          <div class="modal-actions-left">
            ${editing ? `<button class="btn-danger" id="veh-delete">${I18n.t('common.delete')}</button>` : ''}
          </div>
          <div class="modal-actions-right">
            <button class="btn-secondary" id="veh-cancel">${I18n.t('common.cancel')}</button>
            <button class="btn-primary" id="veh-save" disabled>${I18n.t('common.save')}</button>
          </div>
        </div>
      </div>`;
    container.appendChild(overlay);

    const close = (): void => overlay.remove();
    const $ = <T extends HTMLElement>(sel: string): T => overlay.querySelector(sel) as T;
    const nameInput = $<HTMLInputElement>('#veh-name');
    const dateInput = $<HTMLInputElement>('#veh-date');
    const saveBtn = $<HTMLButtonElement>('#veh-save');
    const odoInput = $<HTMLInputElement>('#veh-odo');
    const firstCtInput = $<HTMLInputElement>('#veh-ct-first');

    /** Live validation: required fields are flagged and save stays
     *  disabled until all are filled. The first-inspection date is required
     *  unless the vehicle is marked as exempt. */
    const exemptBox = $<HTMLInputElement>('#veh-ct-exempt');
    const validate = (): void => {
      const checks: [HTMLInputElement, boolean][] = [
        [nameInput, nameInput.value.trim().length > 0],
        [dateInput, dateInput.value.length > 0],
        [firstCtInput, exemptBox.checked || firstCtInput.value.length > 0]
      ];
      let ok = true;
      for (const [input, valid] of checks) {
        input.classList.toggle('invalid-amount', !valid);
        if (!valid) ok = false;
      }
      saveBtn.disabled = !ok;
    };
    nameInput.addEventListener('input', validate);
    dateInput.addEventListener('input', validate);
    firstCtInput.addEventListener('input', validate);

    // The first inspection date is suggested from the acquisition date:
    // +4 years for a vehicle bought new (odometer 0/empty), +2 years for a
    // used one — computed until the user edits the field.
    let firstCtTouched = editing && !!vehicle!.data.firstInspectionDate;
    firstCtInput.addEventListener('input', () => { firstCtTouched = true; });
    const suggestFirstCt = (): void => {
      if (firstCtTouched || !dateInput.value) return;
      const odo = Number.parseFloat(odoInput.value);
      const months = (!Number.isFinite(odo) || odo === 0)
        ? FIRST_INSPECTION_MONTHS_NEW
        : FIRST_INSPECTION_MONTHS_USED;
      firstCtInput.value = addMonths(dateInput.value, months);
      validate(); // programmatic fill does not fire 'input'
    };
    odoInput.addEventListener('input', suggestFirstCt);
    dateInput.addEventListener('input', suggestFirstCt);

    // "Inspection exempt" hides the two CT fields and disables the reminder.
    const ctFields = $<HTMLDivElement>('#veh-ct-fields');
    const toggleCtFields = (): void => {
      ctFields.style.display = exemptBox.checked ? 'none' : '';
      validate();
    };
    exemptBox.addEventListener('change', toggleCtFields);
    toggleCtFields();

    $<HTMLButtonElement>('#veh-cancel').addEventListener('click', close);
    bindOverlayClose(overlay, close);

    saveBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      const date = dateInput.value;
      if (!name || !date) return;
      const odoRaw = Number.parseFloat(odoInput.value);
      const ctRaw = Number.parseInt($<HTMLInputElement>('#veh-ct').value, 10);

      const patch = {
        name,
        vehicleType: $<HTMLSelectElement>('#veh-type').value as VehicleType,
        energyType: $<HTMLSelectElement>('#veh-energy').value as EnergyType,
        acquisitionDate: date,
        initialOdometerKm: Number.isFinite(odoRaw) ? Math.round(displayToKm(odoRaw, units)) : 0,
        inspectionPeriodMonths: Number.isFinite(ctRaw) && ctRaw > 0 ? ctRaw : 24,
        firstInspectionDate: firstCtInput.value || undefined,
        inspectionExempt: exemptBox.checked || undefined
      };
      if (editing) {
        void store.updateVehicle(vehicle.id, patch);
      } else {
        void store.addVehicle(patch);
      }
      close();
    });

    $<HTMLButtonElement>('#veh-delete')?.addEventListener('click', () => {
      void ConfirmDialog.ask(I18n.t('vehicles.deleteConfirm'), container).then(ok => {
        if (ok && vehicle) void store.removeVehicle(vehicle.id);
        close();
      });
    });
  }
}
