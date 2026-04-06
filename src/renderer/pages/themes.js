// ── Theme Marketplace ──

async function renderThemes(container) {
  let _themesData = (await window.modulo.themes.get()) ?? { installed: [], active: null };
  const settings  = (await window.modulo.settings.get()) ?? {};
  const lang      = settings.lang ?? 'fr';
  const _l        = (fr, en) => lang === 'en' ? en : fr;

  let _active     = _themesData.active ?? settings.theme ?? 'dark';
  let _installed  = _themesData.installed ?? [];
  let _filter     = 'all';
  let _query      = '';
  let _catalog    = [];

  // Charger le catalogue depuis Railway
  async function _loadCatalog() {
    try {
      const url = settings.catalogUrl ?? 'https://modulo-web-production.up.railway.app';
      const res = await fetch(`${url}/api/themes`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      _catalog = await res.json();
    } catch {
      // Fallback catalogue minimal intégré
      _catalog = [
        { id:'dark',        name:'Default Dark',     author:'Modulo Team', builtin:true,  preview:['#0f1117','#161b27','#4285F4','#e8eaf0','#34A853'], tags:['dark','official'] },
        { id:'light',       name:'Default Light',    author:'Modulo Team', builtin:true,  preview:['#f5f0e8','#ede8df','#4285F4','#1a1f2e','#34A853'], tags:['light','official'] },
        { id:'nord',        name:'Nord',             author:'Arctic Ice Studio', builtin:false, preview:['#2E3440','#3B4252','#88C0D0','#ECEFF4','#A3BE8C'], tags:['dark','blue'] },
        { id:'dracula',     name:'Dracula',          author:'Zeno Rocha',  builtin:false, preview:['#282a36','#44475a','#bd93f9','#f8f8f2','#50fa7b'], tags:['dark','purple'] },
        { id:'catppuccin',  name:'Catppuccin Mocha', author:'Catppuccin Org', builtin:false, preview:['#1e1e2e','#313244','#cba6f7','#cdd6f4','#a6e3a1'], tags:['dark','pastel'] },
        { id:'tokyonight',  name:'Tokyo Night',      author:'enkia',       builtin:false, preview:['#1a1b2e','#24283b','#7aa2f7','#c0caf5','#9ece6a'], tags:['dark','blue'] },
        { id:'midnight',    name:'Midnight Purple',  author:'Modulo Team', builtin:false, preview:['#0f0a1e','#1e1535','#a78bfa','#ede9fe','#34d399'], tags:['dark','purple'] },
      ];
    }
  }

  function _isInstalled(id) {
    return ['dark', 'light'].includes(id) || _installed.includes(id);
  }

  function _getFiltered() {
    return _catalog.filter(t => {
      const matchFilter =
        _filter === 'all'        ||
        (_filter === 'dark'      && t.tags?.includes('dark'))    ||
        (_filter === 'light'     && t.tags?.includes('light'))   ||
        (_filter === 'installed' && _isInstalled(t.id));
      const q = _query.toLowerCase();
      const matchQ = !q || t.name.toLowerCase().includes(q) || t.author?.toLowerCase().includes(q) || t.tags?.some(tg => tg.includes(q));
      return matchFilter && matchQ;
    });
  }

  function _applyTheme(id) {
    document.documentElement.setAttribute('data-theme', id);
    if (['dark', 'light'].includes(id)) {
      const ns = { ...settings, theme: id };
      window.modulo.settings.save(ns).then(() => window.applySettings(ns));
    }
    _active = id;
  }

  async function _activateTheme(id) {
    _applyTheme(id);
    _themesData.active = id;
    if (['dark', 'light'].includes(id)) {
      const ns = { ...settings, theme: id };
      await window.modulo.settings.save(ns);
      await window.applySettings(ns);
    }
    await window.modulo.themes.save(_themesData);
    // Tracker le download
    try {
      const url = settings.catalogUrl ?? 'https://modulo-web-production.up.railway.app';
      fetch(`${url}/api/themes/${id}/download`, { method: 'POST' }).catch(() => {});
    } catch { /* silent */ }
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
    if (['dark','light'].includes(id)) return;
    _installed = _installed.filter(i => i !== id);
    _themesData.installed = _installed;
    if (_active === id) await _activateTheme('dark');
    else await window.modulo.themes.save(_themesData);
    renderList();
  }

  function _swatches(colors) {
    return (colors ?? []).map(c =>
      `<div style="flex:1;height:100%;background:${c};min-width:0"></div>`
    ).join('');
  }

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
      const darkTag     = theme.tags?.includes('dark');
      const lightTag    = theme.tags?.includes('light');

      return `
        <div class="card themes-card ${isActive?'themes-card-active':''}" data-id="${theme.id}"
          style="cursor:pointer;${isActive?'border-color:var(--blue);background:var(--bg-active)':''}">

          <!-- Prévisualisation -->
          <div style="height:48px;border-radius:var(--radius-md);overflow:hidden;display:flex;border:1px solid var(--border);margin-bottom:12px">
            ${_swatches(theme.preview)}
          </div>

          <!-- Infos -->
          <div style="margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
              <span style="font-size:13px;font-weight:500">${theme.name}</span>
              ${isActive ? `<span style="font-size:10px;padding:1px 7px;border-radius:var(--radius-full);background:var(--blue);color:#fff;font-weight:600">${_l('Actif','Active')}</span>` : ''}
              ${theme.builtin ? `<span style="font-size:10px;padding:1px 7px;border-radius:var(--radius-full);background:var(--bg-elevated);color:var(--text-tertiary);border:1px solid var(--border)">${_l('Officiel','Built-in')}</span>` : ''}
            </div>
            <div style="font-size:11px;color:var(--text-tertiary)">${_l('par','by')} ${theme.author ?? '—'}</div>
          </div>

          <!-- Tags -->
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px">
            ${(theme.tags ?? []).map(t => `
              <span style="font-size:10px;padding:1px 6px;border-radius:var(--radius-full);
                background:${t==='dark'?'rgba(255,255,255,.07)':t==='light'?'rgba(0,0,0,.07)':'var(--bg-elevated)'};
                color:var(--text-tertiary);border:1px solid var(--border)">
                ${t}
              </span>`).join('')}
          </div>

          <!-- Actions -->
          <div style="display:flex;gap:6px">
            ${isActive ? `
              <button class="btn btn-primary btn-sm" style="flex:1" disabled>
                ${icon('check','12px')} ${_l('Actif','Active')}
              </button>
            ` : isInstalled ? `
              <button class="btn btn-secondary btn-sm themes-apply" data-id="${theme.id}" style="flex:1">
                ${_l('Appliquer','Apply')}
              </button>
              ${!theme.builtin ? `
                <button class="btn btn-ghost btn-sm themes-remove" data-id="${theme.id}"
                  title="${_l('Désinstaller','Uninstall')}" style="color:var(--red)">
                  ${icon('trash','13px')}
                </button>` : ''}
            ` : `
              <button class="btn btn-secondary btn-sm themes-install" data-id="${theme.id}" style="flex:1">
                ${icon('download','12px')} ${_l('Installer','Install')}
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Bindings
    list.querySelectorAll('.themes-install').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); _installTheme(btn.dataset.id); }));
    list.querySelectorAll('.themes-apply').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); _activateTheme(btn.dataset.id); }));
    list.querySelectorAll('.themes-remove').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); _uninstallTheme(btn.dataset.id); }));

    // Clic carte = aperçu instantané si installé
    list.querySelectorAll('.themes-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        if (_isInstalled(id) && _active !== id) {
          _applyTheme(id);
          container.querySelectorAll('.themes-card').forEach(c => {
            const isNowActive = c.dataset.id === id;
            c.classList.toggle('themes-card-active', isNowActive);
            c.style.borderColor = isNowActive ? 'var(--blue)' : '';
            c.style.background  = isNowActive ? 'var(--bg-active)' : '';
          });
        }
      });
    });
  }

  function _updateActiveBanner() {
    const current = _catalog.find(t => t.id === _active);
    const banner  = container.querySelector('#themes-active-banner');
    if (!banner || !current) return;
    banner.querySelector('#active-swatches').innerHTML = _swatches(current.preview);
    banner.querySelector('#active-name').textContent   = current.name;
  }

  // ── Shell ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">${icon('eye','20px')} ${_l('Thèmes','Themes')}</div>
          <div class="page-subtitle">${_l('Personnalisez l\'apparence de Modulo','Customize the appearance of Modulo')}</div>
        </div>
      </div>

      <!-- Thème actif -->
      <div class="card" id="themes-active-banner" style="
        margin-bottom:20px;padding:14px 18px;display:flex;align-items:center;
        gap:14px;border-color:var(--blue);background:var(--bg-active);
      ">
        <div style="display:flex;height:32px;flex:0 0 160px;border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border-strong)" id="active-swatches"></div>
        <div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:1px">${_l('Thème actif','Active theme')}</div>
          <div style="font-size:14px;font-weight:500" id="active-name">—</div>
        </div>
        <div style="flex:1"></div>
        <button class="btn btn-ghost btn-sm" id="themes-reset" style="font-size:11px;color:var(--text-tertiary)">
          ${_l('Réinitialiser','Reset')}
        </button>
      </div>

      <!-- Filtres -->
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center">
        <input class="input" id="themes-search" placeholder="${_l('Rechercher…','Search…')}" style="max-width:220px;height:32px;font-size:13px">
        <div style="display:flex;gap:3px">
          ${['all','dark','light','installed'].map(f => `
            <button class="btn btn-sm ${_filter===f?'btn-primary':'btn-secondary'} themes-filter" data-f="${f}" style="font-size:12px">
              ${{ all:_l('Tous','All'), dark:'Dark', light:'Light', installed:_l('Installés','Installed') }[f]}
            </button>
          `).join('')}
        </div>
        <span id="themes-count" style="font-size:11px;color:var(--text-tertiary);margin-left:4px"></span>
      </div>

      <!-- Grille -->
      <div id="themes-list" style="
        display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));
        gap:14px;padding-bottom:40px;
      ">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
    </div>

    <style>
      .themes-card { transition: border-color .15s, transform .1s; }
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
      const count = container.querySelector('#themes-count');
      if (count) count.textContent = `${_getFiltered().length} ${_l('thèmes','themes')}`;
      renderList();
    });
  });

  container.querySelector('#themes-search')?.addEventListener('input', e => {
    _query = e.target.value;
    const count = container.querySelector('#themes-count');
    if (count) count.textContent = `${_getFiltered().length} ${_l('thèmes','themes')}`;
    renderList();
  });

  // Charger le catalogue puis afficher
  await _loadCatalog();

  const count = container.querySelector('#themes-count');
  if (count) count.textContent = `${_catalog.length} ${_l('thèmes','themes')}`;

  _updateActiveBanner();
  renderList();
}
