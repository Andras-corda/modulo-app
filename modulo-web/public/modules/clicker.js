// ── Modulo Module: Clicker (clicker) v1.0.0 ──
// Author: Modulo Team
// Built: 2026-04-08T21:39:06.935Z
// renderFn: renderClicker
// ── clicker/script/state.js ──
// ── Clicker State ──

const ClickerState = {
  _data: null,

  _default() {
    return {
      clicks:      0,        // total clics
      total:       0,        // total all-time (pour prestige)
      perClick:    1,        // valeur par clic
      perSecond:   0,        // production auto
      prestige:    0,        // nombre de prestiges
      prestigeMult:1,        // multiplicateur de prestige
      upgrades:    {},       // { id: level }
      lastTick:    Date.now(),
      unlockedMilestones: [],
    };
  },

  async load() {
    const raw = (await window.modulo.clicker.getAll()) ?? [];
    const saved = raw.length ? raw[0] : null;
    if (saved) {
      try {
        this._data = JSON.parse(saved.content);
        // Recalculer les stats (au cas où les upgrades ont changé)
        this._recalc();
      } catch {
        this._data = this._default();
      }
    } else {
      this._data = this._default();
    }
    return this._data;
  },

  async save() {
    await window.modulo.clicker.save([{ id: '__clicker_save__', content: JSON.stringify(this._data) }]);
  },

  async reset() {
    this._data = this._default();
    await this.save();
  },

  // ── Recalcul des stats depuis les upgrades ──────────────────────────────
  _recalc() {
    const d = this._data;
    d.perClick  = 1;
    d.perSecond = 0;

    for (const upg of CLICKER_UPGRADES) {
      const lvl = d.upgrades[upg.id] ?? 0;
      if (lvl <= 0) continue;
      if (upg.type === 'click')  d.perClick  += upg.value * lvl;
      if (upg.type === 'auto')   d.perSecond += upg.value * lvl;
      if (upg.type === 'mult')   d.perClick  *= (1 + upg.value * lvl);
    }

    // Prestige mult
    d.perClick  = Math.floor(d.perClick  * d.prestigeMult);
    d.perSecond = Math.floor(d.perSecond * d.prestigeMult);
  },

  click() {
    const d = this._data;
    d.clicks += d.perClick;
    d.total  += d.perClick;
    return d.perClick;
  },

  tick() {
    const d   = this._data;
    const now = Date.now();
    const dt  = Math.min((now - d.lastTick) / 1000, 5); // max 5s de rattrapage
    d.lastTick = now;
    if (d.perSecond > 0) {
      const earned = d.perSecond * dt;
      d.clicks += earned;
      d.total  += earned;
    }
  },

  buyUpgrade(id) {
    const d   = this._data;
    const upg = CLICKER_UPGRADES.find(u => u.id === id);
    if (!upg) return false;
    const lvl  = d.upgrades[id] ?? 0;
    const cost = upg.baseCost * Math.pow(upg.growthRate, lvl);
    if (d.clicks < cost) return false;
    d.clicks -= cost;
    d.upgrades[id] = lvl + 1;
    this._recalc();
    return true;
  },

  canPrestige() {
    return this._data.total >= CLICKER_PRESTIGE_COST;
  },

  prestige() {
    if (!this.canPrestige()) return false;
    const d        = this._data;
    d.prestige    += 1;
    d.prestigeMult = 1 + d.prestige * 0.5; // +50% par prestige
    d.clicks       = 0;
    d.upgrades     = {};
    d.unlockedMilestones = [];
    this._recalc();
    return true;
  },

  getUpgradeLevel(id) {
    return this._data.upgrades[id] ?? 0;
  },

  getUpgradeCost(id) {
    const upg = CLICKER_UPGRADES.find(u => u.id === id);
    if (!upg) return Infinity;
    const lvl = this.getUpgradeLevel(id);
    return Math.floor(upg.baseCost * Math.pow(upg.growthRate, lvl));
  },
};

