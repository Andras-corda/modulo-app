// ── Modulo Module: Minuteurs (timers) v1.2.0 ──
// Author: Modulo Team
// Built: 2026-04-02T23:54:51.081Z
// renderFn: renderTimers
// ── timers\script\state.js ──
// ── Timers State ──

const TimersState = {
  _timers:   [],
  _runtime:  {}, // { [id]: { running, elapsed, startedAt, interval } }

  async load() {
    this._timers = (await window.modulo.timers.getAll()) ?? [];
    return this._timers;
  },

  async save() {
    await window.modulo.timers.save(this._timers);
  },

  async add(label, duration) {
    const t = { id: uid(), label, duration, createdAt: today() };
    this._timers.unshift(t);
    await this.save();
    return t;
  },

  async remove(id) {
    this.pause(id);
    this._timers = this._timers.filter(t => t.id !== id);
    delete this._runtime[id];
    await this.save();
  },

  start(id, onTick, onDone) {
    const t = this._timers.find(t => t.id === id);
    if (!t) return;
    if (!this._runtime[id]) this._runtime[id] = { elapsed: 0 };
    const rt = this._runtime[id];
    if (rt.running) return;
    rt.running    = true;
    rt.startedAt  = Date.now();
    rt.interval   = setInterval(() => {
      rt.elapsed = (rt.elapsed ?? 0) + 1;
      onTick?.(id, rt.elapsed);
      if (rt.elapsed >= t.duration) {
        this.pause(id);
        onDone?.(id);
      }
      TimerOverlay.sync(this._timers, this._runtime);
    }, 1000);
    TimerOverlay.sync(this._timers, this._runtime);
  },

  pause(id) {
    const rt = this._runtime[id];
    if (!rt) return;
    clearInterval(rt.interval);
    rt.running = false;
    TimerOverlay.sync(this._timers, this._runtime);
  },

  reset(id) {
    this.pause(id);
    if (this._runtime[id]) this._runtime[id].elapsed = 0;
    TimerOverlay.sync(this._timers, this._runtime);
  },

  getRuntime(id) {
    return this._runtime[id] ?? { running: false, elapsed: 0 };
  },
};

// ── timers\page\render.js ──
// ── Timers Render ──

