// ── Page Settings ──

async function renderSettings(container) {
  let settings = (await window.modulo.settings.get()) ?? {};
  let activeTab = 'appearance';

  const TABS = ['appearance', 'general', 'modules', 'devlog'];

  function render() {
    container.innerHTML = `
      <div class="page">
        <div class="page-header">
          <div class="page-title">${t('settings_title')}</div>
        </div>

        <div style="display:flex;gap:6px;margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:0">
          ${TABS.map(tab => `
            <button class="btn btn-ghost settings-tab ${activeTab === tab ? 'settings-tab-active' : ''}" data-tab="${tab}"
              style="${activeTab === tab ? 'color:var(--blue);border-bottom:2px solid var(--blue);border-radius:0' : 'border-bottom:2px solid transparent;border-radius:0'}">
              ${t('settings_' + tab)}
            </button>
          `).join('')}
        </div>

        <div id="settings-content">
          ${renderTab(activeTab)}
        </div>
      </div>
    `;

    // Tab switching
    container.querySelectorAll('.settings-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        render();
        bindEvents();
      });
    });

    bindEvents();
  }

  function renderTab(tab) {
    if (tab === 'appearance') return renderAppearance();
    if (tab === 'general')    return renderGeneral();
    if (tab === 'modules')    return renderModulesTab();
    if (tab === 'devlog')     return renderDevLog();
    return '';
  }

  function renderAppearance() {
    return `
      <div style="display:flex;flex-direction:column;gap:20px;max-width:480px">
        <div class="card">
          <div style="font-size:13px;font-weight:500;margin-bottom:12px">${t('settings_theme')}</div>
          <div style="display:flex;gap:8px">
            ${['dark','light'].map(th => `
              <button class="btn ${settings.theme === th ? 'btn-primary' : 'btn-secondary'} theme-btn" data-theme="${th}">
                ${icon(th === 'dark' ? 'eye' : 'eye', '14px')} ${t('settings_theme_' + th)}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <div style="font-size:13px;font-weight:500;margin-bottom:12px">${t('settings_font_size')}</div>
          <div style="display:flex;gap:8px">
            ${[['0.88','small'],['1','normal'],['1.15','large']].map(([val, key]) => `
              <button class="btn ${String(settings.fontScale) === val ? 'btn-primary' : 'btn-secondary'} font-btn" data-scale="${val}">
                ${t('settings_font_' + key)}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <div style="font-size:13px;font-weight:500;margin-bottom:12px">${t('settings_language')}</div>
          <div style="display:flex;gap:8px">
            ${[['fr','Français'],['en','English']].map(([code, label]) => `
              <button class="btn ${settings.lang === code ? 'btn-primary' : 'btn-secondary'} lang-btn" data-lang="${code}">
                ${label}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <div style="font-size:13px;font-weight:500;margin-bottom:12px">${t('settings_date_format')}</div>
          <select class="input" id="date-format-sel" style="max-width:200px">
            <option value="dmy" ${settings.dateFormat==='dmy'?'selected':''}>JJ/MM/AAAA</option>
            <option value="mdy" ${settings.dateFormat==='mdy'?'selected':''}>MM/DD/YYYY</option>
            <option value="ymd" ${settings.dateFormat==='ymd'?'selected':''}>AAAA-MM-JJ</option>
          </select>
        </div>
      </div>
    `;
  }

  function renderGeneral() {
    return `
      <div style="display:flex;flex-direction:column;gap:16px;max-width:480px">
        <div class="card" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:13px;font-weight:500">${t('settings_sounds')}</div>
            <div style="font-size:11px;color:var(--text-tertiary);margin-top:2px">Sons de notification et d'actions</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="sounds-toggle" ${settings.sounds !== false ? 'checked' : ''}>
            <span class="switch-track"></span>
          </label>
        </div>

        <div class="card" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:13px;font-weight:500">${t('settings_startup')}</div>
            <div style="font-size:11px;color:var(--text-tertiary);margin-top:2px">Lancer Modulo avec Windows</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="startup-toggle" ${settings.startup ? 'checked' : ''}>
            <span class="switch-track"></span>
          </label>
        </div>

        <div class="card">
          <div style="font-size:13px;font-weight:500;margin-bottom:8px">${t('settings_catalog_url')}</div>
          <input class="input" id="catalog-url-input" value="${settings.catalogUrl ?? 'https://modulo-web-production.up.railway.app'}">
          <div style="font-size:11px;color:var(--text-tertiary);margin-top:6px">URL de l'API Railway pour le catalogue de modules</div>
        </div>

        <button class="btn btn-primary" id="settings-save" style="align-self:flex-start">
          ${icon('check', '14px')} ${t('settings_save')}
        </button>
        <div id="settings-saved" style="font-size:12px;color:var(--green);display:none">${t('settings_saved')}</div>
      </div>
    `;
  }

  function renderModulesTab() {
    return `
      <div style="max-width:600px">
        <div id="modules-list-settings">
          <div class="empty-state"><div class="spinner"></div></div>
        </div>
      </div>
    `;
  }

  async function loadModulesTab() {
    const el = container.querySelector('#modules-list-settings');
    if (!el) return;

    const data = (await window.modulo.modules.get()) ?? { installed: [] };
    const installed = data.installed ?? [];
    const catalog = ModuleManager.getCatalog();

    if (!installed.length) {
      el.innerHTML = `<div class="empty-state">${icon('store', '32px')}<div class="empty-state-title">Aucun module installé</div></div>`;
      return;
    }

    el.innerHTML = installed.map(id => {
      const mod = catalog.find(m => m.id === id);
      const name = mod?.name ?? id;
      const version = mod?.version ?? '—';
      return `
        <div class="item-row" style="margin-bottom:8px">
          <div style="width:32px;height:32px;border-radius:var(--radius-md);background:${mod?.color ?? '#4285F4'}22;display:flex;align-items:center;justify-content:center;color:${mod?.color ?? '#4285F4'}">
            ${icon(mod?.icon ?? 'dashboard', '16px')}
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500">${name}</div>
            <div style="font-size:11px;color:var(--text-tertiary)">v${version}</div>
          </div>
          <button class="btn btn-secondary btn-sm mod-remove" data-id="${id}">${icon('trash','13px')}</button>
        </div>
      `;
    }).join('');

    el.querySelectorAll('.mod-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const mod = catalog.find(m => m.id === id) ?? { id, navKey: id };
        await ModuleManager.uninstall(mod);
        await loadModulesTab();
      });
    });
  }

  function renderDevLog() {
    return `
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">
          <div style="display:flex;gap:4px" id="log-filters">
            ${['all','info','warn','error','debug'].map(lvl => `
              <button class="btn btn-secondary btn-sm log-filter ${lvl === 'all' ? 'active-filter' : ''}" data-lvl="${lvl}">
                ${t('devlog_' + lvl)}
              </button>
            `).join('')}
          </div>
          <div style="flex:1"></div>
          <button class="btn btn-secondary btn-sm" id="log-export">${icon('export', '13px')} ${t('devlog_export')}</button>
          <button class="btn btn-secondary btn-sm" id="log-clear">${icon('trash', '13px')} ${t('devlog_clear')}</button>
        </div>
        <div id="log-entries" style="font-family:var(--font-mono);font-size:11px;max-height:400px;overflow-y:auto"></div>
      </div>
    `;
  }

  async function loadDevLog(lvlFilter = 'all') {
    const el = container.querySelector('#log-entries');
    if (!el) return;

    const entries = (await window.modulo.devlog.get()) ?? [];
    const filtered = lvlFilter === 'all' ? entries : entries.filter(e => e.level === lvlFilter);

    if (!filtered.length) {
      el.innerHTML = `<div class="empty-state" style="padding:24px">${t('devlog_empty')}</div>`;
      return;
    }

    const COLORS = { info: 'var(--blue-light)', warn: 'var(--yellow)', error: 'var(--red)', debug: 'var(--text-tertiary)' };

    el.innerHTML = [...filtered].reverse().map(e => `
      <div style="display:flex;gap:10px;padding:4px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--text-tertiary);white-space:nowrap">${e.ts?.slice(11,19) ?? ''}</span>
        <span style="color:${COLORS[e.level] ?? 'var(--text-secondary)'};width:40px;flex-shrink:0">${e.level}</span>
        <span style="color:var(--text-secondary);word-break:break-all">${e.msg}</span>
      </div>
    `).join('');
  }

  function bindEvents() {
    // Theme
    container.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        settings.theme = btn.dataset.theme;
        await saveSettings();
        render();
        bindEvents();
      });
    });

    // Font scale
    container.querySelectorAll('.font-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        settings.fontScale = parseFloat(btn.dataset.scale);
        await saveSettings();
        render();
        bindEvents();
      });
    });

    // Lang
    container.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        settings.lang = btn.dataset.lang;
        await saveSettings();
        render();
        bindEvents();
      });
    });

    // Date format
    container.querySelector('#date-format-sel')?.addEventListener('change', async (e) => {
      settings.dateFormat = e.target.value;
    });

    // Sounds toggle
    container.querySelector('#sounds-toggle')?.addEventListener('change', (e) => {
      settings.sounds = e.target.checked;
    });

    // Startup toggle
    container.querySelector('#startup-toggle')?.addEventListener('change', async (e) => {
      settings.startup = e.target.checked;
      await window.modulo.setStartup(settings.startup);
    });

    // Save
    container.querySelector('#settings-save')?.addEventListener('click', async () => {
      settings.catalogUrl = container.querySelector('#catalog-url-input')?.value ?? settings.catalogUrl;
      await saveSettings();
      const saved = container.querySelector('#settings-saved');
      if (saved) { saved.style.display = 'block'; setTimeout(() => { saved.style.display = 'none'; }, 2000); }
    });

    // Dev Log filters
    if (activeTab === 'devlog') {
      let lvl = 'all';
      loadDevLog(lvl);

      container.querySelectorAll('.log-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.log-filter').forEach(b => b.classList.remove('active-filter'));
          btn.classList.add('active-filter');
          lvl = btn.dataset.lvl;
          loadDevLog(lvl);
        });
      });

      container.querySelector('#log-clear')?.addEventListener('click', async () => {
        await window.modulo.devlog.save([]);
        loadDevLog(lvl);
      });

      container.querySelector('#log-export')?.addEventListener('click', async () => {
        const entries = (await window.modulo.devlog.get()) ?? [];
        const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `modulo-devlog-${today()}.json`;
        a.click();
      });
    }

    // Modules tab
    if (activeTab === 'modules') loadModulesTab();
  }

  async function saveSettings() {
    await window.modulo.settings.save(settings);
    await applySettings(settings);
  }

  const styleEl = document.createElement('style');
  styleEl.textContent = `.active-filter { background: var(--blue) !important; color: #fff !important; border-color: var(--blue) !important; }`;
  container.appendChild(styleEl);

  render();
}
