// ── Modulo Module: Perlin Noise (perlin) v1.0.0 ──
// Author: Modulo Team
// Built: 2026-04-03T01:52:46.025Z
// renderFn: renderPerlin
// ── perlin/script/gif.js ──
// ── GIF Encoder minimal (sans dépendance) ──
// Basé sur l'algorithme LZW + GIF89a spec

function _gifEncode(frames, width, height, delay) {
  // frames : array of Uint8Array [r,g,b, r,g,b, ...]
  // delay  : en centisecondes (100 = 1s)

  const MAX_COLORS = 256;

  // ─── Quantification couleurs (médiane coupée simplifiée) ──────────────────
  function quantize(rgbData) {
    // Collecter toutes les couleurs uniques
    const colorMap = new Map();
    for (let i = 0; i < rgbData.length; i += 3) {
      // Réduire à 6 bits par canal pour diminuer le nb de couleurs
      const r = rgbData[i]   & 0xFC;
      const g = rgbData[i+1] & 0xFC;
      const b = rgbData[i+2] & 0xFC;
      const key = (r << 16) | (g << 8) | b;
      colorMap.set(key, (colorMap.get(key) ?? 0) + 1);
    }
    // Trier par fréquence, garder les 256 plus fréquentes
    const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]);
    const palette = sorted.slice(0, MAX_COLORS).map(([key]) => [
      (key >> 16) & 0xFF,
      (key >>  8) & 0xFF,
       key        & 0xFF,
    ]);
    // Compléter à 256
    while (palette.length < MAX_COLORS) palette.push([0, 0, 0]);

    // Construire index de lookup
    const lookup = new Map();
    palette.forEach(([r,g,b], i) => lookup.set((r & 0xFC) << 16 | (g & 0xFC) << 8 | (b & 0xFC), i));

    return { palette, lookup };
  }

  function mapPixels(rgbData, lookup) {
    const indices = new Uint8Array(width * height);
    for (let i = 0; i < rgbData.length / 3; i++) {
      const r = rgbData[i*3]   & 0xFC;
      const g = rgbData[i*3+1] & 0xFC;
      const b = rgbData[i*3+2] & 0xFC;
      const key = (r << 16) | (g << 8) | b;
      // Chercher couleur la plus proche si pas trouvée exactement
      indices[i] = lookup.get(key) ?? _gifFindNearest(r, g, b, lookup);
    }
    return indices;
  }

  function _gifFindNearest(r, g, b, lookup) {
    let best = 0, bestDist = Infinity;
    for (const [key, idx] of lookup) {
      const dr = ((key >> 16) & 0xFF) - r;
      const dg = ((key >>  8) & 0xFF) - g;
      const db =  (key        & 0xFF) - b;
      const d  = dr*dr + dg*dg + db*db;
      if (d < bestDist) { bestDist = d; best = idx; }
    }
    return best;
  }

  // ─── LZW compression ──────────────────────────────────────────────────────
  function lzwCompress(indices, minCodeSize) {
    const clearCode = 1 << minCodeSize;
    const eofCode   = clearCode + 1;
    const table     = new Map();
    let nextCode = eofCode + 1;
    let codeSize = minCodeSize + 1;
    const bits   = [];

    function emit(code) {
      for (let i = 0; i < codeSize; i++) {
        bits.push((code >> i) & 1);
      }
    }

    // Reset table
    function resetTable() {
      table.clear();
      for (let i = 0; i < clearCode; i++) table.set(String(i), i);
      nextCode = eofCode + 1;
      codeSize = minCodeSize + 1;
    }

    resetTable();
    emit(clearCode);

    let buffer = String(indices[0]);
    for (let i = 1; i < indices.length; i++) {
      const next = buffer + ',' + indices[i];
      if (table.has(next)) {
        buffer = next;
      } else {
        emit(table.get(buffer));
        if (nextCode < 4096) {
          table.set(next, nextCode++);
          if (nextCode > (1 << codeSize)) codeSize = Math.min(codeSize + 1, 12);
        } else {
          emit(clearCode);
          resetTable();
        }
        buffer = String(indices[i]);
      }
    }
    emit(table.get(buffer));
    emit(eofCode);

    // Bits → bytes
    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8 && i+j < bits.length; j++) {
        byte |= bits[i+j] << j;
      }
      bytes.push(byte);
    }
    return new Uint8Array(bytes);
  }

  // ─── Assemblage GIF ───────────────────────────────────────────────────────
  const chunks = [];

  function u16le(n) { return [n & 0xFF, (n >> 8) & 0xFF]; }
  function push(...args) { args.forEach(a => chunks.push(a instanceof Array ? a : [a])); }

  // Header GIF89a
  chunks.push([0x47,0x49,0x46,0x38,0x39,0x61]); // GIF89a

  // Logical Screen Descriptor
  chunks.push([...u16le(width), ...u16le(height),
    0xF7, // Global Color Table Flag + color resolution + size (256 colors)
    0x00, // Background color index
    0x00, // Pixel aspect ratio
  ]);

  // Quantifier avec les pixels du premier frame
  const allPixels = new Uint8Array(frames[0].length);
  // Combiner tous les frames pour la palette globale
  let combinedSample = frames[0];
  const { palette, lookup } = quantize(combinedSample);

  // Global Color Table
  const gct = new Uint8Array(256 * 3);
  palette.forEach(([r,g,b], i) => { gct[i*3]=r; gct[i*3+1]=g; gct[i*3+2]=b; });
  chunks.push(Array.from(gct));

  // Netscape Application Extension (animation loop)
  chunks.push([
    0x21, 0xFF, 0x0B,
    0x4E,0x45,0x54,0x53,0x43,0x41,0x50,0x45,0x32,0x2E,0x30, // NETSCAPE2.0
    0x03, 0x01,
    0x00, 0x00, // loop count (0 = infini)
    0x00,
  ]);

  // Frames
  for (const rgbData of frames) {
    const indices = mapPixels(rgbData, lookup);
    const minCodeSize = 8; // pour 256 couleurs
    const lzw = lzwCompress(indices, minCodeSize);

    // Graphic Control Extension
    chunks.push([
      0x21, 0xF9, 0x04,
      0x04, // dispose = do not dispose
      ...u16le(delay),
      0x00, // transparent color index
      0x00,
    ]);

    // Image Descriptor
    chunks.push([
      0x2C,
      ...u16le(0), ...u16le(0), // position
      ...u16le(width), ...u16le(height),
      0x00, // no local color table
    ]);

    // Image Data
    chunks.push([minCodeSize]);
    // Sub-blocks de 255 bytes max
    let offset = 0;
    while (offset < lzw.length) {
      const blockSize = Math.min(255, lzw.length - offset);
      chunks.push([blockSize]);
      chunks.push(Array.from(lzw.slice(offset, offset + blockSize)));
      offset += blockSize;
    }
    chunks.push([0x00]); // Block terminator
  }

  // Trailer
  chunks.push([0x3B]);

  // Assembler
  const totalSize = chunks.reduce((s, c) => s + c.length, 0);
  const result    = new Uint8Array(totalSize);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

