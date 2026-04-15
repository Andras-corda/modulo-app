// ── Modulo Module: OpenStruct (dataeditor) v1.0.0 ──
// Author: Modulo Team
// Built: 2026-04-08T21:39:07.143Z
// renderFn: renderDataeditor
// ── dataeditor/script/converters.js ──
// ── Data Editor — Parsers & Converters ──

// ─── JSON ─────────────────────────────────────────────────────────────────────

function _deParseJson(text) {
  return JSON.parse(text);
}

function _deSerializeJson(data, indent = 2) {
  return JSON.stringify(data, null, indent);
}

function _deFormatJson(text) {
  return _deSerializeJson(_deParseJson(text));
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

function _deParseCsv(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  const headers = _deParseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = _deParseCsvLine(line);
    const obj  = {};
    headers.forEach((h, i) => { obj[h.trim()] = (vals[i] ?? '').trim(); });
    return obj;
  });
}

function _deParseCsvLine(line) {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i+1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      result.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function _deSerializeCsv(data) {
  if (!Array.isArray(data) || !data.length) return '';
  const headers = Object.keys(data[0]);
  const escape  = v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  const rows = data.map(row => headers.map(h => escape(row[h])).join(','));
  return [headers.join(','), ...rows].join('\n');
}

function _deFormatCsv(text) {
  // Normaliser : retirer espaces autour des virgules dans le header
  const lines = text.trim().split('\n');
  return lines.map((line, i) => {
    if (i === 0) return line.split(',').map(h => h.trim()).join(',');
    return line;
  }).join('\n');
}

// ─── XML ──────────────────────────────────────────────────────────────────────

function _deParseXml(text) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(text, 'text/xml');
  const errEl  = doc.querySelector('parsererror');
  if (errEl) throw new Error('XML invalide : ' + errEl.textContent.slice(0, 100));
  return _deXmlNodeToObj(doc.documentElement);
}

function _deXmlNodeToObj(node) {
  if (node.nodeType === 3) return node.textContent.trim();
  const obj  = {};
  const attrs = node.attributes;
  for (let i = 0; i < attrs.length; i++) {
    obj['@' + attrs[i].name] = attrs[i].value;
  }
  const children = Array.from(node.childNodes).filter(
    n => n.nodeType !== 8 && !(n.nodeType === 3 && !n.textContent.trim())
  );
  if (children.length === 1 && children[0].nodeType === 3) {
    const text = children[0].textContent.trim();
    if (!Object.keys(obj).length) return text;
    obj['#text'] = text;
    return obj;
  }
  const groups = {};
  children.forEach(child => {
    if (child.nodeType === 3) return;
    const key = child.nodeName;
    const val = _deXmlNodeToObj(child);
    if (groups[key] !== undefined) {
      if (!Array.isArray(groups[key])) groups[key] = [groups[key]];
      groups[key].push(val);
    } else {
      groups[key] = val;
    }
  });
  return { ...obj, ...groups };
}

function _deSerializeXml(data, rootName = 'root', indent = 0) {
  const pad = '  '.repeat(indent);
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return String(data);
  }
  if (Array.isArray(data)) {
    return data.map(item => _deSerializeXml(item, 'item', indent)).join('\n');
  }
  if (typeof data === 'object' && data !== null) {
    const attrs  = Object.entries(data).filter(([k]) => k.startsWith('@'));
    const childs = Object.entries(data).filter(([k]) => !k.startsWith('@') && k !== '#text');
    const attrStr = attrs.map(([k, v]) => ` ${k.slice(1)}="${v}"`).join('');
    if (!childs.length && data['#text'] !== undefined) {
      return `${pad}<${rootName}${attrStr}>${data['#text']}</${rootName}>`;
    }
    if (!childs.length) return `${pad}<${rootName}${attrStr}/>`;
    const inner = childs.map(([k, v]) => {
      if (Array.isArray(v)) {
        return v.map(item => `${'  '.repeat(indent+1)}<${k}>${_deSerializeXml(item, k, 0)}</${k}>`).join('\n');
      }
      if (typeof v === 'object') return _deSerializeXml(v, k, indent + 1);
      return `${'  '.repeat(indent+1)}<${k}>${v}</${k}>`;
    }).join('\n');
    return `${pad}<${rootName}${attrStr}>\n${inner}\n${pad}</${rootName}>`;
  }
  return '';
}

