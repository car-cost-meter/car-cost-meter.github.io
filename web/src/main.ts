import { I18n } from './core/I18n.js';
import { Settings } from './core/settings.js';
import type { Theme } from './core/settings.js';
import { AppStore } from './core/AppStore.js';
import { mergePolicy } from './domain/mergePolicy.js';
import { DashboardView } from './ui/DashboardView.js';
import { VehicleEditor } from './ui/VehicleEditor.js';
import { SimulatorView } from './ui/SimulatorView.js';
import { SettingsModal } from './ui/SettingsModal.js';
import { HelpModal } from './ui/HelpModal.js';
import { ConfirmDialog } from './ui/ConfirmDialog.js';
import { SyncBanner } from './ui/SyncBanner.js';
import { StorageManager } from 'ts-cloud-storage-manager';
import type { StorageConfig } from 'ts-cloud-storage-manager';

// OAuth app credentials — register the app in the Dropbox and Microsoft
// Entra consoles (PKCE public clients), see README. Placeholders until then.
const DROPBOX_APP_KEY = 'oz68n4s2g6onj3e';
const ONEDRIVE_CLIENT_ID = 'TODO-onedrive-client-id';

const STORAGE_CONFIG: StorageConfig = {
  fileName: 'car-cost-meter.json',
  dropbox: { appKey: DROPBOX_APP_KEY },
  oneDrive: { clientId: ONEDRIVE_CLIENT_ID },
  // Offline-first sync with per-vehicle merge; remote updates wait for the
  // banner's update button instead of reloading data under the user's eyes.
  sync: { policy: mergePolicy, eagerPull: false }
};

const settings = Settings.load();
I18n.setLanguage(settings.get('language') ?? I18n.detectLanguage());

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme: Theme): void {
  document.body.classList.remove('light-theme', 'dark-theme');
  document.body.classList.add(`${resolveTheme(theme)}-theme`);
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
    document.documentElement.lang = I18n.language;
  };
  if (I18n.language !== 'fr') swap();
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
  // Footer help link — opens the same help modal as the app toolbar.
  document.getElementById('landing-help')?.addEventListener('click', (e) => {
    e.preventDefault();
    HelpModal.open();
  });
}

async function bootApp(appRoot: HTMLElement): Promise<void> {
  const storageManager = new StorageManager(STORAGE_CONFIG);
  const store = new AppStore(storageManager);
  const dashboard = new DashboardView(appRoot, store, storageManager);
  mountSyncBanner(storageManager);

  dashboard.onProviderPick = async (name) => {
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
  dashboard.onDemo = () => { void store.loginDemo(); };
  dashboard.onVehicleAdd = () => VehicleEditor.open(store);
  dashboard.onVehicleOpen = (id) => {
    const vehicle = store.findVehicle(id);
    if (vehicle) dashboard.showVehicle(vehicle);
  };
  dashboard.onLogout = () => { void store.logout(); };
  dashboard.onSimulator = () => SimulatorView.open();
  dashboard.onHelp = () => HelpModal.open(document.body, storageManager.currentProvider);
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

  let wasAuthenticated = false;
  store.on('state:changed', (state) => {
    if (wasAuthenticated && !state.isAuthenticated) {
      window.location.replace('./');
      return;
    }
    wasAuthenticated = state.isAuthenticated;
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
    if (!verdict) dashboard.showConnectFailed();
    return;
  }

  await store.init();
  if (store.state.isAuthenticated) return;
  if (params.has('connect')) {
    // A named provider (?connect=dropbox) is a deep link straight into its
    // auth flow; a bare ?connect shows the picker card instead.
    const wanted = params.get('connect');
    const provider = storageManager.availableProviders().find(p => p.name === wanted);
    if (provider) {
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
