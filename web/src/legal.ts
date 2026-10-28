import { Settings } from './core/settings.js';

/**
 * Standalone legal pages (privacy.html, terms.html): bilingual content in
 * <div data-lang="fr|en"> blocks toggled by FR/EN links. Also applies the
 * saved theme — these pages don't load main.ts.
 */

const settings = Settings.load();
let lang = settings.get('language')
  ?? (navigator.language.toLowerCase().startsWith('en') ? 'en' : 'fr');

const theme = settings.get('theme');
const resolved = theme !== 'system'
  ? theme
  : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
document.body.classList.add(`${resolved}-theme`);

function apply(l: string): void {
  lang = l as 'fr' | 'en';
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>('[data-lang]').forEach(el => {
    el.hidden = el.dataset.lang !== lang;
  });
  document.querySelectorAll<HTMLElement>('[data-lang-switch]').forEach(el => {
    el.style.fontWeight = el.dataset.langSwitch === lang ? 'bold' : 'normal';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  apply(lang);
  document.querySelectorAll<HTMLElement>('[data-lang-switch]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const l = btn.dataset.langSwitch!;
      settings.set('language', l as 'fr' | 'en');
      apply(l);
    });
  });
});
