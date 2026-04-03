// ── Modulo — Modules core ──

// ─── DevLog ─────────────────────────────────────────────────────────────────

const DevLog = (() => {
  const MAX = 200;

  function _entry(level, msg) {
    const entry = { level, msg, ts: new Date().toISOString() };
    (async () => {
      const all = (await window.modulo.devlog.get()) ?? [];
      all.push(entry);
      if (all.length > MAX) all.splice(0, all.length - MAX);
      await window.modulo.devlog.save(all);
    })();
    if (level === 'error') console.error(`[Modulo]`, msg);
    else if (level === 'warn') console.warn(`[Modulo]`, msg);
    else console.log(`[Modulo][${level}]`, msg);
  }

  return {
    info:  (msg) => _entry('info',  msg),
    warn:  (msg) => _entry('warn',  msg),
    error: (msg) => _entry('error', msg),
    debug: (msg) => _entry('debug', msg),
  };
})();

window.DevLog = DevLog;

// ─── Modal ──────────────────────────────────────────────────────────────────

const Modal = (() => {
  let _onConfirm = null;

  function open(title, html, onConfirm) {
    _onConfirm = onConfirm ?? null;
    const overlay = document.getElementById('modal-overlay');
    overlay.querySelector('.modal-header span').textContent = title;
    overlay.querySelector('.modal-body').innerHTML = html;
    overlay.classList.remove('hidden');
    const firstInput = overlay.querySelector('input, textarea, select');
    if (firstInput) firstInput.focus();
  }

  function close() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    overlay.querySelector('.modal-body').innerHTML = '';
    _onConfirm = null;
  }

  function confirm() {
    if (_onConfirm) _onConfirm();
    close();
  }

  function getInput(name) {
    const el = document.querySelector(`#modal-overlay [name="${name}"], #modal-overlay #${name}`);
    return el?.value ?? null;
  }

  function _init() {
    const overlay = document.getElementById('modal-overlay');
    overlay.querySelector('.modal-confirm')?.addEventListener('click', confirm);
    overlay.querySelector('.modal-cancel')?.addEventListener('click', close);
    overlay.querySelector('.modal-close-btn')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter' && !overlay.classList.contains('hidden')) {
        const active = document.activeElement?.tagName;
        if (active !== 'TEXTAREA' && active !== 'BUTTON') confirm();
      }
    });
  }

  return { open, close, confirm, getInput, _init };
})();

window.Modal = Modal;

// ─── Sound ──────────────────────────────────────────────────────────────────

const Sound = (() => {
  const SOUNDS = {
    ding:  440,
    beep:  880,
    alarm: 660,
    chime: 523,
  };

  function play(name) {
    // Vérifier si les sons sont activés
    const settings = window._settings ?? {};
    if (settings.sounds === false) return;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = SOUNDS[name] ?? 440;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch { /* AudioContext non disponible */ }
  }

  return { play };
})();

window.Sound = Sound;

// ─── TimerOverlay ────────────────────────────────────────────────────────────

const TimerOverlay = (() => {
  let _el = null;
  let _items = [];
  let _state = {};

  function _getEl() {
    if (!_el) _el = document.getElementById('timer-overlay');
    return _el;
  }

  function sync(items, state) {
    _items = items ?? [];
    _state = state ?? {};
    _render();
  }

  function _render() {
    const el = _getEl();
    if (!el) return;
    const running = _items.filter(i => _state[i.id]?.running);
    el.innerHTML = running.map(i => {
      const elapsed = _state[i.id]?.elapsed ?? 0;
      const remaining = Math.max(0, (i.duration ?? 0) - elapsed);
      return `
        <div class="timer-pill" data-id="${i.id}">
          ${icon('timer', '14px')}
          <span>${i.label ?? 'Timer'}</span>
          <span style="font-family:var(--font-mono)">${formatTime(remaining)}</span>
        </div>
      `;
    }).join('');
  }

  return { sync };
})();

window.TimerOverlay = TimerOverlay;

// ─── Utilities (globales) ────────────────────────────────────────────────────

window.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

window.today = () => new Date().toISOString().slice(0, 10);

window.formatTime = (seconds) => {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

window.formatDate = (dateStr) => {
  if (!dateStr) return '';
  const settings = window._settings ?? {};
  const fmt = settings.dateFormat ?? 'dmy';
  const [y, m, d] = dateStr.split('-');
  if (fmt === 'mdy') return `${m}/${d}/${y}`;
  if (fmt === 'ymd') return `${y}-${m}-${d}`;
  return `${d}/${m}/${y}`;
};

window.stripHtml = (html) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent ?? tmp.innerText ?? '';
};

