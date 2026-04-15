// ── Modulo Module: Structogramme (structogram) v1.0.0 ──
// Author: Modulo Team
// Built: 2026-04-08T21:39:07.092Z
// renderFn: renderStructogram
// ── structogram/script/renderer.js ──
// ── Structogram Renderer ──
// Rendu Nassi-Shneiderman Diagram sur canvas 2D

const STRUCTO_FONT      = '13px "Google Sans", Roboto, sans-serif';
const STRUCTO_FONT_BOLD = 'bold 13px "Google Sans", Roboto, sans-serif';
const STRUCTO_FONT_MONO = '12px "Roboto Mono", monospace';
const STRUCTO_ROW_H     = 36;   // hauteur de base d'une ligne
const STRUCTO_INDENT    = 0;    // pas d'indentation supplémentaire
const STRUCTO_MIN_W     = 600;  // largeur minimum

// ── Couleurs thème sombre ─────────────────────────────────────────────────────
function _structoColors(isDark) {
  return {
    bg:        isDark ? '#1e2435' : '#ffffff',
    border:    isDark ? '#4a5278' : '#9e9e9e',
    text:      isDark ? '#e8eaf0' : '#1a1f2e',
    textDim:   isDark ? '#9ba3b8' : '#616161',
    header:    isDark ? '#252d40' : '#f5f5f5',
    headerBg:  isDark ? '#2a3450' : '#e8eaf6',
    // Types
    instruction: isDark ? '#1e2435' : '#ffffff',
    call:        isDark ? '#1a2a3a' : '#e3f2fd',
    condition:   isDark ? '#2a1a3a' : '#f3e5f5',
    while:       isDark ? '#1a2a1a' : '#e8f5e9',
    dowhile:     isDark ? '#2a2510' : '#fff8e1',
    for:         isDark ? '#102a2a' : '#e0f7fa',
    switch:      isDark ? '#2a1a1a' : '#fce4ec',
    parallel:    isDark ? '#252a10' : '#f9fbe7',
    break:       isDark ? '#2a1a1a' : '#ffebee',
    output:      isDark ? '#1a2e1a' : '#e8f4e8',
    return:      isDark ? '#1e2435' : '#eceff1',
  };
}

// ── Mesure de la hauteur d'un nœud ───────────────────────────────────────────
function _structoMeasure(node, ctx, width) {
  ctx.font = STRUCTO_FONT;
  switch (node.type) {
    case 'instruction':
    case 'output':
    case 'call':
    case 'break':
    case 'return':
      return Math.max(STRUCTO_ROW_H, _structoTextH(node.text, ctx, width - 16));

    case 'condition': {
      const labelH = STRUCTO_ROW_H;
      const halfW  = Math.floor(width / 2);
      const trueH  = _structoMeasureList(node.trueBranch  ?? [], ctx, halfW);
      const falseH = _structoMeasureList(node.falseBranch ?? [], ctx, width - halfW);
      return labelH + Math.max(trueH, falseH);
    }

    case 'while':
    case 'for': {
      const bodyH = _structoMeasureList(node.body ?? [], ctx, width - 20);
      return STRUCTO_ROW_H + bodyH;
    }

    case 'dowhile': {
      const bodyH = _structoMeasureList(node.body ?? [], ctx, width);
      return bodyH + STRUCTO_ROW_H;
    }

    case 'switch': {
      const cases = node.cases ?? [];
      if (!cases.length) return STRUCTO_ROW_H * 2;
      const colW   = Math.floor(width / cases.length);
      const labelH = STRUCTO_ROW_H;
      const maxBody = Math.max(...cases.map(c =>
        STRUCTO_ROW_H + _structoMeasureList(c.body ?? [], ctx, colW)));
      return labelH + maxBody;
    }

    case 'parallel': {
      const threads = node.threads ?? [];
      if (!threads.length) return STRUCTO_ROW_H * 2;
      const colW   = Math.floor(width / threads.length);
      const labelH = STRUCTO_ROW_H;
      const maxH   = Math.max(...threads.map(t => _structoMeasureList(t ?? [], ctx, colW)));
      return labelH + maxH;
    }

    default:
      return STRUCTO_ROW_H;
  }
}

function _structoMeasureList(nodes, ctx, width) {
  return (nodes ?? []).reduce((s, n) => s + _structoMeasure(n, ctx, width), 0) || STRUCTO_ROW_H;
}

function _structoTextH(text, ctx, maxW) {
  const words = (text ?? '').split(' ');
  let line = '', lines = 1;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines++; line = w; }
    else line = test;
  }
  return Math.max(STRUCTO_ROW_H, lines * 18 + 12);
}

