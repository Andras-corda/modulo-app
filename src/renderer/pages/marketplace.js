// ── Page Marketplace ──

async function renderMarketplace(container) {
  const settings = window._settings ?? {};
  const lang = settings.lang ?? 'fr';

  // État
  let catalog = [];
  let filter = 'all';
  let query = '';
  let installed = [];

  // Charger les modules installés
  const modData = (await window.modulo.modules.get()) ?? { installed: [] };
  installed = modData.installed ?? [];

  // HTML initial
  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">${t('marketplace_title')}</div>
          <div class="page-subtitle">${t('marketplace_subtitle')}</div>
        </div>
        <button class="btn btn-secondary btn-sm" id="mp-refresh">
          ${icon('reset', '14px')} ${t('marketplace_refresh')}
        </button>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
        <input class="input" id="mp-search" placeholder="${t('marketplace_search')}" style="max-width:300px">
        <div style="display:flex;gap:6px" id="mp-filters">
          ${['all','core','productivity','time','fun'].map(cat => `
            <button class="btn btn-secondary btn-sm mp-filter ${cat === 'all' ? 'active-filter' : ''}" data-cat="${cat}">
              ${t('marketplace_' + cat)}
            </button>
          `).join('')}
        </div>
      </div>

      <div id="mp-content">
        <div class="empty-state">
          <div class="spinner"></div>
          <div>${t('marketplace_loading')}</div>
        </div>
      </div>
    </div>
  `;

  // Style filtre actif
  const styleEl = document.createElement('style');
  styleEl.textContent = `.active-filter { background: var(--blue) !important; color: #fff !important; border-color: var(--blue) !important; }`;
  container.appendChild(styleEl);

  const contentEl = container.querySelector('#mp-content');
  const searchEl  = container.querySelector('#mp-search');

  function renderGrid() {
    const filtered = catalog.filter(m => {
      const matchCat = filter === 'all' || m.category === filter;
      const q = query.toLowerCase();
      const matchQ = !q
        || m.name?.toLowerCase().includes(q)
        || m.description?.toLowerCase().includes(q)
        || m.tags?.some(tag => tag.toLowerCase().includes(q));
      return matchCat && matchQ;
    });

    if (!filtered.length) {
      contentEl.innerHTML = `
        <div class="empty-state">
          ${icon('search', '32px')}
          <div class="empty-state-title">${t('marketplace_empty')}</div>
        </div>
      `;
      return;
    }

    contentEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
        ${filtered.map(mod => {
          const isInstalled = installed.includes(mod.id);
          const isBuiltin   = mod.builtIn || mod.built_in;
          const labelObj    = mod.navLabel ?? {};
          const modName     = mod.name ?? mod.id;
          const downloads   = mod.downloads ?? 0;
          const version     = mod.version ?? '1.0.0';
          const size        = mod.size ?? '—';

          return `
            <div class="card" style="display:flex;flex-direction:column;gap:12px;cursor:pointer" data-id="${mod.id}">
              <div style="display:flex;align-items:flex-start;gap:12px">
                <div style="
                  width:40px;height:40px;border-radius:var(--radius-md);
                  background:${mod.color ?? '#4285F4'}22;
                  display:flex;align-items:center;justify-content:center;
                  color:${mod.color ?? '#4285F4'};flex-shrink:0
                ">
                  ${icon(mod.icon ?? 'dashboard', '20px')}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:14px;font-weight:500;color:var(--text-primary)">${modName}</div>
                  <div style="font-size:11px;color:var(--text-tertiary);margin-top:1px">
                    v${version} · ${mod.author ?? '—'}
                  </div>
                </div>
                ${isBuiltin ? `<span class="badge badge-blue">${t('marketplace_builtin')}</span>` : ''}
              </div>

              <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;flex:1">
                ${mod.description ?? ''}
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between">
                <div style="font-size:11px;color:var(--text-tertiary)">
                  ${icon('download', '12px')} ${downloads} ${t('marketplace_downloads')}
                  &nbsp;·&nbsp; ${size}
                </div>
                ${isBuiltin
                  ? `<button class="btn btn-secondary btn-sm" disabled>${t('marketplace_builtin')}</button>`
                  : isInstalled
                    ? `<button class="btn btn-secondary btn-sm mp-uninstall" data-id="${mod.id}">${icon('trash', '13px')} ${t('marketplace_remove')}</button>`
                    : `<button class="btn btn-primary btn-sm mp-install" data-id="${mod.id}">${icon('download', '13px')} ${t('marketplace_install')}</button>`
                }
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Events install/uninstall
    contentEl.querySelectorAll('.mp-install').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const mod = catalog.find(m => m.id === id);
        if (!mod) return;

        btn.disabled = true;
        btn.innerHTML = `<div class="spinner" style="width:14px;height:14px"></div>`;

        try {
          await ModuleManager.install(mod);
          installed.push(id);
          renderGrid();
          DevLog.info(`[Marketplace] Installed: ${id}`);
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = `${icon('download', '13px')} ${t('marketplace_install')}`;
          alert(`Erreur : ${err.message}`);
        }
      });
    });

    contentEl.querySelectorAll('.mp-uninstall').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const mod = catalog.find(m => m.id === id) ?? { id, navKey: id };
        try {
          await ModuleManager.uninstall(mod);
          installed = installed.filter(i => i !== id);
          renderGrid();
        } catch (err) {
          alert(`Erreur : ${err.message}`);
        }
      });
    });
  }

  async function loadCatalog() {
    contentEl.innerHTML = `<div class="empty-state"><div class="spinner"></div><div>${t('marketplace_loading')}</div></div>`;
    try {
      const url = settings.catalogUrl ?? 'https://modulo-web-production.up.railway.app';
      catalog = await ModuleManager.fetchCatalog(url);
      renderGrid();
    } catch (err) {
      contentEl.innerHTML = `
        <div class="empty-state">
          ${icon('warning', '32px')}
          <div class="empty-state-title">${t('marketplace_error')}</div>
          <div class="empty-state-sub">${err.message}</div>
          <button class="btn btn-primary" id="mp-retry">${t('marketplace_retry')}</button>
        </div>
      `;
      contentEl.querySelector('#mp-retry')?.addEventListener('click', loadCatalog);
    }
  }

  // Events
  searchEl.addEventListener('input', () => { query = searchEl.value; renderGrid(); });

  container.querySelectorAll('.mp-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.mp-filter').forEach(b => b.classList.remove('active-filter'));
      btn.classList.add('active-filter');
      filter = btn.dataset.cat;
      renderGrid();
    });
  });

  container.querySelector('#mp-refresh')?.addEventListener('click', loadCatalog);

  // Charger
  await loadCatalog();
}