// ─── ModuleLoader ─────────────────────────────────────────────────────────────

const ModuleLoader = (() => {
  const _loaded = new Set();

  async function ensureLoaded(mod) {
    if (_loaded.has(mod.id)) return true;

    if (mod.builtIn) {
      // Déjà dans index.html
      _loaded.add(mod.id);
      return true;
    }

    try {
      const code = await window.modulo.moduleFiles.readFile(mod.id);
      if (!code) throw new Error('Fichier JS introuvable');

      // Script inline — s'exécute dans le même window (contextIsolation safe)
      const script = document.createElement('script');
      script.textContent = code;
      document.head.appendChild(script);

      _loaded.add(mod.id);
      DevLog.info(`[ModuleLoader] Loaded: ${mod.id}`);
      return true;
    } catch (err) {
      DevLog.error(`[ModuleLoader] Failed to load ${mod.id}: ${err.message}`);
      return false;
    }
  }

  function isLoaded(id) { return _loaded.has(id); }
  function markLoaded(id) { _loaded.add(id); }

  return { ensureLoaded, isLoaded, markLoaded };
})();

window.ModuleLoader = ModuleLoader;

// ─── ModuleManager ────────────────────────────────────────────────────────────

const ModuleManager = (() => {
  let _catalog = [];

  async function install(mod) {
    try {
      // Télécharger le JS si pas builtin
      if (!mod.builtIn && mod.scriptUrl) {
        DevLog.info(`[ModuleManager] Downloading: ${mod.id}`);
        await window.modulo.moduleFiles.download(mod.id, mod.scriptUrl);
      }

      // Charger le JS
      const loaded = await ModuleLoader.ensureLoaded(mod);
      if (!loaded) throw new Error('Impossible de charger le module');

      // Enregistrer la route
      const renderFn = window[mod.renderFn];
      if (typeof renderFn !== 'function') {
        throw new Error(`renderFn "${mod.renderFn}" non trouvé`);
      }
      Router.register(mod.navKey, renderFn);

      // Persister
      const data = (await window.modulo.modules.get()) ?? { installed: [] };
      if (!data.installed.includes(mod.id)) data.installed.push(mod.id);
      await window.modulo.modules.save(data);

      // Rebuild nav
      await rebuildNav();

      DevLog.info(`[ModuleManager] Installed: ${mod.id}`);
      return true;
    } catch (err) {
      DevLog.error(`[ModuleManager] Install failed for ${mod.id}: ${err.message}`);
      throw err;
    }
  }

  async function uninstall(mod) {
    try {
      Router.unregister(mod.navKey);
      if (!mod.builtIn) {
        await window.modulo.moduleFiles.deleteFile(mod.id);
      }

      const data = (await window.modulo.modules.get()) ?? { installed: [] };
      data.installed = data.installed.filter(id => id !== mod.id);
      await window.modulo.modules.save(data);

      await rebuildNav();
      DevLog.info(`[ModuleManager] Uninstalled: ${mod.id}`);
      return true;
    } catch (err) {
      DevLog.error(`[ModuleManager] Uninstall failed for ${mod.id}: ${err.message}`);
      throw err;
    }
  }

  async function restoreInstalled() {
    const data = (await window.modulo.modules.get()) ?? { installed: [] };
    const installed = data.installed ?? [];

    for (const id of installed) {
      const mod = _catalog.find(m => m.id === id) ?? { id, navKey: id, renderFn: `render${id.charAt(0).toUpperCase()}${id.slice(1)}` };
      try {
        const loaded = await ModuleLoader.ensureLoaded(mod);
        if (loaded) {
          const renderFn = window[mod.renderFn];
          if (typeof renderFn === 'function') {
            Router.register(mod.navKey, renderFn);
          }
        }
      } catch (err) {
        DevLog.warn(`[ModuleManager] Could not restore ${id}: ${err.message}`);
      }
    }
  }

  async function fetchCatalog(catalogUrl) {
    const url = `${catalogUrl}/api/modules`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _catalog = Array.isArray(data) ? data : (data.modules ?? []);
    return _catalog;
  }

  function getCatalog() { return _catalog; }
  function setCatalog(c) { _catalog = c; }

  return { install, uninstall, restoreInstalled, fetchCatalog, getCatalog, setCatalog };
})();

window.ModuleManager = ModuleManager;