function _deFormatXml(text) {
  // Parser puis re-sérialiser pour indenter proprement
  const parser  = new DOMParser();
  const doc     = parser.parseFromString(text.trim(), 'text/xml');
  const errEl   = doc.querySelector('parsererror');
  if (errEl) throw new Error('XML invalide');
  return _deXmlSerializeDoc(doc);
}

function _deXmlSerializeDoc(doc) {
  const decl = '<?xml version="1.0" encoding="UTF-8"?>';
  return decl + '\n' + _deXmlFormatNode(doc.documentElement, 0);
}

function _deXmlFormatNode(node, depth) {
  const pad = '  '.repeat(depth);
  if (node.nodeType === 3) {
    const t = node.textContent.trim();
    return t ? pad + t : '';
  }
  const tag   = node.nodeName;
  const attrs = Array.from(node.attributes ?? []).map(a => ` ${a.name}="${a.value}"`).join('');
  const children = Array.from(node.childNodes).filter(
    n => !(n.nodeType === 3 && !n.textContent.trim()) && n.nodeType !== 8
  );
  if (!children.length) return `${pad}<${tag}${attrs}/>`;
  if (children.length === 1 && children[0].nodeType === 3) {
    return `${pad}<${tag}${attrs}>${children[0].textContent.trim()}</${tag}>`;
  }
  const inner = children.map(c => _deXmlFormatNode(c, depth + 1)).filter(Boolean).join('\n');
  return `${pad}<${tag}${attrs}>\n${inner}\n${pad}</${tag}>`;
}

// ─── TOML ─────────────────────────────────────────────────────────────────────

function _deParseToml(text) {
  const result = {};
  let current  = result;
  let section  = null;

  const lines = text.split('\n');
  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Section [key] ou [[array]]
    const secMatch = line.match(/^\[{1,2}([^\]]+)\]{1,2}$/);
    if (secMatch) {
      const keys  = secMatch[1].split('.');
      const isArr = line.startsWith('[[');
      let obj = result;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      const last = keys[keys.length - 1];
      if (isArr) {
        if (!obj[last]) obj[last] = [];
        const newItem = {};
        obj[last].push(newItem);
        current = newItem;
      } else {
        if (!obj[last]) obj[last] = {};
        current = obj[last];
      }
      section = keys.join('.');
      continue;
    }

    // key = value
    const eqIdx = line.indexOf('=');
    if (eqIdx < 0) continue;
    const key   = line.slice(0, eqIdx).trim();
    const rawVal = line.slice(eqIdx + 1).trim();
    current[key] = _deParseTomlValue(rawVal);
  }
  return result;
}

function _deParseTomlValue(val) {
  if (val === 'true')  return true;
  if (val === 'false') return false;
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  if ((val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  if (val.startsWith('[')) {
    try {
      return JSON.parse(val.replace(/'/g, '"'));
    } catch { return val; }
  }
  return val;
}

function _deSerializeToml(data, prefix = '') {
  let simple = '';
  let sections = '';

  for (const [k, v] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v === null || v === undefined) continue;
    if (typeof v === 'object' && !Array.isArray(v)) {
      sections += `\n[${fullKey}]\n` + _deSerializeToml(v, '');
    } else if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
      for (const item of v) {
        sections += `\n[[${fullKey}]]\n` + _deSerializeTomlFlat(item);
      }
    } else {
      simple += `${k} = ${_deTomlValue(v)}\n`;
    }
  }
  return simple + sections;
}

function _deSerializeTomlFlat(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${k} = ${_deTomlValue(v)}`)
    .join('\n') + '\n';
}

function _deTomlValue(v) {
  if (typeof v === 'string')  return `"${v.replace(/"/g, '\\"')}"`;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return '[' + v.map(_deTomlValue).join(', ') + ']';
  return String(v);
}