// ── Dessin d'un nœud ─────────────────────────────────────────────────────────
function _structoDraw(node, ctx, x, y, width, colors, selected) {
  const h = _structoMeasure(node, ctx, width);
  ctx.save();

  if (selected === node.id) {
    ctx.shadowColor = '#4285F4';
    ctx.shadowBlur  = 8;
  }

  switch (node.type) {

    case 'instruction':
      _structoRect(ctx, x, y, width, h, colors.instruction, colors.border);
      _structoText(ctx, node.text, x, y, width, h, colors.text, STRUCTO_FONT);
      break;

    case 'output':
      _structoRect(ctx, x, y, width, h, colors.output ?? '#e8f4e8', '#2E7D32');
      // Chevron gauche pour symboliser la sortie
      ctx.save();
      ctx.fillStyle = '#2E7D32';
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y + h/2);
      ctx.lineTo(x + 10, y);
      ctx.lineTo(x + 10, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      _structoText(ctx, node.text, x + 10, y, width - 10, h, colors.text, STRUCTO_FONT);
      break;

    case 'call':
      // Double barre verticale à gauche et droite
      _structoRect(ctx, x, y, width, h, colors.call, colors.border);
      ctx.strokeStyle = colors.border;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(x+6, y); ctx.lineTo(x+6, y+h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+width-6, y); ctx.lineTo(x+width-6, y+h); ctx.stroke();
      _structoText(ctx, node.text, x+6, y, width-12, h, colors.text, STRUCTO_FONT);
      break;

    case 'return':
      _structoRect(ctx, x, y, width, h, colors.return, colors.border);
      // Flèche oblique coin bas-gauche
      ctx.fillStyle = colors.border;
      ctx.beginPath();
      ctx.moveTo(x, y + h - 10);
      ctx.lineTo(x + 10, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      _structoText(ctx, node.text, x, y, width, h, colors.text, STRUCTO_FONT);
      break;

    case 'break':
      _structoRect(ctx, x, y, width, h, colors.break, colors.border);
      // Barre oblique coin bas-droit
      ctx.fillStyle = colors.border;
      ctx.beginPath();
      ctx.moveTo(x + width - 10, y + h);
      ctx.lineTo(x + width, y + h - 10);
      ctx.lineTo(x + width, y + h);
      ctx.closePath();
      ctx.fill();
      _structoText(ctx, node.text || 'Sortie', x, y, width, h, colors.text, STRUCTO_FONT);
      break;

    case 'condition': {
      const halfW  = Math.floor(width / 2);
      const labelH = STRUCTO_ROW_H;
      const bodyH  = h - labelH;

      // Fond header
      _structoRect(ctx, x, y, width, labelH, colors.condition, colors.border);

      // Triangle central
      ctx.fillStyle = colors.border;
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + halfW, y + labelH);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Lignes du triangle
      ctx.strokeStyle = colors.border;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + halfW, y + labelH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + width, y); ctx.lineTo(x + halfW, y + labelH); ctx.stroke();

      // Texte condition
      _structoText(ctx, node.text, x, y, width, labelH, colors.text, STRUCTO_FONT_BOLD);

      // Labels Vrai / Faux
      ctx.font      = '11px sans-serif';
      ctx.fillStyle = colors.textDim;
      ctx.textAlign = 'left';
      ctx.fillText('Vrai', x + 4, y + labelH - 6);
      ctx.textAlign = 'right';
      ctx.fillText('Faux', x + width - 4, y + labelH - 6);
      ctx.textAlign = 'left';

      // Branche vraie (gauche)
      let ty = y + labelH;
      for (const child of node.trueBranch ?? []) {
        const ch = _structoMeasure(child, ctx, halfW);
        _structoDraw(child, ctx, x, ty, halfW, colors, selected);
        ty += ch;
      }
      if (!(node.trueBranch ?? []).length) {
        _structoRect(ctx, x, y + labelH, halfW, bodyH, colors.bg, colors.border);
        ctx.font = '11px sans-serif'; ctx.fillStyle = colors.textDim;
        ctx.textAlign = 'center';
        ctx.fillText('(vide)', x + halfW / 2, y + labelH + bodyH / 2);
        ctx.textAlign = 'left';
      }

      // Branche fausse (droite)
      let fy = y + labelH;
      for (const child of node.falseBranch ?? []) {
        const ch = _structoMeasure(child, ctx, width - halfW);
        _structoDraw(child, ctx, x + halfW, fy, width - halfW, colors, selected);
        fy += ch;
      }
      if (!(node.falseBranch ?? []).length) {
        _structoRect(ctx, x + halfW, y + labelH, width - halfW, bodyH, colors.bg, colors.border);
        ctx.font = '11px sans-serif'; ctx.fillStyle = colors.textDim;
        ctx.textAlign = 'center';
        ctx.fillText('(vide)', x + halfW + (width - halfW) / 2, y + labelH + bodyH / 2);
        ctx.textAlign = 'left';
      }

      // Séparateur vertical milieu
      ctx.strokeStyle = colors.border;
      ctx.beginPath();
      ctx.moveTo(x + halfW, y + labelH);
      ctx.lineTo(x + halfW, y + h);
      ctx.stroke();
      break;
    }

    case 'while':
    case 'for': {
      const bodyH = h - STRUCTO_ROW_H;
      // Barre gauche + condition
      _structoRect(ctx, x, y, width, STRUCTO_ROW_H, colors[node.type], colors.border);
      // Barre gauche épaisse
      ctx.fillStyle = colors.border;
      ctx.fillRect(x, y, 3, h);
      // Label type
      ctx.font      = '10px sans-serif';
      ctx.fillStyle = colors.textDim;
      ctx.fillText(node.type === 'while' ? 'TANT QUE' : 'POUR', x + 6, y + 11);
      // Condition
      _structoText(ctx, node.text, x + 6, y + 11, width - 12, STRUCTO_ROW_H - 11, colors.text, STRUCTO_FONT_MONO);

      // Corps
      let by = y + STRUCTO_ROW_H;
      const body = node.body ?? [];
      if (body.length) {
        for (const child of body) {
          const ch = _structoMeasure(child, ctx, width - 20);
          _structoDraw(child, ctx, x + 20, by, width - 20, colors, selected);
          by += ch;
        }
      } else {
        _structoRect(ctx, x + 20, y + STRUCTO_ROW_H, width - 20, bodyH, colors.bg, colors.border);
        ctx.font = '11px sans-serif'; ctx.fillStyle = colors.textDim;
        ctx.textAlign = 'center';
        ctx.fillText('(corps vide)', x + 20 + (width - 20) / 2, y + STRUCTO_ROW_H + bodyH / 2);
        ctx.textAlign = 'left';
      }
      break;
    }

    case 'dowhile': {
      const bodyH  = h - STRUCTO_ROW_H;
      const body   = node.body ?? [];
      let   by     = y;
      if (body.length) {
        for (const child of body) {
          const ch = _structoMeasure(child, ctx, width);
          _structoDraw(child, ctx, x, by, width, colors, selected);
          by += ch;
        }
      } else {
        _structoRect(ctx, x, y, width, bodyH, colors.bg, colors.border);
        ctx.font = '11px sans-serif'; ctx.fillStyle = colors.textDim;
        ctx.textAlign = 'center';
        ctx.fillText('(corps vide)', x + width / 2, y + bodyH / 2);
        ctx.textAlign = 'left';
      }
      // Condition en bas
      _structoRect(ctx, x, y + bodyH, width, STRUCTO_ROW_H, colors.dowhile, colors.border);
      ctx.font = '10px sans-serif'; ctx.fillStyle = colors.textDim;
      ctx.fillText('JUSQU\'À', x + 6, y + bodyH + 11);
      _structoText(ctx, node.text, x + 6, y + bodyH + 11, width - 12, STRUCTO_ROW_H - 11, colors.text, STRUCTO_FONT_MONO);
      ctx.fillStyle = colors.border;
      ctx.fillRect(x, y + bodyH, width, 2); // double barre basse
      ctx.fillRect(x, y + bodyH + 4, width, 1);
      break;
    }

    case 'switch': {
      const cases  = node.cases ?? [];
      const nCols  = cases.length || 1;
      const colW   = Math.floor(width / nCols);
      const labelH = STRUCTO_ROW_H;

      // Header
      _structoRect(ctx, x, y, width, labelH, colors.switch, colors.border);
      ctx.font = '10px sans-serif'; ctx.fillStyle = colors.textDim;
      ctx.fillText('SELON', x + 6, y + 11);
      _structoText(ctx, node.text, x + 6, y + 11, width - 12, labelH - 11, colors.text, STRUCTO_FONT_MONO);

      // Colonnes
      cases.forEach((c, i) => {
        const cx    = x + i * colW;
        const cw    = i === nCols - 1 ? width - i * colW : colW;
        const caseH = STRUCTO_ROW_H;
        _structoRect(ctx, cx, y + labelH, cw, caseH, colors.switch, colors.border);
        _structoText(ctx, c.value ?? `Cas ${i+1}`, cx, y + labelH, cw, caseH, colors.text, STRUCTO_FONT_BOLD);

        let by = y + labelH + caseH;
        for (const child of c.body ?? []) {
          const ch = _structoMeasure(child, ctx, cw);
          _structoDraw(child, ctx, cx, by, cw, colors, selected);
          by += ch;
        }
        if (!(c.body ?? []).length) {
          const bodyH = h - labelH - caseH;
          _structoRect(ctx, cx, y + labelH + caseH, cw, bodyH, colors.bg, colors.border);
        }
      });
      break;
    }

    case 'parallel': {
      const threads = node.threads ?? [];
      const nCols   = threads.length || 1;
      const colW    = Math.floor(width / nCols);
      const labelH  = STRUCTO_ROW_H;

      // Header avec double barre
      _structoRect(ctx, x, y, width, labelH, colors.parallel, colors.border);
      ctx.fillStyle = colors.border;
      ctx.fillRect(x, y + labelH - 4, width, 1);
      ctx.fillRect(x, y + labelH - 2, width, 1);
      ctx.font = '10px sans-serif'; ctx.fillStyle = colors.textDim;
      ctx.fillText('PARALLÈLE', x + 6, y + 11);

      threads.forEach((thread, i) => {
        const cx    = x + i * colW;
        const cw    = i === nCols - 1 ? width - i * colW : colW;
        let   ty2   = y + labelH;
        for (const child of thread ?? []) {
          const ch = _structoMeasure(child, ctx, cw);
          _structoDraw(child, ctx, cx, ty2, cw, colors, selected);
          ty2 += ch;
        }
        if (!(thread ?? []).length) {
          _structoRect(ctx, cx, y + labelH, cw, h - labelH, colors.bg, colors.border);
        }
      });
      break;
    }
  }

  ctx.restore();
  return h;
}

