// ── Modulo Module: QR Code (qrcode) v1.0.0 ──
// Author: Modulo Team
// Built: 2026-04-07T21:30:32.670Z
// renderFn: renderQrcode
// ── qrcode/script/qr.js ──
// ── QR Code Generator — ISO 18004, Level M, versions 1-10 ──

const QR = (() => {

  // ── GF(256) ───────────────────────────────────────────────────────────────
  const EXP = new Uint8Array(512);
  const LOG  = new Uint8Array(256);
  (() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  const gfMul = (a, b) => a && b ? EXP[LOG[a] + LOG[b]] : 0;

  function rsGen(n) {
    let g = [1];
    for (let i = 0; i < n; i++) {
      const r = new Array(g.length + 1).fill(0);
      for (let j = 0; j < g.length; j++) {
        r[j]   ^= g[j];
        r[j+1] ^= gfMul(g[j], EXP[i]);
      }
      g = r;
    }
    return g;
  }

  function rsEncode(data, n) {
    const gen = rsGen(n);
    const rem = new Array(n).fill(0);
    for (const b of data) {
      const f = b ^ rem.shift();
      rem.push(0);
      for (let i = 0; i < n; i++) rem[i] ^= gfMul(gen[i + 1], f);
    }
    return rem;
  }

  // ── Tables Level M ────────────────────────────────────────────────────────
  // [totalDataCW, ecCWperBlock, blocksG1, cwPerBlockG1, blocksG2, cwPerBlockG2]
  const CAPS = [
    null,
    [16,10,1,16,0,0],[28,16,1,28,0,0],[44,26,2,17,0,0],[64,18,2,24,2,25],
    [86,24,2,28,2,29],[108,16,4,19,0,0],[124,18,4,22,1,23],[154,22,2,22,4,23],
    [182,22,3,20,4,21],[216,26,4,24,1,25],
  ];

  const ALIGN = [
    [],[],[6,18],[6,22],[6,26],[6,30],[6,34],
    [6,22,38],[6,24,42],[6,26,46],[6,28,50],
  ];

  // ── Format info BCH ───────────────────────────────────────────────────────
  // EC level M = 00 in ISO 18004
  function fmtInfo(mask) {
    const data = (0b00 << 3) | mask; // 5 bits: 2 EC + 3 mask
    let rem = data << 10;
    for (let i = 14; i >= 10; i--)
      if (rem & (1 << i)) rem ^= 0x537 << (i - 10);
    return ((data << 10) | rem) ^ 0x5412; // 15 bits
  }

  // ── Build matrix ──────────────────────────────────────────────────────────
  function buildMatrix(ver, codewords, maskId) {
    const N   = ver * 4 + 17;
    const mat = Array.from({length: N}, () => new Int8Array(N).fill(-1));
    const fix = Array.from({length: N}, () => new Uint8Array(N));  // 1 = function module

    function set(r, c, v) {
      if (r < 0 || r >= N || c < 0 || c >= N) return;
      mat[r][c] = v;
      fix[r][c] = 1;
    }

    // Finder pattern + separator
    function finder(tr, tc) {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          if (tr+r < 0 || tr+r >= N || tc+c < 0 || tc+c >= N) continue;
          const onBorder = r===0||r===6||c===0||c===6;
          const inCenter = r>=2&&r<=4&&c>=2&&c<=4;
          const v = (r===-1||r===7||c===-1||c===7) ? 0 // separator
                  : (onBorder || inCenter) ? 1 : 0;
          set(tr+r, tc+c, v);
        }
      }
    }
    finder(0, 0); finder(0, N-7); finder(N-7, 0);

    // Timing
    for (let i = 8; i < N-8; i++) {
      set(6, i, i%2===0 ? 1 : 0);
      set(i, 6, i%2===0 ? 1 : 0);
    }

    // Alignment
    const ap = ALIGN[ver];
    for (const ar of ap) for (const ac of ap) {
      if (fix[ar][ac]) continue;
      for (let r=-2; r<=2; r++) for (let c=-2; c<=2; c++) {
        const d = Math.max(Math.abs(r), Math.abs(c));
        set(ar+r, ac+c, d===2||d===0 ? 1 : 0);
      }
    }

    // Reserve format areas (filled with 0 as placeholder)
    const fmtPos1 = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],
                     [7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
    const fmtPos2 = [[N-1,8],[N-2,8],[N-3,8],[N-4,8],[N-5,8],[N-6,8],[N-7,8],
                     [8,N-8],[8,N-7],[8,N-6],[8,N-5],[8,N-4],[8,N-3],[8,N-2],[8,N-1]];
    [...fmtPos1, ...fmtPos2].forEach(([r,c]) => set(r, c, 0));

    // Dark module (always 1, marked as function)
    set(N-8, 8, 1);

    // Place data
    const bits = [];
    codewords.forEach(b => { for (let i=7; i>=0; i--) bits.push((b>>i)&1); });

    let bi = 0;
    for (let right = N-1; right >= 1; right -= 2) {
      if (right === 6) right = 5; // skip vertical timing
      for (let vert = 0; vert < N; vert++) {
        for (let lr = 0; lr < 2; lr++) {
          const col = right - lr;
          const row = (Math.floor((N-1-right)/2) % 2 === 0) ? N-1-vert : vert;
          if (!fix[row][col]) {
            mat[row][col] = bi < bits.length ? bits[bi++] : 0;
          }
        }
      }
    }

    // Apply mask
    const maskFn = [
      (r,c)=>(r+c)%2===0,        (r,c)=>r%2===0,
      (r,c)=>c%3===0,             (r,c)=>(r+c)%3===0,
      (r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0,
      (r,c)=>(r*c)%2+(r*c)%3===0,(r,c)=>((r*c)%2+(r*c)%3)%2===0,
      (r,c)=>((r+c)%2+(r*c)%3)%2===0,
    ][maskId];

    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++)
        if (!fix[r][c]) mat[r][c] ^= maskFn(r,c) ? 1 : 0;

    // Write format info (AFTER mask applied)
    const fmt = fmtInfo(maskId);
    fmtPos1.forEach(([r,c], i) => {
      const bit = (fmt >> (14-i)) & 1;
      mat[r][c] = bit;
    });
    fmtPos2.forEach(([r,c], i) => {
      const bit = (fmt >> (14-i)) & 1;
      mat[r][c] = bit;
    });

    // Dark module must stay 1 (overwrite any accidental change)
    mat[N-8][8] = 1;

    return mat;
  }

  // ── Penalty score ─────────────────────────────────────────────────────────
  function penalty(mat, N) {
    let p = 0;
    for (let r = 0; r < N; r++) {
      let rn=1, cn=1;
      for (let c = 1; c < N; c++) {
        if (mat[r][c] === mat[r][c-1]) { rn++; if(rn===5)p+=3; else if(rn>5)p++; } else rn=1;
        if (mat[c][r] === mat[c-1][r]) { cn++; if(cn===5)p+=3; else if(cn>5)p++; } else cn=1;
      }
    }
    for (let r=0;r<N-1;r++) for(let c=0;c<N-1;c++)
      if(mat[r][c]===mat[r+1][c]&&mat[r][c]===mat[r][c+1]&&mat[r][c]===mat[r+1][c+1]) p+=3;
    let dark=0; mat.forEach(row=>row.forEach(v=>{if(v===1)dark++;}));
    p += Math.abs(Math.round(dark*100/(N*N)/5)*5 - 50)/5 * 10;
    return p;
  }

  // ── Main encode ───────────────────────────────────────────────────────────
  function encode(text) {
    // UTF-8 encode
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c <= 0x7F) bytes.push(c);
      else if (c <= 0x7FF) bytes.push(0xC0|(c>>6), 0x80|(c&0x3F));
      else bytes.push(0xE0|(c>>12), 0x80|((c>>6)&0x3F), 0x80|(c&0x3F));
    }

    // Select version
    let ver = 1;
    while (ver <= 10 && CAPS[ver][0] < bytes.length + 3) ver++;
    if (ver > 10) throw new Error('Content too long for QR (max ~140 chars)');

    const [totalDC, ecPerBlock, b1, cwB1, b2, cwB2] = CAPS[ver];

    // Build data bitstream
    const bits = [];
    const push = (v, n) => { for(let i=n-1;i>=0;i--) bits.push((v>>i)&1); };
    push(0b0100, 4);        // byte mode indicator
    push(bytes.length, 8);  // character count (8 bits for ver 1-9)
    bytes.forEach(b => push(b, 8));
    push(0, 4);             // terminator
    while (bits.length % 8) bits.push(0); // bit padding
    const PAD = [0xEC, 0x11];
    let pi = 0;
    while (bits.length < totalDC * 8) { push(PAD[pi++ & 1], 8); }

    const dataBytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0; for (let j=0;j<8;j++) b=(b<<1)|(bits[i+j]||0);
      dataBytes.push(b);
    }

    // Split into blocks and compute EC
    const dataBlocks = [], ecBlocks = [];
    let off = 0;
    for (let g = 0; g < 2; g++) {
      const [bc, bLen] = g === 0 ? [b1, cwB1] : [b2, cwB2];
      for (let i = 0; i < bc; i++) {
        const block = dataBytes.slice(off, off + bLen); off += bLen;
        dataBlocks.push(block);
        ecBlocks.push(rsEncode(block, ecPerBlock));
      }
    }

    // Interleave data + EC
    const maxDC = Math.max(...dataBlocks.map(b=>b.length));
    const codewords = [];
    for (let i=0;i<maxDC;i++) dataBlocks.forEach(b=>{if(i<b.length) codewords.push(b[i]);});
    for (let i=0;i<ecPerBlock;i++) ecBlocks.forEach(b=>{if(i<b.length) codewords.push(b[i]);});

    // Try all 8 masks, pick lowest penalty
    let bestMask = 0, bestScore = Infinity, bestMat = null;
    for (let m = 0; m < 8; m++) {
      const mat = buildMatrix(ver, codewords, m);
      const N   = mat.length;
      const s   = penalty(mat, N);
      if (s < bestScore) { bestScore = s; bestMask = m; bestMat = mat; }
    }

    return bestMat;
  }

  return { encode };
})();

