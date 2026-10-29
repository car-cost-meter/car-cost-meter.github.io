import { I18n } from '../core/I18n.js';
import { defaultUnits, formatDistance, distanceUnit } from '../core/units.js';
import { formatAmount } from './format.js';
import { todayString } from '../core/dates.js';
import { loadInflationIndex, type InflationIndex, type CpiSeries } from '../core/inflation.js';
import { Settings } from '../core/settings.js';
import { yearlyReport, costsByCategory, isRented } from '../domain/costs.js';
import type { YearReport } from '../domain/costs.js';
import { COST_CATEGORIES } from '../domain/events.js';
import type { CostCategory } from '../domain/events.js';
import type { Vehicle } from '../domain/Vehicle.js';
import { componentStyles } from './componentStyles.js';

const CSS = `
.analysis-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-md);
  font-size: var(--font-size-sm);
}
.analysis-filters label { display: flex; align-items: center; gap: var(--space-xs); color: var(--text-muted); }
.analysis-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.analysis-table th, .analysis-table td {
  padding: var(--space-xs) var(--space-sm);
  text-align: right;
  border-bottom: 1px solid var(--card-border);
}
.analysis-table th:first-child, .analysis-table td:first-child {
  text-align: left;
  width: 1%; /* year column shrinks to its content */
  white-space: nowrap;
}
.analysis-table th { color: var(--text-muted); font-weight: var(--font-weight-semibold); text-align: center; }
.analysis-table tfoot td {
  border-top: 2px solid var(--card-border);
  border-bottom: none;
  font-weight: var(--font-weight-semibold);
}
.analysis-period {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--space-sm);
  margin: var(--space-lg) 0 var(--space-sm);
}
.analysis-period .form-group { margin-bottom: 0; }
.analysis-period .form-control { width: auto; }
.analysis-chart { margin-top: var(--space-lg); }
.analysis-chart svg { display: block; width: 100%; height: auto; }
.analysis-chart-bar { fill: var(--accent); }
.analysis-chart-label { fill: var(--text-muted); font-size: 10px; font-family: var(--font-base); }
/* "Euros constants" stays outside the collapsible category filters —
 * it's a display option, not a filter. */
.constant-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-md);
}
/* Filters collapse into a dropdown on narrow screens. */
.analysis-filter-wrap { position: relative; }
.filters-toggle { display: none; }
@media (max-width: 640px) {
  .filters-toggle { display: inline-flex; margin-bottom: var(--space-sm); }
  .analysis-filters {
    display: none;
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 60;
    flex-direction: column;
    min-width: 13rem;
    padding: var(--space-sm) var(--space-md);
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
  .analysis-filter-wrap.open .analysis-filters { display: flex; }
}
/* Value drawn inside a bar — right-aligned to the bar's right edge. */
.analysis-chart-value { fill: #fff; font-size: 10px; font-family: var(--font-base); text-anchor: end; }
.cat-breakdown { font-size: var(--font-size-sm); }
.cat-breakdown .cat-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  border-bottom: 1px dashed var(--card-border);
}
/* "Dépenses" (cash outflows) is tinted to stand out from the cost view. */
.analysis-table td.col-expenses, .analysis-table th.col-expenses {
  background: var(--color-accent-soft);
}
`;

/**
 * Per-vehicle cost analysis: yearly TCO table (depreciation + recorded
 * costs), €/km, a free-period per-category breakdown and a small SVG bar
 * chart. Category checkboxes exclude costs from every figure.
 */
export class CostsView {
  private readonly filter = new Set<CostCategory>(COST_CATEGORIES);
  /** Mobile filter menu open state — survives the re-render every
   *  checkbox change triggers. */
  private filtersOpen = false;
  private from: string;
  private to = todayString();
  private constantEuros = false;
  private index?: InflationIndex;
  private indexFailed = false;

  constructor(private readonly vehicle: Vehicle, private readonly host: HTMLElement) {
    componentStyles('costs-view', CSS);
    this.from = vehicle.data.acquisitionDate;
    this.render();
  }

