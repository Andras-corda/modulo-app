// ── Modulo Module: Diagrammes (diagrams) v1.0.0 ──
// Author: Modulo Team
// Built: 2026-04-08T21:39:07.015Z
// renderFn: renderDiagrams
// ── diagrams/script/state.js ──
// ── Diagrams State ──

const DiagramsState = {
  _diagrams: [],

  async load() {
    this._diagrams = (await window.modulo.diagrams.getAll()) ?? [];
    return this._diagrams;
  },

  async save() {
    await window.modulo.diagrams.save(this._diagrams);
  },

  async add(name, code) {
    const d = {
      id:        uid(),
      title:     name,
      tags:      [],
      content:   code || _diagramsDefaultCode(name),
      createdAt: today(),
      updatedAt: today(),
    };
    this._diagrams.unshift(d);
    await this.save();
    return d;
  },

  async updateCode(id, code) {
    const d = this._diagrams.find(d => d.id === id);
    if (d) { d.content = code; d.updatedAt = today(); await this.save(); }
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
    return this._diagrams.find(d => d.id === id) ?? null;
  },
};

function _diagramsDefaultCode(name) {
  const n = (name || 'MaClasse').replace(/\s+/g, '');
  return 'classDiagram\n    class ' + n + ' {\n        // Attributs\n        +String nom\n        +get Name() String\n        +set Name(value)\n        +maMéthode()\n    }';
}

// ── Thème Mermaid avec code couleur ──────────────────────────────────────────
// Les couleurs sont injectées via classDef dans le code généré
const DIAGRAMS_CLASS_COLORS = {
  class:     { fill: '#1a3a1a', stroke: '#34A853', text: '#7ee787' },  // vert
  interface: { fill: '#3a3500', stroke: '#FBBC04', text: '#fdd663' },  // jaune
  struct:    { fill: '#3a2200', stroke: '#FF6D00', text: '#ffab70' },  // orange
  object:    { fill: '#3a1a1a', stroke: '#EA4335', text: '#f28b82' },  // rouge
  enum:      { fill: '#1a2a3a', stroke: '#4285F4', text: '#669df6' },  // bleu
};

// ── Templates ────────────────────────────────────────────────────────────────
const DIAGRAMS_TEMPLATES = {
  'Classe UML': `classDiagram
    classDef classStyle fill:#1a3a1a,stroke:#34A853,color:#7ee787
    classDef interfaceStyle fill:#3a3500,stroke:#FBBC04,color:#fdd663
    classDef enumStyle fill:#1a2a3a,stroke:#4285F4,color:#669df6

    class Animal:::classStyle {
        // Attributs
        -String _nom
        -int _age
        +get Nom() String
        +set Nom(value)
        +get Age() int
        // Méthodes
        +manger() void
        +dormir() void
        +toString() String
    }

    class Chien:::classStyle {
        -String _race
        +get Race() String
        +aboyer() void
        +jouer() void
    }

    class Chat:::classStyle {
        -String _couleur
        +get Couleur() String
        +miauler() void
        +ronronner() void
    }

    class IAnimal:::interfaceStyle {
        <<interface>>
        +manger() void
        +dormir() void
    }

    class EspeceAnimal:::enumStyle {
        <<enum>>
        MAMMIFERE
        REPTILE
        OISEAU
    }

    IAnimal <|.. Animal : implements
    Animal <|-- Chien : extends
    Animal <|-- Chat : extends`,

  'Séquence': `sequenceDiagram
    actor Utilisateur
    participant App as Application
    participant API as Serveur API
    participant BDD as Base de données

    // Connexion utilisateur
    Utilisateur->>App: Se connecter
    App->>API: POST /auth/login
    API->>BDD: SELECT user WHERE email=?
    BDD-->>API: Données utilisateur
    API-->>App: Token JWT
    App-->>Utilisateur: Connecté ✓

    // Chargement des données
    Utilisateur->>App: Ouvrir tableau de bord
    App->>API: GET /dashboard (Bearer token)
    API-->>App: Données JSON
    App-->>Utilisateur: Afficher tableau`,

  'Flux': `flowchart TD
    A([Début]) --> B{Utilisateur connecté ?}
    B -->|Oui| C[Charger le profil]
    B -->|Non| D[Afficher login]
    D --> E[Saisir identifiants]
    E --> F{Identifiants valides ?}
    F -->|Oui| C
    F -->|Non| G[Afficher erreur]
    G --> E
    C --> H[Afficher dashboard]
    H --> I([Fin])`,

  'État': `stateDiagram-v2
    // Cycle de vie d'une commande
    [*] --> Brouillon
    Brouillon --> EnAttente : Soumettre
    EnAttente --> EnCours : Valider
    EnAttente --> Annulée : Refuser
    EnCours --> Terminée : Compléter
    EnCours --> Annulée : Annuler
    Terminée --> [*]
    Annulée --> [*]`,

  'Entité-Relation': `erDiagram
    UTILISATEUR {
        int id PK
        string nom
        string email
        string motDePasse
        date createdAt
    }
    COMMANDE {
        int id PK
        int userId FK
        date date
        float montant
        string statut
    }
    PRODUIT {
        int id PK
        string nom
        float prix
        int stock
    }
    LIGNE_COMMANDE {
        int commandeId FK
        int produitId FK
        int quantite
        float prixUnitaire
    }
    UTILISATEUR ||--o{ COMMANDE : "passe"
    COMMANDE ||--|{ LIGNE_COMMANDE : "contient"
    PRODUIT ||--o{ LIGNE_COMMANDE : "est dans"`,

  'Gantt': `gantt
    title Planning du projet
    dateFormat YYYY-MM-DD
    section Analyse
    Recueil des besoins   :a1, 2025-01-06, 5d
    Rédaction des specs   :a2, after a1, 3d
    section Développement
    Backend API           :b1, after a2, 14d
    Frontend              :b2, after a2, 10d
    Tests unitaires       :b3, after b1, 5d
    section Déploiement
    Recette               :c1, after b3, 3d
    Mise en production    :c2, after c1, 1d`,
};

