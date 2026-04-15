// ── Modulo Module: Charts (charts) v1.0.0 ──
// Author: Modulo Team
// Built: 2026-04-08T21:39:06.881Z
// renderFn: renderCharts
// ── charts/script/renderer.js ──
// ── Charts Renderer — Canvas 2D pur ──

const CHART_PAD = { top: 48, right: 24, bottom: 52, left: 60 };

function _chartsDraw(canvas, data, isDark) {
  const ctx = canvas.getContext('2d');
  const W   = canvas.width;
  const H   = canvas.height;
  const pal = CHART_PALETTES[data.palette ?? 0] ?? CHART_PALETTES[0];

  const bg       = isDark ? '#1e2435' : '#ffffff';
  const textCol  = isDark ? '#9ba3b8' : '#4a5166';
  const titleCol = isDark ? '#e8eaf0' : '#1a1f2e';
  const gridCol  = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)';

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (data.title) {
    ctx.font      = `600 15px 'Google Sans',sans-serif`;
    ctx.fillStyle = titleCol;
    ctx.textAlign = 'center';
    ctx.fillText(data.title, W / 2, 28);
  }

  const type = data.type ?? 'bar';

  if (type === 'pie' || type === 'donut') {
    _drawPie(ctx, data, W, H, pal, titleCol, textCol, bg, type === 'donut');
    return;
  }

  // ── Zone graphique ───────────────────────────────────────────────────────
  const pad = CHART_PAD;
  const gX  = pad.left;
  const gY  = pad.top;
  const gW  = W - pad.left - pad.right;
  const gH  = H - pad.top  - pad.bottom;

  const series  = data.series ?? [];
  const labels  = series[0]?.labels ?? [];
  const allVals = series.flatMap(s => s.values ?? []).filter(v => typeof v === 'number');
  const maxVal  = Math.max(...allVals, 1);
  const minVal  = type === 'scatter' ? Math.min(0, ...allVals) : 0;
  const range   = maxVal - minVal || 1;

  // Grille Y + axes Y
  const steps = 5;
  if (data.showGrid !== false) {
    ctx.strokeStyle = gridCol;
    ctx.lineWidth = 1;
    for (let i = 0; i <= steps; i++) {
      const y = gY + gH - (i / steps) * gH;
      ctx.beginPath(); ctx.moveTo(gX, y); ctx.lineTo(gX + gW, y); ctx.stroke();
      const val = minVal + (i / steps) * range;
      ctx.font      = `11px 'Google Sans',sans-serif`;
      ctx.fillStyle = textCol;
      ctx.textAlign = 'right';
      ctx.fillText(_chartsNum(val), gX - 6, y + 4);
    }
  }

  // Labels X
  const colW = gW / Math.max(labels.length, 1);
  ctx.font      = `11px 'Google Sans',sans-serif`;
  ctx.fillStyle = textCol;
  ctx.textAlign = 'center';
  labels.forEach((lbl, i) => {
    ctx.fillText(String(lbl), gX + colW * i + colW / 2, gY + gH + 18);
  });

  // Dessiner chaque série
  series.forEach((serie, si) => {
    const color = pal[si % pal.length];
    const vals  = serie.values ?? [];

    if (type === 'bar') {
      const barW   = colW * 0.55 / series.length;
      const barOff = (si - (series.length - 1) / 2) * barW;
      vals.forEach((v, i) => {
        const x = gX + colW * i + colW / 2 + barOff - barW / 2;
        const h = ((v - minVal) / range) * gH;
        const y = gY + gH - h;
        ctx.fillStyle = color + 'e0';
        _rrect(ctx, x, y, barW, h, 3);
        ctx.fill();
      });

    } else if (type === 'line' || type === 'area') {
      const pts = vals.map((v, i) => ({
        x: gX + colW * i + colW / 2,
        y: gY + gH - ((v - minVal) / range) * gH,
      }));
      if (!pts.length) return;

      if (type === 'area') {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, gY + gH);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, gY + gH);
        ctx.closePath();
        ctx.fillStyle = color + '2a';
        ctx.fill();
      }

      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.lineJoin    = 'round';
      ctx.lineCap     = 'round';
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();

      pts.forEach(p => {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
      });

    } else if (type === 'scatter') {
      vals.forEach((v, i) => {
        const x = gX + colW * i + colW / 2;
        const y = gY + gH - ((v - minVal) / range) * gH;
        ctx.fillStyle = color + 'cc';
        ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill();
      });
    }
  });

  // Légende
  if (data.showLegend !== false && series.length > 1) {
    let lx = gX;
    const ly = H - 12;
    series.forEach((s, si) => {
      const color = pal[si % pal.length];
      const name  = s.name ?? `Series ${si+1}`;
      ctx.fillStyle = color;
      _rrect(ctx, lx, ly - 9, 11, 11, 2); ctx.fill();
      ctx.font      = `11px 'Google Sans',sans-serif`;
      ctx.fillStyle = textCol;
      ctx.textAlign = 'left';
      ctx.fillText(name, lx + 14, ly);
      lx += ctx.measureText(name).width + 28;
    });
  }
}