  /** Price-level factor for display: INSEE factor in constant euros, 1 otherwise. */
  private readonly factor = (date: string): number =>
    this.constantEuros && this.index ? this.index.factorFor(date) : 1;

  private render(): void {
    const units = defaultUnits(I18n.language);
    const report = yearlyReport(this.vehicle, this.filter, undefined, this.factor);
    const breakdown = costsByCategory(this.vehicle, this.from, this.to, this.factor);

    const rented = isRented(this.vehicle); // rented vehicles have no depreciation column
    const total = report.reduce((acc, r) => ({
      expenses: acc.expenses + r.expenses,
      costs: acc.costs + r.costs,
      depreciation: acc.depreciation + r.depreciation,
      tco: acc.tco + r.tco,
      km: (acc.km ?? 0) + (r.km ?? 0)
    }), { expenses: 0, costs: 0, depreciation: 0, tco: 0, km: 0 });
    const totalCostPerKm = total.km > 0 ? total.tco / total.km : undefined;
    this.host.innerHTML = `
      <div class="analysis-filter-wrap" id="an-filter-wrap">
        <button class="btn-secondary filters-toggle" id="an-filters-toggle">${I18n.t('analysis.filters')}</button>
        <div class="analysis-filters">
        ${COST_CATEGORIES.map(c => {
          const label = I18n.t(`categories.${c}`);
          return `<label><input type="checkbox" data-cat="${c}" ${this.filter.has(c) ? 'checked' : ''} /> ${label}</label>`;
        }).join('')}
        </div>
        <label class="constant-label" title="${I18n.t('analysis.constantEurosHint')}">
          <input type="checkbox" id="an-constant" ${this.constantEuros ? 'checked' : ''} ${this.indexFailed ? 'disabled' : ''} />
          ${I18n.t('analysis.constantEuros')} <span class="category-chip">${I18n.t('analysis.franceBadge')}</span>
        </label>
      </div>
      ${this.constantEuros && this.index ? `<p class="inflation-banner" style="margin:0 0 var(--space-md)">${I18n.t('analysis.constantEurosNote', { month: I18n.formatDate(this.index.latestMonth + '-01') })}</p>` : ''}
      ${this.chartHtml(report)}
      <table class="analysis-table">
        <thead><tr>
          <th>${I18n.t('analysis.year')}</th>
          <th class="col-expenses" title="${I18n.t('analysis.expensesHint')}">${I18n.t('analysis.expenses')}</th>
          <th title="${I18n.t(rented ? 'analysis.costsHintRented' : 'analysis.costsHint')}">${I18n.t('analysis.costs')}</th>
          ${rented ? '' : `<th>${I18n.t('analysis.depreciation')}</th>`}
          <th>${I18n.t('analysis.tco')}</th>
          <th>${distanceUnit(units)}</th>
          <th>${I18n.t('analysis.costPerKm')}</th>
        </tr></thead>
        <tbody>
          ${report.map(r => `<tr>
            <td>${r.year}</td>
            <td class="col-expenses">${formatAmount(r.expenses)}</td>
            <td>${formatAmount(r.costs)}</td>
            ${rented ? '' : `<td>${formatAmount(r.depreciation)}</td>`}
            <td><strong>${formatAmount(r.tco)}</strong></td>
            <td>${r.km !== undefined ? formatDistance(r.km, units) : '—'}</td>
            <td>${r.costPerKm !== undefined ? formatAmount(r.costPerKm) : '—'}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr>
          <td>${I18n.t('analysis.total')}</td>
          <td class="col-expenses">${formatAmount(total.expenses)}</td>
          <td>${formatAmount(total.costs)}</td>
          ${rented ? '' : `<td>${formatAmount(total.depreciation)}</td>`}
          <td>${formatAmount(total.tco)}</td>
          <td>${total.km > 0 ? formatDistance(total.km, units) : '—'}</td>
          <td>${totalCostPerKm !== undefined ? formatAmount(totalCostPerKm) : '—'}</td>
        </tr></tfoot>
      </table>
      <div class="analysis-period">
        <div class="form-group">
          <label>${I18n.t('events.from')}</label>
          <input id="an-from" class="form-control" type="date" value="${this.from}" />
        </div>
        <div class="form-group">
          <label>${I18n.t('events.to')}</label>
          <input id="an-to" class="form-control" type="date" value="${this.to}" />
        </div>
      </div>
      <div class="cat-breakdown">
        ${[...breakdown.entries()].sort((a, b) => b[1] - a[1]).map(([cat, amount]) => {
          const label = I18n.t(`categories.${cat}`);
          return `<div class="cat-row"><span>${label}</span><strong>${formatAmount(amount)}</strong></div>`;
        }).join('')}
        ${breakdown.size === 0 ? `<p class="detail-empty">${I18n.t('detail.empty')}</p>` : ''}
      </div>`;

    this.host.querySelector<HTMLInputElement>('#an-constant')?.addEventListener('change', (e) => {
      this.constantEuros = (e.target as HTMLInputElement).checked;
      if (this.constantEuros && this.index === undefined && !this.indexFailed) {
        const series = (Settings.load().get('cpiSeries') ?? 'horsTabac') as CpiSeries;
        void loadInflationIndex(series)
          .then(index => { this.index = index; this.render(); })
          .catch(err => { console.error('INSEE index unavailable:', err); this.indexFailed = true; this.constantEuros = false; this.render(); });
      }
      this.render();
    });
    // Mobile filters menu — opens below the button, closes on outside
    // click; `filtersOpen` restores it after each render.
    const wrap = this.host.querySelector<HTMLElement>('#an-filter-wrap')!;
    wrap.classList.toggle('open', this.filtersOpen);
    const onDocClick = (e: Event): void => {
      if (!wrap.contains(e.target as Node)) {
        this.filtersOpen = false;
        wrap.classList.remove('open');
        document.removeEventListener('click', onDocClick);
      }
    };
    this.host.querySelector('#an-filters-toggle')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.filtersOpen = !this.filtersOpen;
      wrap.classList.toggle('open', this.filtersOpen);
      if (this.filtersOpen) document.addEventListener('click', onDocClick);
    });
    this.host.querySelectorAll<HTMLInputElement>('[data-cat]').forEach(cb => {
      cb.addEventListener('change', () => {
        const cat = cb.dataset.cat as CostCategory;
        if (cb.checked) this.filter.add(cat); else this.filter.delete(cat);
        this.render();
      });
    });
    this.host.querySelector('#an-from')!.addEventListener('change', (e) => {
      this.from = (e.target as HTMLInputElement).value;
      this.render();
    });
    this.host.querySelector('#an-to')!.addEventListener('change', (e) => {
      this.to = (e.target as HTMLInputElement).value;
      this.render();
    });
  }

  /** Simple SVG bar chart of yearly TCO. */
  private chartHtml(report: YearReport[]): string {
    if (report.length === 0) return '';
    const w = 600;
    const barH = 22;
    const gap = 6;
    const labelW = 44;
    const max = Math.max(...report.map(r => r.tco), 1);
    const h = report.length * (barH + gap);
    const bars = report.map((r, i) => {
      const bw = Math.max(1, (r.tco / max) * (w - labelW - 8));
      const y = i * (barH + gap);
      const value = I18n.formatNumber(r.tco, { maximumFractionDigits: 0 });
      // The value goes inside the bar, stuck to its right edge, when it
      // fits (~6px/digit at 10px font); next to the bar otherwise — small
      // bars leave plenty of room on their right either way.
      const inside = bw >= value.length * 6 + 12;
      const vx = inside ? labelW + bw - 4 : labelW + bw + 5;
      const cls = inside ? 'analysis-chart-value' : 'analysis-chart-label';
      return `
        <text class="analysis-chart-label" x="0" y="${y + barH / 2 + 3}">${r.year}</text>
        <rect class="analysis-chart-bar" x="${labelW}" y="${y}" width="${bw}" height="${barH}" rx="3"/>
        <text class="${cls}" x="${vx}" y="${y + barH / 2 + 3}">${value}</text>`;
    }).join('');
    return `<div class="analysis-chart"><svg viewBox="0 0 ${w} ${h}" role="img">${bars}</svg></div>`;
  }
}
