// ── Theme Marketplace ──

// Catalogue des thèmes — duplique le design du marketplace modules
const THEMES_CATALOG = [
  {
    id:          'dark',
    name:        'Default Dark',
    author:      'Modulo Team',
    description: 'The original dark blue theme. Deep navy backgrounds, blue accents.',
    builtin:     true,
    preview:     ['#0f1117','#161b27','#4285F4','#e8eaf0','#34A853'],
    tags:        ['dark', 'official', 'blue'],
  },
  {
    id:          'light',
    name:        'Default Light',
    author:      'Modulo Team',
    description: 'Clean warm light theme. Cream backgrounds, subtle shadows.',
    builtin:     true,
    preview:     ['#f5f0e8','#ede8df','#4285F4','#1a1f2e','#34A853'],
    tags:        ['light', 'official'],
  },
  {
    id:          'nord',
    name:        'Nord',
    author:      'Arctic Ice Studio',
    description: 'An arctic, north-bluish color palette. Calm and elegant.',
    builtin:     false,
    preview:     ['#2E3440','#3B4252','#88C0D0','#ECEFF4','#A3BE8C'],
    tags:        ['dark', 'blue', 'minimal'],
  },
  {
    id:          'dracula',
    name:        'Dracula',
    author:      'Zeno Rocha',
    description: 'A dark theme with vibrant purple accents. For the night owls.',
    builtin:     false,
    preview:     ['#282a36','#44475a','#bd93f9','#f8f8f2','#50fa7b'],
    tags:        ['dark', 'purple', 'vibrant'],
  },
  {
    id:          'catppuccin',
    name:        'Catppuccin Mocha',
    author:      'Catppuccin Org',
    description: 'Soothing pastel theme. Warm, soft, and incredibly cohesive.',
    builtin:     false,
    preview:     ['#1e1e2e','#313244','#cba6f7','#cdd6f4','#a6e3a1'],
    tags:        ['dark', 'pastel', 'warm'],
  },
  {
    id:          'gruvbox',
    name:        'Gruvbox Dark',
    author:      'morhetz',
    description: 'Retro groove. Earthy warm tones for a cozy development experience.',
    builtin:     false,
    preview:     ['#282828','#3c3836','#fabd2f','#ebdbb2','#b8bb26'],
    tags:        ['dark', 'retro', 'warm'],
  },
  {
    id:          'tokyonight',
    name:        'Tokyo Night',
    author:      'enkia',
    description: 'A clean dark theme inspired by the vibrant Tokyo city lights.',
    builtin:     false,
    preview:     ['#1a1b2e','#24283b','#7aa2f7','#c0caf5','#9ece6a'],
    tags:        ['dark', 'blue', 'neon'],
  },
  {
    id:          'onedark',
    name:        'One Dark',
    author:      'Atom',
    description: 'The classic Atom theme. Timeless, balanced, and familiar.',
    builtin:     false,
    preview:     ['#282c34','#2c313c','#61afef','#abb2bf','#98c379'],
    tags:        ['dark', 'classic', 'green'],
  },
  {
    id:          'solarized',
    name:        'Solarized Dark',
    author:      'Ethan Schoonover',
    description: 'Precision colors for machines and people. The legendary theme.',
    builtin:     false,
    preview:     ['#002b36','#073642','#268bd2','#fdf6e3','#2aa198'],
    tags:        ['dark', 'teal', 'legendary'],
  },
  {
    id:          'midnight',
    name:        'Midnight Purple',
    author:      'Modulo Team',
    description: 'Deep purple darkness. Violet accents, perfect for late-night sessions.',
    builtin:     false,
    preview:     ['#0f0a1e','#1e1535','#a78bfa','#ede9fe','#34d399'],
    tags:        ['dark', 'purple', 'unique'],
  },
];