// ── perlin/script/perlin.js ──
// ── Perlin Noise Engine ──
// Adapté du script CLI original pour le contexte browser/canvas

// ─── PRNG déterministe (mulberry32) ──────────────────────────────────────────
function _perlinPRNG(seed) {
  let s = seed >>> 0;
  return function() {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─── Table de permutation ─────────────────────────────────────────────────────
function _perlinBuildPerm(rand) {
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
  }
  return p.concat(p);
}

// ─── Fade / Lerp / Grad ───────────────────────────────────────────────────────
function _perlinFade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function _perlinLerp(a, b, t) { return a + t * (b - a); }
function _perlinGrad(hash, x, y) {
  switch (hash & 3) {
    case 0: return  x + y;
    case 1: return -x + y;
    case 2: return  x - y;
    default: return -x - y;
  }
}

// ─── Bruit de Perlin 2D ───────────────────────────────────────────────────────
function _perlinNoise2D(perm, x, y) {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u  = _perlinFade(xf);
  const v  = _perlinFade(yf);
  const aa = perm[perm[xi]     + yi];
  const ab = perm[perm[xi]     + yi + 1];
  const ba = perm[perm[xi + 1] + yi];
  const bb = perm[perm[xi + 1] + yi + 1];
  return _perlinLerp(
    _perlinLerp(_perlinGrad(aa, xf, yf),     _perlinGrad(ba, xf - 1, yf),     u),
    _perlinLerp(_perlinGrad(ab, xf, yf - 1), _perlinGrad(bb, xf - 1, yf - 1), u),
    v
  );
}

// ─── Octaves (fBm — Fractal Brownian Motion) ──────────────────────────────────
function _perlinFbm(perm, x, y, octaves, lacunarity, gain) {
  let val = 0, amp = 1, freq = 1, max = 0;
  for (let o = 0; o < octaves; o++) {
    val += _perlinNoise2D(perm, x * freq, y * freq) * amp;
    max += amp;
    amp  *= gain;
    freq *= lacunarity;
  }
  return val / max; // normalisé [-1, 1] environ
}

// ─── Génération d'un frame (retourne Float32Array normalisé [0,1]) ────────────
function _perlinGenerateFrame(cfg, offsetZ) {
  const { width, height, scale, seed, octaves, lacunarity, gain } = cfg;
  const rand = _perlinPRNG(seed + (offsetZ | 0));
  const perm = _perlinBuildPerm(rand);
  const raw  = new Float32Array(width * height);
  let min = Infinity, max = -Infinity;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x / width)  * scale;
      const ny = (y / height) * scale;
      const v  = octaves > 1
        ? _perlinFbm(perm, nx + offsetZ, ny + offsetZ, octaves, lacunarity, gain)
        : _perlinNoise2D(perm, nx + offsetZ, ny + offsetZ);
      raw[y * width + x] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  // Normaliser [0, 1]
  const range = max - min || 1;
  for (let i = 0; i < raw.length; i++) {
    raw[i] = (raw[i] - min) / range;
  }
  return raw;
}