// ── Utilitaires de dessin ─────────────────────────────────────────────────────
function _structoRect(ctx, x, y, w, h, fill, stroke) {
  ctx.fillStyle   = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth   = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function _structoText(ctx, text, x, y, w, h, color, font) {
  ctx.font      = font ?? STRUCTO_FONT;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const words    = (text ?? '').split(' ');
  const maxW     = w - 12;
  const lines    = [];
  let   cur      = '';

  for (const word of words) {
    const test = cur ? cur + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur); cur = word;
    } else cur = test;
  }
  if (cur) lines.push(cur);

  const lineH = 18;
  const totalH = lines.length * lineH;
  let ly = y + (h - totalH) / 2 + lineH / 2;

  for (const line of lines) {
    ctx.fillText(line, x + w / 2, ly);
    ly += lineH;
  }

  ctx.textAlign    = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ── Rendu complet d'un diagramme ─────────────────────────────────────────────
function _structoRenderDiagram(canvas, diagram, selected, isDark) {
  const ctx    = canvas.getContext('2d');
  const colors = _structoColors(isDark);
  const nodes  = diagram.nodes ?? [];
  const PAD    = 20;
  const width  = Math.max(canvas.width - PAD * 2, STRUCTO_MIN_W);

  // Calculer la hauteur totale
  const HEADER_H = 44;
  const totalH   = nodes.reduce((s, n) => s + _structoMeasure(n, ctx, width), 0) || STRUCTO_ROW_H;

  canvas.height = HEADER_H + totalH + PAD * 2;

  // Fond
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header (nom + paramètres)
  ctx.fillStyle   = colors.headerBg;
  ctx.strokeStyle = colors.border;
  ctx.lineWidth   = 1;
  ctx.fillRect(PAD, PAD, width, HEADER_H);
  ctx.strokeRect(PAD + 0.5, PAD + 0.5, width - 1, HEADER_H - 1);

  ctx.font      = STRUCTO_FONT_BOLD;
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(diagram.name ?? 'Structogramme', PAD + 10, PAD + 14);

  if (diagram.params) {
    ctx.font      = STRUCTO_FONT_MONO;
    ctx.fillStyle = colors.textDim;
    ctx.fillText('(' + diagram.params + ')', PAD + 10, PAD + 30);
  }

  // Nœuds
  let y = PAD + HEADER_H;
  for (const node of nodes) {
    const h = _structoDraw(node, ctx, PAD, y, width, colors, selected);
    y += h;
  }
}

// ── Hit test — trouver le nœud cliqué ────────────────────────────────────────
function _structoHitTest(nodes, cx, width, py, ctx, offsetX, offsetY) {
  const PAD = 20;
  let y = py;
  for (const node of nodes) {
    const h = _structoMeasure(node, ctx, width);
    if (offsetY >= y && offsetY < y + h && offsetX >= PAD && offsetX < PAD + width) {
      // Chercher dans les enfants
      const child = _structoHitChild(node, cx, width, y, ctx, offsetX, offsetY);
      return child ?? node;
    }
    y += h;
  }
  return null;
}

