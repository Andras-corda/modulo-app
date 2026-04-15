// ── Modulo Module: Notes (notes) v1.3.0 ──
// Author: Modulo Team
// Built: 2026-04-08T21:43:35.199Z
// renderFn: renderNotes
// ── notes/script/state.js ──
// ── Notes State ──

const NotesState = {
  _items: [],

  // ── i18n ────────────────────────────────────────────────────────────────
  _i18n: {
    fr: {
      search:        'Rechercher…',
      folders:       'Dossiers',
      all:           'Toutes',
      tags:          'Tags',
      new_note:      'Nouvelle note',
      untitled:      'Sans titre',
      no_notes:      'Aucune note',
      no_notes_sub:  'Cliquez sur + pour commencer',
      select_note:   'Sélectionnez une note',
      select_note_sub: 'ou créez-en une nouvelle',
      words:         'mots',
      modified:      'Modifié le',
      locked:        'Verrouillée',
      lock:          'Verrouiller',
      delete:        'Supprimer',
      folder_ph:     'Dossier…',
      write_ph:      'Commencez à écrire…',
      links:         'Liens',
      links_todos:   'Tâches liées',
      links_events:  'Événements liés',
      links_diagrams:'Diagrammes liés',
      links_empty:   'Aucun élément lié',
      ref_badge:     '# Référence',
      insert:        'Insérer',
      insert_todo:   'Insérer résumé des tâches',
      insert_event:  'Insérer résumé des événements',
      note_title:    'Titre de la note',
      confirm_del:   'Supprimer cette note ?',
    },
    en: {
      search:        'Search…',
      folders:       'Folders',
      all:           'All',
      tags:          'Tags',
      new_note:      'New note',
      untitled:      'Untitled',
      no_notes:      'No notes',
      no_notes_sub:  'Click + to start',
      select_note:   'Select a note',
      select_note_sub: 'or create a new one',
      words:         'words',
      modified:      'Modified',
      locked:        'Locked',
      lock:          'Lock',
      delete:        'Delete',
      folder_ph:     'Folder…',
      write_ph:      'Start writing…',
      links:         'Links',
      links_todos:   'Related tasks',
      links_events:  'Related events',
      links_diagrams:'Related diagrams',
      links_empty:   'No linked items',
      ref_badge:     '# Reference',
      insert:        'Insert',
      insert_todo:   'Insert task summary',
      insert_event:  'Insert event summary',
      note_title:    'Note title',
      confirm_del:   'Delete this note?',
    },
  },

  _t(key) {
    const lang = window._settings?.lang ?? 'fr';
    return this._i18n[lang]?.[key] ?? this._i18n['fr'][key] ?? key;
  },

  // ── CRUD ─────────────────────────────────────────────────────────────────
  async load() {
    this._items = (await window.modulo.notes.getAll()) ?? [];
    return this._items;
  },

  async save() {
    await window.modulo.notes.save(this._items);
  },

  async add({ title, content = '', tags = [], folder = '', locked = false }) {
    const note = {
      id:        uid(),
      title,
      content,
      tags,
      folder,
      locked,
      createdAt: today(),
      updatedAt: today(),
    };
    this._items.unshift(note);
    await this.save();
    return note;
  },

  async update(id, patch) {
    const note = this._items.find(n => n.id === id);
    if (note) {
      Object.assign(note, patch, { updatedAt: today() });
      await this.save();
    }
  },

  async remove(id) {
    this._items = this._items.filter(n => n.id !== id);
    await this.save();
  },

  getFolders() {
    return [...new Set(this._items.map(n => n.folder).filter(Boolean))];
  },

  getTags() {
    return [...new Set(this._items.flatMap(n => n.tags ?? []).filter(t => !t.startsWith('__')))];
  },

  filter(query, folder, tag) {
    let items = [...this._items];
    if (folder) items = items.filter(n => n.folder === folder);
    if (tag)    items = items.filter(n => n.tags?.includes(tag));
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        (n.content ?? '').toLowerCase().includes(q)
      );
    }
    return items;
  },

  // ── Lecture des autres modules ────────────────────────────────────────────

  async getLinkedTodos(noteTitle) {
    // Retourne les todos dont le texte mentionne le titre de la note
    const todos = (await window.modulo.todos.getAll()) ?? [];
    if (!noteTitle) return todos.slice(0, 5);
    const q = noteTitle.toLowerCase();
    return todos.filter(t => t.text?.toLowerCase().includes(q));
  },

  async getLinkedEvents(noteTitle) {
    const events = (await window.modulo.events.getAll()) ?? [];
    if (!noteTitle) return events.slice(0, 5);
    const q = noteTitle.toLowerCase();
    return events.filter(e => e.title?.toLowerCase().includes(q));
  },

  async getLinkedDiagrams(noteTitle) {
    const diagStore   = (await window.modulo.diagrams.getAll())     ?? [];
    const structStore = (await window.modulo.structograms.getAll()) ?? [];
    const diag = [...diagStore, ...structStore];
    if (!noteTitle) return diag.slice(0, 5);
    const q = noteTitle.toLowerCase();
    return diag.filter(d => d.title?.toLowerCase().includes(q) || (d.content ?? '').toLowerCase().includes(q));
  },

  async buildTodosInsert() {
    const todos = (await window.modulo.todos.getAll()) ?? [];
    const done  = todos.filter(t => t.done).length;
    const lines = todos.slice(0, 10).map(t => `- [${t.done ? 'x' : ' '}] ${t.text}`);
    return `**Tâches** (${done}/${todos.length})\n${lines.join('\n')}`;
  },

  async buildEventsInsert() {
    const events = (await window.modulo.events.getAll()) ?? [];
    const lines  = events.slice(0, 10).map(e => `- ${formatDate(e.date)} — ${e.title}`);
    return `**Événements** (${events.length})\n${lines.join('\n')}`;
  },
};