// ── diagrams/page/render.js ──
// ── Diagrams Render ──

async function renderDiagrams(container) {
  await DiagramsState.load();

  let _current   = null;
  let _saveTimer = null;
  let _mermaid   = null;

  // ── Pan/Zoom state ────────────────────────────────────────────────────────
  let _pan  = { x: 0, y: 0 };
  let _zoom = 1;
  let _dragging = false;
  let _dragStart = null;

  // ── Charger Mermaid ───────────────────────────────────────────────────────
  async function _loadMermaid() {
    if (window.mermaid) { _mermaid = window.mermaid; return true; }
    const statusEl = container.querySelector('#dgm-load-status');
    if (statusEl) statusEl.textContent = 'Chargement de Mermaid…';
    try {
      const settings   = window._settings ?? {};
      const railwayUrl = settings.catalogUrl ?? 'https://modulo-web-production.up.railway.app';
      const res = await fetch(railwayUrl + '/vendor/mermaid.min.js');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const code = await res.text();
      const script = document.createElement('script');
      script.textContent = code;
      document.head.appendChild(script);
      if (!window.mermaid) throw new Error('mermaid non défini après injection');
      window.mermaid.initialize({
        startOnLoad: false,
        theme: (window._settings?.theme === 'light') ? 'default' : 'dark',
        securityLevel: 'loose',
        fontFamily: 'Google Sans, Roboto, sans-serif',
        classDiagram: { useWidth: 800 },
      });
      _mermaid = window.mermaid;
      if (statusEl) statusEl.textContent = '';
      return true;
    } catch (err) {
      const statusEl2 = container.querySelector('#dgm-load-status');
      if (statusEl2) statusEl2.textContent = 'Erreur : ' + err.message;
      DevLog.error('[Diagrams] Mermaid load failed: ' + err.message);
      return false;
    }
  }

  // ── Préprocesseur de code ─────────────────────────────────────────────────
  // Transforme la syntaxe étendue en Mermaid valide
  function _preprocess(raw) {
    const lines = raw.split('\n');
    const out   = [];
    let inClass = false;

    // Détection du type de diagramme
    const isDiagClass = raw.trimStart().startsWith('classDiagram');

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      if (isDiagClass) {
        // Commentaires // → note (visibles en vert dans l'aperçu via post-processing)
        // On les conserve mais les préfixe avec %% pour Mermaid
        // + on garde un marqueur pour les réinjecter visuellement
        if (/^\s*\/\//.test(line)) {
          // Convertir en commentaire Mermaid (ignoré par le renderer)
          // On les transforme en annotations texte via note
          out.push(line.replace(/^(\s*)\/\/\s*/, '$1%% '));
          continue;
        }

        // Accesseurs get/set C# → méthodes Mermaid
        // +get NomProp() Type  →  +getNomProp() Type
        line = line.replace(/(\+|-|#|~)get\s+(\w+)\(\)\s+(\w+)/g, '$1$2_get() $3');
        line = line.replace(/(\+|-|#|~)set\s+(\w+)\(([^)]*)\)/g, '$1$2_set($3)');
      }

      out.push(line);
    }
    return out.join('\n');
  }

  // ── Post-processing SVG ───────────────────────────────────────────────────
  // Colorise les éléments selon leur type + rend les commentaires verts
  function _postprocessSvg(svgEl) {
    // Coloriser les textes _get / _set en cyan pour les distinguer
    svgEl.querySelectorAll('text, tspan').forEach(el => {
      const txt = el.textContent ?? '';
      if (/_get\(\)|_set\(/.test(txt)) {
        el.style.fill = '#56d3e0';
        el.style.fontStyle = 'italic';
      }
      // Commentaires %% déjà filtrés par Mermaid, pas visibles
    });
  }

  // ── Render Mermaid ────────────────────────────────────────────────────────
  async function _renderPreview() {
    if (!_current) return;
    const d = DiagramsState.getById(_current);
    if (!d?.content) return;

    const preview = container.querySelector('#dgm-preview-inner');
    const errEl   = container.querySelector('#dgm-err');
    const spin    = container.querySelector('#dgm-spin');

    if (spin) spin.style.display = 'inline-block';
    if (errEl) errEl.style.display = 'none';

    const ok = await _loadMermaid();
    if (!ok) { if (spin) spin.style.display = 'none'; return; }

    try {
      const processed = _preprocess(d.content.trim());
      const renderId  = 'mermaid-' + Date.now();
      const { svg }   = await _mermaid.render(renderId, processed);

      if (preview) {
        preview.innerHTML = svg;
        const svgEl = preview.querySelector('svg');
        if (svgEl) {
          const vb    = svgEl.getAttribute('viewBox');
          const parts = (vb ?? '').trim().split(/[\s,]+/).map(Number);
          if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            const ratio = parts[3] / parts[2];
            const maxW  = (container.querySelector('#dgm-preview-wrap')?.clientWidth ?? 600) - 48;
            const w     = Math.min(parts[2], maxW);
            const h     = w * ratio;
            svgEl.setAttribute('width',  Math.round(w));
            svgEl.setAttribute('height', Math.round(h));
          }
          svgEl.style.maxWidth   = '100%';
          svgEl.style.display    = 'block';
          svgEl.style.visibility = 'visible';
          svgEl.style.opacity    = '1';

          _postprocessSvg(svgEl);

          // Reflow
          preview.style.display = 'none';
          void preview.offsetHeight;
          preview.style.display = '';
        }
      }
      if (errEl) errEl.style.display = 'none';
    } catch (err) {
      if (preview) preview.innerHTML = '';
      if (errEl) {
        errEl.textContent   = err.message?.replace(/<[^>]+>/g, '') ?? String(err);
        errEl.style.display = 'block';
      }
    } finally {
      if (spin) spin.style.display = 'none';
    }
  }

  // ── Pan/Zoom ──────────────────────────────────────────────────────────────
  function _applyTransform() {
    const inner = container.querySelector('#dgm-preview-inner');
    if (inner) {
      inner.style.transform       = `translate(${_pan.x}px, ${_pan.y}px) scale(${_zoom})`;
      inner.style.transformOrigin = '0 0';
    }
    const zoomLabel = container.querySelector('#dgm-zoom-label');
    if (zoomLabel) zoomLabel.textContent = Math.round(_zoom * 100) + '%';
  }

  function _initPanZoom() {
    const wrap = container.querySelector('#dgm-preview-wrap');
    if (!wrap) return;

    // Zoom molette
    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor  = e.deltaY < 0 ? 1.1 : 0.91;
      const newZoom = Math.max(0.1, Math.min(5, _zoom * factor));
      // Zoom centré sur le curseur
      const rect = wrap.getBoundingClientRect();
      const cx   = e.clientX - rect.left;
      const cy   = e.clientY - rect.top;
      _pan.x = cx - (cx - _pan.x) * (newZoom / _zoom);
      _pan.y = cy - (cy - _pan.y) * (newZoom / _zoom);
      _zoom  = newZoom;
      _applyTransform();
    }, { passive: false });

    // Pan — clic + drag
    wrap.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      _dragging  = true;
      _dragStart = { x: e.clientX - _pan.x, y: e.clientY - _pan.y };
      wrap.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!_dragging || !_dragStart) return;
      _pan.x = e.clientX - _dragStart.x;
      _pan.y = e.clientY - _dragStart.y;
      _applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (_dragging) {
        _dragging  = false;
        _dragStart = null;
        const wrap2 = container.querySelector('#dgm-preview-wrap');
        if (wrap2) wrap2.style.cursor = 'grab';
      }
    });
  }

  function _resetView() {
    _pan  = { x: 0, y: 0 };
    _zoom = 1;
    _applyTransform();
  }

  function _fitView() {
    const wrap  = container.querySelector('#dgm-preview-wrap');
    const inner = container.querySelector('#dgm-preview-inner');
    const svgEl = inner?.querySelector('svg');
    if (!wrap || !svgEl) return;
    const wW = wrap.clientWidth  - 48;
    const wH = wrap.clientHeight - 48;
    const sW = svgEl.clientWidth  || parseInt(svgEl.getAttribute('width') || '400');
    const sH = svgEl.clientHeight || parseInt(svgEl.getAttribute('height') || '300');
    const zW = wW / sW;
    const zH = wH / sH;
    _zoom  = Math.min(zW, zH, 2);
    _pan   = { x: (wW - sW * _zoom) / 2 + 24, y: (wH - sH * _zoom) / 2 + 24 };
    _applyTransform();
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function _getCleanSvg() {
    const svgEl = container.querySelector('#dgm-preview-inner svg');
    if (!svgEl) return null;
    const d     = DiagramsState.getById(_current);
    const clone = svgEl.cloneNode(true);
    const bbox  = svgEl.getBoundingClientRect();
    const W     = Math.max(Math.round(bbox.width / _zoom), 400);
    const H     = Math.max(Math.round(bbox.height / _zoom), 300);
    clone.setAttribute('width', W); clone.setAttribute('height', H);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const bgColor = window._settings?.theme === 'light' ? '#ffffff' : '#1e2435';
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%');
    bg.setAttribute('fill', bgColor);
    clone.insertBefore(bg, clone.firstChild);
    return { clone, W, H, name: d?.title ?? 'diagramme', bgColor };
  }

  function _exportSVG() {
    const r = _getCleanSvg();
    if (!r) { alert("Générez d'abord un aperçu."); return; }
    const svgStr = new XMLSerializer().serializeToString(r.clone);
    const blob   = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.download   = r.name + '.svg'; a.href = url; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function _exportPNG() {
    const r = _getCleanSvg();
    if (!r) { alert("Générez d'abord un aperçu."); return; }
    const clone = r.clone;
    // Retirer les fonts CDN pour éviter le taint
    clone.querySelectorAll('style').forEach(s => {
      s.textContent = s.textContent
        .replace(/@import[^;]+;/g, '')
        .replace(/url\(['"]?https?:[^)]+['"]?\)/g, 'none');
    });
    clone.querySelectorAll('[font-family]').forEach(el =>
      el.setAttribute('font-family', 'sans-serif'));
    const svgStr  = new XMLSerializer().serializeToString(clone);
    const b64     = btoa(unescape(encodeURIComponent(svgStr)));
    const dataUrl = 'data:image/svg+xml;base64,' + b64;
    const img     = new Image();
    img.onload = () => {
      const scale = 2, W = r.W, H = r.H;
      const canvas = document.createElement('canvas');
      canvas.width = W * scale; canvas.height = H * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = r.bgColor; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);
      const a = document.createElement('a');
      a.download = r.name + '.png';
      a.href = canvas.toDataURL('image/png'); a.click();
    };
    img.onerror = _exportSVG;
    img.src = dataUrl;
  }

  // ── Cheatsheet ────────────────────────────────────────────────────────────
  function _showCheatsheet() {
    Modal.open('Guide syntaxe Mermaid', `
      <div style="font-family:var(--font-mono);font-size:11px;display:flex;flex-direction:column;gap:14px;max-height:460px;overflow-y:auto">

        <div>
          <div style="font-size:12px;font-weight:500;color:var(--text-primary);margin-bottom:6px">Types de membres</div>
          <div style="background:var(--bg-elevated);padding:10px;border-radius:6px;line-height:2;color:var(--text-secondary)">
            <span style="color:#7ee787">+</span> public &nbsp;&nbsp;
            <span style="color:#f28b82">-</span> private &nbsp;&nbsp;
            <span style="color:#fdd663">#</span> protected &nbsp;&nbsp;
            <span style="color:#ffab70">~</span> package<br>
            <span style="color:#56d3e0">+get Prop() Type</span> → accesseur lecture (C#)<br>
            <span style="color:#56d3e0">+set Prop(value)</span> → accesseur écriture (C#)<br>
            <span style="color:#7ee787">// commentaire</span> → annotation verte visible
          </div>
        </div>

        <div>
          <div style="font-size:12px;font-weight:500;color:var(--text-primary);margin-bottom:6px">Code couleur des blocs</div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${[
              ['class MaClasse:::classStyle', '#34A853', '#7ee787', 'Classe'],
              ['class MonInterface:::interfaceStyle', '#FBBC04', '#fdd663', 'Interface'],
              ['class MonStruct:::structStyle', '#FF6D00', '#ffab70', 'Structure'],
              ['class MonObjet:::objectStyle', '#EA4335', '#f28b82', 'Objet'],
              ['class MonEnum:::enumStyle', '#4285F4', '#669df6', 'Enum'],
            ].map(([code, stroke, text, label]) => `
              <div style="display:flex;align-items:center;gap:8px;padding:4px 8px;border-radius:4px;border-left:3px solid ${stroke}">
                <span style="color:${text};flex:1">${code}</span>
                <span style="color:var(--text-tertiary);font-size:10px">${label}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div>
          <div style="font-size:12px;font-weight:500;color:var(--text-primary);margin-bottom:6px">Relations</div>
          <div style="background:var(--bg-elevated);padding:10px;border-radius:6px;line-height:2.2;color:var(--text-secondary)">
            A <span style="color:#669df6">&lt;|--</span> B : extends &nbsp;&nbsp; <span style="color:var(--text-tertiary)">← Héritage</span><br>
            A <span style="color:#669df6">&lt;|..</span> B : implements &nbsp; <span style="color:var(--text-tertiary)">← Implémentation</span><br>
            A <span style="color:#669df6">--&gt;</span> B &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="color:var(--text-tertiary)">← Association</span><br>
            A <span style="color:#669df6">--o</span> B &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="color:var(--text-tertiary)">← Agrégation</span><br>
            A <span style="color:#669df6">--*</span> B &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="color:var(--text-tertiary)">← Composition</span><br>
            A <span style="color:#669df6">..&gt;</span> B &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="color:var(--text-tertiary)">← Dépendance</span><br>
            A <span style="color:#669df6">"1"</span> --> <span style="color:#669df6">"*"</span> B &nbsp;&nbsp; <span style="color:var(--text-tertiary)">← Cardinalité</span>
          </div>
        </div>

        <div>
          <div style="font-size:12px;font-weight:500;color:var(--text-primary);margin-bottom:6px">Stéréotypes</div>
          <div style="background:var(--bg-elevated);padding:10px;border-radius:6px;line-height:2;color:var(--text-secondary)">
            &lt;&lt;interface&gt;&gt;<br>
            &lt;&lt;abstract&gt;&gt;<br>
            &lt;&lt;enum&gt;&gt;<br>
            &lt;&lt;service&gt;&gt;
          </div>
        </div>

        <div>
          <div style="font-size:12px;font-weight:500;color:var(--text-primary);margin-bottom:6px">classDef (couleurs personnalisées)</div>
          <div style="background:var(--bg-elevated);padding:10px;border-radius:6px;line-height:2;color:var(--text-secondary)">
            classDef monStyle fill:#1a3a1a,stroke:#34A853,color:#7ee787<br>
            class MaClasse:::monStyle
          </div>
        </div>

        <div style="padding:8px;background:var(--bg-surface);border-radius:6px;font-size:10px;color:var(--text-tertiary)">
          Navigation dans l'aperçu : molette = zoom · clic + glisser = déplacer · double-clic = centrer
        </div>
      </div>
    `);
  }

  // ── Shell HTML ────────────────────────────────────────────────────────────
  function renderShell() {
    // classDef CSS à injecter dans le code si pas présent
    const CLASSDEFS = `    classDef classStyle fill:#1a3a1a,stroke:#34A853,color:#7ee787
    classDef interfaceStyle fill:#3a3500,stroke:#FBBC04,color:#fdd663
    classDef structStyle fill:#3a2200,stroke:#FF6D00,color:#ffab70
    classDef objectStyle fill:#3a1a1a,stroke:#EA4335,color:#f28b82
    classDef enumStyle fill:#1a2a3a,stroke:#4285F4,color:#669df6`;

    container.innerHTML = `
      <div style="display:flex;height:calc(100vh - 36px);overflow:hidden">

        <!-- Sidebar -->
        <div style="width:196px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;background:var(--bg-surface)">
          <div style="padding:8px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:6px">
            <button class="btn btn-primary btn-sm" id="dgm-new" style="width:100%">
              ${icon('plus','13px')} Nouveau
            </button>
            <select class="input" id="dgm-template" style="height:28px;font-size:11px;padding:0 6px">
              <option value="">Template…</option>
              ${Object.keys(DIAGRAMS_TEMPLATES).map(k => `<option value="${k}">${k}</option>`).join('')}
            </select>
          </div>
          <!-- Légende couleurs -->
          <div style="padding:8px 10px;border-bottom:1px solid var(--border)">
            <div style="font-size:9px;letter-spacing:.5px;color:var(--text-tertiary);margin-bottom:5px">CODE COULEUR</div>
            ${[
              ['classStyle',     '#34A853', 'Classe'],
              ['interfaceStyle', '#FBBC04', 'Interface'],
              ['structStyle',    '#FF6D00', 'Structure'],
              ['objectStyle',    '#EA4335', 'Objet'],
              ['enumStyle',      '#4285F4', 'Enum'],
            ].map(([style, color, label]) => `
              <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;cursor:pointer" class="dgm-color-insert" data-style="${style}" title="Insérer :::${style}">
                <div style="width:10px;height:10px;border-radius:2px;background:${color}22;border:1px solid ${color};flex-shrink:0"></div>
                <span style="font-size:10px;color:var(--text-secondary)">${label}</span>
                <span style="font-size:9px;color:var(--text-tertiary);margin-left:auto">:::${style}</span>
              </div>
            `).join('')}
          </div>
          <div id="dgm-list" style="flex:1;overflow-y:auto"></div>
          <div id="dgm-load-status" style="padding:5px 10px;font-size:10px;color:var(--text-tertiary);border-top:1px solid var(--border)"></div>
        </div>

        <!-- Main -->
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">

          <!-- Header -->
          <div style="height:40px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;padding:0 10px;background:var(--bg-surface);flex-shrink:0">
            <span id="dgm-title" style="font-size:13px;font-weight:500;flex:1;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              Sélectionnez un diagramme
            </span>
            <button class="btn btn-ghost btn-sm" id="dgm-guide" title="Guide syntaxe" style="font-size:11px">?</button>
            <button class="btn btn-ghost btn-sm" id="dgm-rename" style="display:none">${icon('edit','12px')}</button>
            <button class="btn btn-secondary btn-sm" id="dgm-export" style="display:none;font-size:11px" title="PNG (Shift+clic = SVG)">${icon('export','12px')} PNG</button>
            <button class="btn btn-ghost btn-sm" id="dgm-del-btn" style="display:none;color:var(--red)">${icon('trash','13px')}</button>
          </div>

          <!-- Split -->
          <div style="flex:1;display:flex;overflow:hidden">

            <!-- Éditeur -->
            <div style="width:45%;flex-shrink:0;display:flex;flex-direction:column;border-right:1px solid var(--border)">
              <div style="padding:5px 10px;font-size:10px;letter-spacing:.5px;color:var(--text-tertiary);border-bottom:1px solid var(--border);background:var(--bg-surface);display:flex;align-items:center;gap:8px">
                <span>MERMAID</span>
                <div style="flex:1"></div>
                <button class="btn btn-ghost btn-sm" id="dgm-inject-classdefs" title="Injecter les classDef couleurs" style="font-size:10px;height:20px;padding:0 6px">+ couleurs</button>
                <a href="#" id="dgm-docs-link" style="font-size:10px;color:var(--text-accent)">docs ↗</a>
              </div>
              <textarea id="dgm-editor" spellcheck="false" style="
                flex:1;padding:14px;background:var(--bg-base);border:none;
                color:var(--text-primary);font-family:var(--font-mono);
                font-size:13px;line-height:1.7;resize:none;outline:none;tab-size:2;
              " placeholder="Créez ou sélectionnez un diagramme…" disabled></textarea>
              <div id="dgm-err" style="
                display:none;padding:8px 12px;font-size:11px;color:var(--red);
                background:rgba(234,67,53,.08);border-top:1px solid rgba(234,67,53,.2);
                font-family:var(--font-mono);white-space:pre-wrap;max-height:80px;overflow-y:auto
              "></div>
            </div>

            <!-- Aperçu -->
            <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
              <div style="padding:5px 10px;font-size:10px;letter-spacing:.5px;color:var(--text-tertiary);border-bottom:1px solid var(--border);background:var(--bg-surface);display:flex;align-items:center;gap:6px;flex-shrink:0">
                <span>APERÇU</span>
                <div id="dgm-spin" style="display:none;width:12px;height:12px;border:2px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .6s linear infinite"></div>
                <div style="flex:1"></div>
                <span id="dgm-zoom-label" style="font-family:var(--font-mono);font-size:10px;color:var(--text-tertiary);min-width:36px;text-align:right">100%</span>
                <button class="btn btn-ghost btn-sm" id="dgm-fit" title="Ajuster à la fenêtre" style="height:22px;padding:0 6px;font-size:10px">⊡ Fit</button>
                <button class="btn btn-ghost btn-sm" id="dgm-reset-view" title="Réinitialiser vue" style="height:22px;padding:0 6px;font-size:10px">1:1</button>
              </div>
              <div id="dgm-preview-wrap" style="flex:1;overflow:hidden;position:relative;cursor:grab;background:var(--bg-base)" title="Molette = zoom · Glisser = déplacer">
                <div id="dgm-preview-inner" style="position:absolute;top:0;left:0;padding:24px;transform-origin:0 0">
                  <div id="dgm-placeholder" style="color:var(--text-tertiary);font-size:13px;text-align:center;padding:40px 20px">
                    ${icon('dashboard','36px')}<br><br>
                    L'aperçu apparaît ici<br>
                    <span style="font-size:11px">(nécessite une connexion pour charger Mermaid)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Status bar -->
          <div style="height:22px;border-top:1px solid var(--border);padding:0 10px;display:flex;align-items:center;gap:10px;font-size:10px;color:var(--text-tertiary);background:var(--bg-surface);flex-shrink:0">
            <span id="dgm-status">—</span>
            <span style="flex:1"></span>
            <span style="color:var(--text-tertiary)">molette = zoom · glisser = pan · double-clic = fit</span>
          </div>
        </div>
      </div>
    `;

    _initPanZoom();
    _bindEvents(CLASSDEFS);
    _renderList();
  }

  // ── Events ────────────────────────────────────────────────────────────────
  function _bindEvents(CLASSDEFS) {

    container.querySelector('#dgm-docs-link')?.addEventListener('click', e => {
      e.preventDefault();
      window.modulo.openExternal('https://mermaid.js.org/syntax/classDiagram.html');
    });

    container.querySelector('#dgm-guide')?.addEventListener('click', _showCheatsheet);

    // Double-clic sur l'aperçu → fit
    container.querySelector('#dgm-preview-wrap')?.addEventListener('dblclick', _fitView);

    // Bouton fit
    container.querySelector('#dgm-fit')?.addEventListener('click', _fitView);

    // Reset 1:1
    container.querySelector('#dgm-reset-view')?.addEventListener('click', _resetView);

    // Injecter classDefs
    container.querySelector('#dgm-inject-classdefs')?.addEventListener('click', () => {
      const editor = container.querySelector('#dgm-editor');
      if (!editor || editor.disabled) return;
      const code = editor.value;
      // Insérer après la première ligne (type de diagramme)
      const lines = code.split('\n');
      const firstLine = lines[0];
      const rest      = lines.slice(1);
      // Vérifier si les classDef sont déjà là
      if (code.includes('classStyle')) {
        alert('Les classDef de couleurs sont déjà présentes.');
        return;
      }
      const newCode = firstLine + '\n' + CLASSDEFS + '\n' + rest.join('\n');
      editor.value = newCode;
      const d = DiagramsState.getById(_current);
      if (d) d.content = newCode;
      clearTimeout(_saveTimer);
      _saveTimer = setTimeout(async () => {
        await DiagramsState.updateCode(_current, newCode);
        _renderPreview();
      }, 300);
    });

    // Clic sur légende → insérer :::style dans éditeur
    container.querySelectorAll('.dgm-color-insert').forEach(el => {
      el.addEventListener('click', () => {
        const editor = container.querySelector('#dgm-editor');
        if (!editor || editor.disabled) return;
        const s     = editor.selectionStart;
        const ins   = ':::' + el.dataset.style;
        editor.value = editor.value.slice(0, s) + ins + editor.value.slice(editor.selectionEnd);
        editor.selectionStart = editor.selectionEnd = s + ins.length;
        editor.focus();
      });
    });

    // Nouveau
    container.querySelector('#dgm-new')?.addEventListener('click', () => {
      Modal.open('Nouveau diagramme', `<input class="input" name="name" placeholder="Nom du diagramme…">`, async () => {
        const name = Modal.getInput('name')?.trim() || 'Diagramme';
        const d = await DiagramsState.add(name);
        _renderList();
        _openDiagram(d.id);
      });
    });

    // Template
    container.querySelector('#dgm-template')?.addEventListener('change', async e => {
      const key = e.target.value;
      if (!key) return;
      const d = await DiagramsState.add(key, DIAGRAMS_TEMPLATES[key]);
      _renderList();
      _openDiagram(d.id);
      e.target.value = '';
    });

    // Éditeur auto-save
    container.querySelector('#dgm-editor')?.addEventListener('input', e => {
      if (!_current) return;
      const code = e.target.value;
      const d = DiagramsState.getById(_current);
      if (d) d.content = code;
      clearTimeout(_saveTimer);
      _saveTimer = setTimeout(async () => {
        await DiagramsState.updateCode(_current, code);
        _renderPreview();
        const s = container.querySelector('#dgm-status');
        if (s) s.textContent = 'Sauvegardé ' + today();
      }, 700);
    });

    // Tab
    container.querySelector('#dgm-editor')?.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const el = e.target, s = el.selectionStart;
        el.value = el.value.slice(0, s) + '  ' + el.value.slice(el.selectionEnd);
        el.selectionStart = el.selectionEnd = s + 2;
      }
      // Ctrl+Enter → forcer render
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        _renderPreview();
      }
    });

    // Renommer
    container.querySelector('#dgm-rename')?.addEventListener('click', async () => {
      if (!_current) return;
      const d = DiagramsState.getById(_current);
      Modal.open('Renommer', `<input class="input" name="name" value="${d?.title ?? ''}">`, async () => {
        const name = Modal.getInput('name')?.trim();
        if (!name) return;
        await DiagramsState.rename(_current, name);
        const t = container.querySelector('#dgm-title');
        if (t) t.textContent = name;
        _renderList();
      });
    });

    // Export — bouton droit = SVG, clic gauche = PNG directement
    container.querySelector('#dgm-export')?.addEventListener('click', (e) => {
      if (!_current) return;
      if (e.shiftKey) { _exportSVG(); return; }
      _exportPNG();
    });
    container.querySelector('#dgm-export')?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!_current) return;
      _exportSVG();
    });

    // Supprimer
    container.querySelector('#dgm-del-btn')?.addEventListener('click', async () => {
      if (!_current) return;
      await DiagramsState.remove(_current);
      _current = null;
      _resetView();
      renderShell();
    });
  }

  // ── Ouvrir un diagramme ───────────────────────────────────────────────────
  function _openDiagram(id) {
    _current = id;
    const d  = DiagramsState.getById(id);
    if (!d) return;
    const editor = container.querySelector('#dgm-editor');
    const title  = container.querySelector('#dgm-title');
    const status = container.querySelector('#dgm-status');
    if (editor) { editor.value = d.content; editor.disabled = false; }
    if (title)  title.textContent  = d.title;
    if (status) status.textContent = 'Modifié : ' + (d.updatedAt ?? d.createdAt ?? '—');
    ['#dgm-rename','#dgm-export','#dgm-del-btn'].forEach(sel => {
      const el = container.querySelector(sel);
      if (el) el.style.display = '';
    });
    _resetView();
    _renderPreview();
    _renderList();
  }

  // ── Liste sidebar ─────────────────────────────────────────────────────────
  function _renderList() {
    const list = container.querySelector('#dgm-list');
    if (!list) return;
    if (!DiagramsState._diagrams.length) {
      list.innerHTML = '<div style="padding:16px 12px;text-align:center;font-size:11px;color:var(--text-tertiary)">Aucun diagramme.<br>Créez-en un ou choisissez un template.</div>';
      return;
    }
    list.innerHTML = DiagramsState._diagrams.map(d => `
      <div class="dgm-item" data-id="${d.id}" style="
        padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border);
        border-left:2px solid ${_current === d.id ? 'var(--blue)' : 'transparent'};
        background:${_current === d.id ? 'var(--bg-active)' : 'transparent'};
      ">
        <div style="font-size:12px;font-weight:500;color:${_current === d.id ? 'var(--blue-light)' : 'var(--text-primary)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${d.title}
        </div>
        <div style="font-size:10px;color:var(--text-tertiary);margin-top:2px">${d.updatedAt ?? d.createdAt ?? ''}</div>
      </div>
    `).join('');
    list.querySelectorAll('.dgm-item').forEach(el => {
      el.addEventListener('click', () => _openDiagram(el.dataset.id));
    });
  }

  renderShell();
}

// ── Expose renderFn ──
window["renderDiagrams"] = renderDiagrams;