// ── Pie / Donut ──────────────────────────────────────────────────────────────
function _drawPie(ctx, data, W, H, pal, titleCol, textCol, bg, isDonut) {
  const series = data.series ?? [];
  const labels = series[0]?.labels ?? [];
  const values = (series[0]?.values ?? []).map(v => Math.abs(+v || 0));
  const total  = values.reduce((s, v) => s + v, 0) || 1;

  // Légend à droite → zone pie centrée à gauche
  const hasLegend = data.showLegend !== false;
  const legW  = hasLegend ? 140 : 0;
  const cx    = (W - legW) / 2;
  const cy    = H / 2 + 10;
  const R     = Math.min((W - legW) / 2, H / 2) * 0.78;
  const rHole = isDonut ? R * 0.54 : 0;

  // Segments
  let angle = -Math.PI / 2;
  values.forEach((v, i) => {
    if (!v) return;
    const sweep = (v / total) * Math.PI * 2;
    const color = pal[i % pal.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Séparateur blanc fin
    ctx.strokeStyle = bg;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Pourcentage dans le segment
    if (sweep > 0.18) {
      const mid = angle + sweep / 2;
      const lr  = isDonut ? (R + rHole) / 2 : R * 0.67;
      const lx  = cx + lr * Math.cos(mid);
      const ly  = cy + lr * Math.sin(mid);
      ctx.fillStyle = '#fff';
      ctx.font      = `bold 12px 'Google Sans',sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(v / total * 100) + '%', lx, ly);
    }

    angle += sweep;
  });
  ctx.textBaseline = 'alphabetic';

  // Trou donut — couleur exacte du fond canvas
  if (isDonut) {
    ctx.beginPath();
    ctx.arc(cx, cy, rHole, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();

    // Total centré
    ctx.fillStyle    = titleCol;
    ctx.font         = `bold ${Math.round(R * 0.28)}px 'Google Sans',sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(_chartsNum(total), cx, cy);
    ctx.textBaseline = 'alphabetic';
  }

  // Légende à droite
  if (hasLegend) {
    const lx0 = W - legW + 8;
    const rowH = Math.min(22, (H - 60) / Math.max(labels.length, 1));
    const startY = (H - labels.length * rowH) / 2 + rowH / 2;
    labels.forEach((lbl, i) => {
      const y = startY + i * rowH;
      ctx.fillStyle = pal[i % pal.length];
      _rrect(ctx, lx0, y - 7, 12, 12, 2); ctx.fill();
      ctx.font      = `12px 'Google Sans',sans-serif`;
      ctx.fillStyle = textCol;
      ctx.textAlign = 'left';
      ctx.fillText(`${lbl} (${values[i] ?? 0})`, lx0 + 16, y + 2);
    });
  }
}

// ── Utils ────────────────────────────────────────────────────────────────────
function _chartsNum(n) {
  n = Math.round(n * 10) / 10;
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function _rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── charts/script/state.js ──
// ── Charts State ──

const ChartsState = {
  _charts: [],

  _i18n: {
    fr: { new:'Nouveau graphique', untitled:'Sans titre', select:'Sélectionnez un graphique',
          nodata:'Aucune donnée', empty:'Aucun graphique', label:'Label', value:'Valeur',
          add_point:'Ajouter point', type:'Type', title:'Titre', colors:'Couleurs',
          export_png:'PNG', export_svg:'SVG', delete:'Supprimer', edit:'Éditer',
          series:'Séries', rename:'Renommer' },
    en: { new:'New chart', untitled:'Untitled', select:'Select a chart',
          nodata:'No data', empty:'No charts', label:'Label', value:'Value',
          add_point:'Add point', type:'Type', title:'Title', colors:'Colors',
          export_png:'PNG', export_svg:'SVG', delete:'Delete', edit:'Edit',
          series:'Series', rename:'Rename' },
  },

  _t(key) {
    const lang = window._settings?.lang ?? 'en';
    return this._i18n[lang]?.[key] ?? this._i18n['en'][key] ?? key;
  },

  async load() {
    const all = (await window.modulo.charts.getAll()) ?? [];
    this._charts = all;
    return this._charts;
  },

  async save() {
    await window.modulo.charts.save(this._charts);
  },

  async add(name, type) {
    const c = {
      id: uid(), title: name, tags: [],
      content: JSON.stringify(_chartsDefaultData(type, name)),
      createdAt: today(), updatedAt: today(),
    };
    this._charts.unshift(c);
    await this.save();
    return c;
  },

  async update(id, data) {
    const c = this._charts.find(c => c.id === id);
    if (c) { c.content = JSON.stringify(data); c.updatedAt = today(); await this.save(); }
  },

  async rename(id, name) {
    const c = this._charts.find(c => c.id === id);
    if (c) { c.title = name; await this.save(); }
  },

  async remove(id) {
    this._charts = this._charts.filter(c => c.id !== id);
    await this.save();
  },

  getById(id) {
    const c = this._charts.find(c => c.id === id);
    if (!c) return null;
    try { return { ...c, data: JSON.parse(c.content) }; }
    catch { return { ...c, data: _chartsDefaultData('bar', c.title) }; }
  },
};

const CHART_TYPES = ['bar', 'line', 'area', 'pie', 'donut', 'scatter'];

const CHART_PALETTES = [
  ['#4285F4','#34A853','#FBBC04','#EA4335','#9C27B0','#00BCD4','#FF6D00','#607D8B'],
  ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'],
  ['#e11d48','#7c3aed','#0284c7','#059669','#d97706','#0891b2','#9333ea','#16a34a'],
];

function _chartsDefaultData(type, title) {
  const labels  = ['Jan','Feb','Mar','Apr','May','Jun'];
  const values  = [42, 78, 55, 91, 63, 85];
  const values2 = [30, 55, 70, 45, 80, 60];
  return {
    type, title,
    palette: 0,
    showLegend: true,
    showGrid: true,
    series: [
      { name: 'Series A', labels, values },
      ...(type === 'scatter' ? [{ name: 'Series B', labels, values: values2 }] : []),
    ],
  };
}

// ── charts/page/render.js ──
// ── Charts Render ──

async function renderCharts(container) {
  await ChartsState.load();

  let _current = null;
  let _data    = null;
  const _t     = k => ChartsState._t(k);
  const isDark = () => (window._settings?.theme ?? 'dark') !== 'light';

  // ── Shell ─────────────────────────────────────────────────────────────────
  function renderShell() {
    container.innerHTML = `
      <div style="display:flex;height:calc(100vh - 36px);overflow:hidden">

        <!-- Sidebar -->
        <div style="width:210px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;background:var(--bg-surface)">
          <div style="padding:8px;border-bottom:1px solid var(--border)">
            <div style="font-size:10px;color:var(--text-tertiary);margin-bottom:5px;letter-spacing:.4px">NEW CHART</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
              ${CHART_TYPES.map(t => `
                <button class="btn btn-secondary btn-sm ch-new" data-type="${t}" style="font-size:11px;justify-content:center">
                  ${_chartIcon(t)} ${t}
                </button>
              `).join('')}
            </div>
          </div>
          <div id="ch-list" style="flex:1;overflow-y:auto"></div>
        </div>

        <!-- Main -->
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">

          <!-- Toolbar -->
          <div style="height:44px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;padding:0 12px;background:var(--bg-surface);flex-shrink:0">
            <span id="ch-title" style="font-size:13px;font-weight:500;color:var(--text-secondary);flex:1">
              ${_t('select')}
            </span>
            <div id="ch-actions" style="display:none;align-items:center;gap:5px">
              <button class="btn btn-ghost btn-sm" id="ch-rename">${icon('edit','12px')}</button>
              <select class="input" id="ch-type-sel" style="height:28px;font-size:12px;width:100px">
                ${CHART_TYPES.map(t => `<option value="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
              </select>
              <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-secondary);cursor:pointer">
                <input type="checkbox" id="ch-grid"> Grid
              </label>
              <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-secondary);cursor:pointer">
                <input type="checkbox" id="ch-legend" checked> Legend
              </label>
              <div style="display:flex;gap:3px" id="ch-palettes">
                ${CHART_PALETTES.map((p,i) => `
                  <div class="ch-pal" data-i="${i}" title="Palette ${i+1}" style="
                    width:20px;height:20px;border-radius:4px;cursor:pointer;
                    background:linear-gradient(135deg,${p[0]} 50%,${p[1]} 50%);
                    border:2px solid transparent;
                  "></div>
                `).join('')}
              </div>
              <button class="btn btn-secondary btn-sm" id="ch-export-png" style="font-size:11px">${icon('export','12px')} PNG</button>
              <button class="btn btn-secondary btn-sm" id="ch-export-svg" style="font-size:11px">SVG</button>
              <button class="btn btn-ghost btn-sm" id="ch-del" style="color:var(--red)">${icon('trash','13px')}</button>
            </div>
          </div>

          <!-- Split : canvas + data editor -->
          <div style="flex:1;display:flex;overflow:hidden">

            <!-- Canvas -->
            <div style="flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--bg-base);padding:20px">
              <canvas id="ch-canvas" style="max-width:100%;max-height:100%;border-radius:var(--radius-lg)"></canvas>
            </div>

            <!-- Data editor -->
            <div style="width:280px;flex-shrink:0;border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden">
              <div style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:10px;letter-spacing:.5px;color:var(--text-tertiary);background:var(--bg-surface)">DATA</div>
              <div id="ch-data-editor" style="flex:1;overflow-y:auto;padding:10px"></div>
            </div>
          </div>
        </div>
      </div>

      <style>
        .ch-pal.active { border-color: var(--blue) !important; }
        .ch-series-row { display:flex;align-items:center;gap:6px;margin-bottom:6px }
      </style>
    `;
    _bindEvents();
    _renderList();
    if (_current) _openChart(_current);
  }

  function _chartIcon(type) {
    const icons = { bar:'▊', line:'📈'.slice(0,1), area:'◭', pie:'◔', donut:'◯', scatter:'⁘' };
    return icons[type] ?? '■';
  }

  // ── Rendu canvas ──────────────────────────────────────────────────────────
  function _renderCanvas() {
    if (!_data) return;
    const canvas = container.querySelector('#ch-canvas');
    const wrap   = canvas?.parentElement;
    if (!canvas || !wrap) return;
    canvas.width  = Math.min(wrap.clientWidth  - 40, 800);
    canvas.height = Math.min(wrap.clientHeight - 40, 500);
    _chartsDraw(canvas, _data, isDark());
  }

  // ── Data editor ───────────────────────────────────────────────────────────
  function _renderDataEditor() {
    const el = container.querySelector('#ch-data-editor');
    if (!el || !_data) return;

    const series = _data.series ?? [];

    el.innerHTML = series.map((s, si) => {
      const color = (CHART_PALETTES[_data.palette ?? 0] ?? CHART_PALETTES[0])[si % 8];
      return `
        <div style="margin-bottom:14px;border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden">
          <!-- Series header -->
          <div style="display:flex;align-items:center;gap:6px;padding:7px 10px;background:var(--bg-elevated)">
            <div style="width:12px;height:12px;border-radius:3px;background:${color};flex-shrink:0"></div>
            <input class="ch-series-name input" data-si="${si}"
              value="${s.name ?? `Series ${si+1}`}"
              style="flex:1;height:22px;font-size:11px;border:none;background:transparent;padding:0;box-shadow:none">
            ${series.length > 1 ? `<button class="btn btn-ghost btn-sm ch-del-series" data-si="${si}" style="padding:0 4px;color:var(--red)">×</button>` : ''}
          </div>

          <!-- Rows -->
          <div style="padding:6px">
            ${s.labels.map((lbl, i) => `
              <div class="ch-series-row">
                <input class="input ch-label" data-si="${si}" data-i="${i}" value="${lbl}"
                  style="flex:1;height:24px;font-size:11px">
                <input class="input ch-value" data-si="${si}" data-i="${i}" type="number"
                  value="${s.values[i] ?? 0}"
                  style="width:70px;height:24px;font-size:11px">
                <button class="btn btn-ghost btn-sm ch-del-row" data-si="${si}" data-i="${i}"
                  style="padding:0 5px;color:var(--text-tertiary)">×</button>
              </div>
            `).join('')}
            <button class="btn btn-ghost btn-sm ch-add-row" data-si="${si}"
              style="width:100%;font-size:10px;margin-top:3px">
              + ${_t('add_point')}
            </button>
          </div>
        </div>
      `;
    }).join('') + `
      <button class="btn btn-secondary btn-sm ch-add-series" style="width:100%;font-size:11px">
        + ${_t('series')}
      </button>
    `;

    _bindDataEvents();
  }

  function _bindDataEvents() {
    // Nom de série
    container.querySelectorAll('.ch-series-name').forEach(inp => {
      inp.addEventListener('input', e => {
        _data.series[+inp.dataset.si].name = e.target.value;
        _scheduleUpdate();
      });
    });

    // Label
    container.querySelectorAll('.ch-label').forEach(inp => {
      inp.addEventListener('input', e => {
        const si = +inp.dataset.si, i = +inp.dataset.i;
        _data.series[si].labels[i] = e.target.value;
        _scheduleUpdate();
      });
    });

    // Valeur
    container.querySelectorAll('.ch-value').forEach(inp => {
      inp.addEventListener('input', e => {
        const si = +inp.dataset.si, i = +inp.dataset.i;
        _data.series[si].values[i] = parseFloat(e.target.value) || 0;
        _scheduleUpdate();
      });
    });

    // Supprimer ligne
    container.querySelectorAll('.ch-del-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const si = +btn.dataset.si, i = +btn.dataset.i;
        _data.series[si].labels.splice(i, 1);
        _data.series[si].values.splice(i, 1);
        _update();
      });
    });

    // Ajouter ligne
    container.querySelectorAll('.ch-add-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const si = +btn.dataset.si;
        const last = _data.series[si].labels.length;
        _data.series[si].labels.push(`Item ${last + 1}`);
        _data.series[si].values.push(0);
        _update();
      });
    });

    // Supprimer série
    container.querySelectorAll('.ch-del-series').forEach(btn => {
      btn.addEventListener('click', () => {
        _data.series.splice(+btn.dataset.si, 1);
        _update();
      });
    });

    // Ajouter série
    container.querySelector('.ch-add-series')?.addEventListener('click', () => {
      const ref = _data.series[0];
      _data.series.push({
        name: `Series ${_data.series.length + 1}`,
        labels: [...(ref?.labels ?? ['A','B','C'])],
        values: Array(ref?.labels?.length ?? 3).fill(0),
      });
      _update();
    });
  }

  // ── Mise à jour ───────────────────────────────────────────────────────────
  let _saveTimer = null;
  function _scheduleUpdate() {
    _renderCanvas();
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => ChartsState.update(_current, _data), 800);
  }

  function _update() {
    _renderCanvas();
    _renderDataEditor();
    ChartsState.update(_current, _data);
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function _exportPNG() {
    const c = document.createElement('canvas');
    c.width = 900; c.height = 540;
    _chartsDraw(c, _data, isDark());
    const a = document.createElement('a');
    a.download = (_data?.title ?? 'chart') + '.png';
    a.href = c.toDataURL('image/png'); a.click();
  }

  function _exportSVG() {
    const c = document.createElement('canvas');
    c.width = 900; c.height = 540;
    _chartsDraw(c, _data, isDark());
    const d64 = btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(c))));
    const svg  = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540"><image href="${c.toDataURL()}" width="900" height="540"/></svg>`;
    const url  = URL.createObjectURL(new Blob([svg], { type:'image/svg+xml' }));
    const a    = document.createElement('a');
    a.download = (_data?.title ?? 'chart') + '.svg';
    a.href = url; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Events ────────────────────────────────────────────────────────────────
  function _bindEvents() {
    // Nouveau
    container.querySelectorAll('.ch-new').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        Modal.open(`New ${type} chart`, `<input class="input" name="name" placeholder="Chart title…" autofocus>`, async () => {
          const name = Modal.getInput('name')?.trim() || 'Chart';
          const c    = await ChartsState.add(name, type);
          _renderList();
          _openChart(c.id);
        });
      });
    });

    // Rename
    container.querySelector('#ch-rename')?.addEventListener('click', () => {
      Modal.open('Rename', `<input class="input" name="name" value="${_data?.title ?? ''}">`, async () => {
        const name = Modal.getInput('name')?.trim();
        if (!name || !_current) return;
        _data.title = name;
        await ChartsState.rename(_current, name);
        container.querySelector('#ch-title').textContent = name;
        _renderCanvas();
        _renderList();
      });
    });

    // Type
    container.querySelector('#ch-type-sel')?.addEventListener('change', e => {
      _data.type = e.target.value;
      _update();
    });

    // Grid + Legend
    container.querySelector('#ch-grid')?.addEventListener('change', e => {
      _data.showGrid = e.target.checked; _scheduleUpdate();
    });
    container.querySelector('#ch-legend')?.addEventListener('change', e => {
      _data.showLegend = e.target.checked; _scheduleUpdate();
    });

    // Palettes
    container.querySelectorAll('.ch-pal').forEach(el => {
      el.addEventListener('click', () => {
        _data.palette = +el.dataset.i;
        container.querySelectorAll('.ch-pal').forEach(p => p.classList.toggle('active', +p.dataset.i === _data.palette));
        _scheduleUpdate();
      });
    });

    // Export
    container.querySelector('#ch-export-png')?.addEventListener('click', _exportPNG);
    container.querySelector('#ch-export-svg')?.addEventListener('click', _exportSVG);

    // Delete
    container.querySelector('#ch-del')?.addEventListener('click', async () => {
      if (!_current) return;
      await ChartsState.remove(_current);
      _current = null; _data = null;
      renderShell();
    });
  }

  // ── Ouvrir un graphique ───────────────────────────────────────────────────
  function _openChart(id) {
    _current = id;
    const c  = ChartsState.getById(id);
    if (!c) return;
    _data    = c.data;

    container.querySelector('#ch-title').textContent = c.title;
    const actions = container.querySelector('#ch-actions');
    if (actions) actions.style.display = 'flex';

    const typeSel = container.querySelector('#ch-type-sel');
    if (typeSel) typeSel.value = _data.type;
    const grid = container.querySelector('#ch-grid');
    if (grid) grid.checked = _data.showGrid !== false;
    const legend = container.querySelector('#ch-legend');
    if (legend) legend.checked = _data.showLegend !== false;
    container.querySelectorAll('.ch-pal').forEach(p =>
      p.classList.toggle('active', +p.dataset.i === (_data.palette ?? 0)));

    _renderCanvas();
    _renderDataEditor();
    _renderList();
  }

  // ── Liste ─────────────────────────────────────────────────────────────────
  function _renderList() {
    const list = container.querySelector('#ch-list');
    if (!list) return;
    if (!ChartsState._charts.length) {
      list.innerHTML = `<div style="padding:16px;text-align:center;font-size:11px;color:var(--text-tertiary)">No charts yet.</div>`;
      return;
    }
    list.innerHTML = ChartsState._charts.map(c => `
      <div class="ch-item" data-id="${c.id}" style="
        padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border);
        border-left:3px solid ${_current===c.id?'var(--blue)':'transparent'};
        background:${_current===c.id?'var(--bg-active)':'transparent'};
      ">
        <div style="font-size:12px;font-weight:500;color:${_current===c.id?'var(--blue-light)':'var(--text-primary)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${c.title}
        </div>
        <div style="font-size:10px;color:var(--text-tertiary);margin-top:2px">${JSON.parse(c.content)?.type ?? 'bar'} · ${c.updatedAt ?? ''}</div>
      </div>
    `).join('');
    list.querySelectorAll('.ch-item').forEach(el => {
      el.addEventListener('click', () => _openChart(el.dataset.id));
    });
  }

  renderShell();
}

// ── Expose renderFn ──
window["renderCharts"] = renderCharts;
