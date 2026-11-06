import { componentStyles } from './componentStyles.js';

const CSS = `
/* Trigger — a discreet inline element, not a button. */
.dropdown-menu-trigger {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-sm);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-pill); /* chip look — rounder than a button */
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
  user-select: none;
}
.dropdown-menu-trigger:hover { color: var(--text); background: var(--accent-soft); }
/* Filter-state glyph: "+" = nothing filtered, "×" = filter active. */
.dropdown-menu-trigger .filter-state {
  margin-right: var(--space-xs);
  font-weight: var(--font-weight-semibold);
}
/* Active state — the trigger turns accent-tinted. */
.dropdown-menu-trigger.filter-active {
  background: var(--color-accent-soft);
  color: var(--accent);
  font-weight: var(--font-weight-semibold);
}
.dropdown-menu-panel {
  position: fixed;
  z-index: 60;
  min-width: 13rem;
  padding: var(--space-sm) var(--space-md);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  font-size: var(--font-size-sm);
}
.dropdown-menu-panel label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) 0;
  color: var(--text-muted);
}
`;

/**
 * Dropdown menu on the mon-patrimoine popover model: the panel is
 * appended to `document.body` (it survives host re-renders) and a single
 * delegated document listener drives triggers and outside clicks —
 * no listener is ever re-attached, so nothing goes stale.
 *
 *   html:  `${DropdownMenu.getHtml({ id: 'x', label, buttonClass })}`
 *   wire:  `DropdownMenu.register('x', () => panelHtml, onBound)`
 */
export class DropdownMenu {
  /** Emits the trigger carrying `data-dropdown-id`. When `active` is
   *  defined the component renders its state glyph before the label:
   *  "×" (active — click clears via `register`'s onClear) or "+". */
  static getHtml(opts: { id: string; label: string; buttonClass?: string; active?: boolean }): string {
    componentStyles('dropdown-menu', CSS);
    const mark = opts.active ? '×' : '+';
    const glyph = opts.active === undefined ? '' : `<span class="filter-state">${mark}</span>`;
    const cls = `dropdown-menu-trigger ${opts.active ? 'filter-active' : ''} ${opts.buttonClass ?? ''}`.trim();
    return `<span class="${cls}" role="button" tabindex="0" data-dropdown-id="${opts.id}" aria-expanded="false">${glyph}${opts.label}</span>`;
  }

  /** Registers the panel content of a dropdown id; `onBound` wires
   *  listeners inside the panel each time it opens; `onClear` runs when
   *  the "×" state glyph is clicked (the panel closes first). */
  static register(id: string, content: () => string, onBound?: (panel: HTMLElement) => void, onClear?: () => void): void {
    contents.set(id, content);
    if (onBound) boundHooks.set(id, onBound);
    if (onClear) clearHandlers.set(id, onClear);
  }

  /** Closes the open panel, if any. */
  static close(): void {
    hide();
  }
}

interface PanelState { panel: HTMLElement; ownerId: string }

let open: PanelState | null = null;
const contents = new Map<string, () => string>();
const boundHooks = new Map<string, (panel: HTMLElement) => void>();
const clearHandlers = new Map<string, () => void>();

function positionPanel(panel: HTMLElement, trigger: HTMLElement): void {
  const rect = trigger.getBoundingClientRect();
  const margin = 8;
  let left = rect.left;
  if (left + panel.offsetWidth > window.innerWidth - margin) {
    left = window.innerWidth - panel.offsetWidth - margin;
  }
  let top = rect.bottom + 4;
  if (top + panel.offsetHeight > window.innerHeight - margin) {
    top = rect.top - panel.offsetHeight - 4;
  }
  panel.style.left = `${Math.max(margin, left)}px`;
  panel.style.top = `${Math.max(margin, top)}px`;
}

function show(id: string, trigger: HTMLElement): void {
  hide();
  const make = contents.get(id);
  if (!make) return;
  const panel = document.createElement('div');
  panel.className = 'dropdown-menu-panel';
  panel.innerHTML = make();
  document.body.appendChild(panel);
  open = { panel, ownerId: id };
  trigger.setAttribute('aria-expanded', 'true');
  positionPanel(panel, trigger);
  boundHooks.get(id)?.(panel);
}

function hide(): void {
  open?.panel.remove();
  open = null;
}

function onDocumentClick(e: Event): void {
  const target = e.target as HTMLElement;
  const trigger = target.closest('.dropdown-menu-trigger') as HTMLElement | null;
  if (trigger) {
    const id = trigger.dataset.dropdownId!;
    // The "×" glyph clears (only while active); "+" falls through to the toggle.
    if (target.closest('.filter-state') && trigger.classList.contains('filter-active')) {
      const onClear = clearHandlers.get(id);
      hide();
      onClear?.();
      return;
    }
    if (open?.ownerId === id) hide(); else show(id, trigger);
    return;
  }
  if (open && !open.panel.contains(target)) hide();
}

let initialized = false;
function init(): void {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { hide(); return; }
    const target = e.target as HTMLElement;
    const trigger = target.closest('.dropdown-menu-trigger') as HTMLElement | null;
    if (trigger && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const id = trigger.dataset.dropdownId!;
      if (open?.ownerId === id) hide(); else show(id, trigger);
    }
  });
  document.addEventListener('scroll', hide, true); // fixed panel must not detach
}
init();
