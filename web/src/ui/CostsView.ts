import { I18n } from '../core/I18n.js';
import { activeUnits, formatDistance, distanceUnit, kmToDisplay } from '../core/units.js';
import { formatAmount } from './format.js';
import { todayString } from '../core/dates.js';
import { loadInflationIndex, type InflationIndex, type CpiSeries } from '../core/inflation.js';
import { Settings } from '../core/settings.js';
import { yearlyReport, costBreakdown, isRented } from '../domain/costs.js';
import { HelpPopover } from './HelpPopover.js';
import { DropdownMenu } from './DropdownMenu.js';
import { CHART_ICON } from './icons.js';
import type { BreakdownKey, YearReport } from '../domain/costs.js';
import { COST_CATEGORIES } from '../domain/events.js';
import type { CostCategory } from '../domain/events.js';
import type { Vehicle } from '../domain/Vehicle.js';
import { componentStyles } from './componentStyles.js';

const CSS = `
/* The table scrolls in its own area (header stays visible) so a chart
 * above it can never push every row off screen. */
.analysis-scroll { overflow: auto; max-height: 45vh; min-height: 8rem; }
.analysis-table thead th { position: sticky; top: 0; z-index: 1; background: var(--card-bg); }
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
.analysis-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}
/* Header cell: label, optional "?" and the chart toggle on one line. */
.col-head { display: inline-flex; align-items: center; gap: 2px; white-space: nowrap; }
.col-chart-btn {
  display: inline-flex;
  padding: 2px;
  border: none;
  border-radius: var(--radius-sm, 4px);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
.col-chart-btn:hover { color: var(--text); background: var(--color-accent-soft); }
.col-chart-btn.active { color: var(--accent); background: var(--color-accent-soft); }
.analysis-chart { margin-bottom: var(--space-md); }
.analysis-chart-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-xs); }
.analysis-chart-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--text-muted); }
.analysis-chart-close {
  width: 1.8rem;
  height: 1.8rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}
.analysis-chart-close:hover { background: var(--color-accent-soft); color: var(--text); }
.analysis-chart-scroll { overflow-x: auto; overflow-y: hidden; }
.analysis-chart-scroll svg { display: block; max-width: none; }
.analysis-chart-bar { fill: var(--accent); }
.analysis-chart-grid { stroke: var(--card-border); stroke-width: 1; }
.analysis-chart-label { fill: var(--text-muted); font-size: 10px; font-family: var(--font-base); }
/* "Euros constants" stays outside the collapsible category filters —
 * it's a display option, not a filter. */
.constant-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}
.cat-breakdown { font-size: var(--font-size-sm); margin-top: var(--space-lg); }
.cat-breakdown summary {
  cursor: pointer;
  font-weight: var(--font-weight-semibold);
  color: var(--text-muted);
}
/* Rows on the left, pie on the right; the pie drops below when narrow. */
.breakdown-body { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-lg); }
.breakdown-rows { flex: 1 1 16rem; }
.breakdown-pie { flex: 0 0 auto; width: 9rem; height: 9rem; margin: 0 auto; }
/* Labels must not steal the hover from the slice tooltip underneath. */
.breakdown-pie-label {
  fill: #fff;
  font-size: 9px;
  font-weight: 600;
  font-family: var(--font-base);
  text-anchor: middle;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.35);
  stroke-width: 2px;
  pointer-events: none;
}
.cat-swatch {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  margin-right: var(--space-xs);
  border-radius: 2px;
}
.cat-breakdown .cat-total {
  border-bottom: none;
  border-top: 2px solid var(--card-border);
  font-weight: var(--font-weight-semibold);
}
.cat-breakdown .cat-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  border-bottom: 1px dashed var(--card-border);
}
/* "Dépenses" (cash outflows) gets a neutral pale-grey tint. */
.analysis-table td.col-expenses, .analysis-table th.col-expenses {
  background: rgba(128, 128, 128, 0.12);
}
`;