async function renderTimers(container) {
  await TimersState.load();

  const PRESETS = [
    { label: 'Pomodoro',    duration: 25 * 60 },
    { label: 'Pause courte', duration: 5 * 60 },
    { label: 'Pause longue', duration: 15 * 60 },
  ];

  function _remaining(t) {
    const rt = TimersState.getRuntime(t.id);
    return Math.max(0, t.duration - (rt.elapsed ?? 0));
  }

  function _pct(t) {
    const rt = TimersState.getRuntime(t.id);
    return Math.min(100, Math.round(((rt.elapsed ?? 0) / t.duration) * 100));
  }

  function render() {
    const timers = TimersState._timers;

    container.innerHTML = `
      <div class="page">
        <div class="page-header">
          <div class="page-title">${icon('timer','20px')} Minuteurs</div>
          <button class="btn btn-primary" id="timers-add">${icon('plus','16px')} Nouveau</button>
        </div>

        <!-- Présets -->
        <div style="margin-bottom:24px">
          <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:8px">Démarrage rapide</div>
          <div style="display:flex;gap:8px">
            ${PRESETS.map(p => `
              <button class="btn btn-secondary btn-sm timers-preset" data-label="${p.label}" data-duration="${p.duration}">
                ${icon('play','12px')} ${p.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Liste -->
        <div id="timers-list">
          ${!timers.length ? `
            <div class="empty-state">
              ${icon('timer','40px')}
              <div class="empty-state-title">Aucun minuteur</div>
              <div class="empty-state-sub">Créez un minuteur ou utilisez un préset</div>
            </div>
          ` : timers.map(t => {
            const rt        = TimersState.getRuntime(t.id);
            const remaining = _remaining(t);
            const pct       = _pct(t);
            const done      = remaining === 0;
            return `
              <div class="card" style="margin-bottom:12px" data-id="${t.id}">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
                  <div style="flex:1">
                    <div style="font-size:14px;font-weight:500">${t.label}</div>
                    <div style="font-size:11px;color:var(--text-tertiary)">${formatTime(t.duration)} total</div>
                  </div>
                  <div style="font-size:28px;font-weight:500;font-family:var(--font-mono);color:${done ? 'var(--green)' : 'var(--text-primary)'}">
                    ${formatTime(remaining)}
                  </div>
                </div>

                <div class="progress-bar" style="margin-bottom:12px">
                  <div class="progress-bar-fill" style="width:${pct}%;background:${done ? 'var(--green)' : 'var(--red)'}"></div>
                </div>

                <div style="display:flex;gap:6px">
                  ${!rt.running && !done ? `
                    <button class="btn btn-primary btn-sm timers-start" data-id="${t.id}">${icon('play','13px')} Démarrer</button>
                  ` : rt.running ? `
                    <button class="btn btn-secondary btn-sm timers-pause" data-id="${t.id}">${icon('pause','13px')} Pause</button>
                  ` : `
                    <span class="badge badge-green">${icon('check','12px')} Terminé</span>
                  `}
                  <button class="btn btn-secondary btn-sm timers-reset" data-id="${t.id}">${icon('reset','13px')} Reset</button>
                  <div style="flex:1"></div>
                  <button class="btn btn-ghost btn-icon btn-sm timers-del" data-id="${t.id}">${icon('trash','14px')}</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    _bindEvents();
  }

  function _onTick(id) { render(); }

  function _onDone(id) {
    const t = TimersState._timers.find(t => t.id === id);
    window.modulo.notify({ title: '⏰ Minuteur terminé', body: t?.label ?? 'Minuteur terminé' });
    Sound.play('ding');
    render();
  }

  function _openAddModal(label = '', duration = 25 * 60) {
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    Modal.open('Nouveau minuteur', `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Nom</label>
          <input class="input" name="label" value="${label}" placeholder="Mon minuteur…">
        </div>
        <div style="display:flex;gap:8px">
          <div style="flex:1">
            <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Minutes</label>
            <input class="input" type="number" name="mins" value="${mins}" min="0" max="999">
          </div>
          <div style="flex:1">
            <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Secondes</label>
            <input class="input" type="number" name="secs" value="${secs}" min="0" max="59">
          </div>
        </div>
      </div>
    `, async () => {
      const lbl  = Modal.getInput('label')?.trim() || 'Minuteur';
      const m    = parseInt(Modal.getInput('mins') ?? '25', 10) || 0;
      const s    = parseInt(Modal.getInput('secs') ?? '0',  10) || 0;
      const dur  = m * 60 + s;
      if (dur <= 0) return;
      await TimersState.add(lbl, dur);
      render();
    });
  }

  function _bindEvents() {
    container.querySelector('#timers-add')?.addEventListener('click', () => _openAddModal());

    container.querySelectorAll('.timers-preset').forEach(btn => {
      btn.addEventListener('click', () => _openAddModal(btn.dataset.label, parseInt(btn.dataset.duration)));
    });

    container.querySelectorAll('.timers-start').forEach(btn => {
      btn.addEventListener('click', () => { TimersState.start(btn.dataset.id, _onTick, _onDone); render(); });
    });

    container.querySelectorAll('.timers-pause').forEach(btn => {
      btn.addEventListener('click', () => { TimersState.pause(btn.dataset.id); render(); });
    });

    container.querySelectorAll('.timers-reset').forEach(btn => {
      btn.addEventListener('click', () => { TimersState.reset(btn.dataset.id); render(); });
    });

    container.querySelectorAll('.timers-del').forEach(btn => {
      btn.addEventListener('click', async () => { await TimersState.remove(btn.dataset.id); render(); });
    });
  }

  render();
}

// ── Expose renderFn ──
window["renderTimers"] = renderTimers;