async function renderThemes(container) {
  let _themesData = (await window.modulo.themes.get()) ?? { installed: [], active: null };
  const settings  = (await window.modulo.settings.get()) ?? {};
  const lang      = settings.lang ?? 'fr';
  const _l        = (fr, en) => lang === 'en' ? en : fr;

  let _active     = _themesData.active ?? settings.theme ?? 'dark';
  let _installed  = _themesData.installed ?? [];
  let _filter     = 'all';
  let _query      = '';

  function _isInstalled(id) {
    return ['dark', 'light'].includes(id) || _installed.includes(id);
  }

  function _getFiltered() {
    return THEMES_CATALOG.filter(t => {
      const matchFilter =
        _filter === 'all'      ||
        (_filter === 'dark'    && t.tags.includes('dark'))  ||
        (_filter === 'light'   && t.tags.includes('light')) ||
        (_filter === 'installed' && _isInstalled(t.id));
      const q = _query.toLowerCase();
      const matchQ = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tg => tg.includes(q));
      return matchFilter && matchQ;
    });
  }

  // Appliquer un thème (prévisualisation instantanée)
  function _applyTheme(id) {
    const isBaseTheme = ['dark', 'light'].includes(id);
    if (isBaseTheme) {
      // Thème de base : géré via settings.theme
      const newSettings = { ...settings, theme: id };
      window.modulo.settings.save(newSettings).then(() => window.applySettings(newSettings));
    } else {
      document.documentElement.setAttribute('data-theme', id);
    }
    _active = id;
  }

  async function _activateTheme(id) {
    _applyTheme(id);
    _themesData.active = id;
    // Si thème de base, réinitialiser le thème dans les settings aussi
    if (['dark', 'light'].includes(id)) {
      const newSettings = { ...settings, theme: id };
      await window.modulo.settings.save(newSettings);
      await window.applySettings(newSettings);
    }
    await window.modulo.themes.save(_themesData);
    renderList();
  }

  async function _installTheme(id) {
    if (!_installed.includes(id)) {
      _installed.push(id);
      _themesData.installed = _installed;
    }
    await _activateTheme(id);
  }

  async function _uninstallTheme(id) {
    if (['dark', 'light'].includes(id)) return;
    _installed = _installed.filter(i => i !== id);
    _themesData.installed = _installed;
    // Si c'était le thème actif, revenir au dark
    if (_active === id) {
      await _activateTheme('dark');
    } else {
      await window.modulo.themes.save(_themesData);
    }
    renderList();
  }

  // ── Swatches SVG (prévisualisation couleurs) ──────────────────────────────
  function _swatches(colors) {
    return colors.map(c => `
      <div style="flex:1;height:100%;background:${c};min-width:0"></div>
    `).join('');
  }

  // ── Rendu liste ────────────────────────────────────────────────────────────
  function renderList() {
    const list = container.querySelector('#themes-list');
    if (!list) return;

    const filtered = _getFiltered();

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state">${icon('eye','32px')}<div class="empty-state-title">${_l('Aucun thème trouvé','No themes found')}</div></div>`;
      return;
    }

    list.innerHTML = filtered.map(theme => {
      const isActive    = _active === theme.id;
      const isInstalled = _isInstalled(theme.id);

      return `
        <div class="card themes-card ${isActive ? 'themes-card-active' : ''}" data-id="${theme.id}" style="
          cursor:pointer;
          border-color:${isActive ? 'var(--blue)' : ''};
          background:${isActive ? 'var(--bg-active)' : ''};
        ">
          <!-- Bande de prévisualisation -->
          <div style="
            height:52px;border-radius:var(--radius-md);overflow:hidden;
            display:flex;margin-bottom:14px;border:1px solid var(--border);
          ">
            ${_swatches(theme.preview)}
          </div>

          <!-- Infos -->
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:7px">
                <span style="font-size:14px;font-weight:500">${theme.name}</span>
                ${theme.builtin ? `<span class="badge badge-blue" style="font-size:10px">${_l('Officiel','Built-in')}</span>` : ''}
                ${isActive ? `<span class="badge badge-blue" style="font-size:10px;background:var(--blue);color:#fff">${_l('Actif','Active')}</span>` : ''}
              </div>
              <div style="font-size:11px;color:var(--text-tertiary);margin-top:2px">${_l('par','by')} ${theme.author}</div>
            </div>
          </div>

          <div style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:14px">${theme.description}</div>

          <!-- Tags -->
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px">
            ${theme.tags.map(t => `<span class="badge badge-gray">${t}</span>`).join('')}
          </div>

          <!-- Actions -->
          <div style="display:flex;gap:8px">
            ${isActive ? `
              <button class="btn btn-primary btn-sm" style="flex:1;cursor:default" disabled>
                ${icon('check','13px')} ${_l('Actif','Active')}
              </button>
            ` : isInstalled ? `
              <button class="btn btn-secondary btn-sm themes-apply" data-id="${theme.id}" style="flex:1">
                ${_l('Appliquer','Apply')}
              </button>
              ${!theme.builtin ? `<button class="btn btn-ghost btn-sm themes-remove" data-id="${theme.id}" style="color:var(--red)">${icon('trash','13px')}</button>` : ''}
            ` : `
              <button class="btn btn-secondary btn-sm themes-install" data-id="${theme.id}" style="flex:1">
                ${_l('Installer','Install')} &amp; ${_l('appliquer','apply')}
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Binder les actions
    list.querySelectorAll('.themes-install').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); _installTheme(btn.dataset.id); });
    });
    list.querySelectorAll('.themes-apply').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); _activateTheme(btn.dataset.id); });
    });
    list.querySelectorAll('.themes-remove').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); _uninstallTheme(btn.dataset.id); });
    });

    // Clic sur la carte = prévisualiser
    list.querySelectorAll('.themes-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        if (!_isInstalled(id)) return; // pas de prévisualisation sans installation
        if (_active !== id) _applyTheme(id);
      });
    });
  }

  // ── Shell ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">${icon('eye','20px')} ${_l('Thèmes','Themes')}</div>
          <div class="page-subtitle">${_l('Personnalisez l\'apparence de Modulo', 'Customize the appearance of Modulo')}</div>
        </div>
      </div>

      <!-- Thème actif (aperçu) -->
      <div class="card" id="themes-active-banner" style="
        margin-bottom:24px;padding:18px 20px;
        display:flex;align-items:center;gap:16px;
        background:var(--bg-active);border-color:var(--blue);
      ">
        <div style="
          display:flex;height:36px;flex:0 0 180px;border-radius:var(--radius-md);
          overflow:hidden;border:1px solid var(--border-strong);
        ">
          ${_swatches((THEMES_CATALOG.find(t => t.id === _active) ?? THEMES_CATALOG[0]).preview)}
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:2px">${_l('Thème actif','Active theme')}</div>
          <div style="font-size:14px;font-weight:500">${(THEMES_CATALOG.find(t => t.id === _active) ?? THEMES_CATALOG[0]).name}</div>
        </div>
        <div style="flex:1"></div>
        <button class="btn btn-ghost btn-sm" id="themes-reset" style="font-size:11px">
          ${_l('Revenir au défaut','Reset to default')}
        </button>
      </div>

      <!-- Barre de filtres + recherche -->
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center">
        <input class="input" id="themes-search" placeholder="${_l('Rechercher un thème…','Search themes…')}" style="max-width:240px">
        <div style="display:flex;gap:4px">
          ${['all','dark','light','installed'].map(f => `
            <button class="btn btn-sm ${_filter===f?'btn-primary':'btn-secondary'} themes-filter" data-f="${f}" style="font-size:12px">
              ${{ all: _l('Tous','All'), dark: 'Dark', light: 'Light', installed: _l('Installés','Installed') }[f]}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Grille -->
      <div id="themes-list" style="
        display:grid;
        grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
        gap:16px;
        padding-bottom:40px;
      "></div>
    </div>

    <style>
      .themes-card { transition: border-color .15s, transform .15s, background .15s; }
      .themes-card:hover { transform: translateY(-1px); border-color: var(--border-strong) !important; }
      .themes-card-active { transform: none !important; }
    </style>
  `;

  // Events
  container.querySelector('#themes-reset')?.addEventListener('click', () => _activateTheme('dark'));

  container.querySelectorAll('.themes-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      _filter = btn.dataset.f;
      container.querySelectorAll('.themes-filter').forEach(b => {
        b.className = `btn btn-sm ${_filter===b.dataset.f?'btn-primary':'btn-secondary'} themes-filter`;
        b.style.fontSize = '12px';
      });
      renderList();
    });
  });

  container.querySelector('#themes-search')?.addEventListener('input', e => {
    _query = e.target.value;
    renderList();
  });

  renderList();
}
