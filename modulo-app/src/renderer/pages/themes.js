// Theme Marketplace

async function renderThemes(container) {
  let _themesData = (await window.modulo.themes.get()) ?? { installed: [], active: 'default-dark' };
  const settings  = (await window.modulo.settings.get()) ?? {};
  const lang      = settings.lang ?? 'fr';
  const _l        = (fr, en) => lang === 'en' ? en : fr;

  let _active    = _themesData.active ?? (settings.theme === 'light' ? 'default-light' : 'default-dark');
  let _installed = _themesData.installed ?? [];
  let _catalog   = [];
  let _filter    = 'all';
  let _query     = '';

  // Load the catalog 
  async function _loadCatalog() {
    try {
      const url = settings.catalogUrl ?? 'https://modulo-web-production.up.railway.app';
      const res = await fetch(`${url}/api/themes`);
      _catalog  = await res.json();
    } catch {
      _catalog = [
        { id:'default', name:'Default', author:'Modulo Team', builtin:true, variants:{ dark:{ preview:['#0f1117','#161b27','#4285F4','#e8eaf0','#34A853'] }, light:{ preview:['#f5f0e8','#ede8df','#4285F4','#1a1f2e','#34A853'] } }, tags:[] },
      ];
    }
  }

  // Helpers
  function _themeId(paletteId, mode) {
    return paletteId === 'default' ? mode : `${paletteId}-${mode}`;
  }

  function _parseThemeId(themeId) {
    if (themeId === 'dark' || themeId === 'light') return { paletteId: 'default', mode: themeId };
    const parts = themeId.split('-');
    const mode  = parts[parts.length - 1];
    if (mode === 'dark' || mode === 'light') {
      return { paletteId: parts.slice(0, -1).join('-'), mode };
    }
    return { paletteId: themeId, mode: 'dark' };
  }

  function _isInstalled(paletteId) {
    return paletteId === 'default' ||
      _installed.includes(paletteId) ||
      _catalog.find(t => t.id === paletteId)?.builtin;
  }

  function _getFiltered() {
    return _catalog.filter(t => {
      if (_filter === 'installed') return _isInstalled(t.id);
      if (_filter !== 'all') return t.tags?.includes(_filter);
      const q = _query.toLowerCase();
      return !q || t.name.toLowerCase().includes(q) || t.author?.toLowerCase().includes(q) || t.tags?.some(tg => tg.includes(q));
    });
  }

  // Apply a theme
  async function _applyTheme(paletteId, mode) {
    const themeId = _themeId(paletteId, mode);
    document.documentElement.setAttribute('data-theme', themeId);
    _active = themeId;

    // Sync settings.theme for built-in themes
    const ns = { ...settings, theme: mode };
    await window.modulo.settings.save(ns);
    // Pass themeId directly to avoid a themes.get() call that would read the old value
    await window.applySettings(ns, themeId);

    _themesData.active = themeId;
    await window.modulo.themes.save(_themesData);

    // Track download
    try {
      const url = settings.catalogUrl ?? 'https://modulo-web-production.up.railway.app';
      fetch(`${url}/api/themes/${paletteId}/download`, { method:'POST' }).catch(() => {});
    } catch {}

    _updateActiveBanner();
    _renderList();
  }

  async function _installPalette(paletteId) {
    if (!_installed.includes(paletteId)) {
      _installed.push(paletteId);
      _themesData.installed = _installed;
      await window.modulo.themes.save(_themesData);
    }
  }

  async function _removePalette(paletteId) {
    if (paletteId === 'default') return;
    _installed = _installed.filter(i => i !== paletteId);
    _themesData.installed = _installed;
    // Si le thème actif était cette palette, revenir au défaut
    const { paletteId: activePalette } = _parseThemeId(_active);
    if (activePalette === paletteId) await _applyTheme('default', 'dark');
    else await window.modulo.themes.save(_themesData);
    _renderList();
  }

  // Swatches
  function _swatches(colors) {
    return (colors ?? []).map(c =>
      `<div style="flex:1;height:100%;background:${c}"></div>`
    ).join('');
  }

  // Active banner rendering
  function _updateActiveBanner() {
    const banner = container.querySelector('#themes-active-banner');
    if (!banner) return;
    const { paletteId, mode } = _parseThemeId(_active);
    const palette = _catalog.find(t => t.id === paletteId);
    const preview = palette?.variants?.[mode]?.preview ?? [];
    const nameEl  = banner.querySelector('#active-name');
    const swEl    = banner.querySelector('#active-swatches');
    const modeEl  = banner.querySelector('#active-mode');
    if (nameEl) nameEl.textContent = palette?.name ?? paletteId;
    if (modeEl) modeEl.innerHTML = mode === 'dark' ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg> Dark' : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Light';
    if (swEl)   swEl.innerHTML     = _swatches(preview);
  }

  // Rendered list
  function _renderList() {
    const list = container.querySelector('#themes-list');
    if (!list) return;

    const filtered = _getFiltered();
    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-title">${_l('Aucune palette','No palettes found')}</div></div>`;
      return;
    }

    list.innerHTML = filtered.map(palette => {
      const installed   = _isInstalled(palette.id);
      const { paletteId: activePalette, mode: activeMode } = _parseThemeId(_active);
      const isActivePalette = activePalette === palette.id;
      const darkPreview  = palette.variants?.dark?.preview  ?? [];
      const lightPreview = palette.variants?.light?.preview ?? [];

      return `
        <div class="card palette-card ${isActivePalette ? 'palette-active' : ''}"
          style="${isActivePalette ? 'border-color:var(--blue);background:var(--bg-active)' : ''}">

          <!-- Previews dark + light -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">
            <div class="palette-variant ${isActivePalette && activeMode==='dark' ? 'variant-active' : ''}"
              data-palette="${palette.id}" data-mode="dark"
              style="cursor:${installed?'pointer':'default'};border-radius:6px;overflow:hidden;border:1.5px solid ${isActivePalette && activeMode==='dark' ? 'var(--blue)' : 'var(--border)'};transition:border-color .12s">
              <div style="display:flex;height:36px">${_swatches(darkPreview)}</div>
              <div style="padding:3px 6px;font-size:10px;color:var(--text-tertiary);background:var(--bg-elevated);display:flex;align-items:center;gap:4px">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg> <span>Dark</span>
                ${isActivePalette && activeMode==='dark' ? '<svg width="8" height="8" viewBox="0 0 8 8" style="margin-left:auto;flex-shrink:0"><circle cx="4" cy="4" r="4" fill="var(--blue)"/></svg>' : ''}
              </div>
            </div>
            <div class="palette-variant ${isActivePalette && activeMode==='light' ? 'variant-active' : ''}"
              data-palette="${palette.id}" data-mode="light"
              style="cursor:${installed?'pointer':'default'};border-radius:6px;overflow:hidden;border:1.5px solid ${isActivePalette && activeMode==='light' ? 'var(--blue)' : 'var(--border)'};transition:border-color .12s">
              <div style="display:flex;height:36px">${_swatches(lightPreview)}</div>
              <div style="padding:3px 6px;font-size:10px;color:var(--text-tertiary);background:var(--bg-elevated);display:flex;align-items:center;gap:4px">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> <span>Light</span>
                ${isActivePalette && activeMode==='light' ? '<svg width="8" height="8" viewBox="0 0 8 8" style="margin-left:auto;flex-shrink:0"><circle cx="4" cy="4" r="4" fill="var(--blue)"/></svg>' : ''}
              </div>
            </div>
          </div>

          <!-- Info -->
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
            <span style="font-size:13px;font-weight:500">${palette.name}</span>
            ${isActivePalette ? `<span style="font-size:10px;padding:1px 7px;border-radius:var(--radius-full);background:var(--blue);color:#fff;font-weight:600">${_l('Actif','Active')}</span>` : ''}
            ${palette.builtin ? `<span style="font-size:10px;padding:1px 7px;border-radius:var(--radius-full);background:var(--bg-elevated);color:var(--text-tertiary);border:1px solid var(--border)">${_l('Officiel','Built-in')}</span>` : ''}
          </div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:10px">${_l('par','by')} ${palette.author ?? '—'}</div>

          <!-- Tags -->
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px">
            ${(palette.tags ?? []).map(t => `<span style="font-size:10px;padding:1px 6px;border-radius:var(--radius-full);background:var(--bg-elevated);color:var(--text-tertiary);border:1px solid var(--border)">${t}</span>`).join('')}
          </div>

          <!-- Actions -->
          <div style="display:flex;gap:6px">
            ${installed ? `
              <button class="btn btn-secondary btn-sm themes-apply-dark" data-id="${palette.id}"
                style="flex:1;font-size:11px;${isActivePalette && activeMode==='dark' ? 'opacity:.4;cursor:default' : ''}">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg> ${_l('Sombre','Dark')}
              </button>
              <button class="btn btn-secondary btn-sm themes-apply-light" data-id="${palette.id}"
                style="flex:1;font-size:11px;${isActivePalette && activeMode==='light' ? 'opacity:.4;cursor:default' : ''}">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> ${_l('Clair','Light')}
              </button>
              ${!palette.builtin ? `
                <button class="btn btn-ghost btn-sm themes-remove" data-id="${palette.id}"
                  title="${_l('Désinstaller','Uninstall')}" style="color:var(--red);padding:0 8px">
                  ${icon('trash','13px')}
                </button>` : ''}
            ` : `
              <button class="btn btn-secondary btn-sm themes-install-dark" data-id="${palette.id}" style="flex:1;font-size:11px">
                ${icon('download','12px')} ${_l('Installer','Install')}
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Bindings
    list.querySelectorAll('.themes-apply-dark').forEach(btn =>
      btn.addEventListener('click', () => _applyTheme(btn.dataset.id, 'dark')));
    list.querySelectorAll('.themes-apply-light').forEach(btn =>
      btn.addEventListener('click', () => _applyTheme(btn.dataset.id, 'light')));
    list.querySelectorAll('.themes-install-dark').forEach(btn =>
      btn.addEventListener('click', async () => {
        await _installPalette(btn.dataset.id);
        await _applyTheme(btn.dataset.id, 'dark');
      }));
    list.querySelectorAll('.themes-remove').forEach(btn =>
      btn.addEventListener('click', () => _removePalette(btn.dataset.id)));

    // Clic sur les variantes (si installé)
    list.querySelectorAll('.palette-variant').forEach(el => {
      el.addEventListener('click', () => {
        const palette = el.dataset.palette;
        const mode    = el.dataset.mode;
        if (_isInstalled(palette)) _applyTheme(palette, mode);
      });
    });
  }

  // Shell
  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">${icon('eye','20px')} ${_l('Thèmes','Themes')}</div>
          <div class="page-subtitle">${_l('Chaque palette propose une version sombre et claire','Each palette has a dark and light variant')}</div>
        </div>
      </div>

      <!-- Thème actif -->
      <div class="card" id="themes-active-banner" style="
        margin-bottom:20px;padding:14px 18px;
        display:flex;align-items:center;gap:14px;
        border-color:var(--blue);background:var(--bg-active);
      ">
        <div style="display:flex;height:32px;flex:0 0 160px;border-radius:6px;overflow:hidden;border:1px solid var(--border-strong)" id="active-swatches"></div>
        <div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:1px">${_l('Thème actif','Active theme')}</div>
          <div style="font-size:14px;font-weight:500;display:flex;align-items:center;gap:7px">
            <span id="active-name">—</span>
            <span id="active-mode" style="font-size:11px;color:var(--text-tertiary)"></span>
          </div>
        </div>
        <div style="flex:1"></div>
        <button class="btn btn-ghost btn-sm" id="themes-reset" style="font-size:11px">
          ${_l('Réinitialiser','Reset')}
        </button>
      </div>

      <!-- Filtres -->
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center">
        <input class="input" id="themes-search" placeholder="${_l('Rechercher…','Search…')}" style="max-width:220px;height:32px;font-size:13px">
        <div style="display:flex;gap:3px">
          ${['all','installed','minimal','blue','purple','green','warm','retro','classic','vibrant'].map(f => `
            <button class="btn btn-sm ${_filter===f?'btn-primary':'btn-secondary'} themes-filter" data-f="${f}" style="font-size:11px">
              ${{ all:_l('Tous','All'), installed:_l('Installés','Installed') }[f] ?? f}
            </button>
          `).join('')}
        </div>
        <span id="themes-count" style="font-size:11px;color:var(--text-tertiary)"></span>
      </div>

      <!-- Grille -->
      <div id="themes-list" style="
        display:grid;
        grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
        gap:14px;padding-bottom:40px;
      ">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
    </div>

    <style>
      .palette-card { transition: border-color .15s, transform .1s; }
      .palette-card:hover { transform: translateY(-1px); }
      .palette-active { transform: none !important; }
      .palette-variant:hover { border-color: var(--border-strong) !important; }
      .variant-active { border-color: var(--blue) !important; }
    </style>
  `;

  // Events
  container.querySelector('#themes-reset')?.addEventListener('click', () => _applyTheme('default', 'dark'));

  container.querySelectorAll('.themes-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      _filter = btn.dataset.f;
      container.querySelectorAll('.themes-filter').forEach(b => {
        b.className = `btn btn-sm ${_filter===b.dataset.f?'btn-primary':'btn-secondary'} themes-filter`;
        b.style.fontSize = '11px';
      });
      const ct = container.querySelector('#themes-count');
      if (ct) ct.textContent = `${_getFiltered().length} palettes`;
      _renderList();
    });
  });

  container.querySelector('#themes-search')?.addEventListener('input', e => {
    _query = e.target.value;
    const ct = container.querySelector('#themes-count');
    if (ct) ct.textContent = `${_getFiltered().length} palettes`;
    _renderList();
  });

  // load and render
  await _loadCatalog();

  const ct = container.querySelector('#themes-count');
  if (ct) ct.textContent = `${_catalog.length} palettes`;

  _updateActiveBanner();
  _renderList();
}