function _structoHitChild(node, cx, width, nodeY, ctx, ox, oy) {
  switch (node.type) {
    case 'condition': {
      const halfW  = Math.floor(width / 2);
      const labelH = STRUCTO_ROW_H;
      const PAD    = 20;
      if (oy >= nodeY + labelH) {
        if (ox < PAD + halfW) return _structoHitTest(node.trueBranch ?? [], cx, halfW, nodeY + labelH, ctx, ox, oy);
        else return _structoHitTest(node.falseBranch ?? [], cx, width - halfW, nodeY + labelH, ctx, ox - halfW, oy);
      }
      return null;
    }
    case 'while':
    case 'for':
      if (oy >= nodeY + STRUCTO_ROW_H)
        return _structoHitTest(node.body ?? [], cx, width - 20, nodeY + STRUCTO_ROW_H, ctx, ox - 20, oy);
      return null;
    case 'dowhile':
      return _structoHitTest(node.body ?? [], cx, width, nodeY, ctx, ox, oy);
    default:
      return null;
  }
}

// ── structogram/script/state.js ──
// ── Structogram State ──

const StructogramState = {
  _diagrams: [],

  async load() {
    this._diagrams = (await window.modulo.structograms.getAll()) ?? [];
    return this._diagrams;
  },

  async save() {
    await window.modulo.structograms.save(this._diagrams);
  },

  async add(name) {
    const d = {
      id:        uid(),
      title:     name,
      tags:      [],
      content:   JSON.stringify(_structoDefaultDiagram(name)),
      createdAt: today(),
      updatedAt: today(),
    };
    this._diagrams.unshift(d);
    await this.save();
    return d;
  },

  async update(id, diagram) {
    const d = this._diagrams.find(d => d.id === id);
    if (d) {
      d.content   = JSON.stringify({ name: diagram.name, params: diagram.params, nodes: diagram.nodes });
      d.title     = diagram.name;
      d.updatedAt = today();
      await this.save();
    }
  },

  async rename(id, name) {
    const d = this._diagrams.find(d => d.id === id);
    if (d) { d.title = name; await this.save(); }
  },

  async remove(id) {
    this._diagrams = this._diagrams.filter(d => d.id !== id);
    await this.save();
  },

  getById(id) {
    const d = this._diagrams.find(d => d.id === id);
    if (!d) return null;
    try {
      const p = JSON.parse(d.content ?? '{}');
      return { id: d.id, name: d.title, params: p.params ?? '', nodes: p.nodes ?? [] };
    } catch {
      return { id: d.id, name: d.title, params: '', nodes: [] };
    }
  },
};

// ── Types de nœuds NSD ───────────────────────────────────────────────────────
// Noms en anglais — standard Nassi-Shneiderman
const STRUCTO_TYPES = {
  instruction: { label: 'Instruction',    color: '#e8eaf0', border: '#5C6BC0' },
  output:      { label: 'Output',         color: '#e8f4e8', border: '#2E7D32' },
  call:        { label: 'Call',           color: '#e3f2fd', border: '#1976D2' },
  condition:   { label: 'If / Else',      color: '#f3e5f5', border: '#7B1FA2' },
  while:       { label: 'While',          color: '#e8f5e9', border: '#388E3C' },
  dowhile:     { label: 'Do While',       color: '#fff8e1', border: '#F57F17' },
  for:         { label: 'For',            color: '#e0f7fa', border: '#00838F' },
  switch:      { label: 'Switch / Case',  color: '#fce4ec', border: '#C62828' },
  parallel:    { label: 'Parallel',       color: '#f9fbe7', border: '#827717' },
  break:       { label: 'Break',          color: '#ffebee', border: '#D32F2F' },
  return:      { label: 'Return',         color: '#eceff1', border: '#37474F' },
};

// ── Diagramme par défaut ──────────────────────────────────────────────────────
function _structoDefaultDiagram(name) {
  return {
    name,
    params: '',
    nodes: [
      { id: uid(), type: 'instruction', text: 'Start' },
      {
        id: uid(), type: 'condition', text: 'x > 0',
        trueBranch:  [{ id: uid(), type: 'output', text: 'print("Positive")' }],
        falseBranch: [{ id: uid(), type: 'output', text: 'print("Negative")' }],
      },
      { id: uid(), type: 'return', text: 'result' },
    ],
  };
}

// ── structogram/page/render.js ──
// ── Structogram Render ──

