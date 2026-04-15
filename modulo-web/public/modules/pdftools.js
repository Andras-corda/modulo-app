// ── Modulo Module: PDF Tools (pdftools) v1.0.0 ──
// Author: Modulo Team
// Built: 2026-04-08T20:52:49.295Z
// renderFn: renderPdftools
// ── pdftools/script/pdflib.js ──
// ── PDF Library — Pure JS ──

const PDFLib = {

  async toBytes(file) {
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
  },

  toDataURL(bytes, mime = 'application/pdf') {
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  },

  download(bytes, filename) {
    const url = URL.createObjectURL(new Blob([bytes], { type:'application/pdf' }));
    const a   = Object.assign(document.createElement('a'), { href:url, download:filename });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href:url, download:filename });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  // ── Images → PDF ──────────────────────────────────────────────────────────
  async imagesToPDF(files) {
    const pages = await Promise.all(files.map(f => this._fileToJPEG(f)));
    return this._buildPDF(pages);
  },

  async _fileToJPEG(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          const d = c.toDataURL('image/jpeg', 0.92).split(',')[1];
          const b = atob(d), a = new Uint8Array(b.length);
          for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
          res({ data: a, w: img.naturalWidth, h: img.naturalHeight });
        };
        img.onerror = rej;
        img.src = e.target.result;
      };
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  },

  // ── Build PDF from JPEG pages ─────────────────────────────────────────────
  _buildPDF(pages, PW = 595, PH = 842) {
    const chunks = [];
    const off    = {};
    let   pos    = 0;

    const push  = s => { const b = new TextEncoder().encode(s); chunks.push(b); pos += b.length; };
    const pushB = b => { chunks.push(b); pos += b.length; };
    const sObj  = n => { off[n] = pos; push(n + ' 0 obj\n'); };
    const eObj  = ()=> push('endobj\n');

    push('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

    const N   = pages.length;
    const iIds = Array.from({length:N}, (_,i) => i*2 + 1);   // image objects
    const pIds = Array.from({length:N}, (_,i) => i*2 + 2);   // page objects
    const PAGES = N*2 + 1;
    const CAT   = N*2 + 2;

    // Images
    pages.forEach((pg, i) => {
      let dw = Math.min(PW-40, pg.w), dh = Math.round(dw * pg.h / pg.w);
      if (dh > PH-40) { dh = PH-40; dw = Math.round(dh * pg.w / pg.h); }
      const dx = Math.round((PW-dw)/2), dy = Math.round((PH-dh)/2);
      pg.draw = {dw,dh,dx,dy};

      sObj(iIds[i]);
      push('<< /Type /XObject /Subtype /Image /Width ' + pg.w + ' /Height ' + pg.h
        + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '
        + pg.data.length + ' >>\nstream\n');
      pushB(pg.data);
      push('\nendstream\n'); eObj();
    });

    // Pages
    pages.forEach((pg, i) => {
      const {dw,dh,dx,dy} = pg.draw;
      const stream = 'q ' + dw + ' 0 0 ' + dh + ' ' + dx + ' ' + dy + ' cm /Im' + (i+1) + ' Do Q';
      sObj(pIds[i]);
      push('<< /Type /Page /Parent ' + PAGES + ' 0 R /MediaBox [0 0 ' + PW + ' ' + PH + ']'
        + ' /Resources << /XObject << /Im' + (i+1) + ' ' + iIds[i] + ' 0 R >> >>'
        + ' /Contents ' + (pIds[i]+N*2) + ' 0 R >>\n'); eObj();

      sObj(pIds[i]+N*2);
      push('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream\n'); eObj();
    });

    sObj(PAGES);
    push('<< /Type /Pages /Kids [' + pIds.map(id => id+' 0 R').join(' ') + '] /Count ' + N + ' >>\n'); eObj();

    sObj(CAT);
    push('<< /Type /Catalog /Pages ' + PAGES + ' 0 R >>\n'); eObj();

    // xref
    const xrefOff = pos;
    const allIds  = [...iIds, ...pIds, ...pIds.map(id=>id+N*2), PAGES, CAT];
    const maxId   = Math.max(...allIds);
    let xref = 'xref\n0 ' + (maxId+1) + '\n0000000000 65535 f \n';
    for (let id = 1; id <= maxId; id++) {
      xref += (off[id] ?? 0).toString().padStart(10,'0') + ' 00000 n \n';
    }
    xref += 'trailer\n<< /Size ' + (maxId+1) + ' /Root ' + CAT + ' 0 R >>\nstartxref\n' + xrefOff + '\n%%EOF';
    push(xref);

    const total = new Uint8Array(pos);
    let p = 0;
    for (const c of chunks) { total.set(c, p); p += c.length; }
    return total;
  },

  // ── Extract embedded JPEGs from a PDF ─────────────────────────────────────
  extractJPEGs(bytes) {
    const imgs = [];
    let i = 0;
    while (i < bytes.length - 3) {
      if (bytes[i]===0xFF && bytes[i+1]===0xD8 && bytes[i+2]===0xFF) {
        let j = i + 2;
        while (j < bytes.length - 1) {
          if (bytes[j]===0xFF && bytes[j+1]===0xD9) { j += 2; break; }
          j++;
        }
        if (j - i > 500) imgs.push(bytes.slice(i, j));
        i = j;
      } else i++;
    }
    return imgs;
  },

  // ── Merge PDFs (via JPEG extraction) ─────────────────────────────────────
  async mergePDFs(files) {
    const pages = [];
    for (const file of files) {
      const bytes = await this.toBytes(file);
      const jpegs = this.extractJPEGs(bytes);
      for (const jpg of jpegs) {
        const pg = await this._jpegToPage(jpg);
        pages.push(pg);
      }
    }
    if (!pages.length) throw new Error('No pages found in PDFs');
    return this._buildPDF(pages);
  },

  async _jpegToPage(jpegBytes) {
    return new Promise((res, rej) => {
      const blob = new Blob([jpegBytes], { type:'image/jpeg' });
      const url  = URL.createObjectURL(blob);
      const img  = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res({ data: jpegBytes, w: img.naturalWidth, h: img.naturalHeight }); };
      img.onerror = () => { URL.revokeObjectURL(url); res({ data: jpegBytes, w: 800, h: 600 }); };
      img.src = url;
    });
  },

  // ── Rotate pages ─────────────────────────────────────────────────────────
  async rotatePDF(file, degrees) {
    const bytes = await this.toBytes(file);
    const jpegs = this.extractJPEGs(bytes);
    const pages = [];
    for (const jpg of jpegs) {
      const pg = await this._jpegToPage(jpg);
      // Rotate via canvas
      const rotated = await this._rotateJPEG(pg.data, pg.w, pg.h, degrees);
      pages.push(rotated);
    }
    return this._buildPDF(pages);
  },

  async _rotateJPEG(jpegBytes, w, h, deg) {
    return new Promise((res) => {
      const blob = new Blob([jpegBytes], { type:'image/jpeg' });
      const url  = URL.createObjectURL(blob);
      const img  = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const swap = deg === 90 || deg === 270;
        const c    = document.createElement('canvas');
        c.width  = swap ? h : w;
        c.height = swap ? w : h;
        const ctx = c.getContext('2d');
        ctx.translate(c.width/2, c.height/2);
        ctx.rotate(deg * Math.PI / 180);
        ctx.drawImage(img, -w/2, -h/2);
        const d = c.toDataURL('image/jpeg', 0.92).split(',')[1];
        const b = atob(d), a = new Uint8Array(b.length);
        for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
        res({ data: a, w: c.width, h: c.height });
      };
      img.src = url;
    });
  },

  // ── Split PDF by page range ────────────────────────────────────────────────
  async splitPDF(file, ranges) {
    // ranges = [[0,2],[3,5]] (0-indexed)
    const bytes = await this.toBytes(file);
    const jpegs = this.extractJPEGs(bytes);
    const results = [];
    for (const [from, to] of ranges) {
      const pages = [];
      for (let i = from; i <= to && i < jpegs.length; i++) {
        const pg = await this._jpegToPage(jpegs[i]);
        pages.push(pg);
      }
      if (pages.length) results.push(this._buildPDF(pages));
    }
    return results;
  },

  // ── PDF → images (PNG) ────────────────────────────────────────────────────
  async pdfToImages(file) {
    const bytes = await this.toBytes(file);
    const jpegs = this.extractJPEGs(bytes);
    return jpegs.map((jpg, i) => ({
      data: jpg,
      name: file.name.replace('.pdf','') + '_page' + (i+1) + '.jpg',
    }));
  },

  // ── Count pages ───────────────────────────────────────────────────────────
  countPages(bytes) {
    return this.extractJPEGs(bytes).length;
  },
};

