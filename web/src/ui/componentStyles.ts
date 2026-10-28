/**
 * Component-embedded CSS: each UI component ships its styles in its .ts
 * file (never in index.html) and injects them once under a named key.
 */
const injected = new Set<string>();

export function componentStyles(key: string, css: string): void {
  if (injected.has(key)) return;
  const el = document.createElement('style');
  el.dataset.component = key;
  el.textContent = css;
  document.head.appendChild(el);
  injected.add(key);
}