function _notesDjb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  return (hash >>> 0).toString(16);
}

// ── notes/page/render.js ──
// ── Notes Render ──

async function renderNotes(container) {
  let _selected = null;
  let _query    = '';
  let _folder   = '';
  let _tag      = '';
  let _saveTimer = null;
  let _tab      = 'write'; // 'write' | 'links' | 'insert'

  const _t = k => NotesState._t(k);

  await NotesState.load();

  // ── Render principal ──────────────────────────────────────────────────────
  function render() {
    const items   = NotesState.filter(_query, _folder, _tag);
    const folders = NotesState.getFolders();
    const tags    = NotesState.getTags();
    const note    = _selected ? NotesState._items.find(n => n.id === _selected) : null;

    container.innerHTML = `
      <div class="page" style="padding:0">
        <div style="display:flex;height:calc(100vh - 36px)">

          <!-- Sidebar gauche -->
          <div style="width:224px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;background:var(--bg-surface)">

            <!-- Barre de recherche + nouveau -->
            <div style="padding:10px;border-bottom:1px solid var(--border);display:flex;gap:6px">
              <input class="input" id="notes-search" placeholder="${_t('search')}"
                value="${_query}" style="flex:1;height:30px;font-size:12px">
              <button class="btn btn-primary btn-sm" id="notes-add" style="flex-shrink:0">
                ${icon('plus','14px')}
              </button>
            </div>

            <!-- Filtres dossiers -->
            ${folders.length ? `
              <div style="padding:6px 10px 2px;font-size:9px;font-weight:600;letter-spacing:.6px;color:var(--text-tertiary);text-transform:uppercase">${_t('folders')}</div>
              <div class="notes-folder-item ${!_folder?'notes-folder-active':''}" data-folder="">
                ${icon('folder','13px')} ${_t('all')}
              </div>
              ${folders.map(f => `
                <div class="notes-folder-item ${_folder===f?'notes-folder-active':''}" data-folder="${f}">
                  ${icon(_folder===f?'folder_open':'folder','13px')} ${f}
                </div>
              `).join('')}
              <div style="height:1px;background:var(--border);margin:4px 0"></div>
            ` : ''}

            <!-- Tags -->
            ${tags.length ? `
              <div style="padding:4px 10px;display:flex;gap:4px;flex-wrap:wrap">
                ${tags.map(tag => `
                  <span class="notes-tag ${_tag===tag?'notes-tag-active':''}" data-tag="${tag}">${tag}</span>
                `).join('')}
              </div>
              <div style="height:1px;background:var(--border);margin:4px 0"></div>
            ` : ''}

            <!-- Liste des notes -->
            <div style="flex:1;overflow-y:auto">
              ${!items.length ? `
                <div style="padding:24px 12px;text-align:center;color:var(--text-tertiary);font-size:12px">
                  ${_t('no_notes')}<br>
                  <span style="font-size:11px">${_t('no_notes_sub')}</span>
                </div>
              ` : items.map(n => `
                <div class="notes-item ${_selected===n.id?'notes-item-active':''}" data-id="${n.id}">
                  <div style="display:flex;align-items:center;gap:5px;margin-bottom:2px">
                    ${n.locked ? `<span style="color:var(--yellow);flex-shrink:0">${icon('lock','11px')}</span>` : ''}
                    <span style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${_selected===n.id?'var(--blue-light)':'var(--text-primary)'}">${n.title || _t('untitled')}</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-tertiary)">${n.updatedAt ?? n.createdAt ?? ''}</div>
                  ${n.content ? `<div style="font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px">${(n.content).slice(0,60)}</div>` : ''}
                  ${n.folder ? `<span style="font-size:10px;color:var(--text-tertiary)">${icon('folder','10px')} ${n.folder}</span>` : ''}
                  ${(n.tags??[]).filter(t=>!t.startsWith('__')).length ? `
                    <div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:3px">
                      ${(n.tags??[]).filter(t=>!t.startsWith('__')).map(t=>`<span style="font-size:9px;padding:1px 5px;border-radius:var(--radius-full);background:var(--bg-elevated);color:var(--text-tertiary)">${t}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Zone principale -->
          <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
            ${!note ? `
              <div class="empty-state">
                ${icon('note','40px')}
                <div class="empty-state-title">${_t('select_note')}</div>
                <div class="empty-state-sub">${_t('select_note_sub')}</div>
              </div>
            ` : `
              <!-- Header note -->
              <div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center;background:var(--bg-surface);flex-shrink:0">
                <input class="input" id="note-title" value="${(note.title??'').replace(/"/g,'&quot;')}"
                  placeholder="${_t('note_title')}"
                  style="flex:1;font-size:15px;font-weight:500;border:none;background:transparent;padding:0;height:auto;box-shadow:none">
                <input class="input" id="note-folder" value="${note.folder??''}"
                  placeholder="${_t('folder_ph')}"
                  style="width:120px;font-size:11px;height:26px">
                <button class="btn btn-ghost btn-icon btn-sm" id="note-lock"
                  title="${note.locked?_t('locked'):_t('lock')}"
                  style="color:${note.locked?'var(--yellow)':'var(--text-tertiary)'}">
                  ${icon('lock','15px')}
                </button>
                <button class="btn btn-ghost btn-icon btn-sm" id="note-del"
                  title="${_t('delete')}" style="color:var(--red)">
                  ${icon('trash','15px')}
                </button>
              </div>

              <!-- Tabs -->
              <div style="display:flex;border-bottom:1px solid var(--border);background:var(--bg-surface);flex-shrink:0">
                ${[
                  { id:'write',  label: t('note') ?? (window._settings?.lang==='en'?'Write':'Écrire') },
                  { id:'links',  label: _t('links') },
                  { id:'insert', label: _t('insert') },
                ].map(tab => `
                  <button class="notes-tab ${_tab===tab.id?'notes-tab-active':''}" data-tab="${tab.id}"
                    style="padding:7px 14px;font-size:12px;border:none;background:none;cursor:pointer;
                    color:${_tab===tab.id?'var(--blue-light)':'var(--text-secondary)'};
                    border-bottom:2px solid ${_tab===tab.id?'var(--blue)':'transparent'};
                    font-family:var(--font-sans)">
                    ${tab.label}
                  </button>
                `).join('')}
              </div>

              <!-- Contenu tab -->
              <div style="flex:1;overflow:hidden;display:flex;flex-direction:column">

                <!-- Tab : Écrire -->
                <div id="notes-tab-write" style="flex:1;display:${_tab==='write'?'flex':'none'};flex-direction:column">
                  <textarea id="note-content" style="
                    flex:1;padding:18px 20px;background:transparent;border:none;
                    color:var(--text-primary);font-size:14px;line-height:1.75;
                    resize:none;outline:none;font-family:var(--font-sans);
                  " placeholder="${_t('write_ph')}">${note.content??''}</textarea>
                  <div style="padding:5px 14px;font-size:10px;color:var(--text-tertiary);border-top:1px solid var(--border);display:flex;gap:12px;background:var(--bg-surface)">
                    <span>${_t('modified')} ${note.updatedAt??'—'}</span>
                    <span>${(note.content??'').split(/\s+/).filter(Boolean).length} ${_t('words')}</span>
                  </div>
                </div>

                <!-- Tab : Liens -->
                <div id="notes-tab-links" style="display:${_tab==='links'?'block':'none'};overflow-y:auto;padding:16px">
                  <div id="notes-links-content">
                    <div class="empty-state" style="padding:20px"><div class="spinner"></div></div>
                  </div>
                </div>

                <!-- Tab : Insérer -->
                <div id="notes-tab-insert" style="display:${_tab==='insert'?'block':'none'};padding:16px;overflow-y:auto">
                  <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px">${_t('insert')}</div>
                  <div style="display:flex;flex-direction:column;gap:8px">
                    <button class="btn btn-secondary" id="insert-todos" style="justify-content:flex-start;gap:10px;font-size:12px">
                      ${icon('check','15px')}
                      <span>${_t('insert_todo')}</span>
                    </button>
                    <button class="btn btn-secondary" id="insert-events" style="justify-content:flex-start;gap:10px;font-size:12px">
                      ${icon('calendar','15px')}
                      <span>${_t('insert_event')}</span>
                    </button>
                  </div>
                </div>
              </div>
            `}
          </div>
        </div>
      </div>

      <style>
        .notes-folder-item {
          padding:5px 10px;font-size:12px;color:var(--text-secondary);
          cursor:pointer;display:flex;align-items:center;gap:6px;
        }
        .notes-folder-item:hover { background:var(--bg-hover); }
        .notes-folder-active { color:var(--blue-light);background:var(--bg-active); }

        .notes-tag {
          font-size:10px;padding:2px 7px;border-radius:var(--radius-full);
          background:var(--bg-elevated);border:1px solid var(--border);
          color:var(--text-secondary);cursor:pointer;
        }
        .notes-tag:hover { border-color:var(--border-strong); }
        .notes-tag-active { background:var(--blue);color:#fff;border-color:var(--blue); }

        .notes-item {
          padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border);
          transition:background .1s;
        }
        .notes-item:hover { background:var(--bg-hover); }
        .notes-item-active { background:var(--bg-active);border-left:2px solid var(--blue); }

        .notes-tab { transition:color .15s,border-color .15s; }
        .notes-tab:hover { color:var(--text-primary) !important; }
      </style>
    `;

    _bindEvents(note);

    // Charger les liens si tab actif
    if (note && _tab === 'links') _loadLinks(note);
  }

  // ── Liens cross-module ────────────────────────────────────────────────────
  async function _loadLinks(note) {
    const el = container.querySelector('#notes-links-content');
    if (!el) return;

    const [todos, events, diagrams] = await Promise.all([
      NotesState.getLinkedTodos(note.title),
      NotesState.getLinkedEvents(note.title),
      NotesState.getLinkedDiagrams(note.title),
    ]);

    const hasTodos    = todos.length > 0;
    const hasEvents   = events.length > 0;
    const hasDiagrams = diagrams.length > 0;

    if (!hasTodos && !hasEvents && !hasDiagrams) {
      el.innerHTML = `<div class="empty-state" style="padding:32px">${icon('search','32px')}<div class="empty-state-title" style="margin-top:10px">${_t('links_empty')}</div><div class="empty-state-sub" style="font-size:11px;margin-top:4px">Aucun élément lié au titre "${note.title}"</div></div>`;
      return;
    }

    el.innerHTML = `
      ${hasTodos ? `
        <div style="margin-bottom:18px">
          <div style="font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;display:flex;align-items:center;gap:6px">
            ${icon('check','13px')} ${_t('links_todos')} <span style="color:var(--blue-light)">(${todos.length})</span>
          </div>
          ${todos.map(t => `
            <div class="item-row" style="margin-bottom:5px;${t.done?'opacity:.6':''}">
              <div style="width:14px;height:14px;border-radius:3px;border:1.5px solid ${t.done?'var(--blue)':'var(--border-strong)'};background:${t.done?'var(--blue)':'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center">
                ${t.done?icon('check','10px'):''}
              </div>
              <span style="font-size:12px;${t.done?'text-decoration:line-through;color:var(--text-tertiary)':''}">${t.text}</span>
              ${t.priority && t.priority!=='normal'?`<span style="font-size:10px;color:${t.priority==='high'?'var(--red)':'var(--text-tertiary)'};margin-left:auto">${t.priority}</span>`:''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${hasEvents ? `
        <div style="margin-bottom:18px">
          <div style="font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;display:flex;align-items:center;gap:6px">
            ${icon('calendar','13px')} ${_t('links_events')} <span style="color:var(--blue-light)">(${events.length})</span>
          </div>
          ${events.map(e => `
            <div class="item-row" style="margin-bottom:5px;border-left:3px solid ${e.color??'var(--blue)'}">
              <div>
                <div style="font-size:12px;font-weight:500">${e.title}</div>
                <div style="font-size:10px;color:var(--text-tertiary)">${formatDate(e.date)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${hasDiagrams ? `
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;display:flex;align-items:center;gap:6px">
            ${icon('dashboard','13px')} ${_t('links_diagrams')} <span style="color:var(--blue-light)">(${diagrams.length})</span>
          </div>
          ${diagrams.map(d => `
            <div class="item-row" style="margin-bottom:5px">
              <span style="font-size:10px;padding:1px 5px;border-radius:3px;background:var(--bg-elevated);color:var(--text-tertiary)">${d.tags?.includes('__structogram__')?'NSD':'UML'}</span>
              <span style="font-size:12px;font-weight:500">${d.title}</span>
              <span style="font-size:10px;color:var(--text-tertiary);margin-left:auto">${d.updatedAt??''}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  // ── Events ────────────────────────────────────────────────────────────────
  function _bindEvents(note) {
    // Recherche
    container.querySelector('#notes-search')?.addEventListener('input', e => {
      _query = e.target.value; render();
    });

    // Nouvelle note
    container.querySelector('#notes-add')?.addEventListener('click', async () => {
      const n = await NotesState.add({ title: _t('new_note') });
      _selected = n.id;
      _tab = 'write';
      render();
      setTimeout(() => container.querySelector('#note-title')?.select(), 50);
    });

    // Sélection note
    container.querySelectorAll('.notes-item').forEach(el => {
      el.addEventListener('click', () => {
        _selected = el.dataset.id;
        _tab = 'write';
        render();
      });
    });

    // Dossiers
    container.querySelectorAll('.notes-folder-item').forEach(el => {
      el.addEventListener('click', () => { _folder = el.dataset.folder; render(); });
    });

    // Tags
    container.querySelectorAll('.notes-tag').forEach(el => {
      el.addEventListener('click', () => {
        _tag = _tag === el.dataset.tag ? '' : el.dataset.tag;
        render();
      });
    });

    // Tabs
    container.querySelectorAll('.notes-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _tab = btn.dataset.tab;
        render();
        if (_tab === 'links' && note) _loadLinks(note);
      });
    });

    if (!note) return;

    // Auto-save titre + dossier
    const autoSave = async () => {
      const title   = container.querySelector('#note-title')?.value ?? '';
      const content = container.querySelector('#note-content')?.value ?? '';
      const folder  = container.querySelector('#note-folder')?.value ?? '';
      await NotesState.update(note.id, { title, content, folder });
    };

    const schedSave = () => {
      clearTimeout(_saveTimer);
      _saveTimer = setTimeout(async () => { await autoSave(); render(); }, 800);
    };

    container.querySelector('#note-title')?.addEventListener('input', schedSave);
    container.querySelector('#note-folder')?.addEventListener('input', schedSave);
    container.querySelector('#note-content')?.addEventListener('input', schedSave);

    // Verrouiller
    container.querySelector('#note-lock')?.addEventListener('click', async () => {
      await autoSave();
      await NotesState.update(note.id, { locked: !note.locked });
      render();
    });

    // Supprimer
    container.querySelector('#note-del')?.addEventListener('click', async () => {
      await NotesState.remove(note.id);
      _selected = null;
      render();
    });

    // Insérer résumé tâches
    container.querySelector('#insert-todos')?.addEventListener('click', async () => {
      const text = await NotesState.buildTodosInsert();
      const ta   = container.querySelector('#note-content');
      if (ta) {
        const s = ta.selectionStart;
        ta.value = ta.value.slice(0, s) + '\n' + text + '\n' + ta.value.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = s + text.length + 2;
        ta.focus();
        await NotesState.update(note.id, { content: ta.value });
        _tab = 'write';
        render();
      }
    });

    // Insérer résumé événements
    container.querySelector('#insert-events')?.addEventListener('click', async () => {
      const text = await NotesState.buildEventsInsert();
      const ta   = container.querySelector('#note-content');
      if (ta) {
        const s = ta.selectionStart;
        ta.value = ta.value.slice(0, s) + '\n' + text + '\n' + ta.value.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = s + text.length + 2;
        ta.focus();
        await NotesState.update(note.id, { content: ta.value });
        _tab = 'write';
        render();
      }
    });
  }

  render();
}

// ── Expose renderFn ──
window["renderNotes"] = renderNotes;