function _deFormatToml(text) {
  // TOML n'a pas vraiment de formatter standard — on normalise juste les espaces
  return text.split('\n').map(line => {
    if (/^\s*#/.test(line) || /^\s*\[/.test(line) || !line.includes('=')) return line;
    const eq = line.indexOf('=');
    return line.slice(0, eq).trimEnd() + ' = ' + line.slice(eq + 1).trimStart();
  }).join('\n');
}

// ─── Conversion universelle ───────────────────────────────────────────────────

function _deConvert(text, fromFormat, toFormat) {
  if (fromFormat === toFormat) return _deAutoFormat(text, fromFormat);

  // Étape 1 : parser vers objet JS
  let data;
  switch (fromFormat) {
    case 'json': data = _deParseJson(text);  break;
    case 'csv':  data = _deParseCsv(text);   break;
    case 'xml':  data = _deParseXml(text);   break;
    case 'toml': data = _deParseToml(text);  break;
    default: throw new Error('Format source inconnu : ' + fromFormat);
  }

  // Étape 2 : sérialiser vers le format cible
  switch (toFormat) {
    case 'json': return _deSerializeJson(data);
    case 'csv':  {
      // Si l'objet est un tableau, direct; sinon envelopper
      const arr = Array.isArray(data) ? data : [data];
      return _deSerializeCsv(arr);
    }
    case 'xml':  {
      const decl = '<?xml version="1.0" encoding="UTF-8"?>\n';
      return decl + _deSerializeXml(data, 'root', 0);
    }
    case 'toml': return _deSerializeToml(data);
    default: throw new Error('Format cible inconnu : ' + toFormat);
  }
}

function _deAutoFormat(text, format) {
  switch (format) {
    case 'json': return _deFormatJson(text);
    case 'csv':  return _deFormatCsv(text);
    case 'xml':  return _deFormatXml(text);
    case 'toml': return _deFormatToml(text);
    default:     return text;
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function _deValidate(text, format) {
  try {
    switch (format) {
      case 'json': _deParseJson(text); break;
      case 'csv':  _deParseCsv(text);  break;
      case 'xml':  _deParseXml(text);  break;
      case 'toml': _deParseToml(text); break;
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── dataeditor/script/state.js ──
// ── Data Editor State ──

const DataeditorState = {
  _files: [],

  async load() {
    this._files = (await window.modulo.datafiles.getAll()) ?? [];
    return this._files;
  },

  async save() {
    await window.modulo.datafiles.save(this._files);
  },

  async add(name, format, content) {
    const f = {
      id:        uid(),
      title:     name,
      tags:      [format],
      content:   content ?? _dataeditorDefaultContent(format),
      folder:    format,
      createdAt: today(),
      updatedAt: today(),
    };
    this._files.unshift(f);
    await this.save();
    return f;
  },

  async updateContent(id, content) {
    const f = this._files.find(f => f.id === id);
    if (f) { f.content = content; f.updatedAt = today(); await this.save(); }
  },

  async rename(id, name) {
    const f = this._files.find(f => f.id === id);
    if (f) { f.title = name; await this.save(); }
  },

  async remove(id) {
    this._files = this._files.filter(f => f.id !== id);
    await this.save();
  },

  getById(id) {
    return this._files.find(f => f.id === id) ?? null;
  },

  getFormat(file) {
    return (file.tags ?? []).find(t => ['json','csv','xml','toml'].includes(t)) ?? 'json';
  },
};

// ── Contenu par défaut par format ─────────────────────────────────────────────
function _dataeditorDefaultContent(format) {
  const defaults = {
    json: `{
  "name": "Mon fichier",
  "version": "1.0.0",
  "description": "",
  "data": []
}`,
    csv: `id,nom,valeur,date
1,Premier,100,2025-01-01
2,Deuxième,200,2025-01-02
3,Troisième,300,2025-01-03`,
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <item id="1">
    <name>Premier</name>
    <value>100</value>
  </item>
  <item id="2">
    <name>Deuxième</name>
    <value>200</value>
  </item>
</root>`,
    toml: `# Configuration
name = "Mon fichier"
version = "1.0.0"

[settings]
debug = false
timeout = 30

[database]
host = "localhost"
port = 5432
name = "ma_base"`,
  };
  return defaults[format] ?? defaults.json;
}

// ── dataeditor/page/render.js ──
// ── Data Editor Render ──

async function renderDataeditor(container) {
  await DataeditorState.load();

  let _current   = null;
  let _saveTimer = null;
  let _filterFmt = 'all';

  const FORMATS = ['json', 'csv', 'xml', 'toml'];
  const FORMAT_COLORS = {
    json: '#34A853', csv: '#FBBC04', xml: '#4285F4', toml: '#FF6D00',
  };
  const FORMAT_ICONS = {
    json: '{ }', csv: '⊞', xml: '<>', toml: '⚙',
  };

  // ── Shell ─────────────────────────────────────────────────────────────────
  function renderShell() {
    container.innerHTML = `
      <div style="display:flex;height:calc(100vh - 36px);overflow:hidden">

        <!-- Sidebar -->
        <div style="width:210px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;background:var(--bg-surface)">

          <!-- Nouveau fichier -->
          <div style="padding:8px;border-bottom:1px solid var(--border)">
            <div style="font-size:10px;color:var(--text-tertiary);margin-bottom:5px;letter-spacing:.4px">NOUVEAU FICHIER</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
              ${FORMATS.map(fmt => `
                <button class="de-new-btn btn btn-secondary btn-sm" data-fmt="${fmt}" style="
                  border-left:3px solid ${FORMAT_COLORS[fmt]};font-size:11px;
                  justify-content:flex-start;gap:5px;padding:0 8px
                ">
                  <span style="font-family:var(--font-mono);font-size:10px;color:${FORMAT_COLORS[fmt]}">${FORMAT_ICONS[fmt]}</span>
                  ${fmt.toUpperCase()}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Filtre format -->
          <div style="padding:6px 8px;border-bottom:1px solid var(--border);display:flex;gap:3px;flex-wrap:wrap">
            <button class="de-filter btn btn-ghost btn-sm ${_filterFmt==='all'?'de-filter-active':''}" data-fmt="all" style="font-size:10px;height:22px;padding:0 6px">Tous</button>
            ${FORMATS.map(fmt => `
              <button class="de-filter btn btn-ghost btn-sm ${_filterFmt===fmt?'de-filter-active':''}" data-fmt="${fmt}" style="font-size:10px;height:22px;padding:0 6px;color:${FORMAT_COLORS[fmt]}">${fmt.toUpperCase()}</button>
            `).join('')}
          </div>

          <!-- Liste fichiers -->
          <div id="de-list" style="flex:1;overflow-y:auto"></div>
        </div>

        <!-- Main -->
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">

          <!-- Toolbar -->
          <div style="height:44px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;padding:0 12px;background:var(--bg-surface);flex-shrink:0">
            <span id="de-title" style="font-size:13px;font-weight:500;color:var(--text-secondary);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              Sélectionnez un fichier
            </span>
            <span id="de-fmt-badge" style="display:none"></span>
            <div style="flex:1"></div>

            <!-- Actions groupées -->
            <div id="de-actions" style="display:none;display:flex;align-items:center;gap:6px">
              <!-- Format -->
              <button class="btn btn-secondary btn-sm" id="de-format" title="Auto-indenter (Ctrl+Shift+F)" style="font-size:11px">
                ${icon('reset','12px')} Indenter
              </button>

              <!-- Convertir vers -->
              <div style="display:flex;align-items:center;gap:3px">
                <span style="font-size:10px;color:var(--text-tertiary)">→</span>
                ${FORMATS.map(fmt => `
                  <button class="de-convert btn btn-secondary btn-sm" data-to="${fmt}" style="
                    font-size:10px;padding:0 7px;height:28px;
                    border-left:2px solid ${FORMAT_COLORS[fmt]}
                  ">${fmt.toUpperCase()}</button>
                `).join('')}
              </div>

              <!-- Valider -->
              <button class="btn btn-secondary btn-sm" id="de-validate" title="Valider la syntaxe" style="font-size:11px">
                ${icon('check','12px')} Valider
              </button>

              <!-- Export -->
              <button class="btn btn-primary btn-sm" id="de-export" style="font-size:11px">
                ${icon('export','12px')} Exporter
              </button>

              <!-- Supprimer -->
              <button class="btn btn-ghost btn-sm" id="de-delete" style="color:var(--red)">
                ${icon('trash','13px')}
              </button>
            </div>
          </div>

          <!-- Éditeur + status -->
          <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative">
            <textarea id="de-editor" spellcheck="false" style="
              flex:1;padding:16px 18px;background:var(--bg-base);border:none;
              color:var(--text-primary);font-family:var(--font-mono);
              font-size:13px;line-height:1.7;resize:none;outline:none;tab-size:2;
              width:100%;box-sizing:border-box;
            " placeholder="Sélectionnez ou créez un fichier…" disabled></textarea>

            <!-- Notification inline -->
            <div id="de-notif" style="
              display:none;position:absolute;top:12px;right:16px;
              padding:6px 14px;border-radius:var(--radius-md);font-size:12px;
              backdrop-filter:blur(4px);border:1px solid;
            "></div>
          </div>

          <!-- Status bar -->
          <div style="height:22px;border-top:1px solid var(--border);padding:0 12px;display:flex;align-items:center;gap:12px;font-size:10px;color:var(--text-tertiary);background:var(--bg-surface);flex-shrink:0">
            <span id="de-status">—</span>
            <span style="flex:1"></span>
            <span id="de-stats"></span>
            <span>Ctrl+Shift+F = indenter · Ctrl+S = sauvegarder</span>
          </div>
        </div>
      </div>

      <style>
        .de-filter-active { background:var(--bg-active) !important; color:var(--blue-light) !important; }
        #de-actions { display:flex !important; }
      </style>
    `;

    _bindEvents();
    _renderList();

    // Masquer les actions au départ
    const actions = container.querySelector('#de-actions');
    if (actions) actions.style.display = 'none';
  }

  // ── Notification toast ────────────────────────────────────────────────────
  function _notify(msg, type = 'success') {
    const el = container.querySelector('#de-notif');
    if (!el) return;
    const colors = {
      success: { bg: 'rgba(52,168,83,.15)', border: 'rgba(52,168,83,.4)', text: '#57bb6e' },
      error:   { bg: 'rgba(234,67,53,.15)', border: 'rgba(234,67,53,.4)', text: '#f28b82' },
      info:    { bg: 'rgba(66,133,244,.15)', border: 'rgba(66,133,244,.4)', text: '#669df6' },
    };
    const c = colors[type] ?? colors.info;
    el.style.background = c.bg;
    el.style.borderColor = c.border;
    el.style.color = c.text;
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.display = 'none'; }, 2800);
  }

  // ── Ouvrir un fichier ─────────────────────────────────────────────────────
  function _openFile(id) {
    _current = id;
    const f   = DataeditorState.getById(id);
    if (!f) return;
    const fmt = DataeditorState.getFormat(f);

    const editor  = container.querySelector('#de-editor');
    const title   = container.querySelector('#de-title');
    const badge   = container.querySelector('#de-fmt-badge');
    const actions = container.querySelector('#de-actions');
    const status  = container.querySelector('#de-status');
    const stats   = container.querySelector('#de-stats');

    if (editor)  { editor.value = f.content; editor.disabled = false; }
    if (title)   title.textContent = f.title;
    if (badge)   {
      badge.style.display = 'inline-flex';
      badge.innerHTML = `<span style="
        padding:2px 8px;border-radius:var(--radius-full);font-size:10px;font-weight:600;
        font-family:var(--font-mono);background:${FORMAT_COLORS[fmt]}22;
        color:${FORMAT_COLORS[fmt]};border:1px solid ${FORMAT_COLORS[fmt]}44
      ">${fmt.toUpperCase()}</span>`;
    }
    if (actions) actions.style.display = 'flex';
    if (status)  status.textContent = `Modifié : ${f.updatedAt ?? f.createdAt ?? '—'}`;

    // Masquer les boutons de conversion vers le format actuel
    container.querySelectorAll('.de-convert').forEach(btn => {
      btn.style.opacity = btn.dataset.to === fmt ? '0.35' : '1';
      btn.disabled = btn.dataset.to === fmt;
    });

    _updateStats();
    _renderList();
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  function _updateStats() {
    const editor = container.querySelector('#de-editor');
    const stats  = container.querySelector('#de-stats');
    if (!editor || !stats) return;
    const text   = editor.value;
    const lines  = text.split('\n').length;
    const chars  = text.length;
    stats.textContent = `${lines} lignes · ${chars.toLocaleString()} caractères`;
  }

  // ── Auto-format ───────────────────────────────────────────────────────────
  function _doFormat() {
    const f = DataeditorState.getById(_current);
    if (!f) return;
    const fmt    = DataeditorState.getFormat(f);
    const editor = container.querySelector('#de-editor');
    if (!editor) return;
    try {
      const formatted = _deAutoFormat(editor.value, fmt);
      editor.value    = formatted;
      const d = DataeditorState.getById(_current);
      if (d) d.content = formatted;
      clearTimeout(_saveTimer);
      _saveTimer = setTimeout(() => DataeditorState.updateContent(_current, formatted), 300);
      _notify('Indenté ✓');
      _updateStats();
    } catch (e) {
      _notify('Erreur : ' + e.message, 'error');
    }
  }

  // ── Valider ───────────────────────────────────────────────────────────────
  function _doValidate() {
    const f = DataeditorState.getById(_current);
    if (!f) return;
    const fmt    = DataeditorState.getFormat(f);
    const editor = container.querySelector('#de-editor');
    if (!editor) return;
    const result = _deValidate(editor.value, fmt);
    if (result.ok) {
      _notify(`${fmt.toUpperCase()} valide ✓`, 'success');
    } else {
      _notify('Invalide : ' + result.error, 'error');
    }
  }

  // ── Convertir ─────────────────────────────────────────────────────────────
  async function _doConvert(toFmt) {
    const f = DataeditorState.getById(_current);
    if (!f) return;
    const fromFmt = DataeditorState.getFormat(f);
    const editor  = container.querySelector('#de-editor');
    if (!editor) return;

    try {
      const converted = _deConvert(editor.value, fromFmt, toFmt);

      // Créer un nouveau fichier avec le contenu converti
      const newName = f.title.replace(/\.(json|csv|xml|toml)$/i, '') + '.' + toFmt;
      const newFile = await DataeditorState.add(newName, toFmt, converted);
      _renderList();
      _openFile(newFile.id);
      _notify(`Converti ${fromFmt.toUpperCase()} → ${toFmt.toUpperCase()} ✓`, 'success');
    } catch (e) {
      _notify('Conversion échouée : ' + e.message, 'error');
    }
  }

  // ── Export fichier ────────────────────────────────────────────────────────
  function _doExport() {
    const f = DataeditorState.getById(_current);
    if (!f) return;
    const fmt    = DataeditorState.getFormat(f);
    const editor = container.querySelector('#de-editor');
    const text   = editor?.value ?? f.content;
    const mimes  = { json:'application/json', csv:'text/csv', xml:'application/xml', toml:'text/plain' };
    const blob   = new Blob([text], { type: mimes[fmt] ?? 'text/plain' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    const fname  = f.title.includes('.') ? f.title : f.title + '.' + fmt;
    a.download   = fname;
    a.href       = url;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    _notify(`Exporté : ${fname}`, 'info');
  }

  // ── Events ────────────────────────────────────────────────────────────────
  function _bindEvents() {
    // Nouveaux fichiers
    container.querySelectorAll('.de-new-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fmt = btn.dataset.fmt;
        Modal.open(`Nouveau fichier ${fmt.toUpperCase()}`, `
          <input class="input" name="name" placeholder="nom-du-fichier">
        `, async () => {
          let name = Modal.getInput('name')?.trim() || 'nouveau';
          if (!name.endsWith('.' + fmt)) name += '.' + fmt;
          const f = await DataeditorState.add(name, fmt);
          _renderList();
          _openFile(f.id);
        });
      });
    });

    // Filtres
    container.querySelectorAll('.de-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        _filterFmt = btn.dataset.fmt;
        container.querySelectorAll('.de-filter').forEach(b =>
          b.classList.toggle('de-filter-active', b.dataset.fmt === _filterFmt));
        _renderList();
      });
    });

    // Éditeur — auto-save
    container.querySelector('#de-editor')?.addEventListener('input', e => {
      if (!_current) return;
      const code = e.target.value;
      const d = DataeditorState.getById(_current);
      if (d) d.content = code;
      _updateStats();
      clearTimeout(_saveTimer);
      _saveTimer = setTimeout(async () => {
        await DataeditorState.updateContent(_current, code);
        const s = container.querySelector('#de-status');
        if (s) s.textContent = 'Sauvegardé ' + today();
      }, 800);
    });

    // Raccourcis clavier
    container.querySelector('#de-editor')?.addEventListener('keydown', e => {
      // Tab → 2 espaces
      if (e.key === 'Tab') {
        e.preventDefault();
        const el = e.target, s = el.selectionStart;
        el.value = el.value.slice(0, s) + '  ' + el.value.slice(el.selectionEnd);
        el.selectionStart = el.selectionEnd = s + 2;
      }
      // Ctrl+Shift+F → indenter
      if (e.key === 'F' && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        _doFormat();
      }
      // Ctrl+S → sauvegarder
      if (e.key === 's' && e.ctrlKey) {
        e.preventDefault();
        clearTimeout(_saveTimer);
        DataeditorState.updateContent(_current, e.target.value).then(() => {
          _notify('Sauvegardé ✓', 'info');
        });
      }
    });

    // Boutons toolbar
    container.querySelector('#de-format')?.addEventListener('click', _doFormat);
    container.querySelector('#de-validate')?.addEventListener('click', _doValidate);
    container.querySelector('#de-export')?.addEventListener('click', _doExport);

    container.querySelector('#de-delete')?.addEventListener('click', async () => {
      if (!_current) return;
      const f = DataeditorState.getById(_current);
      Modal.open('Supprimer', `Supprimer "${f?.title}" ?`, async () => {
        await DataeditorState.remove(_current);
        _current = null;
        renderShell();
      });
    });

    // Conversion
    container.querySelectorAll('.de-convert').forEach(btn => {
      btn.addEventListener('click', () => _doConvert(btn.dataset.to));
    });
  }

  // ── Liste sidebar ─────────────────────────────────────────────────────────
  function _renderList() {
    const list = container.querySelector('#de-list');
    if (!list) return;

    let files = DataeditorState._files;
    if (_filterFmt !== 'all') {
      files = files.filter(f => DataeditorState.getFormat(f) === _filterFmt);
    }

    if (!files.length) {
      list.innerHTML = `<div style="padding:20px 12px;text-align:center;font-size:11px;color:var(--text-tertiary)">
        Aucun fichier.<br>Créez-en un avec les boutons ci-dessus.
      </div>`;
      return;
    }

    list.innerHTML = files.map(f => {
      const fmt = DataeditorState.getFormat(f);
      const isCurrent = _current === f.id;
      return `
        <div class="de-item" data-id="${f.id}" style="
          padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--border);
          border-left:3px solid ${isCurrent ? FORMAT_COLORS[fmt] : 'transparent'};
          background:${isCurrent ? 'var(--bg-active)' : 'transparent'};
        ">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="
              font-family:var(--font-mono);font-size:9px;font-weight:600;
              padding:1px 5px;border-radius:3px;
              background:${FORMAT_COLORS[fmt]}22;color:${FORMAT_COLORS[fmt]};
              flex-shrink:0
            ">${fmt.toUpperCase()}</span>
            <span style="
              font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
              color:${isCurrent ? 'var(--blue-light)' : 'var(--text-primary)'}
            ">${f.title}</span>
          </div>
          <div style="font-size:10px;color:var(--text-tertiary);margin-top:2px;padding-left:2px">
            ${f.updatedAt ?? f.createdAt ?? ''}
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.de-item').forEach(el => {
      el.addEventListener('click', () => _openFile(el.dataset.id));
    });
  }

  renderShell();
}

// ── Expose renderFn ──
window["renderDataeditor"] = renderDataeditor;