// ─── Appliquer une colormap ───────────────────────────────────────────────────
const PERLIN_COLORMAPS = {
  grayscale: (t) => [t*255|0, t*255|0, t*255|0],
  fire: (t) => {
    const r = Math.min(255, t * 2 * 255) | 0;
    const g = Math.max(0, (t * 2 - 1) * 255) | 0;
    const b = 0;
    return [r, g, b];
  },
  ocean: (t) => {
    const r = (t * 30) | 0;
    const g = (50 + t * 100) | 0;
    const b = (100 + t * 155) | 0;
    return [r, g, b];
  },
  forest: (t) => {
    const r = (t * 80) | 0;
    const g = (80 + t * 120) | 0;
    const b = (t * 60) | 0;
    return [r, g, b];
  },
  magma: (t) => {
    // Approximation de la colormap magma
    const r = Math.min(255, t < 0.5 ? t * 2 * 120 : 120 + (t - 0.5) * 2 * 135) | 0;
    const g = (t * t * 180) | 0;
    const b = Math.min(255, t < 0.3 ? t * 2 * 200 : Math.max(0, 200 - (t - 0.3) * 2 * 200)) | 0;
    return [r, g, b];
  },
  neon: (t) => {
    const h = t * 360;
    return _perlinHslToRgb(h, 100, 50 + t * 20);
  },
  custom: (t, c1, c2) => {
    // Interpolation entre deux couleurs hex
    const r = (c1[0] + (c2[0] - c1[0]) * t) | 0;
    const g = (c1[1] + (c2[1] - c1[1]) * t) | 0;
    const b = (c1[2] + (c2[2] - c1[2]) * t) | 0;
    return [r, g, b];
  },
};

function _perlinHslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [(f(0)*255)|0, (f(8)*255)|0, (f(4)*255)|0];
}

function _perlinHexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return [r, g, b];
}

