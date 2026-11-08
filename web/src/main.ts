import { I18n } from './core/I18n.js';
import { Settings } from './core/settings.js';
import type { Theme } from './core/settings.js';
import { AppStore } from './core/AppStore.js';
import { parseRoute, isAppRoot, listPath, simulatorPath, stationsPath, vehiclePath, connectPath } from './core/route.js';
import { STORAGE_CONFIG, ONEDRIVE_CLIENT_ID } from './core/storageConfig.js';
import { refreshFuelDataIfStale } from './domain/fuelStations.js';
import { DashboardView } from './ui/DashboardView.js';
import { VehicleEditor } from './ui/VehicleEditor.js';
import { SettingsModal } from './ui/SettingsModal.js';
import { ConfirmDialog } from './ui/ConfirmDialog.js';
import { SyncBanner } from './ui/SyncBanner.js';
import { StorageManager } from 'ts-cloud-storage-manager';

// Providers whose OAuth app is not registered yet (placeholder client
// id) are shown greyed out in the picker instead of failing at connect.
const COMING_SOON_PROVIDERS: ReadonlySet<string> = new Set(
  ONEDRIVE_CLIENT_ID.startsWith('TODO') ? ['onedrive'] : []
);

const settings = Settings.load();
I18n.setLanguage(settings.get('language') ?? I18n.detectLanguage());

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// Page background colors, used as the browser theme color (status/navigation bars).
const THEME_COLORS = { light: '#f4f6f8', dark: '#0b0f17' } as const;

function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme);
  document.body.classList.remove('light-theme', 'dark-theme');
  document.body.classList.add(`${resolved}-theme`);
  // Keep the system bars in sync with the chosen theme, whatever the OS preference is.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta => {
    meta.content = THEME_COLORS[resolved];
  });
}

applyTheme(settings.get('theme'));
// Follow live system changes while the theme stays on 'system'.
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (settings.get('theme') === 'system') applyTheme('system');
});

document.addEventListener('DOMContentLoaded', () => {
  const appRoot = document.getElementById('app-root');
  if (appRoot) {
    void bootApp(appRoot);
  } else {
    bootLanding();
  }
  registerServiceWorker();
});

/**
 * Landing page (site root): the markup is static French readable without
 * JS; when another language is active we swap the data-i18n elements.
 */
function bootLanding(): void {
  const swap = (): void => {
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n!;
      const text = I18n.t(key);
      if (text !== key) el.textContent = text;
    });
    document.querySelectorAll<HTMLButtonElement>('.demo-banner .banner-close').forEach(btn => {
      btn.title = I18n.t('common.close');
      btn.setAttribute('aria-label', btn.title);
    });
    document.documentElement.lang = I18n.language;
    // The static help page is per-language — keep the footer link on the
    // active locale's variant.
    document.getElementById('landing-help')
      ?.setAttribute('href', I18n.language === 'en' ? 'en/help/' : 'help/');
  };
  if (I18n.language !== 'fr') swap();
  // The preliminary banner can be dismissed for the session — a reload
  // shows it again (nothing persisted).
  document.querySelectorAll<HTMLElement>('.demo-banner .banner-close').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.demo-banner')?.remove());
  });
  // FR/EN switcher — persists in settings and re-translates in place.
  document.querySelectorAll<HTMLElement>('[data-lang-switch]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const lang = btn.dataset.langSwitch as 'fr' | 'en';
      settings.set('language', lang);
      I18n.setLanguage(lang);
      swap();
    });
  });
}

