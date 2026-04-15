// Modulo App  
// Bootstrap 

// Declared globally so that modules can call it
window._settings = {};

async function applySettings(settings, activeThemeOverride) {
  window._settings = settings;

  // Theme, if an override is provided (e.g., from themes.js), it is used directly
  // If not, we read the store themes to get the latest value
  let activeTheme;
  if (activeThemeOverride !== undefined) {
    activeTheme = activeThemeOverride;
  } else {
    const themesData = (await window.modulo.themes.get()) ?? {};
    activeTheme = themesData.active ?? settings.theme ?? 'dark';
  }
  document.documentElement.setAttribute('data-theme', activeTheme);

  // Language
  setLang(settings.lang ?? 'fr');

  // Font scale
  const scale = settings.fontScale ?? 1;
  document.documentElement.style.setProperty('--font-scale', scale);
  // Appliquer directement sur html aussi pour Electron
  document.documentElement.style.fontSize = `calc(16px * ${scale})`;

  // Font family
  const fontFamily = settings.fontFamily ?? "'Google Sans', 'Roboto', sans-serif";
  document.documentElement.style.setProperty('--font-sans', fontFamily);
  document.body.style.fontFamily = fontFamily;

  // Title window
  document.title = 'Modulo';
}

async function rebuildNav() {
  const nav = document.getElementById('modules-nav');
  if (!nav) return;

  const data = (await window.modulo.modules.get()) ?? { installed: [] };
  const installed = data.installed ?? [];
  const catalog = ModuleManager.getCatalog();

  nav.innerHTML = '';

  if (installed.length === 0) {
    nav.innerHTML = `
      <div style="padding:12px 16px;font-size:11px;color:var(--text-tertiary)">
        ${t('marketplace_empty')}
      </div>
    `;
    return;
  }

  for (const id of installed) {
    const mod = catalog.find(m => m.id === id);
    const label = mod?.navLabel?.[window._settings?.lang ?? 'fr']
                ?? mod?.navLabel?.fr
                ?? mod?.name
                ?? id;
    const navIcon = mod?.navIcon ?? mod?.icon ?? 'dashboard';

    const item = document.createElement('div');
    item.className = 'nav-item';
    item.dataset.key = mod?.navKey ?? id;
    item.innerHTML = `
      <span class="nav-icon">${icon(navIcon, '18px')}</span>
      <span class="nav-label">${label}</span>
      <span class="nav-tooltip">${label}</span>
    `;
    item.addEventListener('click', () => Router.navigate(item.dataset.key));
    nav.appendChild(item);
  }
}

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const chevron = document.getElementById('sidebar-chevron');
  const logoSpan = document.querySelector('#titlebar-logo span');

  // Restore the state from localStorage
  const collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
  if (collapsed) {
    sidebar.classList.add('collapsed');
    if (logoSpan) logoSpan.style.display = 'none';
  }

  chevron?.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebar_collapsed', isCollapsed);
    if (logoSpan) logoSpan.style.display = isCollapsed ? 'none' : '';
  });
}

function initWindowControls() {
  document.getElementById('btn-minimize')?.addEventListener('click', () => window.modulo.window.minimize());
  document.getElementById('btn-maximize')?.addEventListener('click', () => window.modulo.window.maximize());
  document.getElementById('btn-close')?.addEventListener('click', () => window.modulo.window.close());
}

function initStaticNav() {
  // Routes fixes
  document.querySelectorAll('.nav-item[data-key]').forEach(item => {
    item.addEventListener('click', () => Router.navigate(item.dataset.key));
  });
}

function initReminders() {
  window.modulo.reminders.onFired((reminder) => {
    window.modulo.notify({
      title: '⏰ Modulo — Rappel',
      body: reminder.label ?? 'Un rappel est arrivé',
    });
    Sound.play('bell' in window.Sound ? 'bell' : 'ding');
  });
}

// Bootstrap

async function bootstrap() {
  // 1. Apply the theme FIRST to prevent screen flickering
  // Read settings and themes in parallel before any rendering
  const [settings, themesData] = await Promise.all([
    window.modulo.settings.get().then(s => s ?? {}),
    window.modulo.themes.get().then(t => t ?? { active: null }),
  ]);

  // Load the TOML configuration (modulo.toml) and cache it in the global cache
  try {
    window._appConfig = await window.modulo.config.get();
  } catch { window._appConfig = {}; }

  // Apply the theme immediately before rendering
  const savedTheme = themesData.active ?? settings.theme ?? 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // 2. Apply the remaining settings (font, language, etc.)
  await applySettings(settings, savedTheme);

  // 3. Initialize the router
  Router.init(document.getElementById('app-content'));

  // 4. Save fixed routes
  Router.register('dashboard',  renderDashboard);
  Router.register('themes',     renderThemes);
  Router.register('marketplace', renderMarketplace);
  Router.register('settings',   renderSettings);
  Router.register('profile',    renderProfile);

  // 5. UI
  initWindowControls();
  initSidebar();
  initStaticNav();
  Modal._init();
  initReminders();

  // 6. Restore installed modules
  const cfg = window._appConfig ?? {};
  const catalogUrl = settings.catalogUrl ?? cfg.server?.base_url ?? 'https://modulo-web-production.up.railway.app';
  try {
    const catalog = await ModuleManager.fetchCatalog(catalogUrl);
    ModuleManager.setCatalog(catalog);
  } catch {
    DevLog.warn('[Bootstrap] Could not fetch catalog on startup');
  }

  await ModuleManager.restoreInstalled();
  await rebuildNav();

  // 7. Home Page
  Router.navigate('dashboard');

  // Load profile in the sidebar
  try { await _updateSidebarProfile(); } catch { /* profile page not loaded yet */ }

  DevLog.info('[Bootstrap] Modulo ready');
}

// Expose rebuildNav globally (used by modules.js)
window.rebuildNav = rebuildNav;
window.applySettings = applySettings;

document.addEventListener('DOMContentLoaded', bootstrap);