const BREAKDOWN_COLORS: Record<BreakdownKey, string> = {
  depreciation: '#6c8ebf', rent: '#6c8ebf', acquisition: '#6c8ebf',
  fuel: '#e0a030', maintenance: '#5aa469', repair: '#d0605e',
  inspection: '#9a7bc4', insurance: '#3fa7a7', other: '#8a8f98'
};

type ColumnId = 'expenses' | 'depreciation' | 'ownership' | 'usage' | 'tco' | 'km' | 'usagePerKm' | 'costPerKm';

interface Column {
  id: ColumnId;
  header: string;
  /** Label in the columns menu and the chart title. */
  menuLabel: string;
  value: (r: YearReport) => number | undefined;
  format: (v: number) => string;
  /** Key of the "?" explanation, when the column has one. */
  helpKey?: string;
  className?: string;
  strong?: boolean;
}

/**
 * Per-vehicle cost analysis: yearly table (cash expenses, depreciation,
 * ownership and usage costs, per-distance costs) with user-selectable
 * columns, a free-period per-category breakdown and an on-demand bar chart
 * of any column. Category checkboxes exclude costs from every figure.
 */
export class CostsView {
  private readonly filter = new Set<CostCategory>(COST_CATEGORIES);
  private readonly hidden: Set<ColumnId>;
  private chartColumn?: ColumnId;
  private breakdownOpen = true;
  private from: string;
  private to = todayString();
  private constantEuros = false;
  private index?: InflationIndex;
  private indexFailed = false;
  private menuColumns: Column[] = [];

  constructor(private readonly vehicle: Vehicle, private readonly host: HTMLElement) {
    componentStyles('costs-view', CSS);
    this.from = vehicle.data.acquisitionDate;
    this.hidden = new Set((Settings.load().get('analysisHiddenColumns') ?? []) as ColumnId[]);
    this.render();
  }

  /** Price-level factor for display: INSEE factor in constant euros, 1 otherwise. */
  private readonly factor = (date: string): number =>
    this.constantEuros && this.index ? this.index.factorFor(date) : 1;

  /** Every column, in display order; depreciation is dropped for rentals. */
  private allColumns(rented: boolean): Column[] {
    const units = activeUnits();
    const unit = distanceUnit(units);
    const perUnit = kmToDisplay(1, units); // per-km figures → per-distance-unit figures
    const amount = (id: ColumnId, key: string, value: (r: YearReport) => number | undefined, extra: Partial<Column> = {}): Column =>
      ({ id, header: I18n.t(key), menuLabel: I18n.t(key), value, format: formatAmount, ...extra });
    const perDistance = (id: ColumnId, key: string, value: (r: YearReport) => number | undefined): Column => {
      const label = `${I18n.t(key)}/${unit}`;
      return { id, header: label, menuLabel: label, value: r => { const v = value(r); return v === undefined ? undefined : v / perUnit; }, format: formatAmount };
    };
    const columns: Column[] = [
      amount('expenses', 'analysis.expenses', r => r.expenses, { helpKey: 'expenses', className: 'col-expenses' }),
      ...(rented ? [] : [amount('depreciation', 'analysis.depreciation', r => r.depreciation)]),
      amount('ownership', 'analysis.ownership', r => r.ownership, { helpKey: 'ownership' }),
      amount('usage', 'analysis.usage', r => r.usage, { helpKey: 'usage' }),
      amount('tco', 'analysis.tco', r => r.tco, { strong: true }),
      {
        id: 'km', header: unit, menuLabel: `${I18n.t('analysis.distance')} (${unit})`,
        value: r => r.km, format: v => formatDistance(v, units)
      },
      perDistance('usagePerKm', 'analysis.usage', r => r.usageCostPerKm),
      perDistance('costPerKm', 'analysis.tco', r => r.costPerKm)
    ];
    return columns;
  }