async function renderStructogram(container) {
  await StructogramState.load();

  let _current   = null;
  let _selected  = null;
  let _diagram   = null;
  let _zoom      = 1;
  let _pan       = { x: 20, y: 20 };
  let _dragging  = false;
  let _dragStart = null;
  let _toolbarOpen = true;

  // Drag from toolbar state
  let _dndType     = null;
  let _dndDropIdx  = null;

  const isDark = () => (window._settings?.theme ?? 'dark') !== 'light';

  // ── Catégories ─────────────────────────────────────────────────────────────
  const STRUCTO_CATS = [
    {
      label: 'Basic',
      color: '#5C6BC0',
      blocks: [
        { type: 'instruction', label: 'Instruction' },
        { type: 'output',      label: 'Output'      },
        { type: 'call',        label: 'Call'         },
        { type: 'return',      label: 'Return'       },
        { type: 'break',       label: 'Break'        },
      ],
    },
    {
      label: 'Condition',
      color: '#7B1FA2',
      blocks: [
        { type: 'condition', label: 'If / Else'     },
        { type: 'switch',    label: 'Switch / Case'  },
      ],
    },
    {
      label: 'Loops',
      color: '#388E3C',
      blocks: [
        { type: 'while',   label: 'While'    },
        { type: 'for',     label: 'For'      },
        { type: 'dowhile', label: 'Do While' },
      ],
    },
    {
      label: 'Advanced',
      color: '#827717',
      blocks: [
        { type: 'parallel', label: 'Parallel' },
      ],
    },
  ];

  // ── Valeurs par défaut des blocs ──────────────────────────────────────────
  const STRUCTO_DEFAULTS = {
    instruction: { text: 'Instruction'              },
    output:      { text: 'print(value)'             },
    call:        { text: 'functionCall()'           },
    return:      { text: 'value'                    },
    break:       { text: ''                         },
    condition:   { text: 'condition', trueBranch: [], falseBranch: [] },
    while:       { text: 'condition', body: []      },
    for:         { text: 'i = 0 to n', body: []     },
    dowhile:     { text: 'condition', body: []      },
    switch:      { text: 'variable', cases: [{ value: 'Case 1', body: [] }, { value: 'Case 2', body: [] }] },
    parallel:    { text: '', threads: [[], []]       },
  };

  // ── Shell HTML ─────────────────────────────────────────────────────────────
  function renderShell() {
    container.innerHTML = `
      <div style="display:flex;height:calc(100vh - 36px);overflow:hidden;flex-direction:column">

        <!-- Barre du haut -->
        <div style="height:44px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;padding:0 10px;background:var(--bg-surface);flex-shrink:0;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" id="sg-new">${icon('plus','12px')} New</button>
          <select class="input" id="sg-select" style="height:30px;font-size:12px;max-width:220px">
            <option value="">-- Select --</option>
            ${StructogramState._diagrams.map(d => `<option value="${d.id}" ${_current===d.id?'selected':''}>${d.title}</option>`).join('')}
          </select>
          <div style="width:1px;height:20px;background:var(--border)"></div>

          <div id="sg-actions" style="display:${_current?'flex':'none'};align-items:center;gap:4px">
            <button class="btn btn-ghost btn-sm" id="sg-rename" title="Rename">${icon('edit','13px')}</button>
            <button class="btn btn-ghost btn-sm" id="sg-params" title="Function parameters" style="font-family:var(--font-mono);font-size:11px">( )</button>
            <button class="btn btn-ghost btn-sm" id="sg-del-diag" title="Delete" style="color:var(--red)">${icon('trash','13px')}</button>
            <div style="width:1px;height:20px;background:var(--border)"></div>
          </div>

          <div id="sg-sel-actions" style="display:none;align-items:center;gap:4px">
            <button class="btn btn-secondary btn-sm" id="sg-edit-node" style="font-size:11px">${icon('edit','12px')} Edit</button>
            <button class="btn btn-ghost btn-sm" id="sg-move-up" title="Move up">↑</button>
            <button class="btn btn-ghost btn-sm" id="sg-move-down" title="Move down">↓</button>
            <button class="btn btn-ghost btn-sm" id="sg-del-node" style="color:var(--red)">${icon('trash','13px')}</button>
            <div style="width:1px;height:20px;background:var(--border)"></div>
          </div>

          <div style="flex:1"></div>

          <div id="sg-view-actions" style="display:${_current?'flex':'none'};align-items:center;gap:4px">
            <span id="sg-zoom-label" style="font-size:10px;color:var(--text-tertiary);font-family:var(--font-mono);min-width:36px;text-align:right">100%</span>
            <button class="btn btn-ghost btn-sm" id="sg-fit" style="height:28px;padding:0 8px;font-size:11px">Fit</button>
            <button class="btn btn-ghost btn-sm" id="sg-zoom-reset" style="height:28px;padding:0 8px;font-size:11px">1:1</button>
            <div style="width:1px;height:20px;background:var(--border)"></div>
            <button class="btn btn-secondary btn-sm" id="sg-export-png" style="font-size:11px">${icon('export','12px')} PNG</button>
            <button class="btn btn-secondary btn-sm" id="sg-export-svg" style="font-size:11px">SVG</button>
          </div>
        </div>

        <!-- Canvas + toolbar bas -->
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative">

          <!-- Canvas -->
          <div id="sg-canvas-wrap" style="flex:1;overflow:hidden;position:relative;background:var(--bg-base)">
            <div id="sg-canvas-inner" style="position:absolute;top:0;left:0;transform-origin:0 0">
              <canvas id="sg-canvas" style="display:block"></canvas>
            </div>

            <!-- Drop line indicator -->
            <div id="sg-drop-line" style="
              display:none;position:absolute;left:16px;right:16px;height:2px;
              background:var(--blue);border-radius:1px;pointer-events:none;z-index:50;
            "></div>

            <!-- Placeholder -->
            <div id="sg-placeholder" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--text-tertiary);pointer-events:none">
              ${icon('list','48px')}
              <div style="font-size:13px">Create or select a diagram</div>
              <div style="font-size:11px">Drag blocks from the toolbar below</div>
            </div>
          </div>

          <!-- Toolbar bas -->
          <div id="sg-toolbar" style="flex-shrink:0;background:var(--bg-surface);border-top:1px solid var(--border);overflow:hidden;transition:height .2s ease;height:${_toolbarOpen?'88px':'28px'}">

            <!-- Toggle -->
            <div id="sg-toolbar-toggle" style="height:28px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;cursor:pointer;user-select:none;border-bottom:1px solid var(--border)">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:10px;font-weight:600;letter-spacing:.6px;color:var(--text-tertiary)">BLOCKS</span>
                <span style="font-size:10px;color:var(--text-tertiary)">— drag onto the diagram</span>
              </div>
              <div id="sg-chevron" style="color:var(--text-tertiary);transition:transform .2s;transform:${_toolbarOpen?'rotate(0deg)':'rotate(180deg)'}">
                ${icon('chevron_down','14px')}
              </div>
            </div>

            <!-- Blocs -->
            <div style="padding:8px 12px;display:flex;gap:14px;overflow-x:auto;align-items:flex-start;height:60px">
              ${STRUCTO_CATS.map(cat => `
                <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0">
                  <div style="font-size:9px;font-weight:600;letter-spacing:.5px;color:${cat.color};text-transform:uppercase">${cat.label}</div>
                  <div style="display:flex;gap:4px">
                    ${cat.blocks.map(b => `
                      <div class="sg-pill" data-type="${b.type}" data-label="${b.label}"
                        style="
                          padding:4px 9px;border-radius:var(--radius-md);font-size:11px;
                          font-weight:500;border-left:3px solid ${cat.color};
                          background:${cat.color}18;color:var(--text-primary);
                          border:1px solid ${cat.color}55;border-left:3px solid ${cat.color};
                          user-select:none;white-space:nowrap;
                          cursor:${_current?'grab':'not-allowed'};
                          opacity:${_current?'1':'.4'};
                        ">
                        ${b.label}
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Status -->
          <div style="height:20px;border-top:1px solid var(--border);padding:0 12px;display:flex;align-items:center;font-size:10px;color:var(--text-tertiary);background:var(--bg-surface);flex-shrink:0">
            <span id="sg-status">—</span>
            <span style="flex:1"></span>
            <span>Scroll = zoom · Drag = pan · Click = select · Double-click = edit</span>
          </div>
        </div>
      </div>

      <!-- Ghost cursor -->
      <div id="sg-ghost" style="
        position:fixed;pointer-events:none;z-index:9999;display:none;
        padding:4px 10px;border-radius:var(--radius-md);font-size:11px;font-weight:500;
        background:var(--blue);color:#fff;box-shadow:var(--shadow-md);
        transform:translate(10px,-50%);
      "></div>
    `;

    _initPanZoom();
    _initDragDrop();
    _bindEvents();
    if (_current) _loadDiagram(_current);
  }

  // ── Rendu canvas ──────────────────────────────────────────────────────────
  function _render() {
    const canvas = container.querySelector('#sg-canvas');
    const inner  = container.querySelector('#sg-canvas-inner');
    const wrap   = container.querySelector('#sg-canvas-wrap');
    if (!canvas || !_diagram) return;
    canvas.width = Math.max((wrap?.clientWidth ?? 800) - 40, STRUCTO_MIN_W);
    _structoRenderDiagram(canvas, _diagram, _selected, isDark());
    inner.style.transform = `translate(${_pan.x}px,${_pan.y}px) scale(${_zoom})`;
    const zl = container.querySelector('#sg-zoom-label');
    if (zl) zl.textContent = Math.round(_zoom * 100) + '%';
    const ph = container.querySelector('#sg-placeholder');
    if (ph) ph.style.display = 'none';
  }

  // ── Pan / Zoom ────────────────────────────────────────────────────────────
  function _applyTransform() {
    const inner = container.querySelector('#sg-canvas-inner');
    if (inner) inner.style.transform = `translate(${_pan.x}px,${_pan.y}px) scale(${_zoom})`;
    const zl = container.querySelector('#sg-zoom-label');
    if (zl) zl.textContent = Math.round(_zoom * 100) + '%';
  }

  function _initPanZoom() {
    const wrap = container.querySelector('#sg-canvas-wrap');
    if (!wrap) return;

    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      const f  = e.deltaY < 0 ? 1.1 : 0.91;
      const nz = Math.max(0.15, Math.min(4, _zoom * f));
      const r  = wrap.getBoundingClientRect();
      _pan.x = (e.clientX - r.left) - ((e.clientX - r.left) - _pan.x) * (nz / _zoom);
      _pan.y = (e.clientY - r.top)  - ((e.clientY - r.top)  - _pan.y) * (nz / _zoom);
      _zoom  = nz;
      _applyTransform();
    }, { passive: false });

    wrap.addEventListener('mousedown', e => {
      if (e.button !== 0 || _dndType) return;
      _dragging  = true;
      _dragStart = { x: e.clientX - _pan.x, y: e.clientY - _pan.y };
      wrap.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', e => {
      if (!_dragging) return;
      _pan.x = e.clientX - _dragStart.x;
      _pan.y = e.clientY - _dragStart.y;
      _applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (_dragging) { _dragging = false; const w = container.querySelector('#sg-canvas-wrap'); if (w) w.style.cursor = 'default'; }
    });

    // Clic = sélection
    wrap.addEventListener('click', e => {
      if (!_diagram || _dndType || _dragging) return;
      const inner  = container.querySelector('#sg-canvas-inner');
      const r      = inner.getBoundingClientRect();
      const ox     = (e.clientX - r.left) / _zoom;
      const oy     = (e.clientY - r.top)  / _zoom;
      const canvas = container.querySelector('#sg-canvas');
      const ctx    = canvas.getContext('2d');
      const node   = _structoHitTest(_diagram.nodes, canvas.width, canvas.width - 40, 64, ctx, ox + 20, oy + 20);
      _selected = node?.id ?? null;
      _render();
      _updateSelActions();
    });

    // Double-clic = éditer
    wrap.addEventListener('dblclick', () => { if (_selected) _editNode(); });
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  // Utilise mousedown/mousemove/mouseup natifs pour éviter les problèmes
  // avec l'API HTML5 Drag and Drop dans Electron.

  function _initDragDrop() {
    const ghost = container.querySelector('#sg-ghost');
    const wrap  = container.querySelector('#sg-canvas-wrap');

    // Mousedown sur les pills
    container.addEventListener('mousedown', e => {
      const pill = e.target.closest('.sg-pill');
      if (!pill || !_current) return;
      e.preventDefault();
      _dndType = pill.dataset.type;
      if (ghost) {
        ghost.textContent = pill.dataset.label;
        ghost.style.display = 'block';
        ghost.style.left = e.clientX + 'px';
        ghost.style.top  = e.clientY + 'px';
      }
      document.body.style.userSelect = 'none';
    });

    // Mousemove — déplacer le ghost + calculer drop index
    window.addEventListener('mousemove', e => {
      if (!_dndType) return;
      if (ghost) {
        ghost.style.left = (e.clientX + 12) + 'px';
        ghost.style.top  = e.clientY + 'px';
      }

      // Est-on au-dessus du canvas ?
      if (!wrap || !_diagram) return;
      const wrapRect = wrap.getBoundingClientRect();
      const inWrap   = e.clientX >= wrapRect.left && e.clientX <= wrapRect.right &&
                       e.clientY >= wrapRect.top  && e.clientY <= wrapRect.bottom;

      if (inWrap) {
        const inner   = container.querySelector('#sg-canvas-inner');
        const canvas  = container.querySelector('#sg-canvas');
        const r       = inner.getBoundingClientRect();
        const oy      = (e.clientY - r.top) / _zoom - 20; // -20 pour le padding
        const ctx     = canvas.getContext('2d');
        _dndDropIdx   = _calcDropIndex(_diagram.nodes, oy, ctx, canvas.width - 40);
        _showDropLine(_dndDropIdx, wrap, inner, canvas);
      } else {
        _hideDropLine();
        _dndDropIdx = null;
      }
    });

    // Mouseup — déposer
    window.addEventListener('mouseup', e => {
      if (!_dndType) return;
      if (ghost) ghost.style.display = 'none';
      document.body.style.userSelect = '';

      if (_dndDropIdx !== null && _diagram) {
        _insertBlock(_dndType, _dndDropIdx);
      }

      _hideDropLine();
      _dndType    = null;
      _dndDropIdx = null;
    });
  }

  function _calcDropIndex(nodes, oy, ctx, width) {
    const HEADER_H = 44 + 20; // header + padding top
    let y = HEADER_H;
    for (let i = 0; i < nodes.length; i++) {
      const h = _structoMeasure(nodes[i], ctx, width);
      if (oy < y + h / 2) return i;
      y += h;
    }
    return nodes.length;
  }

  function _showDropLine(idx, wrap, inner, canvas) {
    const line = container.querySelector('#sg-drop-line');
    if (!line || !canvas) return;
    const ctx    = canvas.getContext('2d');
    const width  = canvas.width - 40;
    const nodes  = _diagram?.nodes ?? [];
    const HEADER = 44 + 20;
    let y = HEADER;
    for (let i = 0; i < Math.min(idx, nodes.length); i++) {
      y += _structoMeasure(nodes[i], ctx, width);
    }
    const wr      = wrap.getBoundingClientRect();
    const ir      = inner.getBoundingClientRect();
    const screenY = ir.top - wr.top + (y * _zoom) + _pan.y;
    line.style.display = 'block';
    line.style.top = Math.max(0, screenY) + 'px';
  }

  function _hideDropLine() {
    const line = container.querySelector('#sg-drop-line');
    if (line) line.style.display = 'none';
  }

  function _insertBlock(type, idx) {
    if (!_diagram) return;
    const def  = STRUCTO_DEFAULTS[type] ?? { text: type };
    const node = { id: uid(), type, ...JSON.parse(JSON.stringify(def)) };
    _diagram.nodes.splice(idx, 0, node);
    _selected = node.id;
    StructogramState.update(_current, _diagram).then(() => {
      _render();
      _updateSelActions();
      _updateStatus();
      if (!['break', 'parallel'].includes(type)) {
        setTimeout(() => _editNode(), 80);
      }
    });
  }

  // ── Trouver nœud ────────────────────────────────────────────────────────
  function _findNode(nodes, id) {
    for (const n of nodes) {
      if (n.id === id) return { node: n, parent: nodes };
      for (const b of [n.trueBranch, n.falseBranch, n.body, ...(n.cases?.map(c=>c.body)??[]), ...(n.threads??[])].filter(Boolean)) {
        const f = _findNode(b, id);
        if (f) return f;
      }
    }
    return null;
  }

  // ── Éditer nœud ─────────────────────────────────────────────────────────
  function _editNode() {
    if (!_selected || !_diagram) return;
    const found = _findNode(_diagram.nodes, _selected);
    if (!found) return;
    const { node } = found;
    const typeDef  = STRUCTO_TYPES[node.type] ?? {};
    let extra = '';
    if (node.type === 'switch') {
      extra = `<div><label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Cases (comma-separated)</label><input class="input" name="cases" value="${(node.cases??[]).map(c=>c.value).join(', ')}"></div>`;
    }
    if (node.type === 'parallel') {
      extra = `<div><label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Number of threads</label><input class="input" type="number" name="threads" value="${node.threads?.length??2}" min="2" max="8"></div>`;
    }
    const hasText = !['break'].includes(node.type);
    Modal.open(`Edit — ${typeDef.label ?? node.type}`, `
      <div style="display:flex;flex-direction:column;gap:12px">
        ${hasText ? `
          <div>
            <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">
              ${['condition','while','for','dowhile','switch'].includes(node.type) ? 'Condition / Expression' : 'Text'}
            </label>
            <textarea class="input" name="text" rows="3" style="resize:vertical;font-family:var(--font-mono)">${node.text??''}</textarea>
          </div>` : ''}
        ${extra}
      </div>
    `, async () => {
      if (hasText) node.text = Modal.getInput('text')?.trim() ?? node.text;
      if (node.type === 'switch') {
        const vals = (Modal.getInput('cases')??'').split(',').map(s=>s.trim()).filter(Boolean);
        node.cases = vals.map((v,i)=>({ value:v, body:node.cases?.[i]?.body??[] }));
      }
      if (node.type === 'parallel') {
        const n = parseInt(Modal.getInput('threads')??'2',10)||2;
        node.threads = Array.from({length:n},(_,i)=>node.threads?.[i]??[]);
      }
      await StructogramState.update(_current, _diagram);
      _render();
    });
  }

  // ── Move / Delete ─────────────────────────────────────────────────────────
  function _moveNode(dir) {
    if (!_selected || !_diagram) return;
    const found = _findNode(_diagram.nodes, _selected);
    if (!found) return;
    const { parent } = found;
    const idx = parent.findIndex(n => n.id === _selected);
    if (dir === 'up'   && idx > 0)               [parent[idx-1], parent[idx]] = [parent[idx], parent[idx-1]];
    if (dir === 'down' && idx < parent.length-1) [parent[idx], parent[idx+1]] = [parent[idx+1], parent[idx]];
    StructogramState.update(_current, _diagram);
    _render();
  }

  function _deleteNode() {
    if (!_selected || !_diagram) return;
    const found = _findNode(_diagram.nodes, _selected);
    if (!found) return;
    found.parent.splice(found.parent.indexOf(found.node), 1);
    _selected = null;
    StructogramState.update(_current, _diagram);
    _render();
    _updateSelActions();
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  function _updateSelActions() {
    const el = container.querySelector('#sg-sel-actions');
    if (el) el.style.display = _selected ? 'flex' : 'none';
  }

  function _updateStatus() {
    const s = container.querySelector('#sg-status');
    if (s && _diagram) s.textContent = `${_diagram.nodes.length} root block(s) · ${_diagram.name}`;
  }

  function _fitView() {
    const wrap   = container.querySelector('#sg-canvas-wrap');
    const canvas = container.querySelector('#sg-canvas');
    if (!wrap || !canvas) return;
    const margin = 40;
    _zoom = Math.min((wrap.clientWidth - margin) / canvas.width, (wrap.clientHeight - margin) / canvas.height, 1.5);
    _pan  = { x: ((wrap.clientWidth - canvas.width * _zoom) / 2), y: 20 };
    _applyTransform();
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  function _exportPNG() {
    const c = document.createElement('canvas');
    c.width = STRUCTO_MIN_W * 2;
    _structoRenderDiagram(c, _diagram, null, isDark());
    const a = document.createElement('a');
    a.download = (_diagram?.name ?? 'structogram') + '.png';
    a.href = c.toDataURL('image/png'); a.click();
  }

  function _exportSVG() {
    const c = document.createElement('canvas');
    c.width = STRUCTO_MIN_W;
    _structoRenderDiagram(c, _diagram, null, isDark());
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${c.width}" height="${c.height}"><image href="${c.toDataURL('image/png')}" width="${c.width}" height="${c.height}"/></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.download = (_diagram?.name ?? 'structogram') + '.svg';
    a.href = url; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  function _bindEvents() {
    // Toolbar toggle
    container.querySelector('#sg-toolbar-toggle')?.addEventListener('click', () => {
      _toolbarOpen = !_toolbarOpen;
      const tb  = container.querySelector('#sg-toolbar');
      const chv = container.querySelector('#sg-chevron');
      if (tb)  tb.style.height  = _toolbarOpen ? '88px' : '28px';
      if (chv) chv.style.transform = _toolbarOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    });

    // Nouveau
    container.querySelector('#sg-new')?.addEventListener('click', () => {
      Modal.open('New Structogram', `
        <div style="display:flex;flex-direction:column;gap:10px">
          <input class="input" name="name" placeholder="Function / algorithm name…">
          <input class="input" name="params" placeholder="Parameters (e.g. a, b, n)">
        </div>
      `, async () => {
        const name   = Modal.getInput('name')?.trim() || 'MyAlgorithm';
        const params = Modal.getInput('params')?.trim() ?? '';
        const d = await StructogramState.add(name);
        _current = d.id;
        _loadDiagram(d.id);
        if (params && _diagram) {
          _diagram.params = params;
          await StructogramState.update(d.id, _diagram);
        }
        _rebuildSelect();
      });
    });

    // Select
    container.querySelector('#sg-select')?.addEventListener('change', e => {
      if (e.target.value) _loadDiagram(e.target.value);
    });

    // Rename
    container.querySelector('#sg-rename')?.addEventListener('click', () => {
      Modal.open('Rename', `<input class="input" name="name" value="${_diagram?.name??''}">`, async () => {
        const name = Modal.getInput('name')?.trim();
        if (!name || !_current) return;
        _diagram.name = name;
        await StructogramState.update(_current, _diagram);
        _render();
        _rebuildSelect();
        _updateStatus();
      });
    });

    // Params
    container.querySelector('#sg-params')?.addEventListener('click', () => {
      Modal.open('Parameters', `<input class="input" name="params" value="${_diagram?.params??''}" placeholder="a, b, n">`, async () => {
        if (!_diagram) return;
        _diagram.params = Modal.getInput('params')?.trim() ?? '';
        await StructogramState.update(_current, _diagram);
        _render();
      });
    });

    // Delete diagram
    container.querySelector('#sg-del-diag')?.addEventListener('click', async () => {
      if (!_current) return;
      await StructogramState.remove(_current);
      _current = null; _diagram = null; _selected = null;
      renderShell();
    });

    // Nœud
    container.querySelector('#sg-edit-node')?.addEventListener('click', _editNode);
    container.querySelector('#sg-move-up')?.addEventListener('click', () => _moveNode('up'));
    container.querySelector('#sg-move-down')?.addEventListener('click', () => _moveNode('down'));
    container.querySelector('#sg-del-node')?.addEventListener('click', _deleteNode);

    // Vue
    container.querySelector('#sg-fit')?.addEventListener('click', _fitView);
    container.querySelector('#sg-zoom-reset')?.addEventListener('click', () => { _zoom=1; _pan={x:20,y:20}; _applyTransform(); });

    // Export
    container.querySelector('#sg-export-png')?.addEventListener('click', _exportPNG);
    container.querySelector('#sg-export-svg')?.addEventListener('click', _exportSVG);
  }

  // ── Charger un diagramme ──────────────────────────────────────────────────
  function _loadDiagram(id) {
    _current  = id;
    _selected = null;
    const d   = StructogramState.getById(id);
    if (!d) return;
    _diagram  = { name: d.name, params: d.params, nodes: d.nodes };

    const actions = container.querySelector('#sg-actions');
    const vact    = container.querySelector('#sg-view-actions');
    if (actions) actions.style.display = 'flex';
    if (vact)    vact.style.display    = 'flex';

    container.querySelectorAll('.sg-pill').forEach(p => { p.style.opacity = '1'; p.style.cursor = 'grab'; });

    _pan  = { x: 20, y: 20 };
    _zoom = 1;
    _render();
    _updateStatus();

    const sel = container.querySelector('#sg-select');
    if (sel) sel.value = id;
  }

  function _rebuildSelect() {
    const sel = container.querySelector('#sg-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select --</option>' +
      StructogramState._diagrams.map(d => `<option value="${d.id}" ${_current===d.id?'selected':''}>${d.title}</option>`).join('');
  }

  renderShell();
}

// ── Expose renderFn ──
window["renderStructogram"] = renderStructogram;