// ── pdftools/page/render.js ──
// ── PDF Tools Render ──

async function renderPdftools(container) {

  const TOOLS = [
    { id:'merge',    icon:'🔗', label:'Merge PDF',        desc:'Combine multiple PDFs into one' },
    { id:'split',    icon:'✂️', label:'Split PDF',         desc:'Extract pages or split into parts' },
    { id:'rotate',   icon:'🔄', label:'Rotate PDF',        desc:'Rotate pages 90°, 180° or 270°' },
    { id:'img2pdf',  icon:'🖼️', label:'Images → PDF',      desc:'Convert JPG, PNG, WEBP to PDF' },
    { id:'pdf2img',  icon:'📄', label:'PDF → Images',      desc:'Extract pages as JPEG images' },
    { id:'compress', icon:'📦', label:'Compress PDF',      desc:'Reduce file size by re-encoding images' },
  ];

  let _tool  = null;
  let _files = [];
  let _busy  = false;

  // ── Shell ─────────────────────────────────────────────────────────────────
  function renderShell() {
    container.innerHTML = `
      <div style="display:flex;height:calc(100vh - 36px);overflow:hidden;background:var(--bg-base)">

        <!-- Sidebar outils -->
        <div style="width:220px;flex-shrink:0;border-right:1px solid var(--border);background:var(--bg-surface);overflow-y:auto;padding:8px 0">
          <div style="font-size:10px;font-weight:600;letter-spacing:.7px;color:var(--text-tertiary);text-transform:uppercase;padding:10px 14px 6px">PDF Tools</div>
          ${TOOLS.map(tool => `
            <div class="pdf-tool-item" data-id="${tool.id}" style="
              display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;
              border-left:3px solid transparent;transition:all .12s;
            ">
              <span style="font-size:18px;flex-shrink:0">${tool.icon}</span>
              <div style="min-width:0">
                <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${tool.label}</div>
                <div style="font-size:10px;color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${tool.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Zone principale -->
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
          <div id="pdf-main" style="flex:1;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:28px">
            <div style="text-align:center;color:var(--text-tertiary)">
              <div style="font-size:48px;margin-bottom:12px">📄</div>
              <div style="font-size:14px">Select a tool on the left</div>
            </div>
          </div>
        </div>
      </div>

      <style>
        .pdf-tool-item:hover { background:var(--bg-hover); }
        .pdf-tool-item.active { background:var(--bg-active); border-left-color:var(--red) !important; color:var(--text-accent); }
        .pdf-drop {
          border:2px dashed var(--border-strong);border-radius:var(--radius-lg);
          padding:32px;text-align:center;cursor:pointer;transition:all .15s;
          background:var(--bg-card);
        }
        .pdf-drop.drag-over, .pdf-drop:hover { border-color:var(--red);background:rgba(234,67,53,.06); }
        .pdf-file-chip {
          display:flex;align-items:center;gap:8px;padding:8px 12px;
          background:var(--bg-elevated);border-radius:var(--radius-md);
          border:1px solid var(--border);margin-bottom:6px;
        }
      </style>
    `;

    container.querySelectorAll('.pdf-tool-item').forEach(el => {
      el.addEventListener('click', () => {
        _tool  = el.dataset.id;
        _files = [];
        container.querySelectorAll('.pdf-tool-item').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        renderTool();
      });
    });
  }

  // ── Rendu de l'outil sélectionné ─────────────────────────────────────────
  function renderTool() {
    const main = container.querySelector('#pdf-main');
    if (!main) return;

    const tool = TOOLS.find(t => t.id === _tool);
    const isPDF = ['merge','split','rotate','pdf2img','compress'].includes(_tool);
    const accept = isPDF ? '.pdf,application/pdf' : 'image/*';
    const multi  = ['merge','img2pdf'].includes(_tool);

    main.innerHTML = `
      <div style="max-width:600px;width:100%">
        <div style="margin-bottom:24px">
          <div style="font-size:22px;font-weight:700;letter-spacing:-.5px;margin-bottom:4px">
            ${tool.icon} ${tool.label}
          </div>
          <div style="font-size:13px;color:var(--text-tertiary)">${tool.desc}</div>
        </div>

        <!-- Drop zone -->
        <div class="pdf-drop" id="pdf-drop">
          <div style="font-size:32px;margin-bottom:8px">${isPDF ? '📄' : '🖼️'}</div>
          <div style="font-size:14px;font-weight:500;margin-bottom:4px">
            Drop ${multi ? 'files' : 'a file'} here
          </div>
          <div style="font-size:12px;color:var(--text-tertiary)">
            or click to browse ${isPDF ? '(PDF)' : '(Images)'}
          </div>
          <input type="file" id="pdf-input" accept="${accept}" ${multi ? 'multiple' : ''} style="display:none">
        </div>

        <!-- Liste des fichiers -->
        <div id="pdf-files" style="margin-top:14px"></div>

        <!-- Options selon l'outil -->
        <div id="pdf-options" style="margin-top:16px"></div>

        <!-- Action -->
        <div id="pdf-action" style="margin-top:20px;display:none">
          <button class="btn btn-primary" id="pdf-run" style="min-width:160px;justify-content:center">
            ${tool.icon} Run
          </button>
          <span id="pdf-status" style="margin-left:14px;font-size:12px;color:var(--text-tertiary)"></span>
        </div>
      </div>
    `;

    _bindDropZone();
    _renderOptions();
  }

  // ── Drop zone ─────────────────────────────────────────────────────────────
  function _bindDropZone() {
    const drop  = container.querySelector('#pdf-drop');
    const input = container.querySelector('#pdf-input');
    if (!drop || !input) return;

    drop.addEventListener('click', () => input.click());
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('drag-over');
      _addFiles([...e.dataTransfer.files]);
    });
    input.addEventListener('change', e => { _addFiles([...e.target.files]); input.value = ''; });
  }

  function _addFiles(newFiles) {
    const multi = ['merge','img2pdf'].includes(_tool);
    if (multi) { _files.push(...newFiles); }
    else        { _files = [newFiles[0]]; }
    _renderFileList();
    _renderOptions();
    const action = container.querySelector('#pdf-action');
    if (action && _files.length) action.style.display = 'flex';
  }

  function _renderFileList() {
    const el = container.querySelector('#pdf-files');
    if (!el) return;
    el.innerHTML = _files.map((f, i) => `
      <div class="pdf-file-chip">
        <span style="font-size:16px">${f.name.endsWith('.pdf') ? '📄' : '🖼️'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</div>
          <div style="font-size:10px;color:var(--text-tertiary)">${(f.size/1024).toFixed(1)} KB</div>
        </div>
        <button class="btn btn-ghost btn-sm pdf-rm" data-i="${i}" style="padding:0 6px;color:var(--text-tertiary)">×</button>
      </div>
    `).join('');
    el.querySelectorAll('.pdf-rm').forEach(btn => {
      btn.addEventListener('click', () => {
        _files.splice(+btn.dataset.i, 1);
        _renderFileList();
        if (!_files.length) {
          const action = container.querySelector('#pdf-action');
          if (action) action.style.display = 'none';
        }
      });
    });
  }

  // ── Options par outil ─────────────────────────────────────────────────────
  function _renderOptions() {
    const el = container.querySelector('#pdf-options');
    if (!el) return;

    if (_tool === 'rotate') {
      el.innerHTML = `
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">Rotation angle</div>
        <div style="display:flex;gap:8px">
          ${[90,180,270].map(d => `
            <button class="btn btn-secondary pdf-rot-opt ${d===90?'active':''}" data-deg="${d}" style="font-size:12px">
              ${d === 90 ? '↻' : d === 180 ? '↕' : '↺'} ${d}°
            </button>
          `).join('')}
        </div>
      `;
      el.querySelectorAll('.pdf-rot-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.pdf-rot-opt').forEach(b => b.classList.remove('active','btn-primary'));
          el.querySelectorAll('.pdf-rot-opt').forEach(b => b.classList.add('btn-secondary'));
          btn.classList.remove('btn-secondary'); btn.classList.add('active','btn-primary');
        });
      });

    } else if (_tool === 'split') {
      el.innerHTML = `
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px">Split mode</div>
        <select class="input" id="split-mode" style="max-width:260px;height:32px;font-size:12px">
          <option value="half">Split in half</option>
          <option value="every">Every N pages</option>
          <option value="range">Custom range</option>
        </select>
        <div id="split-extra" style="margin-top:8px"></div>
      `;
      container.querySelector('#split-mode')?.addEventListener('change', e => {
        const extra = container.querySelector('#split-extra');
        if (!extra) return;
        if (e.target.value === 'every') {
          extra.innerHTML = `<input class="input" id="split-n" type="number" min="1" value="1" style="max-width:100px;height:32px;font-size:12px"> pages per part`;
        } else if (e.target.value === 'range') {
          extra.innerHTML = `<input class="input" id="split-range" placeholder="e.g. 1-3, 4-6" style="max-width:240px;height:32px;font-size:12px">`;
        } else { extra.innerHTML = ''; }
      });

    } else if (_tool === 'compress') {
      el.innerHTML = `
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px">Quality</div>
        <div style="display:flex;gap:8px">
          ${[['high','High (less compression)','0.85'],['medium','Medium','0.65'],['low','Low (more compression)','0.40']].map(([id,lbl,q]) => `
            <button class="btn btn-secondary pdf-q-opt ${id==='medium'?'active btn-primary':''}" data-q="${q}" style="font-size:11px">${lbl}</button>
          `).join('')}
        </div>
      `;
      el.querySelectorAll('.pdf-q-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.pdf-q-opt').forEach(b => { b.classList.remove('active','btn-primary'); b.classList.add('btn-secondary'); });
          btn.classList.remove('btn-secondary'); btn.classList.add('active','btn-primary');
        });
      });
    }

    // Bind run button
    const runBtn = container.querySelector('#pdf-run');
    if (runBtn) {
      runBtn.addEventListener('click', _runTool);
    }
  }

  // ── Run ───────────────────────────────────────────────────────────────────
  async function _runTool() {
    if (_busy || !_files.length) return;
    _busy = true;
    const status = container.querySelector('#pdf-status');
    const runBtn = container.querySelector('#pdf-run');
    if (status) status.textContent = 'Processing…';
    if (runBtn) { runBtn.disabled = true; }

    try {
      if (_tool === 'merge') {
        const bytes = await PDFLib.mergePDFs(_files);
        PDFLib.download(bytes, 'merged.pdf');
        if (status) status.textContent = `✓ merged.pdf (${(bytes.length/1024).toFixed(0)} KB)`;

      } else if (_tool === 'img2pdf') {
        const bytes = await PDFLib.imagesToPDF(_files);
        PDFLib.download(bytes, 'images.pdf');
        if (status) status.textContent = `✓ images.pdf (${(bytes.length/1024).toFixed(0)} KB)`;

      } else if (_tool === 'rotate') {
        const activeBtn = container.querySelector('.pdf-rot-opt.active');
        const deg = +(activeBtn?.dataset.deg ?? 90);
        const bytes = await PDFLib.rotatePDF(_files[0], deg);
        const name = _files[0].name.replace('.pdf','') + '_rotated.pdf';
        PDFLib.download(bytes, name);
        if (status) status.textContent = `✓ ${name}`;

      } else if (_tool === 'pdf2img') {
        const imgs = await PDFLib.pdfToImages(_files[0]);
        if (!imgs.length) { if (status) status.textContent = 'No images found in PDF'; return; }
        imgs.forEach(img => PDFLib.downloadBlob(new Blob([img.data],{type:'image/jpeg'}), img.name));
        if (status) status.textContent = `✓ Downloaded ${imgs.length} image(s)`;

      } else if (_tool === 'split') {
        const mode = container.querySelector('#split-mode')?.value ?? 'half';
        const bytes = await PDFLib.toBytes(_files[0]);
        const jpegs = PDFLib.extractJPEGs(bytes);
        const n     = jpegs.length;
        let ranges  = [];
        if (mode === 'half') {
          const mid = Math.ceil(n/2);
          ranges = [[0, mid-1], [mid, n-1]];
        } else if (mode === 'every') {
          const step = +container.querySelector('#split-n')?.value || 1;
          for (let i = 0; i < n; i += step) ranges.push([i, Math.min(i+step-1, n-1)]);
        } else {
          const raw = container.querySelector('#split-range')?.value ?? '';
          ranges = raw.split(',').map(r => {
            const [a, b] = r.trim().split('-').map(x => +x.trim() - 1);
            return [a, b ?? a];
          }).filter(([a,b]) => !isNaN(a) && !isNaN(b));
        }
        const parts = await PDFLib.splitPDF(_files[0], ranges);
        parts.forEach((p, i) => PDFLib.download(p, `part${i+1}.pdf`));
        if (status) status.textContent = `✓ Downloaded ${parts.length} part(s)`;

      } else if (_tool === 'compress') {
        const q = +(container.querySelector('.pdf-q-opt.active')?.dataset.q ?? 0.65);
        const bytes = await PDFLib.toBytes(_files[0]);
        const jpegs = PDFLib.extractJPEGs(bytes);
        const pages = [];
        for (const jpg of jpegs) {
          const pg = await PDFLib._jpegToPage(jpg);
          // Re-encode with lower quality
          const blob = new Blob([pg.data], {type:'image/jpeg'});
          const url  = URL.createObjectURL(blob);
          const compressed = await new Promise(res => {
            const img = new Image();
            img.onload = () => {
              URL.revokeObjectURL(url);
              const c = document.createElement('canvas');
              c.width = img.naturalWidth; c.height = img.naturalHeight;
              c.getContext('2d').drawImage(img, 0, 0);
              const d = c.toDataURL('image/jpeg', q).split(',')[1];
              const b = atob(d), a = new Uint8Array(b.length);
              for (let i=0;i<b.length;i++) a[i]=b.charCodeAt(i);
              res({ data: a, w: img.naturalWidth, h: img.naturalHeight });
            };
            img.src = url;
          });
          pages.push(compressed);
        }
        const result = PDFLib._buildPDF(pages);
        const orig   = bytes.length, comp = result.length;
        PDFLib.download(result, _files[0].name.replace('.pdf','') + '_compressed.pdf');
        if (status) status.textContent = `✓ ${(orig/1024).toFixed(0)}KB → ${(comp/1024).toFixed(0)}KB (${Math.round((1-comp/orig)*100)}% smaller)`;
      }
    } catch (e) {
      if (status) status.textContent = '✗ ' + e.message;
    } finally {
      _busy = false;
      if (runBtn) runBtn.disabled = false;
    }
  }

  renderShell();
}

// ── Expose renderFn ──
window["renderPdftools"] = renderPdftools;
