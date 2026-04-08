// ── Modulo App — Bootstrap ──

// Exposé globalement pour que les modules puissent l'appeler
window._settings = {};

async function applySettings(settings, activeThemeOverride) {
  window._settings = settings;

  // Thème — si un override est fourni (ex: depuis themes.js) on l'utilise directement
  // Sinon on lit le store themes pour avoir la valeur à jour
  let activeTheme;
  if (activeThemeOverride !== undefined) {
    activeTheme = activeThemeOverride;
  } else {
    const themesData = (await window.modulo.themes.get()) ?? {};
    activeTheme = themesData.active ?? settings.theme ?? 'dark';
  }
  document.documentElement.setAttribute('data-theme', activeTheme);

  // Langue
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

  // Titre de la fenêtre
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

  // Restaurer l'état depuis localStorage
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

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function bootstrap() {
  // 0. Appliquer le thème en PREMIER pour éviter le flash (FOUC)
  //    On lit settings + themes en parallèle avant tout rendu
  const [settings, themesData] = await Promise.all([
    window.modulo.settings.get().then(s => s ?? {}),
    window.modulo.themes.get().then(t => t ?? { active: null }),
  ]);

  // Charger la config TOML (modulo.toml) et la mettre en cache global
  try {
    window._appConfig = await window.modulo.config.get();
  } catch { window._appConfig = {}; }

  // Appliquer le thème immédiatement avant tout rendu
  const savedTheme = themesData.active ?? settings.theme ?? 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // 1. Appliquer le reste des settings (font, lang, etc.)
  await applySettings(settings, savedTheme);

  // 2. Initialiser le router
  Router.init(document.getElementById('app-content'));

  // 3. Enregistrer les routes fixes
  Router.register('dashboard',  renderDashboard);
  Router.register('themes',     renderThemes);
  Router.register('marketplace', renderMarketplace);
  Router.register('settings',   renderSettings);
  Router.register('profile',    renderProfile);

  // 4. UI
  initWindowControls();
  initSidebar();
  initStaticNav();
  Modal._init();
  initReminders();

  // 5. Restaurer les modules installés
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

  // 6. Page initiale
  Router.navigate('dashboard');

  // Charger le profil dans la sidebar
  try { await _updateSidebarProfile(); } catch { /* profile page not loaded yet */ }

  DevLog.info('[Bootstrap] Modulo ready');
}

// Exposer rebuildNav globalement (utilisé par modules.js)
window.rebuildNav = rebuildNav;
window.applySettings = applySettings;

document.addEventListener('DOMContentLoaded', bootstrap);