  private render(): void {
    const rented = isRented(this.vehicle); // rented vehicles have no depreciation column
    const all = this.allColumns(rented);
    this.menuColumns = all;
    const cols = all.filter(c => !this.hidden.has(c.id));
    if (this.chartColumn && !cols.some(c => c.id === this.chartColumn)) this.chartColumn = undefined;
    const report = yearlyReport(this.vehicle, this.filter, undefined, this.factor);
    const breakdown = costBreakdown(this.vehicle, this.from, this.to, this.filter, this.factor).filter(r => r.amount !== 0);

    const sum = (f: (r: YearReport) => number): number => report.reduce((acc, r) => acc + f(r), 0);
    const totalKm = sum(r => r.km ?? 0);
    const perKm = (amount: number): number | undefined => totalKm > 0 ? amount / totalKm : undefined;
    const total: YearReport = {
      year: 0, expenses: sum(r => r.expenses), costs: sum(r => r.costs), depreciation: sum(r => r.depreciation),
      ownership: sum(r => r.ownership), usage: sum(r => r.usage), tco: sum(r => r.tco),
      km: totalKm > 0 ? totalKm : undefined,
      usageCostPerKm: perKm(sum(r => r.usage)), costPerKm: perKm(sum(r => r.tco))
    };
    const cell = (c: Column, r: YearReport): string => {
      const v = c.value(r);
      const text = v === undefined ? '—' : c.format(v);
      return `<td${c.className ? ` class="${c.className}"` : ''}>${c.strong ? `<strong>${text}</strong>` : text}</td>`;
    };
    const chartLabel = I18n.t('analysis.chartToggle');
    const header = (c: Column): string => {
      const active = this.chartColumn === c.id;
      return `<th${c.className ? ` class="${c.className}"` : ''}><span class="col-head">${c.header}${c.helpKey ? HelpPopover.getHtml(c.helpKey) : ''}<button type="button" class="col-chart-btn${active ? ' active' : ''}" data-chart="${c.id}" aria-pressed="${active}" aria-label="${chartLabel}" title="${chartLabel}">${CHART_ICON}</button></span></th>`;
    };
    const chartCol = cols.find(c => c.id === this.chartColumn);
    this.host.innerHTML = `
      <div class="analysis-toolbar">
        ${DropdownMenu.getHtml({
          id: 'analysis-filters',
          label: I18n.t('analysis.filters'),
          active: this.filter.size < COST_CATEGORIES.length
        })}
        ${DropdownMenu.getHtml({
          id: 'analysis-columns',
          label: I18n.t('analysis.columns'),
          active: this.hidden.size > 0
        })}
        <label class="constant-label" title="${I18n.t('analysis.constantEurosHint')}">
          <input type="checkbox" id="an-constant" ${this.constantEuros ? 'checked' : ''} ${this.indexFailed ? 'disabled' : ''} />
          ${I18n.t('analysis.constantEuros')} <span class="category-chip">${I18n.t('analysis.franceBadge')}</span>
        </label>
      </div>
      ${this.constantEuros && this.index ? `<p class="inflation-banner" style="margin:0 0 var(--space-md)">${I18n.t('analysis.constantEurosNote', { month: I18n.formatDate(this.index.latestMonth + '-01') })}</p>` : ''}
      ${chartCol ? this.chartHtml(report, chartCol) : ''}
      <div class="analysis-scroll">
        <table class="analysis-table">
          <thead><tr>
            <th>${I18n.t('analysis.year')}</th>
            ${cols.map(header).join('')}
          </tr></thead>
          <tbody>
            ${report.map(r => `<tr><td>${r.year}</td>${cols.map(c => cell(c, r)).join('')}</tr>`).join('')}
          </tbody>
          <tfoot><tr><td>${I18n.t('analysis.total')}</td>${cols.map(c => cell({ ...c, strong: false }, total)).join('')}</tr></tfoot>
        </table>
      </div>
      <details class="cat-breakdown" id="an-breakdown" ${this.breakdownOpen ? 'open' : ''}>
        <summary>${I18n.t('analysis.breakdown')}</summary>
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
        <div class="breakdown-body">
          <div class="breakdown-rows">
            ${breakdown.map(r => `<div class="cat-row"><span><i class="cat-swatch" style="background:${BREAKDOWN_COLORS[r.key]}"></i>${this.breakdownLabel(r.key)}</span><strong>${formatAmount(r.amount)}</strong></div>`).join('')}
            <div class="cat-row cat-total"><span>${I18n.t('analysis.total')}</span><strong>${formatAmount(breakdown.reduce((acc, r) => acc + r.amount, 0))}</strong></div>
          </div>
          ${this.pieHtml(breakdown)}
        </div>
      </details>`;

    const scroller = this.host.querySelector<HTMLElement>('.analysis-chart-scroll');
    if (scroller) scroller.scrollLeft = scroller.scrollWidth; // most recent years first

    this.host.querySelectorAll<HTMLElement>('.col-chart-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.chart as ColumnId;
        this.chartColumn = this.chartColumn === id ? undefined : id;
        this.render();
      });
    });
    this.host.querySelector<HTMLDetailsElement>('#an-breakdown')!.addEventListener('toggle', (e) => {
      this.breakdownOpen = (e.target as HTMLDetailsElement).open;
    });
    this.host.querySelector('.analysis-chart-close')?.addEventListener('click', () => {
      this.chartColumn = undefined;
      this.render();
    });
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
    // The checkboxes live in the DropdownMenu panels, attached to
    // document.body — they survive the re-render every toggle triggers.
    const bindFilterCheckboxes = (root: ParentNode): void => {
      root.querySelectorAll<HTMLInputElement>('[data-cat]').forEach(cb => {
        cb.addEventListener('change', () => {
          const cat = cb.dataset.cat as CostCategory;
          if (cb.checked) this.filter.add(cat); else this.filter.delete(cat);
          this.render();
        });
      });
    };
    DropdownMenu.register('analysis-filters',
      () => COST_CATEGORIES.map(c => this.filterLabelHtml(c)).join(''),
      bindFilterCheckboxes,
      () => { COST_CATEGORIES.forEach(c => this.filter.add(c)); this.render(); });
    const bindColumnCheckboxes = (root: ParentNode): void => {
      root.querySelectorAll<HTMLInputElement>('[data-col]').forEach(cb => {
        cb.addEventListener('change', () => {
          const id = cb.dataset.col as ColumnId;
          if (cb.checked) this.hidden.delete(id); else this.hidden.add(id);
          this.saveHidden();
          this.render();
        });
      });
    };
    DropdownMenu.register('analysis-columns',
      () => this.menuColumns.map(c => this.columnLabelHtml(c)).join(''),
      bindColumnCheckboxes,
      () => { this.hidden.clear(); this.saveHidden(); this.render(); });
    // Circled "?" buttons explain what each cost column contains.
    HelpPopover.bind(this.host, key => ({
      title: I18n.t(`analysis.${key}`),
      body: I18n.t(key === 'ownership' && rented ? 'analysis.ownershipHintRented' : `analysis.${key}Hint`)
    }));
    this.host.querySelector('#an-from')!.addEventListener('change', (e) => {
      this.from = (e.target as HTMLInputElement).value;
      this.render();
    });
    this.host.querySelector('#an-to')!.addEventListener('change', (e) => {
      this.to = (e.target as HTMLInputElement).value;
      this.render();
    });
  }

  /** Pie chart of the breakdown (positive lines only); slice colors match
   *  the swatches of the rows. Empty when there is nothing to share. */
  private pieHtml(rows: { key: BreakdownKey; amount: number }[]): string {
    const slices = rows.filter(r => r.amount > 0);
    const total = slices.reduce((acc, r) => acc + r.amount, 0);
    if (total <= 0) return '';
    const c = 64, radius = 60;
    const coords = (turn: number, r = radius): [number, number] => {
      const a = (turn - 0.25) * 2 * Math.PI; // start at 12 o'clock
      return [c + r * Math.cos(a), c + r * Math.sin(a)];
    };
    const point = (turn: number): string => coords(turn).join(' ');
    let start = 0;
    const paths = slices.map(r => {
      const share = r.amount / total;
      const end = start + share;
      const tip = `<title>${this.breakdownLabel(r.key)} — ${formatAmount(r.amount)} (${I18n.formatNumber(share * 100, { maximumFractionDigits: 1 })} %)</title>`;
      const shape = share >= 1
        ? `<circle cx="${c}" cy="${c}" r="${radius}" fill="${BREAKDOWN_COLORS[r.key]}">${tip}</circle>`
        : `<path d="M${c} ${c} L${point(start)} A${radius} ${radius} 0 ${share > 0.5 ? 1 : 0} 1 ${point(end)} Z" fill="${BREAKDOWN_COLORS[r.key]}">${tip}</path>`;
      // The percentage is written in the slice when it is wide enough.
      const mid = (start + end) / 2;
      const [lx, ly] = share >= 1 ? [c, c] : coords(mid, radius * 0.62);
      const label = share >= 0.06
        ? `<text class="breakdown-pie-label" x="${lx}" y="${ly + 3}">${I18n.formatNumber(share * 100, { maximumFractionDigits: 0 })} %</text>`
        : '';
      start = end;
      return shape + label;
    }).join('');
    return `<svg class="breakdown-pie" viewBox="0 0 128 128" role="img" aria-label="${I18n.t('analysis.breakdown')}">${paths}</svg>`;
  }

  private breakdownLabel(key: BreakdownKey): string {
    return I18n.t(key === 'depreciation' || key === 'rent' ? `analysis.${key}` : `categories.${key}`);
  }

  private saveHidden(): void {
    Settings.load().set('analysisHiddenColumns', [...this.hidden]);
  }

  /** One category checkbox row — used by the inline row and the mobile panel. */
  private filterLabelHtml(c: CostCategory): string {
    const label = I18n.t(`categories.${c}`);
    return `<label><input type="checkbox" data-cat="${c}" ${this.filter.has(c) ? 'checked' : ''} /> ${label}</label>`;
  }

  /** One column checkbox row of the columns menu. */
  private columnLabelHtml(c: Column): string {
    return `<label><input type="checkbox" data-col="${c.id}" ${this.hidden.has(c.id) ? '' : 'checked'} /> ${c.menuLabel}</label>`;
  }

  /** SVG bar chart of one column: years in abscissa, amounts in ordinate,
   *  in a horizontally scrollable area. */
  private chartHtml(report: YearReport[], col: Column): string {
    if (report.length === 0) return '';
    const left = 52, top = 18, bottom = 34, plotH = 170, step = 64, barW = 40;
    const w = left + report.length * step + 8;
    const h = top + plotH + bottom;
    const values = report.map(r => col.value(r) ?? 0);
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    const span = max - min || 1;
    const y = (v: number): number => top + (max - v) / span * plotH;
    const digits = span < 10 ? 2 : 0;
    const grid = Array.from({ length: 5 }, (_, i) => {
      const v = min + span * i / 4;
      return `<line class="analysis-chart-grid" x1="${left}" x2="${w}" y1="${y(v)}" y2="${y(v)}"/>
        <text class="analysis-chart-label" x="${left - 4}" y="${y(v) + 3}" text-anchor="end">${I18n.formatNumber(v, { maximumFractionDigits: digits })}</text>`;
    }).join('');
    const bars = report.map((r, i) => {
      const raw = col.value(r);
      const v = raw ?? 0;
      const bx = left + i * step + (step - barW) / 2;
      const by = v >= 0 ? y(v) : y(0);
      const bh = Math.max(1, Math.abs(y(v) - y(0)));
      const ty = v >= 0 ? by - 4 : by + bh + 11;
      return `
        <rect class="analysis-chart-bar" x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="3"/>
        <text class="analysis-chart-label" x="${bx + barW / 2}" y="${ty}" text-anchor="middle">${raw === undefined ? '—' : I18n.formatNumber(raw, { maximumFractionDigits: digits })}</text>
        <text class="analysis-chart-label" x="${bx + barW / 2}" y="${h - 6}" text-anchor="middle">${r.year}</text>`;
    }).join('');
    return `<div class="analysis-chart">
      <div class="analysis-chart-head">
        <span class="analysis-chart-title">${col.menuLabel}</span>
        <button type="button" class="analysis-chart-close" aria-label="${I18n.t('common.close')}">×</button>
      </div>
      <div class="analysis-chart-scroll"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${col.menuLabel}">${grid}${bars}</svg></div>
    </div>`;
  }
}