// ── Catalogue d'upgrades ──────────────────────────────────────────────────────
const CLICKER_UPGRADES = [
  // Click power
  { id:'sharp_nail',   name:'Sharp Nail',     icon:'💅', type:'click', value:1,    baseCost:15,       growthRate:1.5,  desc:'+1 per click' },
  { id:'power_glove',  name:'Power Glove',    icon:'🥊', type:'click', value:5,    baseCost:100,      growthRate:1.6,  desc:'+5 per click' },
  { id:'cyber_finger', name:'Cyber Finger',   icon:'🤖', type:'click', value:25,   baseCost:1100,     growthRate:1.7,  desc:'+25 per click' },
  { id:'quantum_tap',  name:'Quantum Tap',    icon:'⚛️', type:'click', value:100,  baseCost:12000,    growthRate:1.8,  desc:'+100 per click' },
  { id:'god_touch',    name:'God Touch',      icon:'✨', type:'click', value:500,  baseCost:130000,   growthRate:1.9,  desc:'+500 per click' },

  // Multipliers
  { id:'focus',        name:'Focus Mode',     icon:'🎯', type:'mult',  value:0.1,  baseCost:500,      growthRate:2.0,  desc:'+10% click mult' },
  { id:'frenzy',       name:'Frenzy',         icon:'🔥', type:'mult',  value:0.25, baseCost:5000,     growthRate:2.2,  desc:'+25% click mult' },

  // Auto-clickers
  { id:'cursor',       name:'Cursor',         icon:'🖱️', type:'auto',  value:0.1,  baseCost:10,       growthRate:1.15, desc:'+0.1/s' },
  { id:'grandma',      name:'Grandma',        icon:'👵', type:'auto',  value:0.5,  baseCost:100,      growthRate:1.15, desc:'+0.5/s' },
  { id:'farm',         name:'Farm',           icon:'🌾', type:'auto',  value:4,    baseCost:1100,     growthRate:1.15, desc:'+4/s' },
  { id:'mine',         name:'Mine',           icon:'⛏️', type:'auto',  value:10,   baseCost:12000,    growthRate:1.15, desc:'+10/s' },
  { id:'factory',      name:'Factory',        icon:'🏭', type:'auto',  value:40,   baseCost:130000,   growthRate:1.15, desc:'+40/s' },
  { id:'lab',          name:'Lab',            icon:'🧪', type:'auto',  value:100,  baseCost:1400000,  growthRate:1.15, desc:'+100/s' },
  { id:'portal',       name:'Portal',         icon:'🌀', type:'auto',  value:400,  baseCost:20000000, growthRate:1.15, desc:'+400/s' },
  { id:'timemachine',  name:'Time Machine',   icon:'⏰', type:'auto',  value:6666, baseCost:2e9,      growthRate:1.15, desc:'+6666/s' },
];

// ── Milestones ────────────────────────────────────────────────────────────────
const CLICKER_MILESTONES = [
  { id:'m100',   threshold:100,      label:'First Hundred',    icon:'🌱' },
  { id:'m1k',    threshold:1000,     label:'One Thousand',     icon:'⭐' },
  { id:'m10k',   threshold:10000,    label:'Ten Thousand',     icon:'💫' },
  { id:'m100k',  threshold:100000,   label:'100K Club',        icon:'🔥' },
  { id:'m1m',    threshold:1000000,  label:'Millionaire',      icon:'💰' },
  { id:'m1b',    threshold:1e9,      label:'Billionaire',      icon:'💎' },
  { id:'m1t',    threshold:1e12,     label:'Trillionaire',     icon:'🌌' },
];

const CLICKER_PRESTIGE_COST = 1000000;

// ── Formatage des nombres ─────────────────────────────────────────────────────
function _clickerFmt(n) {
  n = Math.floor(n);
  if (n < 1000)     return n.toLocaleString();
  if (n < 1e6)      return (n / 1e3).toFixed(1) + 'K';
  if (n < 1e9)      return (n / 1e6).toFixed(2) + 'M';
  if (n < 1e12)     return (n / 1e9).toFixed(2) + 'B';
  if (n < 1e15)     return (n / 1e12).toFixed(2) + 'T';
  return (n / 1e15).toFixed(2) + 'Qa';
}

// ── clicker/page/render.js ──
// ── Clicker Render ──

