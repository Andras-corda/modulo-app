// ── Page Settings ──

async function renderSettings(container) {
  let settings = (await window.modulo.settings.get()) ?? {};
  let activeTab = 'appearance';

  const TABS = ['appearance', 'general', 'modules', 'devlog', 'about'];

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
    if (tab === 'about')      return renderAbout();
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
        <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:12px">
          Glissez-déposez pour réordonner les modules dans la sidebar.
        </div>
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
    let installed = [...(data.installed ?? [])];
    const catalog = ModuleManager.getCatalog();

    if (!installed.length) {
      el.innerHTML = `<div class="empty-state">${icon('store', '32px')}<div class="empty-state-title">Aucun module installé</div><button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="Router.navigate('marketplace')">Découvrir le marketplace</button></div>`;
      return;
    }

    el.innerHTML = `<div id="mod-sort-list" style="display:flex;flex-direction:column;gap:6px">` +
      installed.map((id, idx) => {
        const mod = catalog.find(m => m.id === id);
        const name = mod?.name ?? id;
        const version = mod?.version ?? '—';
        return `
          <div class="mod-sort-item item-row" data-id="${id}" data-idx="${idx}" style="cursor:grab;user-select:none">
            <div style="color:var(--text-tertiary);cursor:grab;padding:0 6px;font-size:16px;line-height:1">⠿</div>
            <div style="width:32px;height:32px;border-radius:var(--radius-md);background:${mod?.color ?? '#4285F4'}22;display:flex;align-items:center;justify-content:center;color:${mod?.color ?? '#4285F4'}">
              ${icon(mod?.icon ?? 'dashboard', '16px')}
            </div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:500">${name}</div>
              <div style="font-size:11px;color:var(--text-tertiary)">v${version}</div>
            </div>
            <button class="btn btn-ghost btn-sm" id="mod-up-${id}" data-id="${id}" title="Monter" ${idx===0?'disabled':''}>↑</button>
            <button class="btn btn-ghost btn-sm" id="mod-dn-${id}" data-id="${id}" title="Descendre" ${idx===installed.length-1?'disabled':''}>↓</button>
            <button class="btn btn-secondary btn-sm mod-remove" data-id="${id}">${icon('trash','13px')}</button>
          </div>
        `;
      }).join('') + `</div>`;

    // Boutons monter/descendre
    el.querySelectorAll('[id^="mod-up-"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id  = btn.dataset.id;
        const idx = installed.indexOf(id);
        if (idx > 0) { [installed[idx-1], installed[idx]] = [installed[idx], installed[idx-1]]; }
        await window.modulo.modules.save({ ...data, installed });
        await rebuildNav();
        loadModulesTab();
      });
    });

    el.querySelectorAll('[id^="mod-dn-"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id  = btn.dataset.id;
        const idx = installed.indexOf(id);
        if (idx < installed.length - 1) { [installed[idx], installed[idx+1]] = [installed[idx+1], installed[idx]]; }
        await window.modulo.modules.save({ ...data, installed });
        await rebuildNav();
        loadModulesTab();
      });
    });

    // Drag & drop pour réordonner
    const list = el.querySelector('#mod-sort-list');
    let dragId = null, dragEl = null;

    el.querySelectorAll('.mod-sort-item').forEach(item => {
      item.addEventListener('mousedown', e => {
        if (e.target.classList.contains('btn')) return;
        dragId = item.dataset.id;
        dragEl = item;
        item.style.opacity = '0.5';
        item.style.cursor  = 'grabbing';
      });

      item.addEventListener('mouseenter', async () => {
        if (!dragId || dragId === item.dataset.id) return;
        const fromIdx = installed.indexOf(dragId);
        const toIdx   = installed.indexOf(item.dataset.id);
        if (fromIdx < 0 || toIdx < 0) return;
        installed.splice(toIdx, 0, installed.splice(fromIdx, 1)[0]);
        await window.modulo.modules.save({ ...data, installed });
        await rebuildNav();
        loadModulesTab();
        dragId = null;
      });
    });

    window.addEventListener('mouseup', () => {
      if (dragEl) { dragEl.style.opacity = '1'; dragEl.style.cursor = 'grab'; }
      dragId = null; dragEl = null;
    }, { once: true });

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

  function renderAbout() {
    return `
      <div style="max-width:480px;display:flex;flex-direction:column;gap:20px">

        <div class="card" style="background:linear-gradient(135deg,rgba(66,133,244,.06) 0%,transparent 100%)">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
            <div style="width:52px;height:52px;border-radius:12px;background:var(--blue);display:flex;align-items:center;justify-content:center">
              <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="7" height="7" rx="2" fill="#fff"/>
                <rect x="11" y="2" width="7" height="7" rx="2" fill="#fff" opacity=".6"/>
                <rect x="2" y="11" width="7" height="7" rx="2" fill="#fff" opacity=".6"/>
                <rect x="11" y="11" width="7" height="7" rx="2" fill="#fff" opacity=".3"/>
              </svg>
            </div>
            <div>
              <div style="font-size:18px;font-weight:600">Modulo</div>
              <div style="font-size:12px;color:var(--text-tertiary)">v1.3.2 — Application de productivité modulaire</div>
            </div>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.6">
            Modulo est une application desktop open-source permettant d'installer uniquement les fonctionnalités dont vous avez besoin. Données 100% locales, aucun compte requis.
          </div>
        </div>

        <div class="card">
          <div style="font-size:13px;font-weight:500;margin-bottom:14px">Créateur</div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#4285F4,#9C27B0);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff">R</div>
            <div>
              <div style="font-size:14px;font-weight:600">R3tr0___</div>
              <div style="font-size:11px;color:var(--text-tertiary)">Développeur</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-secondary about-ext" data-url="https://discord.gg/8JPP3wDd6e" style="justify-content:flex-start;gap:10px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color:#5865F2;flex-shrink:0"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              <span>Discord — Rejoindre le serveur</span>
            </button>
            <button class="btn btn-secondary about-ext" data-url="https://andras-corda.github.io/portfolio-github-hosting/" style="justify-content:flex-start;gap:10px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span>Portfolio</span>
            </button>
            <button class="btn btn-secondary about-ext" data-url="https://github.com/Andras-corda/modulo-app" style="justify-content:flex-start;gap:10px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;color:var(--text-secondary)"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              <span>GitHub — Code source</span>
            </button>
          </div>
        </div>

        <div class="card">
          <div style="font-size:13px;font-weight:500;margin-bottom:8px">Licence</div>
          <div style="font-size:12px;color:var(--text-tertiary);line-height:1.6">
            MIT License — Logiciel libre et open source.<br>
            Vos données vous appartiennent et ne quittent jamais votre machine.
          </div>
        </div>

      </div>
    `;
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

    // About — liens externes
    if (activeTab === 'about') {
      container.querySelectorAll('.about-ext').forEach(btn => {
        btn.addEventListener('click', () => window.modulo.openExternal(btn.dataset.url));
      });
    }

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