async function bootApp(appRoot: HTMLElement): Promise<void> {
  const storageManager = new StorageManager(STORAGE_CONFIG);
  const store = new AppStore(storageManager);
  const dashboard = new DashboardView(appRoot, store, storageManager);
  dashboard.comingSoonProviders = COMING_SOON_PROVIDERS;
  mountSyncBanner(storageManager);
  // Fuel-stations file: ~1 MB cached for the day — a stale copy is
  // re-downloaded in the background even if the screen is never opened.
  void refreshFuelDataIfStale();

  dashboard.onProviderPick = async (name) => {
    // OAuth providers build their redirect URI from the current path —
    // pin it to /app/, the registered entry point, so connecting from a
    // deep link or a tool screen (e.g. /app/calc) keeps working. The
    // visited screen is remembered in lastRoute and restored after auth.
    if (window.location.pathname !== '/app/') {
      window.history.replaceState(null, '', `/app/${window.location.search}`);
    }
    storageManager.useProviderByName(name);
    // The "connecting" placeholder only suits popup flows (the consent
    // window is up while the page stays). A redirect flow leaves
    // immediately — keeping the picker on screen is what the bfcache
    // restores if the user hits the browser's back button on the
    // provider's page.
    if (storageManager.currentProvider.authResponseParams.length === 0) {
      dashboard.showLoading(true);
    }
    try {
      await store.login();
    } catch (error) {
      console.error('Authentication failed:', error);
    }
    if (store.state.isAuthenticated) {
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      dashboard.showConnectFailed();
    }
  };
  // URL routing — the visible screen follows /app/** paths; back/forward
  // buttons replay them through popstate.
  const applyRoute = (): void => {
    const params = new URLSearchParams(window.location.search);
    // The bare app root resumes the last visited screen — the query is
    // kept so ?demo survives. Auth queries (?connect, ?code, ?state,
    // ?error) pin /app/ instead: it is the registered OAuth endpoint and
    // the picker / verdict processing must run under it, not under the
    // restored screen's path.
    const authIntent = params.has('connect') || params.has('code')
      || params.has('state') || params.has('error');
    if (isAppRoot(window.location.pathname) && !authIntent) {
      const target = settings.get('lastRoute') ?? listPath();
      window.history.replaceState(null, '', target + window.location.search);
    }
    const route = parseRoute(window.location.pathname);
    if (route.kind === 'connect') {
      // Already signed in → the connect screen is meaningless: resume the
      // last visited screen, exactly like the bare root.
      if (store.state.isAuthenticated) {
        const target = settings.get('lastRoute') ?? listPath();
        window.history.replaceState(null, '', target + window.location.search);
        applyRoute();
        return;
      }
      dashboard.showProviderPicker();
      return; // never stored in lastRoute — it is an entry point, not a screen
    }
    if (route.kind === 'vehicle') dashboard.showVehicleById(route.id);
    else if (route.kind === 'simulator') dashboard.showSimulator();
    else if (route.kind === 'stations') dashboard.showStations();
    else dashboard.showList();
    // Remember the resolved screen — the bare root (kept for auth queries)
    // never overwrites it either.
    if (!isAppRoot(window.location.pathname)) {
      settings.set('lastRoute', window.location.pathname);
    }
  };
  const navigate = (path: string, replace = false): void => {
    if (replace) window.history.replaceState(null, '', path);
    else window.history.pushState(null, '', path);
    applyRoute();
  };
  window.addEventListener('popstate', applyRoute);

  dashboard.onDemo = () => { void store.loginDemo(); };
  dashboard.onVehicleAdd = () => VehicleEditor.open(store);
  dashboard.onVehicleOpen = (id) => navigate(vehiclePath(id));
  dashboard.onHome = () => navigate(listPath());
  dashboard.onVehicleGone = () => navigate(listPath(), true);
  dashboard.onLogout = () => { void store.logout(); };
  dashboard.onSimulator = () => navigate(simulatorPath());
  dashboard.onStations = () => navigate(stationsPath());
  // Contextual help: each screen links to its own help chapter.
  dashboard.onHelp = (kind) => {
    const slug = kind === 'stations' ? 'stations' : kind === 'simulator' ? 'simulateur' : 'vehicules';
    window.location.href = `${I18n.language === 'en' ? '/en/help/' : '/help/'}${slug}/`;
  };
  dashboard.onSettings = () => SettingsModal.open(settings, (patch) => {
    if ('theme' in patch) applyTheme(settings.get('theme'));
    if ('language' in patch) {
      I18n.setLanguage(settings.get('language') ?? I18n.detectLanguage());
    }
    // Re-render so units/currency/language-dependent labels refresh.
    dashboard.render(store.state);
  });
  dashboard.onExport = () => {
    const blob = new Blob([JSON.stringify(store.getExportPayload(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'car-cost-meter.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  dashboard.onImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.text().then(async (text) => {
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          window.alert(I18n.t('alerts.importError'));
          return;
        }
        const ok = await ConfirmDialog.ask(I18n.t('tools.importConfirm'), document.body, I18n.t('common.confirm'));
        if (!ok) return;
        try {
          await store.importData(data);
        } catch {
          window.alert(I18n.t('alerts.importError'));
        }
      });
    });
    input.click();
  };

  // Resolve the entry URL (/app/, /app/veh/<id>, /app/calc) — an
  // unauthenticated deep link shows the picker and resumes after login.
  applyRoute();

  let wasAuthenticated = false;
  store.on('state:changed', (state) => {
    if (wasAuthenticated && !state.isAuthenticated) {
      window.location.replace('./');
      return;
    }
    wasAuthenticated = state.isAuthenticated;
    // The connect screen only makes sense while unauthenticated: once the
    // session resolves, re-route so it resumes the last visited screen.
    if (window.location.pathname === connectPath()) { applyRoute(); return; }
    dashboard.render(state);
  });
  store.on('state:loading', (isLoading) => dashboard.showLoading(isLoading));
  store.on('load:error', () => window.alert(I18n.t('alerts.loadError')));

  const params = new URLSearchParams(window.location.search);
  // A requested ?demo URL wins over any existing session — the demo banner
  // keeps it clearly distinguishable from real data.
  if (params.has('demo')) {
    await store.loginDemo();
    return;
  }
  // A redirect-flow provider (Dropbox, OneDrive) comes back with its verdict
  // carried in the URL (?code / ?error + ?state). Consume it before anything
  // could conclude the user is unauthenticated.
  // The applyRoute above just showed the picker — the code exchange can take
  // a while, so the connecting placeholder replaces it while resumeAuth runs.
  if (params.has('code') || params.has('state') || params.has('error')) {
    dashboard.showLoading(true);
  }
  const verdict = await storageManager.resumeAuth(new URL(window.location.href));
  if (verdict !== 'none') {
    const url = new URL(window.location.href);
    for (const param of storageManager.currentProvider.authResponseParams) {
      url.searchParams.delete(param);
    }
    // On success the connect marker goes with the OAuth params; on failure it
    // is kept — a reload retries the same provider through the deep link.
    if (verdict) {
      url.searchParams.delete('connect');
    } else {
      url.searchParams.set('connect', storageManager.providerName);
    }
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    await store.init();
    if (!verdict) {
      dashboard.showConnectFailed();
      return;
    }
    applyRoute(); // successful sign-in: resume the last visited screen
    return;
  }

  await store.init();
  if (store.state.isAuthenticated) return;
  if (params.has('connect')) {
    // A named provider (?connect=dropbox) is a deep link straight into its
    // auth flow; a bare ?connect shows the picker card instead.
    const wanted = params.get('connect');
    const provider = storageManager.availableProviders().find(p => p.name === wanted);
    if (provider && !COMING_SOON_PROVIDERS.has(provider.name)) {
      await dashboard.onProviderPick(provider.name);
    } else {
      dashboard.showProviderPicker();
    }
    return;
  }
  // No session yet: show the picker (the landing links straight to /app/).
  dashboard.render(store.state);
}

function mountSyncBanner(storageManager: StorageManager): void {
  // The slot lives inside the dashboard layout, built lazily on first
  // render — retry briefly until it exists.
  let tries = 40;
  const tryMount = (): void => {
    const bannerRoot = document.getElementById('sync-banner-root');
    if (bannerRoot) { new SyncBanner(bannerRoot, storageManager); return; }
    if (--tries > 0) setTimeout(tryMount, 50);
  };
  tryMount();
}

function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .catch(err => console.log('SW registration failed:', err));
  }
}