// ─── Dessiner un frame sur un canvas ─────────────────────────────────────────
function _perlinDrawFrame(canvas, raw, cfg) {
  const { width, height, colormap, color1, color2 } = cfg;
  const ctx  = canvas.getContext('2d');
  const img  = ctx.createImageData(width, height);
  const data = img.data;
  const cm   = PERLIN_COLORMAPS[colormap] ?? PERLIN_COLORMAPS.grayscale;
  const c1   = color1 ? _perlinHexToRgb(color1) : [0,0,0];
  const c2   = color2 ? _perlinHexToRgb(color2) : [255,255,255];

  for (let i = 0; i < raw.length; i++) {
    const [r, g, b] = colormap === 'custom' ? cm(raw[i], c1, c2) : cm(raw[i]);
    const idx = i * 4;
    data[idx]   = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// ── perlin/page/render.js ──
// ── Perlin Noise Render ──

async function renderPerlin(container) {

  // ── État ──────────────────────────────────────────────────────────────────
  let _cfg = {
    width:      256,
    height:     256,
    scale:      4,
    seed:       Math.floor(Math.random() * 65536),
    octaves:    1,
    lacunarity: 2.0,
    gain:       0.5,
    colormap:   'grayscale',
    color1:     '#000000',
    color2:     '#ffffff',
    // GIF
    gifFrames:  16,
    gifDelay:   8,   // centisecondes
    gifSpeed:   0.08,
    // Spritesheet
    ssColumns:  4,
    ssRows:     4,
    ssTileW:    64,
    ssTileH:    64,
    ssFrames:   16,
    ssSpeed:    0.1,
  };
  let _mode = 'png'; // 'png' | 'gif' | 'spritesheet'
  let _generating = false;

  // ── Shell HTML ────────────────────────────────────────────────────────────
  function renderShell() {
    container.innerHTML = `
      <div class="page" style="max-width:none;padding:0;display:flex;height:calc(100vh - 36px);overflow:hidden">

        <!-- Panneau gauche : paramètres -->
        <div style="width:280px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;background:var(--bg-surface);display:flex;flex-direction:column">

          <!-- Mode tabs -->
          <div style="display:flex;border-bottom:1px solid var(--border)">
            ${['png','gif','spritesheet'].map(m => `
              <button class="pn-tab" data-mode="${m}" style="
                flex:1;padding:10px 4px;font-size:11px;font-weight:500;
                border:none;background:${_mode===m?'var(--bg-active)':'transparent'};
                color:${_mode===m?'var(--blue-light)':'var(--text-secondary)'};
                border-bottom:2px solid ${_mode===m?'var(--blue)':'transparent'};
                cursor:pointer;letter-spacing:.3px
              ">${m === 'png' ? '🖼 PNG' : m === 'gif' ? '🎞 GIF' : '🗂 Sprite'}</button>
            `).join('')}
          </div>

          <div style="padding:14px;display:flex;flex-direction:column;gap:12px;flex:1">

            <!-- Paramètres communs -->
            <div style="font-size:10px;font-weight:600;color:var(--text-tertiary);letter-spacing:.6px">BRUIT</div>

            ${_field('Seed', 'seed', 'number', _cfg.seed, { min:0, max:99999 })}
            <button class="btn btn-secondary btn-sm" id="pn-random-seed" style="font-size:11px">🎲 Seed aléatoire</button>
            ${_field('Scale', 'scale', 'range', _cfg.scale, { min:0.5, max:20, step:0.5 })}
            ${_field('Octaves', 'octaves', 'range', _cfg.octaves, { min:1, max:8, step:1 })}
            ${_field('Lacunarité', 'lacunarity', 'range', _cfg.lacunarity, { min:1.5, max:4, step:0.1 })}
            ${_field('Gain', 'gain', 'range', _cfg.gain, { min:0.1, max:0.9, step:0.05 })}

            <div style="font-size:10px;font-weight:600;color:var(--text-tertiary);letter-spacing:.6px;margin-top:4px">IMAGE</div>

            ${_field('Largeur (px)', 'width', 'select', _cfg.width, { options:[64,128,256,512,1024] })}
            ${_field('Hauteur (px)', 'height', 'select', _cfg.height, { options:[64,128,256,512,1024] })}

            <div style="font-size:10px;font-weight:600;color:var(--text-tertiary);letter-spacing:.6px;margin-top:4px">COULEUR</div>

            <div>
              <label style="font-size:11px;color:var(--text-secondary);display:block;margin-bottom:4px">Colormap</label>
              <select class="input pn-field" data-key="colormap" style="height:30px;font-size:12px">
                ${Object.keys(PERLIN_COLORMAPS).map(c => `<option value="${c}" ${_cfg.colormap===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
              </select>
            </div>

            <div id="pn-custom-colors" style="display:${_cfg.colormap==='custom'?'flex':'none'};gap:8px">
              <div style="flex:1">
                <label style="font-size:10px;color:var(--text-tertiary)">Couleur sombre</label>
                <input type="color" class="pn-field" data-key="color1" value="${_cfg.color1}" style="width:100%;height:30px;border:1px solid var(--border);border-radius:4px;cursor:pointer;background:none">
              </div>
              <div style="flex:1">
                <label style="font-size:10px;color:var(--text-tertiary)">Couleur claire</label>
                <input type="color" class="pn-field" data-key="color2" value="${_cfg.color2}" style="width:100%;height:30px;border:1px solid var(--border);border-radius:4px;cursor:pointer;background:none">
              </div>
            </div>

            <!-- Paramètres spécifiques au mode -->
            <div id="pn-mode-params">
              ${_modeParams()}
            </div>

            <!-- Générer -->
            <button class="btn btn-primary" id="pn-generate" style="margin-top:auto;font-size:13px;height:40px">
              ⚡ Générer
            </button>
            <button class="btn btn-secondary" id="pn-download" style="font-size:12px;display:none">
              ${icon('download','14px')} Télécharger
            </button>
          </div>
        </div>

        <!-- Zone de prévisualisation -->
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg-base)">

          <!-- Toolbar aperçu -->
          <div style="height:40px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;padding:0 16px;background:var(--bg-surface);flex-shrink:0">
            <span style="font-size:12px;color:var(--text-secondary)" id="pn-preview-label">Aperçu</span>
            <div style="flex:1"></div>
            <span id="pn-info" style="font-size:11px;color:var(--text-tertiary)"></span>
          </div>

          <!-- Canvas / Preview -->
          <div style="flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:24px;position:relative">
            <div id="pn-progress" style="display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center">
              <div class="spinner" style="width:32px;height:32px;margin:0 auto 12px"></div>
              <div style="font-size:13px;color:var(--text-secondary)" id="pn-progress-text">Génération…</div>
            </div>
            <canvas id="pn-canvas" style="image-rendering:pixelated;max-width:100%;max-height:100%;box-shadow:0 4px 24px rgba(0,0,0,.4);display:block"></canvas>
          </div>

          <!-- Status -->
          <div style="height:22px;border-top:1px solid var(--border);padding:0 16px;display:flex;align-items:center;font-size:10px;color:var(--text-tertiary);background:var(--bg-surface)">
            <span id="pn-status">Configurez les paramètres et cliquez sur Générer.</span>
          </div>
        </div>
      </div>
    `;

    _bindEvents();
    // Générer un aperçu initial
    setTimeout(() => _generate(true), 100);
  }

  // ── Helper : field ────────────────────────────────────────────────────────
  function _field(label, key, type, value, opts = {}) {
    if (type === 'range') {
      return `
        <div>
          <label style="font-size:11px;color:var(--text-secondary);display:flex;justify-content:space-between;margin-bottom:4px">
            <span>${label}</span>
            <span id="pn-val-${key}" style="font-family:var(--font-mono);color:var(--text-primary)">${value}</span>
          </label>
          <input type="range" class="pn-field" data-key="${key}"
            min="${opts.min}" max="${opts.max}" step="${opts.step ?? 1}" value="${value}"
            style="width:100%;accent-color:var(--blue)">
        </div>`;
    }
    if (type === 'select') {
      return `
        <div>
          <label style="font-size:11px;color:var(--text-secondary);display:block;margin-bottom:4px">${label}</label>
          <select class="input pn-field" data-key="${key}" style="height:30px;font-size:12px">
            ${opts.options.map(o => `<option value="${o}" ${value==o?'selected':''}>${o}px</option>`).join('')}
          </select>
        </div>`;
    }
    return `
      <div>
        <label style="font-size:11px;color:var(--text-secondary);display:block;margin-bottom:4px">${label}</label>
        <input type="${type}" class="input pn-field" data-key="${key}" value="${value}"
          ${opts.min!==undefined?`min="${opts.min}"`:''}
          ${opts.max!==undefined?`max="${opts.max}"`:''}
          style="height:30px;font-size:12px">
      </div>`;
  }

  // ── Paramètres spécifiques au mode ────────────────────────────────────────
  function _modeParams() {
    if (_mode === 'gif') return `
      <div style="font-size:10px;font-weight:600;color:var(--text-tertiary);letter-spacing:.6px;margin-top:4px">GIF ANIMÉ</div>
      ${_field('Nombre de frames', 'gifFrames', 'select', _cfg.gifFrames, { options:[4,8,16,24,32] })}
      ${_field('Vitesse (déplacement/frame)', 'gifSpeed', 'range', _cfg.gifSpeed, { min:0.01, max:0.5, step:0.01 })}
      ${_field('Délai entre frames (cs)', 'gifDelay', 'range', _cfg.gifDelay, { min:1, max:50, step:1 })}
    `;
    if (_mode === 'spritesheet') return `
      <div style="font-size:10px;font-weight:600;color:var(--text-tertiary);letter-spacing:.6px;margin-top:4px">SPRITESHEET</div>
      ${_field('Frames total', 'ssFrames', 'select', _cfg.ssFrames, { options:[4,8,16,24,32,48,64] })}
      ${_field('Colonnes', 'ssColumns', 'range', _cfg.ssColumns, { min:1, max:16, step:1 })}
      ${_field('Largeur tile (px)', 'ssTileW', 'select', _cfg.ssTileW, { options:[32,64,128,256] })}
      ${_field('Hauteur tile (px)', 'ssTileH', 'select', _cfg.ssTileH, { options:[32,64,128,256] })}
      ${_field('Vitesse animation', 'ssSpeed', 'range', _cfg.ssSpeed, { min:0.01, max:0.5, step:0.01 })}
    `;
    return ''; // PNG — pas de params supplémentaires
  }

  // ── Génération ────────────────────────────────────────────────────────────
  async function _generate(preview = false) {
    if (_generating) return;
    _generating = true;

    const canvas   = container.querySelector('#pn-canvas');
    const progress = container.querySelector('#pn-progress');
    const progText = container.querySelector('#pn-progress-text');
    const status   = container.querySelector('#pn-status');
    const infoEl   = container.querySelector('#pn-info');
    const dlBtn    = container.querySelector('#pn-download');

    if (progress) progress.style.display = 'block';
    if (canvas)   canvas.style.opacity   = '0.3';
    if (dlBtn)    dlBtn.style.display    = 'none';

    // Laisser le DOM se mettre à jour
    await new Promise(r => setTimeout(r, 20));

    try {
      const t0 = performance.now();

      if (_mode === 'png') {
        const cfg    = { ..._cfg };
        const w      = preview ? Math.min(cfg.width, 256) : cfg.width;
        const h      = preview ? Math.min(cfg.height, 256) : cfg.height;
        canvas.width  = w;
        canvas.height = h;
        const raw = _perlinGenerateFrame({ ...cfg, width: w, height: h }, 0);
        _perlinDrawFrame(canvas, raw, { ...cfg, width: w, height: h });

        if (status) status.textContent = `PNG ${w}×${h} — seed ${cfg.seed} — scale ${cfg.scale}`;
        if (infoEl) infoEl.textContent = `${w}×${h}px`;

        // Stocker pour export
        container._exportMode = 'png';
        container._exportCanvas = canvas;

      } else if (_mode === 'gif') {
        const cfg      = { ..._cfg };
        const nFrames  = cfg.gifFrames;
        const w        = preview ? Math.min(cfg.width, 128) : cfg.width;
        const h        = preview ? Math.min(cfg.height, 128) : cfg.height;
        const speed    = cfg.gifSpeed;
        const frameCfg = { ...cfg, width: w, height: h };

        // Générer tous les frames
        const rawFrames = [];
        for (let i = 0; i < nFrames; i++) {
          if (progText) progText.textContent = `Frame ${i+1} / ${nFrames}…`;
          await new Promise(r => setTimeout(r, 0));
          const raw = _perlinGenerateFrame(frameCfg, i * speed);
          rawFrames.push(raw);
        }

        // Encoder GIF
        if (progText) progText.textContent = 'Encodage GIF…';
        await new Promise(r => setTimeout(r, 0));

        // Convertir en RGB arrays
        const cm = PERLIN_COLORMAPS[cfg.colormap] ?? PERLIN_COLORMAPS.grayscale;
        const c1 = cfg.color1 ? _perlinHexToRgb(cfg.color1) : [0,0,0];
        const c2 = cfg.color2 ? _perlinHexToRgb(cfg.color2) : [255,255,255];
        const rgbFrames = rawFrames.map(raw => {
          const rgb = new Uint8Array(w * h * 3);
          for (let i = 0; i < raw.length; i++) {
            const [r,g,b] = cfg.colormap === 'custom' ? cm(raw[i], c1, c2) : cm(raw[i]);
            rgb[i*3] = r; rgb[i*3+1] = g; rgb[i*3+2] = b;
          }
          return rgb;
        });

        const gifData = _gifEncode(rgbFrames, w, h, cfg.gifDelay);
        container._exportMode = 'gif';
        container._exportGifData = gifData;

        // Prévisualiser : dessiner le premier frame sur canvas
        canvas.width  = w;
        canvas.height = h;
        _perlinDrawFrame(canvas, rawFrames[0], { ...cfg, width: w, height: h });

        // Animer la prévisualisation
        let frameIdx = 0;
        clearInterval(container._gifInterval);
        container._gifInterval = setInterval(() => {
          if (!container._generating) {
            _perlinDrawFrame(canvas, rawFrames[frameIdx % rawFrames.length], { ...cfg, width: w, height: h });
            frameIdx++;
          }
        }, cfg.gifDelay * 10);

        if (status) status.textContent = `GIF ${w}×${h} — ${nFrames} frames — delay ${cfg.gifDelay}cs`;
        if (infoEl) infoEl.textContent = `${w}×${h}px · ${nFrames}f · ${(gifData.length/1024).toFixed(1)}KB`;

      } else if (_mode === 'spritesheet') {
        const cfg     = { ..._cfg };
        const cols    = cfg.ssColumns;
        const nFrames = cfg.ssFrames;
        const rows    = Math.ceil(nFrames / cols);
        const tileW   = cfg.ssTileW;
        const tileH   = cfg.ssTileH;
        const speed   = cfg.ssSpeed;

        const ssW = cols * tileW;
        const ssH = rows * tileH;

        canvas.width  = ssW;
        canvas.height = ssH;

        const ctx = canvas.getContext('2d');
        const tileCfg = { ...cfg, width: tileW, height: tileH };

        for (let i = 0; i < nFrames; i++) {
          if (progText) progText.textContent = `Tile ${i+1} / ${nFrames}…`;
          await new Promise(r => setTimeout(r, 0));

          const raw = _perlinGenerateFrame(tileCfg, i * speed);
          const tileCanvas = document.createElement('canvas');
          tileCanvas.width  = tileW;
          tileCanvas.height = tileH;
          _perlinDrawFrame(tileCanvas, raw, tileCfg);

          const col = i % cols;
          const row = Math.floor(i / cols);
          ctx.drawImage(tileCanvas, col * tileW, row * tileH);
        }

        container._exportMode = 'spritesheet';
        container._exportCanvas = canvas;

        if (status) status.textContent = `Spritesheet ${ssW}×${ssH} — ${nFrames} tiles (${cols}×${rows}) — tile ${tileW}×${tileH}`;
        if (infoEl) infoEl.textContent = `${ssW}×${ssH}px · ${nFrames} tiles`;
      }

      const dt = ((performance.now() - t0) / 1000).toFixed(2);
      if (status) {
        const cur = container.querySelector('#pn-status')?.textContent ?? '';
        container.querySelector('#pn-status').textContent = cur + ` (${dt}s)`;
      }

      if (!preview && dlBtn) dlBtn.style.display = '';

    } catch (err) {
      if (status) status.textContent = 'Erreur : ' + err.message;
      DevLog.error('[Perlin] ' + err.message);
    } finally {
      _generating = false;
      if (progress) progress.style.display = 'none';
      if (canvas)   canvas.style.opacity   = '1';
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function _download() {
    const mode = container._exportMode;
    const ts   = new Date().toISOString().slice(0,19).replace(/[T:]/g, '-');
    const name = `perlin_${_cfg.seed}_s${_cfg.scale}_${ts}`;

    if (mode === 'gif') {
      const data = container._exportGifData;
      if (!data) { alert("Générez d'abord un GIF."); return; }
      const blob = new Blob([data], { type: 'image/gif' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.download = name + '.gif'; a.href = url; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      const canvas = container._exportCanvas;
      if (!canvas) { alert("Générez d'abord une image."); return; }
      const suffix = mode === 'spritesheet' ? '_spritesheet' : '';
      const a = document.createElement('a');
      a.download = name + suffix + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
  }

  // ── Auto-preview debounced ───────────────────────────────────────────────
  let _previewTimer = null;
  function _schedulePreview() {
    clearTimeout(_previewTimer);
    _previewTimer = setTimeout(() => _generate(true), 400);
  }

  // ── Events ────────────────────────────────────────────────────────────────
  function _bindEvents() {
    // Tabs mode
    container.querySelectorAll('.pn-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _mode = btn.dataset.mode;
        renderShell();
      });
    });

    // Champs
    container.querySelectorAll('.pn-field').forEach(el => {
      const key = el.dataset.key;
      const update = () => {
        const val = el.type === 'range' || el.tagName === 'SELECT'
          ? (el.type === 'range' ? parseFloat(el.value) : (isNaN(Number(el.value)) ? el.value : Number(el.value)))
          : (el.type === 'number' ? parseInt(el.value, 10) : el.value);
        _cfg[key] = val;

        // Mettre à jour le label du range
        const lbl = container.querySelector(`#pn-val-${key}`);
        if (lbl) lbl.textContent = val;

        // Afficher/masquer couleurs custom
        if (key === 'colormap') {
          const cc = container.querySelector('#pn-custom-colors');
          if (cc) cc.style.display = val === 'custom' ? 'flex' : 'none';
        }
      };
      el.addEventListener('input', () => { update(); _schedulePreview(); });
      el.addEventListener('change', () => { update(); _schedulePreview(); });
    });

    // Seed aléatoire
    container.querySelector('#pn-random-seed')?.addEventListener('click', () => {
      _cfg.seed = Math.floor(Math.random() * 65536);
      const el = container.querySelector('[data-key="seed"]');
      if (el) { el.value = _cfg.seed; }
      _schedulePreview();
    });

    // Générer
    container.querySelector('#pn-generate')?.addEventListener('click', () => _generate(false));

    // Télécharger
    container.querySelector('#pn-download')?.addEventListener('click', _download);

    // Label aperçu
    const labelEl = container.querySelector('#pn-preview-label');
    if (labelEl) labelEl.textContent = `Aperçu — ${_mode.toUpperCase()}`;
  }

  renderShell();
}

// ── Expose renderFn ──
window["renderPerlin"] = renderPerlin;