// ── qrcode/page/render.js ──
// ── QR Code Render ──

async function renderQrcode(container) {
  let _mode      = 'text';
  let _qrMatrix  = null;
  let _fgColor   = '#000000';
  let _bgColor   = '#ffffff';
  let _logoData  = null;
  let _size      = 300;

  const MODES = [
    { id:'text',  label:'Text'    },
    { id:'url',   label:'URL'     },
    { id:'email', label:'Email'   },
    { id:'wifi',  label:'WiFi'    },
    { id:'vcard', label:'vCard'   },
    { id:'phone', label:'Phone'   },
  ];

  // ── Construire le contenu selon le mode ───────────────────────────────────
  function _buildContent() {
    switch (_mode) {
      case 'text':  return container.querySelector('#qr-text')?.value ?? '';
      case 'url':   return container.querySelector('#qr-url')?.value ?? '';
      case 'phone': return 'tel:' + (container.querySelector('#qr-phone')?.value ?? '');
      case 'email': {
        const to  = container.querySelector('#qr-email-to')?.value ?? '';
        const sub = container.querySelector('#qr-email-sub')?.value ?? '';
        const bod = container.querySelector('#qr-email-body')?.value ?? '';
        return `mailto:${to}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(bod)}`;
      }
      case 'wifi': {
        const ssid = container.querySelector('#qr-wifi-ssid')?.value ?? '';
        const pass = container.querySelector('#qr-wifi-pass')?.value ?? '';
        const enc  = container.querySelector('#qr-wifi-enc')?.value ?? 'WPA';
        return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
      }
      case 'vcard': {
        const name  = container.querySelector('#qr-vc-name')?.value ?? '';
        const org   = container.querySelector('#qr-vc-org')?.value ?? '';
        const tel   = container.querySelector('#qr-vc-tel')?.value ?? '';
        const mail  = container.querySelector('#qr-vc-mail')?.value ?? '';
        const web   = container.querySelector('#qr-vc-web')?.value ?? '';
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nORG:${org}\nTEL:${tel}\nEMAIL:${mail}\nURL:${web}\nEND:VCARD`;
      }
      default: return '';
    }
  }

  // ── Dessiner le QR ────────────────────────────────────────────────────────
  function _render() {
    const content = _buildContent().trim();
    const canvas  = container.querySelector('#qr-canvas');
    if (!canvas) return;
    canvas.width  = _size;
    canvas.height = _size;
    const ctx = canvas.getContext('2d');

    if (!content) {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, _size, _size);
      ctx.fillStyle = '#888';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Enter content to generate', _size/2, _size/2);
      return;
    }

    try {
      _qrMatrix = QR.encode(content);
    } catch (e) {
      ctx.fillStyle = '#fee';
      ctx.fillRect(0, 0, _size, _size);
      ctx.fillStyle = '#c00';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Content too long', _size/2, _size/2);
      return;
    }

    const N    = _qrMatrix.length;
    const cell = Math.floor(_size / (N + 8));
    const off  = Math.floor((_size - cell * N) / 2);

    ctx.fillStyle = _bgColor;
    ctx.fillRect(0, 0, _size, _size);

    ctx.fillStyle = _fgColor;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (_qrMatrix[r][c] === 1) {
          ctx.fillRect(off + c * cell, off + r * cell, cell, cell);
        }
      }
    }

    // Logo overlay
    if (_logoData) {
      const img = new Image();
      img.onload = () => {
        const logoSize = _size * 0.2;
        const lx = (_size - logoSize) / 2;
        const ly = (_size - logoSize) / 2;
        // Fond blanc rond
        ctx.fillStyle = _bgColor;
        ctx.beginPath();
        ctx.roundRect(lx - 4, ly - 4, logoSize + 8, logoSize + 8, 6);
        ctx.fill();
        ctx.drawImage(img, lx, ly, logoSize, logoSize);
        _updatePreview();
      };
      img.src = _logoData;
    }

    _updatePreview();
  }

  function _updatePreview() {
    const canvas  = container.querySelector('#qr-canvas');
    const preview = container.querySelector('#qr-preview');
    if (!canvas || !preview) return;
    preview.src = canvas.toDataURL('image/png');
  }

  // ── Rendu du formulaire selon le mode ─────────────────────────────────────
  function _modeForm() {
    const forms = {
      text:  `<textarea class="input qr-input" id="qr-text" rows="4" placeholder="Enter text…" style="resize:vertical"></textarea>`,
      url:   `<input class="input qr-input" id="qr-url" placeholder="https://example.com" type="url">`,
      phone: `<input class="input qr-input" id="qr-phone" placeholder="+32 123 456 789" type="tel">`,
      email: `
        <input class="input qr-input" id="qr-email-to"   placeholder="To: address@email.com" style="margin-bottom:6px">
        <input class="input qr-input" id="qr-email-sub"  placeholder="Subject" style="margin-bottom:6px">
        <textarea class="input qr-input" id="qr-email-body" rows="3" placeholder="Body…" style="resize:vertical"></textarea>`,
      wifi:  `
        <input class="input qr-input" id="qr-wifi-ssid" placeholder="Network name (SSID)" style="margin-bottom:6px">
        <input class="input qr-input" id="qr-wifi-pass" placeholder="Password" type="password" style="margin-bottom:6px">
        <select class="input qr-input" id="qr-wifi-enc" style="height:32px">
          <option value="WPA">WPA/WPA2</option>
          <option value="WEP">WEP</option>
          <option value="nopass">Open (no password)</option>
        </select>`,
      vcard: `
        <input class="input qr-input" id="qr-vc-name" placeholder="Full name" style="margin-bottom:6px">
        <input class="input qr-input" id="qr-vc-org"  placeholder="Organization" style="margin-bottom:6px">
        <input class="input qr-input" id="qr-vc-tel"  placeholder="Phone" type="tel" style="margin-bottom:6px">
        <input class="input qr-input" id="qr-vc-mail" placeholder="Email" type="email" style="margin-bottom:6px">
        <input class="input qr-input" id="qr-vc-web"  placeholder="Website" type="url">`,
    };
    return forms[_mode] ?? '';
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function _exportPNG() {
    const canvas = container.querySelector('#qr-canvas');
    if (!canvas || !_qrMatrix) return;
    const a = document.createElement('a');
    a.download = 'qrcode.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  function _exportSVG() {
    if (!_qrMatrix) return;
    const N    = _qrMatrix.length;
    const cell = 10;
    const S    = N * cell;
    let paths  = '';
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (_qrMatrix[r][c] === 1) {
          paths += `<rect x="${c*cell}" y="${r*cell}" width="${cell}" height="${cell}" fill="${_fgColor}"/>`;
        }
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" fill="${_bgColor}"/>${paths}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type:'image/svg+xml' }));
    const a   = document.createElement('a');
    a.download = 'qrcode.svg'; a.href = url; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Shell ─────────────────────────────────────────────────────────────────
  function renderShell() {
    container.innerHTML = `
      <div style="display:flex;height:calc(100vh - 36px);overflow:hidden">

        <!-- Panneau gauche : options -->
        <div style="width:280px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;background:var(--bg-surface);overflow-y:auto">

          <!-- Mode tabs -->
          <div style="padding:10px;border-bottom:1px solid var(--border)">
            <div style="font-size:10px;color:var(--text-tertiary);margin-bottom:6px;letter-spacing:.5px">TYPE</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${MODES.map(m => `
                <button class="btn btn-sm qr-mode-btn ${_mode===m.id?'btn-primary':'btn-secondary'}" data-mode="${m.id}" style="font-size:11px">
                  ${m.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Formulaire -->
          <div id="qr-form" style="padding:12px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:6px">
            ${_modeForm()}
          </div>

          <!-- Style -->
          <div style="padding:12px;border-bottom:1px solid var(--border)">
            <div style="font-size:10px;color:var(--text-tertiary);margin-bottom:8px;letter-spacing:.5px">STYLE</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;align-items:center;gap:8px">
                <label style="font-size:12px;color:var(--text-secondary);width:80px">Foreground</label>
                <input type="color" id="qr-fg" value="${_fgColor}" style="width:40px;height:28px;border:1px solid var(--border);border-radius:4px;cursor:pointer;background:none">
                <span id="qr-fg-val" style="font-size:11px;color:var(--text-tertiary);font-family:var(--font-mono)">${_fgColor}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <label style="font-size:12px;color:var(--text-secondary);width:80px">Background</label>
                <input type="color" id="qr-bg" value="${_bgColor}" style="width:40px;height:28px;border:1px solid var(--border);border-radius:4px;cursor:pointer;background:none">
                <span id="qr-bg-val" style="font-size:11px;color:var(--text-tertiary);font-family:var(--font-mono)">${_bgColor}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <label style="font-size:12px;color:var(--text-secondary);width:80px">Size (px)</label>
                <input type="range" id="qr-size" min="200" max="600" step="50" value="${_size}" style="flex:1;accent-color:var(--blue)">
                <span id="qr-size-val" style="font-size:11px;color:var(--text-tertiary);font-family:var(--font-mono);min-width:36px">${_size}px</span>
              </div>
            </div>
          </div>

          <!-- Logo overlay -->
          <div style="padding:12px;border-bottom:1px solid var(--border)">
            <div style="font-size:10px;color:var(--text-tertiary);margin-bottom:8px;letter-spacing:.5px">LOGO OVERLAY</div>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn btn-secondary btn-sm" id="qr-logo-btn" style="font-size:11px">
                ${icon('plus','12px')} Add image…
              </button>
              <button class="btn btn-ghost btn-sm" id="qr-logo-clear" style="font-size:11px;display:${_logoData?'':'none'}">Remove</button>
              <input type="file" id="qr-logo-input" accept="image/*" style="display:none">
            </div>
          </div>

          <!-- Présets de couleur -->
          <div style="padding:12px">
            <div style="font-size:10px;color:var(--text-tertiary);margin-bottom:8px;letter-spacing:.5px">PRESETS</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${[
                ['#000000','#ffffff'],['#ffffff','#000000'],
                ['#4285F4','#ffffff'],['#ffffff','#4285F4'],
                ['#34A853','#ffffff'],['#EA4335','#ffffff'],
                ['#0f1117','#4285F4'],['#1a1a2e','#e94560'],
              ].map(([fg,bg]) => `
                <div class="qr-preset" data-fg="${fg}" data-bg="${bg}" title="${fg} / ${bg}" style="
                  width:28px;height:28px;border-radius:6px;cursor:pointer;
                  background:linear-gradient(135deg,${fg} 50%,${bg} 50%);
                  border:1.5px solid var(--border-strong);
                "></div>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- Zone droite : preview + export -->
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
          <div style="height:44px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;padding:0 16px;background:var(--bg-surface);flex-shrink:0">
            <span style="font-size:13px;font-weight:500;color:var(--text-secondary);flex:1">QR Code Preview</span>
            <button class="btn btn-secondary btn-sm" id="qr-exp-png" style="font-size:11px">${icon('export','12px')} PNG</button>
            <button class="btn btn-secondary btn-sm" id="qr-exp-svg" style="font-size:11px">SVG</button>
          </div>

          <div style="flex:1;display:flex;align-items:center;justify-content:center;background:var(--bg-base);position:relative">
            <!-- Fond damier pour voir la transparence -->
            <div style="position:relative">
              <div style="
                position:absolute;inset:0;border-radius:8px;
                background-image:repeating-conic-gradient(#ccc 0% 25%,#eee 0% 50%);
                background-size:12px 12px;opacity:.3;
              "></div>
              <canvas id="qr-canvas" style="display:none"></canvas>
              <img id="qr-preview" style="display:block;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.3);max-width:90%;max-height:calc(100vh - 160px)" alt="QR Code">
            </div>
          </div>

          <div style="height:22px;border-top:1px solid var(--border);padding:0 16px;display:flex;align-items:center;font-size:10px;color:var(--text-tertiary);background:var(--bg-surface)">
            <span id="qr-info">Enter content to generate</span>
          </div>
        </div>
      </div>
    `;

    _bindEvents();
    _render();
  }

  function _bindEvents() {
    // Mode switch
    container.querySelectorAll('.qr-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _mode = btn.dataset.mode;
        // Reconstruire le formulaire
        const form = container.querySelector('#qr-form');
        if (form) { form.innerHTML = _modeForm(); _bindInputEvents(); }
        container.querySelectorAll('.qr-mode-btn').forEach(b => {
          b.className = `btn btn-sm qr-mode-btn ${_mode===b.dataset.mode?'btn-primary':'btn-secondary'}`;
          b.style.fontSize = '11px';
        });
        _render();
      });
    });

    _bindInputEvents();

    // Colors
    container.querySelector('#qr-fg')?.addEventListener('input', e => {
      _fgColor = e.target.value;
      const v = container.querySelector('#qr-fg-val');
      if (v) v.textContent = _fgColor;
      _render();
    });
    container.querySelector('#qr-bg')?.addEventListener('input', e => {
      _bgColor = e.target.value;
      const v = container.querySelector('#qr-bg-val');
      if (v) v.textContent = _bgColor;
      _render();
    });

    // Size
    container.querySelector('#qr-size')?.addEventListener('input', e => {
      _size = +e.target.value;
      const v = container.querySelector('#qr-size-val');
      if (v) v.textContent = _size + 'px';
      _render();
    });

    // Présets
    container.querySelectorAll('.qr-preset').forEach(el => {
      el.addEventListener('click', () => {
        _fgColor = el.dataset.fg;
        _bgColor = el.dataset.bg;
        const fg = container.querySelector('#qr-fg');
        const bg = container.querySelector('#qr-bg');
        if (fg) { fg.value = _fgColor; container.querySelector('#qr-fg-val').textContent = _fgColor; }
        if (bg) { bg.value = _bgColor; container.querySelector('#qr-bg-val').textContent = _bgColor; }
        _render();
      });
    });

    // Logo
    container.querySelector('#qr-logo-btn')?.addEventListener('click', () =>
      container.querySelector('#qr-logo-input')?.click());
    container.querySelector('#qr-logo-input')?.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        _logoData = ev.target.result;
        const clr = container.querySelector('#qr-logo-clear');
        if (clr) clr.style.display = '';
        _render();
      };
      reader.readAsDataURL(file);
    });
    container.querySelector('#qr-logo-clear')?.addEventListener('click', () => {
      _logoData = null;
      const clr = container.querySelector('#qr-logo-clear');
      if (clr) clr.style.display = 'none';
      _render();
    });

    // Export
    container.querySelector('#qr-exp-png')?.addEventListener('click', _exportPNG);
    container.querySelector('#qr-exp-svg')?.addEventListener('click', _exportSVG);
  }

  function _bindInputEvents() {
    let _debounce = null;
    container.querySelectorAll('.qr-input').forEach(el => {
      el.addEventListener('input', () => {
        clearTimeout(_debounce);
        _debounce = setTimeout(() => {
          _render();
          const info = container.querySelector('#qr-info');
          const content = _buildContent();
          if (info) info.textContent = content
            ? `${content.length} chars · ${_qrMatrix ? _qrMatrix.length + '×' + _qrMatrix.length + ' modules' : '—'}`
            : 'Enter content to generate';
        }, 200);
      });
      el.addEventListener('change', () => { clearTimeout(_debounce); _render(); });
    });
  }

  renderShell();
}

// ── Expose renderFn ──
window["renderQrcode"] = renderQrcode;