async function renderClicker(container) {
  await ClickerState.load();

  let _saveTimer   = null;
  let _tickInterval = null;
  let _particles   = [];
  let _canvas      = null;
  let _ctx         = null;
  let _animFrame   = null;

  // ── Shell ─────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div id="ck-root" style="
      display:flex;height:calc(100vh - 36px);overflow:hidden;
      background:#08090c;color:#e8eaf0;
      font-family:'Google Sans',Roboto,sans-serif;
      position:relative;
    ">

      <!-- Canvas particules (fond) -->
      <canvas id="ck-canvas" style="position:absolute;inset:0;pointer-events:none;z-index:0"></canvas>

      <!-- Zone gauche : stats + bouton -->
      <div style="
        flex:1;display:flex;flex-direction:column;align-items:center;
        justify-content:center;position:relative;z-index:1;padding:24px;
      ">
        <!-- Counter -->
        <div style="text-align:center;margin-bottom:32px">
          <div id="ck-count" style="
            font-size:52px;font-weight:700;letter-spacing:-2px;
            background:linear-gradient(135deg,#ff8c00,#ff4500);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;
            background-clip:text;line-height:1;
            font-variant-numeric:tabular-nums;
          ">0</div>
          <div style="font-size:13px;color:rgba(255,255,255,.3);margin-top:4px;letter-spacing:.5px">
            clicks
          </div>
          <div id="ck-cps" style="
            font-size:12px;color:rgba(255,255,255,.2);margin-top:6px;letter-spacing:.3px
          ">0 per second</div>
        </div>

        <!-- Bouton principal -->
        <div id="ck-btn-wrap" style="position:relative">
          <div id="ck-btn" style="
            width:180px;height:180px;border-radius:50%;
            background:radial-gradient(circle at 35% 35%,#ff8c00,#c23b00);
            box-shadow:0 0 0 6px rgba(255,140,0,.15), 0 0 60px rgba(255,80,0,.25), 0 20px 40px rgba(0,0,0,.6);
            cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            font-size:72px;
            transition:transform .08s,box-shadow .08s;
            user-select:none;
            position:relative;
            overflow:hidden;
          ">
            <!-- Shine -->
            <div style="
              position:absolute;top:12px;left:30px;
              width:60px;height:28px;
              background:rgba(255,255,255,.15);
              border-radius:50%;transform:rotate(-20deg);
              pointer-events:none;
            "></div>
            🍪
          </div>

          <!-- Ring animé -->
          <div id="ck-ring" style="
            position:absolute;inset:-12px;border-radius:50%;
            border:2px solid rgba(255,140,0,.12);
            animation:ck-spin 8s linear infinite;
            pointer-events:none;
          ">
            <div style="
              position:absolute;top:-3px;left:50%;transform:translateX(-50%);
              width:6px;height:6px;border-radius:50%;
              background:#ff8c00;box-shadow:0 0 8px #ff8c00;
            "></div>
          </div>
        </div>

        <!-- Per click info -->
        <div id="ck-per-click" style="
          margin-top:20px;font-size:12px;color:rgba(255,255,255,.2);letter-spacing:.3px
        ">+1 per click</div>

        <!-- Prestige -->
        <div id="ck-prestige-wrap" style="margin-top:28px;text-align:center">
          <button id="ck-prestige-btn" class="btn btn-secondary btn-sm" style="
            font-size:11px;opacity:.5;cursor:not-allowed;
            background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);
            color:rgba(255,255,255,.4);
          " disabled>
            ✦ Prestige — <span id="ck-prestige-cost"></span>
          </button>
          <div id="ck-prestige-info" style="font-size:10px;color:rgba(255,255,255,.15);margin-top:5px"></div>
        </div>

        <!-- Milestones -->
        <div id="ck-milestones" style="
          display:flex;gap:6px;flex-wrap:wrap;justify-content:center;
          margin-top:24px;max-width:300px;
        "></div>
      </div>

      <!-- Séparateur -->
      <div style="width:1px;background:rgba(255,255,255,.05);z-index:1;flex-shrink:0"></div>

      <!-- Zone droite : upgrades -->
      <div style="
        width:300px;flex-shrink:0;display:flex;flex-direction:column;
        overflow:hidden;z-index:1;background:rgba(0,0,0,.3);
      ">
        <div style="
          padding:16px;border-bottom:1px solid rgba(255,255,255,.06);
          font-size:11px;font-weight:600;letter-spacing:.8px;
          color:rgba(255,255,255,.3);text-transform:uppercase;
        ">Upgrades</div>

        <div id="ck-upgrades" style="overflow-y:auto;flex:1;padding:8px"></div>

        <!-- Stats compactes -->
        <div style="
          padding:12px 16px;border-top:1px solid rgba(255,255,255,.06);
          font-size:11px;color:rgba(255,255,255,.2);
          display:flex;flex-direction:column;gap:3px;
        ">
          <div style="display:flex;justify-content:space-between">
            <span>All-time</span>
            <span id="ck-total" style="color:rgba(255,255,255,.4)">0</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span>Prestige</span>
            <span id="ck-prestige-count" style="color:rgba(255,200,0,.4)">0</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span>Mult</span>
            <span id="ck-mult" style="color:rgba(255,140,0,.4)">×1</span>
          </div>
          <button id="ck-reset-btn" style="
            margin-top:6px;background:none;border:none;
            font-size:10px;color:rgba(255,255,255,.1);cursor:pointer;
            text-align:left;padding:0;font-family:inherit;
          ">Reset all data</button>
        </div>
      </div>
    </div>

    <style>
      @keyframes ck-spin { to { transform: rotate(360deg); } }
      @keyframes ck-pop  { 0%{transform:scale(1)} 40%{transform:scale(.88)} 70%{transform:scale(1.04)} 100%{transform:scale(1)} }
      @keyframes ck-float { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-60px) scale(.8)} }

      #ck-btn:active { transform: scale(.93); box-shadow: 0 0 0 3px rgba(255,140,0,.2), 0 8px 20px rgba(0,0,0,.6); }

      .ck-upg {
        display:flex;align-items:center;gap:10px;
        padding:10px 12px;border-radius:8px;margin-bottom:4px;
        cursor:pointer;
        border:1px solid rgba(255,255,255,.05);
        background:rgba(255,255,255,.03);
        transition:background .12s,border-color .12s,opacity .12s;
      }
      .ck-upg:hover:not(.ck-upg-locked) { background:rgba(255,255,255,.07); border-color:rgba(255,255,255,.12); }
      .ck-upg-locked { opacity:.35; cursor:not-allowed; }
      .ck-upg-can    { border-color:rgba(255,140,0,.3); background:rgba(255,140,0,.06); }

      .ck-float-text {
        position:absolute;pointer-events:none;
        font-size:18px;font-weight:700;
        color:#ff8c00;text-shadow:0 2px 8px rgba(0,0,0,.8);
        animation:ck-float .9s ease-out forwards;
        z-index:999;white-space:nowrap;
      }
    </style>
  `;

  // ── Canvas particules ─────────────────────────────────────────────────────
  function _initCanvas() {
    _canvas = container.querySelector('#ck-canvas');
    _ctx    = _canvas.getContext('2d');

    function _resize() {
      const root = container.querySelector('#ck-root');
      _canvas.width  = root?.clientWidth  ?? 800;
      _canvas.height = root?.clientHeight ?? 600;
    }
    _resize();
    window.addEventListener('resize', _resize);

    function _loop() {
      _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

      for (let i = _particles.length - 1; i >= 0; i--) {
        const p = _particles[i];
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.08; // gravity
        p.life -= 1;
        p.r  *= 0.97;

        if (p.life <= 0 || p.r < 0.5) { _particles.splice(i, 1); continue; }

        _ctx.globalAlpha = p.life / p.maxLife * .8;
        _ctx.fillStyle   = p.color;
        _ctx.beginPath();
        _ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        _ctx.fill();
      }
      _ctx.globalAlpha = 1;

      _animFrame = requestAnimationFrame(_loop);
    }
    _loop();
  }

  function _spawnParticles(x, y, count = 12) {
    const colors = ['#ff8c00','#ff4500','#ffd700','#ff6b35','#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      _particles.push({
        x, y,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed - 1.5,
        r:     2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life:  30 + Math.random() * 30,
        maxLife: 60,
      });
    }
  }

  // ── Float text ────────────────────────────────────────────────────────────
  function _floatText(x, y, text) {
    const el = document.createElement('div');
    el.className   = 'ck-float-text';
    el.textContent = '+' + _clickerFmt(text);
    el.style.left  = (x - 20) + 'px';
    el.style.top   = (y - 20) + 'px';
    container.querySelector('#ck-root').appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  // ── Update UI ─────────────────────────────────────────────────────────────
  function _updateUI() {
    const d = ClickerState._data;

    // Counter
    const cEl = container.querySelector('#ck-count');
    if (cEl) cEl.textContent = _clickerFmt(d.clicks);

    const cpsEl = container.querySelector('#ck-cps');
    if (cpsEl) cpsEl.textContent = d.perSecond > 0 ? `${_clickerFmt(d.perSecond)} per second` : '';

    const pcEl = container.querySelector('#ck-per-click');
    if (pcEl) pcEl.textContent = `+${_clickerFmt(d.perClick)} per click`;

    // Totals
    const totEl = container.querySelector('#ck-total');
    if (totEl) totEl.textContent = _clickerFmt(d.total);

    const presEl = container.querySelector('#ck-prestige-count');
    if (presEl) presEl.textContent = d.prestige;

    const multEl = container.querySelector('#ck-mult');
    if (multEl) multEl.textContent = '×' + d.prestigeMult.toFixed(1);

    // Prestige button
    const presBtn  = container.querySelector('#ck-prestige-btn');
    const presInfo = container.querySelector('#ck-prestige-info');
    const presCost = container.querySelector('#ck-prestige-cost');
    if (presBtn && presCost) {
      presCost.textContent = _clickerFmt(CLICKER_PRESTIGE_COST);
      const can = ClickerState.canPrestige();
      presBtn.disabled = !can;
      presBtn.style.opacity  = can ? '1'   : '.5';
      presBtn.style.cursor   = can ? 'pointer' : 'not-allowed';
      presBtn.style.color    = can ? 'rgba(255,200,0,.9)' : 'rgba(255,255,255,.4)';
      presBtn.style.borderColor = can ? 'rgba(255,200,0,.3)' : 'rgba(255,255,255,.1)';
    }
    if (presInfo) {
      presInfo.textContent = d.prestige > 0
        ? `Prestige ×${d.prestige} — mult ${d.prestigeMult.toFixed(1)}x`
        : `Resets everything, grants ×1.5 production`;
    }

    // Milestones
    const msEl = container.querySelector('#ck-milestones');
    if (msEl) {
      msEl.innerHTML = CLICKER_MILESTONES
        .filter(m => d.total >= m.threshold)
        .map(m => `
          <div title="${m.label}" style="
            width:28px;height:28px;border-radius:6px;
            background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
            display:flex;align-items:center;justify-content:center;font-size:14px;
          ">${m.icon}</div>
        `).join('');
    }

    // Upgrades
    _renderUpgrades();
  }

  function _renderUpgrades() {
    const d   = ClickerState._data;
    const el  = container.querySelector('#ck-upgrades');
    if (!el) return;

    const sections = [
      { label: 'Click Power', types: ['click','mult'] },
      { label: 'Auto-clickers', types: ['auto'] },
    ];

    el.innerHTML = sections.map(sec => {
      const items = CLICKER_UPGRADES.filter(u => sec.types.includes(u.type));
      return `
        <div style="
          font-size:9px;font-weight:600;letter-spacing:.8px;
          color:rgba(255,255,255,.2);text-transform:uppercase;
          padding:8px 12px 4px;
        ">${sec.label}</div>
        ${items.map(upg => {
          const lvl  = ClickerState.getUpgradeLevel(upg.id);
          const cost = ClickerState.getUpgradeCost(upg.id);
          const can  = d.clicks >= cost;
          const maxed = lvl >= 999;
          return `
            <div class="ck-upg ${maxed?'':'ck-upg-' + (can ? 'can' : 'locked')}"
              data-upg="${upg.id}"
              style="${maxed?'opacity:.25;cursor:default':''}">
              <div style="font-size:20px;flex-shrink:0">${upg.icon}</div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:12px;font-weight:500;
                    color:${can&&!maxed?'#e8eaf0':'rgba(255,255,255,.5)'}">
                    ${upg.name}
                  </span>
                  ${lvl > 0 ? `<span style="
                    font-size:9px;padding:1px 5px;border-radius:4px;
                    background:rgba(255,140,0,.15);color:rgba(255,140,0,.8);
                    font-weight:600;
                  ">×${lvl}</span>` : ''}
                </div>
                <div style="font-size:10px;color:rgba(255,255,255,.2);margin-top:1px">
                  ${upg.desc}
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="
                  font-size:11px;font-weight:600;
                  color:${can&&!maxed?'#ff8c00':'rgba(255,255,255,.2)'};
                  font-variant-numeric:tabular-nums;
                ">${maxed ? '—' : _clickerFmt(cost)}</div>
                <div style="font-size:9px;color:rgba(255,255,255,.15);margin-top:1px">🍪</div>
              </div>
            </div>
          `;
        }).join('')}
      `;
    }).join('');

    // Bind clics upgrades
    el.querySelectorAll('.ck-upg[data-upg]').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.upg;
        if (ClickerState.buyUpgrade(id)) {
          _updateUI();
          _scheduleSave();
        }
      });
    });
  }

  // ── Clic principal ────────────────────────────────────────────────────────
  function _handleClick(e) {
    const btn = container.querySelector('#ck-btn');
    if (!btn) return;

    const earned = ClickerState.click();
    _updateUI();
    _scheduleSave();

    // Particules
    const r    = btn.getBoundingClientRect();
    const cx   = r.left + r.width  / 2;
    const cy   = r.top  + r.height / 2;
    const root = container.querySelector('#ck-root').getBoundingClientRect();
    _spawnParticles(cx - root.left, cy - root.top, 10 + Math.min(earned / 5, 30));

    // Float text à la position du clic
    _floatText(e.clientX - root.left, e.clientY - root.top, earned);

    // Animation pop
    btn.style.animation = 'none';
    void btn.offsetWidth;
    btn.style.animation = 'ck-pop .15s ease-out';
  }

  // ── Tick auto ────────────────────────────────────────────────────────────
  function _startTick() {
    _tickInterval = setInterval(() => {
      ClickerState.tick();
      _updateUI();
    }, 100);
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  function _scheduleSave() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => ClickerState.save(), 2000);
  }

  // ── Events ───────────────────────────────────────────────────────────────
  container.querySelector('#ck-btn')?.addEventListener('click', _handleClick);

  container.querySelector('#ck-prestige-btn')?.addEventListener('click', () => {
    if (!ClickerState.canPrestige()) return;
    Modal.open('Prestige', `
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:32px;margin-bottom:12px">✦</div>
        <div style="font-size:15px;font-weight:500;margin-bottom:8px">Reset everything?</div>
        <div style="font-size:13px;color:var(--text-secondary)">
          You'll lose all clicks and upgrades, but gain a
          <strong style="color:#ffd700">×${(1 + (ClickerState._data.prestige + 1) * 0.5).toFixed(1)} permanent multiplier</strong>.
        </div>
      </div>
    `, () => {
      ClickerState.prestige();
      ClickerState.save();
      _updateUI();
    });
  });

  container.querySelector('#ck-reset-btn')?.addEventListener('click', () => {
    Modal.open('Reset', `<div style="text-align:center;padding:8px 0">Delete all save data?</div>`, async () => {
      await ClickerState.reset();
      _updateUI();
    });
  });

  // ── Init ─────────────────────────────────────────────────────────────────
  _initCanvas();
  _startTick();
  _updateUI();

  // Prestige cost display
  const presCostEl = container.querySelector('#ck-prestige-cost');
  if (presCostEl) presCostEl.textContent = _clickerFmt(CLICKER_PRESTIGE_COST);

  // Cleanup
  const _obs = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      clearInterval(_tickInterval);
      clearTimeout(_saveTimer);
      cancelAnimationFrame(_animFrame);
      ClickerState.save();
      _obs.disconnect();
    }
  });
  _obs.observe(document.body, { childList: true, subtree: true });
}

// ── Expose renderFn ──
window["renderClicker"] = renderClicker;
