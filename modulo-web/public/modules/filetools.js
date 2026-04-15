// ── Modulo Module: File Tools (filetools) v1.0.0 ──
// Author: Modulo Team
// Built: 2026-04-07T21:42:47.527Z
// renderFn: renderFiletools
// ── filetools/script/pdf.js ──
// ── PDF Generator — pure JS, aucune dépendance ──
// Génère un PDF minimal avec une image JPEG embarquée

const PDFGen = {
  // Encode une string en bytes latin-1
  _str(s) {
    const b = [];
    for (let i = 0; i < s.length; i++) b.push(s.charCodeAt(i) & 0xff);
    return b;
  },

  // Extraire les bytes JPEG depuis un dataURL
  _jpegBytes(dataURL) {
    const b64 = dataURL.split(',')[1];
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  },

  // Générer un PDF contenant une image (fournie en dataURL JPEG)
  generate(jpegDataURL, imgW, imgH, title = 'Image') {
    const imgBytes = this._jpegBytes(jpegDataURL);
    const imgLen   = imgBytes.length;

    // Dimensions de page A4 en points (72dpi): 595 × 842
    // Ou adapter à l'image (max 595 × 842, centré)
    const PAGE_W = 595;
    const PAGE_H = 842;
    const MARGIN = 28; // ~1cm

    const availW = PAGE_W - MARGIN * 2;
    const availH = PAGE_H - MARGIN * 2;

    let drawW = imgW, drawH = imgH;
    if (drawW > availW) { drawH = Math.round(drawH * availW / drawW); drawW = availW; }
    if (drawH > availH) { drawW = Math.round(drawW * availH / drawH); drawH = availH; }

    const x = Math.round((PAGE_W - drawW) / 2);
    const y = Math.round((PAGE_H - drawH) / 2);

    // ── Construire les objets PDF ────────────────────────────────────────────
    const parts = [];
    const offsets = [];

    function out(s) { parts.push(s); }

    function obj(n, content) {
      offsets[n] = parts.join('').length;
      out(`${n} 0 obj\n${content}\nendobj\n`);
    }

    // Header
    out('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

    // Obj 1: Catalog
    obj(1, `<< /Type /Catalog /Pages 2 0 R >>`);

    // Obj 2: Pages
    obj(2, `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);

    // Obj 3: Page
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>`);

    // Obj 4: Content stream (draw image)
    const stream = `q ${drawW} 0 0 ${drawH} ${x} ${y} cm /Im1 Do Q`;
    obj(4, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

    // Obj 5: Image XObject
    const imgObjHeader = `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgLen} >>`;
    offsets[5] = parts.join('').length;
    out(`5 0 obj\n${imgObjHeader}\nstream\n`);

    // PDF jusqu'ici en string, puis ajouter les bytes JPEG binaires
    const headerPart = parts.join('');
    const after = `\nendstream\nendobj\n`;

    // Xref
    const xrefOffset = headerPart.length + imgLen + after.length;
    const numObjs = 6;
    let xref = `xref\n0 ${numObjs}\n0000000000 65535 f \n`;
    for (let i = 1; i < numObjs; i++) {
      xref += (offsets[i] ?? 0).toString().padStart(10, '0') + ' 00000 n \n';
    }
    xref += `trailer\n<< /Size ${numObjs} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    // Assembler en Uint8Array
    const headerBytes  = new TextEncoder().encode(headerPart);
    const afterBytes   = new TextEncoder().encode(after + xref);
    const total        = new Uint8Array(headerBytes.length + imgLen + afterBytes.length);
    total.set(headerBytes, 0);
    total.set(imgBytes, headerBytes.length);
    total.set(afterBytes, headerBytes.length + imgLen);

    return total;
  },

  download(jpegDataURL, imgW, imgH, filename = 'image') {
    const bytes = this.generate(jpegDataURL, imgW, imgH, filename);
    const blob  = new Blob([bytes], { type: 'application/pdf' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = filename.replace(/\.[^.]+$/, '') + '.pdf';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
};

// ── filetools/script/state.js ──
// ── FileTools State ──

const FT = {
  file:     null,
  src:      null,
  img:      null,
  rotation: 0,
  flipH:    false,
  flipV:    false,
  quality:  0.92,
  targetFmt:'image/jpeg',
  scale:    1.0,
  meta: { filename:'', width:0, height:0, size:0, type:'', lastModified:'' },

  FORMATS: [
    { mime:'image/jpeg', ext:'jpg',  label:'JPEG' },
    { mime:'image/png',  ext:'png',  label:'PNG'  },
    { mime:'image/webp', ext:'webp', label:'WEBP' },
    { mime:'image/bmp',  ext:'bmp',  label:'BMP'  },
  ],

  async loadFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.src      = e.target.result;
        this.file     = file;
        this.rotation = 0;
        this.flipH    = false;
        this.flipV    = false;
        this.scale    = 1.0;
        const mime    = file.type || 'image/jpeg';
        this.targetFmt = mime.includes('png')  ? 'image/png'
                       : mime.includes('webp') ? 'image/webp'
                       : 'image/jpeg';
        this.meta = {
          filename:     file.name,
          width:        0,
          height:       0,
          size:         file.size,
          type:         file.type || 'unknown',
          lastModified: new Date(file.lastModified).toLocaleString(),
        };
        const img = new Image();
        img.onload = () => {
          this.img = img;
          this.meta.width  = img.naturalWidth;
          this.meta.height = img.naturalHeight;
          resolve(img);
        };
        img.onerror = reject;
        img.src = this.src;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  render(overrides = {}) {
    if (!this.img) return null;
    const rot   = overrides.rotation  ?? this.rotation;
    const flipH = overrides.flipH     ?? this.flipH;
    const flipV = overrides.flipV     ?? this.flipV;
    const scale = overrides.scale     ?? this.scale;
    const fmt   = overrides.fmt       ?? this.targetFmt;
    const qual  = overrides.quality   ?? this.quality;

    const sw = Math.round(this.img.naturalWidth  * scale);
    const sh = Math.round(this.img.naturalHeight * scale);
    const rotated = rot === 90 || rot === 270;
    const cw = rotated ? sh : sw;
    const ch = rotated ? sw : sh;

    const c   = document.createElement('canvas');
    c.width   = cw; c.height = ch;
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate((rot * Math.PI) / 180);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);
    ctx.drawImage(this.img, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();

    const outFmt  = fmt === 'image/bmp' ? 'image/png' : fmt;
    const dataURL = c.toDataURL(outFmt, qual);
    return { dataURL, width: cw, height: ch };
  },

  formatBytes(n) {
    if (n < 1024)      return n + ' B';
    if (n < 1048576)   return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  },

  formatExt(mime) {
    return (FT.FORMATS.find(f => f.mime === mime) ?? FT.FORMATS[0]).ext;
  },
};

// ── filetools/page/render.js ──
// ── FileTools Render ──

async function renderFiletools(container) {

  let _previewURL = null;
  let _dropActive = false;

  // ── Shell ─────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div id="ft-root" style="display:flex;height:calc(100vh - 36px);overflow:hidden;background:var(--bg-base)">

      <!-- Panneau gauche : contrôles -->
      <div id="ft-panel" style="width:268px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto;background:var(--bg-surface)">

        <!-- Drop zone -->
        <div id="ft-drop" style="
          margin:12px;border-radius:var(--radius-lg);
          border:2px dashed var(--border-strong);
          padding:28px 16px;text-align:center;cursor:pointer;
          transition:all .15s;background:var(--bg-card);
        ">
          <div style="font-size:28px;margin-bottom:8px">🖼️</div>
          <div style="font-size:13px;font-weight:500;color:var(--text-secondary)">Drop image here</div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px">or click to browse</div>
          <div style="font-size:10px;color:var(--text-tertiary);margin-top:6px">PNG · JPG · WEBP · BMP · GIF</div>
          <input type="file" id="ft-file-input" accept="image/*" style="display:none">
        </div>

        <!-- Sections (cachées tant que pas de fichier) -->
        <div id="ft-controls" style="display:none;flex-direction:column">

          <!-- Métadonnées -->
          <div class="ft-section">
            <div class="ft-section-title">📄 Properties</div>
            <div id="ft-meta-grid" class="ft-meta-grid"></div>
            <div style="height:8px"></div>
            <div class="ft-row">
              <label class="ft-label">Filename</label>
              <input class="input" id="ft-meta-name" style="font-size:12px">
            </div>
          </div>

          <!-- Rotation & flip -->
          <div class="ft-section">
            <div class="ft-section-title">🔄 Transform</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
              <button class="btn btn-secondary btn-sm ft-rot" data-deg="-90" title="Rotate left">↺ -90°</button>
              <button class="btn btn-secondary btn-sm ft-rot" data-deg="90"  title="Rotate right">↻ +90°</button>
              <button class="btn btn-secondary btn-sm ft-rot" data-deg="180" title="Rotate 180°">↕ 180°</button>
              <button class="btn btn-secondary btn-sm" id="ft-fliph" title="Flip horizontal">⇄ Flip H</button>
              <button class="btn btn-secondary btn-sm" id="ft-flipv" title="Flip vertical">⇅ Flip V</button>
              <button class="btn btn-ghost btn-sm" id="ft-reset-transform" style="color:var(--text-tertiary);font-size:11px">Reset</button>
            </div>
            <div class="ft-row">
              <label class="ft-label">Rotation</label>
              <span id="ft-rot-display" style="font-size:12px;font-family:var(--font-mono);color:var(--text-secondary)">0°</span>
            </div>
          </div>

          <!-- Resize -->
          <div class="ft-section">
            <div class="ft-section-title">📐 Resize</div>
            <div class="ft-row">
              <label class="ft-label">Scale</label>
              <input type="range" id="ft-scale" min="5" max="200" value="100" step="5"
                style="flex:1;accent-color:var(--blue)">
              <span id="ft-scale-val" style="font-size:11px;font-family:var(--font-mono);color:var(--text-secondary);min-width:38px">100%</span>
            </div>
            <div class="ft-row">
              <label class="ft-label">Output size</label>
              <span id="ft-out-size" style="font-size:11px;color:var(--text-tertiary);font-family:var(--font-mono)">—</span>
            </div>
          </div>

          <!-- Conversion -->
          <div class="ft-section">
            <div class="ft-section-title">🔁 Convert to</div>
            <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px" id="ft-fmt-btns"></div>
            <div class="ft-row" id="ft-quality-row">
              <label class="ft-label">Quality</label>
              <input type="range" id="ft-quality" min="10" max="100" value="92"
                style="flex:1;accent-color:var(--blue)">
              <span id="ft-quality-val" style="font-size:11px;font-family:var(--font-mono);color:var(--text-secondary);min-width:34px">92%</span>
            </div>
          </div>

          <!-- Export -->
          <div class="ft-section">
            <div class="ft-section-title">⬇️ Export</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <button class="btn btn-primary" id="ft-export-img" style="justify-content:center">
                ${icon('export','14px')} Download image
              </button>
              <button class="btn btn-secondary" id="ft-export-pdf" style="justify-content:center">
                📄 Export as PDF
              </button>
              <button class="btn btn-ghost btn-sm" id="ft-copy-clip" style="justify-content:center;font-size:11px">
                📋 Copy to clipboard
              </button>
            </div>
          </div>

          <!-- Info fichier converti -->
          <div style="padding:10px 14px 16px;font-size:10px;color:var(--text-tertiary);line-height:1.7" id="ft-info-bottom"></div>
        </div>
      </div>

      <!-- Zone preview -->
      <div id="ft-preview-area" style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative">
        <!-- Damier transparence -->
        <div style="position:absolute;inset:0;
          background-image:repeating-conic-gradient(rgba(128,128,128,.06) 0% 25%,transparent 0% 50%);
          background-size:16px 16px;pointer-events:none"></div>

        <div id="ft-empty" style="text-align:center;position:relative;z-index:1">
          <div style="font-size:56px;margin-bottom:12px;opacity:.3">🖼️</div>
          <div style="font-size:14px;color:var(--text-tertiary)">No file loaded</div>
          <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px">Drop an image on the left panel</div>
        </div>

        <img id="ft-preview" style="display:none;max-width:calc(100% - 32px);max-height:calc(100% - 32px);
          border-radius:var(--radius-md);box-shadow:0 8px 32px rgba(0,0,0,.4);position:relative;z-index:1;
          object-fit:contain" alt="Preview">

        <!-- Badge infos -->
        <div id="ft-preview-badge" style="
          display:none;position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
          background:rgba(0,0,0,.65);backdrop-filter:blur(8px);
          border-radius:var(--radius-full);padding:5px 14px;
          font-size:11px;color:rgba(255,255,255,.7);font-family:var(--font-mono);
          z-index:2;white-space:nowrap;
        "></div>

        <!-- Zoom controls -->
        <div style="position:absolute;top:10px;right:10px;display:flex;gap:4px;z-index:2" id="ft-zoom-btns" style="display:none">
          <button class="btn btn-secondary btn-sm" id="ft-zoom-fit" style="font-size:11px">Fit</button>
          <button class="btn btn-secondary btn-sm" id="ft-zoom-100" style="font-size:11px">100%</button>
        </div>
      </div>
    </div>

    <style>
      .ft-section {
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
      }
      .ft-section-title {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: .7px;
        text-transform: uppercase;
        color: var(--text-tertiary);
        margin-bottom: 10px;
      }
      .ft-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .ft-label {
        font-size: 11px;
        color: var(--text-secondary);
        min-width: 80px;
        flex-shrink: 0;
      }
      .ft-meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px 8px;
        margin-bottom: 8px;
      }
      .ft-meta-item {
        background: var(--bg-elevated);
        border-radius: var(--radius-md);
        padding: 6px 9px;
      }
      .ft-meta-key { font-size: 9px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .4px; }
      .ft-meta-val { font-size: 12px; font-weight: 500; color: var(--text-primary); margin-top: 1px; font-family: var(--font-mono); }
      .ft-fmt-active { border-color: var(--blue) !important; color: var(--blue) !important; background: var(--bg-active) !important; }

      #ft-drop.drag-over {
        border-color: var(--blue);
        background: var(--bg-active);
      }
    </style>
  `;

  // ── Refs ──────────────────────────────────────────────────────────────────
  const $ = id => container.querySelector('#' + id);
  const drop      = $('ft-drop');
  const fileInput = $('ft-file-input');
  const preview   = $('ft-preview');
  const empty     = $('ft-empty');
  const controls  = $('ft-controls');
  const badge     = $('ft-preview-badge');

  // ── Load file ─────────────────────────────────────────────────────────────
  async function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please load an image file (PNG, JPG, WEBP, BMP, GIF).');
      return;
    }

    try {
      await FT.loadFile(file);
      controls.style.display = 'flex';
      empty.style.display    = 'none';

      _buildMetaGrid();
      _buildFormatBtns();
      _updatePreview();
      _updateOutputSize();

      // Pré-remplir le nom de fichier
      $('ft-meta-name').value = FT.meta.filename;

    } catch (e) {
      alert('Failed to load file: ' + e.message);
    }
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  function _updatePreview() {
    if (!FT.img) return;

    const result = FT.render();
    if (!result) return;
    _previewURL = result.dataURL;

    preview.src          = result.dataURL;
    preview.style.display = 'block';
    badge.style.display  = 'block';

    // Badge info
    const ext  = FT.formatExt(FT.targetFmt);
    const size = _estimateSize(result.dataURL);
    badge.textContent = `${result.width} × ${result.height}px · ${ext.toUpperCase()} · ~${FT.formatBytes(size)}`;

    _updateOutputSize();
    _updateInfoBottom(result);
  }

  function _estimateSize(dataURL) {
    // Taille approximative des données base64
    const b64 = dataURL.split(',')[1] ?? '';
    return Math.round(b64.length * 0.75);
  }

  function _updateOutputSize() {
    if (!FT.img) return;
    const scale = FT.scale;
    const rot   = FT.rotation;
    const rotated = rot === 90 || rot === 270;
    const w = Math.round(FT.img.naturalWidth  * scale);
    const h = Math.round(FT.img.naturalHeight * scale);
    const ow = rotated ? h : w;
    const oh = rotated ? w : h;
    $('ft-out-size').textContent = `${ow} × ${oh}px`;
  }

  function _updateInfoBottom(result) {
    const orig = FT.formatBytes(FT.meta.size);
    const conv = FT.formatBytes(_estimateSize(result.dataURL));
    const ratio = ((_estimateSize(result.dataURL) / (FT.meta.size || 1)) * 100).toFixed(0);
    $('ft-info-bottom').innerHTML = `
      Original: <strong style="color:var(--text-secondary)">${orig}</strong>
      &nbsp;→&nbsp; Output: <strong style="color:var(--text-secondary)">${conv}</strong>
      &nbsp;(${ratio}%)
    `;
  }

  // ── Métadonnées ───────────────────────────────────────────────────────────
  function _buildMetaGrid() {
    const m = FT.meta;
    const items = [
      ['Width',    m.width + 'px'],
      ['Height',   m.height + 'px'],
      ['Size',     FT.formatBytes(m.size)],
      ['Type',     m.type.split('/')[1]?.toUpperCase() ?? m.type],
      ['Modified', m.lastModified.split(',')[0] ?? '—'],
      ['Format',   FT.FORMATS.find(f => f.mime === FT.targetFmt)?.label ?? '—'],
    ];
    $('ft-meta-grid').innerHTML = items.map(([k, v]) => `
      <div class="ft-meta-item">
        <div class="ft-meta-key">${k}</div>
        <div class="ft-meta-val">${v}</div>
      </div>
    `).join('');
  }

  // ── Format buttons ────────────────────────────────────────────────────────
  function _buildFormatBtns() {
    const el = $('ft-fmt-btns');
    el.innerHTML = FT.FORMATS.map(f => `
      <button class="btn btn-secondary btn-sm ft-fmt-btn ${FT.targetFmt === f.mime ? 'ft-fmt-active' : ''}"
        data-mime="${f.mime}" style="font-size:11px">
        ${f.label}
      </button>
    `).join('');

    el.querySelectorAll('.ft-fmt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        FT.targetFmt = btn.dataset.mime;
        el.querySelectorAll('.ft-fmt-btn').forEach(b =>
          b.classList.toggle('ft-fmt-active', b.dataset.mime === FT.targetFmt));

        // PNG/BMP n'ont pas de contrôle qualité
        const hasQuality = FT.targetFmt === 'image/jpeg' || FT.targetFmt === 'image/webp';
        $('ft-quality-row').style.display = hasQuality ? 'flex' : 'none';

        _buildMetaGrid();
        _updatePreview();
      });
    });

    // Initialiser la visibilité du contrôle qualité
    const hasQuality = FT.targetFmt === 'image/jpeg' || FT.targetFmt === 'image/webp';
    $('ft-quality-row').style.display = hasQuality ? 'flex' : 'none';
  }

  // ── Export image ──────────────────────────────────────────────────────────
  function _exportImage() {
    if (!_previewURL) return;
    const name = ($('ft-meta-name').value.trim() || FT.meta.filename || 'image')
                  .replace(/\.[^.]+$/, '');
    const ext  = FT.formatExt(FT.targetFmt);
    const a    = document.createElement('a');
    a.href     = _previewURL;
    a.download = `${name}.${ext}`;
    a.click();
  }

  // ── Export PDF ────────────────────────────────────────────────────────────
  async function _exportPDF() {
    if (!FT.img) return;

    // Toujours exporter en JPEG pour le PDF (meilleure compatibilité)
    const result = FT.render({ fmt: 'image/jpeg', quality: 0.92 });
    if (!result) return;

    const name = ($('ft-meta-name').value.trim() || FT.meta.filename || 'image')
                  .replace(/\.[^.]+$/, '');

    try {
      PDFGen.download(result.dataURL, result.width, result.height, name);
    } catch(e) {
      alert('PDF export failed: ' + e.message);
    }
  }

  // ── Copy to clipboard ──────────────────────────────────────────────────────
  async function _copyClipboard() {
    if (!_previewURL) return;
    try {
      const res  = await fetch(_previewURL);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      const btn = $('ft-copy-clip');
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 1800);
    } catch {
      // Fallback: ouvrir dans un nouvel onglet
      window.open(_previewURL, '_blank');
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────

  // Drop zone
  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
    fileInput.value = '';
  });

  drop.addEventListener('dragover', e => {
    e.preventDefault();
    drop.classList.add('drag-over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('drag-over');
    const f = e.dataTransfer.files?.[0];
    if (f) loadFile(f);
  });

  // Rotation
  container.querySelectorAll('.ft-rot').forEach(btn => {
    btn.addEventListener('click', () => {
      const deg = parseInt(btn.dataset.deg);
      FT.rotation = ((FT.rotation + deg) + 360) % 360;
      $('ft-rot-display').textContent = FT.rotation + '°';
      _updatePreview();
    });
  });

  $('ft-fliph').addEventListener('click', () => {
    FT.flipH = !FT.flipH;
    $('ft-fliph').classList.toggle('ft-fmt-active', FT.flipH);
    _updatePreview();
  });

  $('ft-flipv').addEventListener('click', () => {
    FT.flipV = !FT.flipV;
    $('ft-flipv').classList.toggle('ft-fmt-active', FT.flipV);
    _updatePreview();
  });

  $('ft-reset-transform').addEventListener('click', () => {
    FT.rotation = 0;
    FT.flipH    = false;
    FT.flipV    = false;
    $('ft-rot-display').textContent = '0°';
    $('ft-fliph').classList.remove('ft-fmt-active');
    $('ft-flipv').classList.remove('ft-fmt-active');
    _updatePreview();
  });

  // Scale
  $('ft-scale').addEventListener('input', e => {
    FT.scale = +e.target.value / 100;
    $('ft-scale-val').textContent = e.target.value + '%';
    _updatePreview();
  });

  // Quality
  $('ft-quality').addEventListener('input', e => {
    FT.quality = +e.target.value / 100;
    $('ft-quality-val').textContent = e.target.value + '%';
    _updatePreview();
  });

  // Export
  $('ft-export-img').addEventListener('click', _exportImage);
  $('ft-export-pdf').addEventListener('click', _exportPDF);
  $('ft-copy-clip').addEventListener('click', _copyClipboard);

  // Zoom
  $('ft-zoom-fit')?.addEventListener('click', () => {
    preview.style.maxWidth  = 'calc(100% - 32px)';
    preview.style.maxHeight = 'calc(100% - 32px)';
    preview.style.width     = '';
    preview.style.height    = '';
  });
  $('ft-zoom-100')?.addEventListener('click', () => {
    if (!FT.img) return;
    preview.style.maxWidth  = 'none';
    preview.style.maxHeight = 'none';
    preview.style.width     = FT.img.naturalWidth + 'px';
    preview.style.height    = FT.img.naturalHeight + 'px';
  });

  // Glisser-déposer depuis l'extérieur de la drop zone aussi
  const previewArea = $('ft-preview-area');
  previewArea.addEventListener('dragover', e => e.preventDefault());
  previewArea.addEventListener('drop', e => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) loadFile(f);
  });
}

// ── Expose renderFn ──
window["renderFiletools"] = renderFiletools;
