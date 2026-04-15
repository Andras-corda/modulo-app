// ── Modulo Module: Tâches (todos) v1.2.0 ──
// Author: Modulo Team
// Built: 2026-04-02T23:54:51.083Z
// renderFn: renderTodos
// ── todos\script\state.js ──
// ── Todos State ──

const TodosState = {
  _items: [],

  async load() {
    this._items = (await window.modulo.todos.getAll()) ?? [];
    return this._items;
  },

  async save() {
    await window.modulo.todos.save(this._items);
  },

  async add(text, priority = 'normal', dueDate = null) {
    const item = { id: uid(), text, priority, dueDate, done: false, createdAt: today() };
    this._items.unshift(item);
    await this.save();
    return item;
  },

  async toggle(id) {
    const item = this._items.find(i => i.id === id);
    if (item) { item.done = !item.done; await this.save(); }
  },

  async remove(id) {
    this._items = this._items.filter(i => i.id !== id);
    await this.save();
  },

  async update(id, patch) {
    const item = this._items.find(i => i.id === id);
    if (item) { Object.assign(item, patch); await this.save(); }
  },

  filter(filter, query) {
    let items = [...this._items];
    if (filter === 'active') items = items.filter(i => !i.done);
    if (filter === 'done')   items = items.filter(i => i.done);
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(i => i.text?.toLowerCase().includes(q));
    }
    return items;
  },
};

// ── todos\page\render.js ──
// ── Todos Render ──

async function renderTodos(container) {
  let _filter = 'all';
  let _query  = '';

  await TodosState.load();

  function _priorityColor(p) {
    return p === 'high' ? 'var(--red)' : p === 'low' ? 'var(--text-tertiary)' : 'var(--blue)';
  }

  function _priorityLabel(p) {
    return p === 'high' ? 'Haute' : p === 'low' ? 'Basse' : 'Normale';
  }

  function render() {
    const items = TodosState.filter(_filter, _query);
    const all   = TodosState._items;
    const done  = all.filter(i => i.done).length;

    container.innerHTML = `
      <div class="page">
        <div class="page-header">
          <div>
            <div class="page-title">${icon('check', '20px')} Tâches</div>
            <div class="page-subtitle">${done}/${all.length} terminées</div>
          </div>
          <button class="btn btn-primary" id="todos-add-btn">
            ${icon('plus', '16px')} Ajouter
          </button>
        </div>

        <!-- Barre de recherche + filtres -->
        <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
          <input class="input" id="todos-search" placeholder="Rechercher…" value="${_query}" style="max-width:240px">
          <div style="display:flex;gap:4px">
            ${['all','active','done'].map(f => `
              <button class="btn btn-sm ${_filter === f ? 'btn-primary' : 'btn-secondary'} todos-filter" data-f="${f}">
                ${ f === 'all' ? 'Toutes' : f === 'active' ? 'En cours' : 'Terminées' }
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Progression -->
        ${all.length ? `
          <div class="progress-bar" style="margin-bottom:20px">
            <div class="progress-bar-fill" style="width:${Math.round(done/all.length*100)}%"></div>
          </div>
        ` : ''}

        <!-- Liste -->
        <div id="todos-list">
          ${!items.length ? `
            <div class="empty-state">
              ${icon('check', '36px')}
              <div class="empty-state-title">Aucune tâche</div>
              <div class="empty-state-sub">Cliquez sur "Ajouter" pour commencer</div>
            </div>
          ` : items.map(item => `
            <div class="item-row todos-item" data-id="${item.id}" style="margin-bottom:8px;${item.done ? 'opacity:.55' : ''}">
              <div class="checkbox ${item.done ? 'checked' : ''} todos-check" data-id="${item.id}">
                ${item.done ? icon('check', '12px') : ''}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;${item.done ? 'text-decoration:line-through;color:var(--text-tertiary)' : ''}">
                  ${item.text}
                </div>
                <div style="display:flex;gap:8px;margin-top:3px;align-items:center">
                  <span style="font-size:11px;color:${_priorityColor(item.priority)}">${_priorityLabel(item.priority)}</span>
                  ${item.dueDate ? `<span style="font-size:11px;color:var(--text-tertiary)">${icon('date','11px')} ${formatDate(item.dueDate)}</span>` : ''}
                </div>
              </div>
              <button class="btn btn-ghost btn-icon btn-sm todos-edit" data-id="${item.id}" title="Modifier">
                ${icon('edit', '14px')}
              </button>
              <button class="btn btn-ghost btn-icon btn-sm todos-del" data-id="${item.id}" title="Supprimer">
                ${icon('trash', '14px')}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    _bindEvents();
  }

  function _bindEvents() {
    // Filtres
    container.querySelectorAll('.todos-filter').forEach(btn => {
      btn.addEventListener('click', () => { _filter = btn.dataset.f; render(); });
    });

    // Recherche
    container.querySelector('#todos-search')?.addEventListener('input', e => {
      _query = e.target.value; render();
    });

    // Ajouter
    container.querySelector('#todos-add-btn')?.addEventListener('click', () => _openModal());

    // Checkbox
    container.querySelectorAll('.todos-check').forEach(cb => {
      cb.addEventListener('click', async () => {
        await TodosState.toggle(cb.dataset.id);
        render();
      });
    });

    // Supprimer
    container.querySelectorAll('.todos-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        await TodosState.remove(btn.dataset.id);
        render();
      });
    });

    // Modifier
    container.querySelectorAll('.todos-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = TodosState._items.find(i => i.id === btn.dataset.id);
        if (item) _openModal(item);
      });
    });
  }

  function _openModal(item = null) {
    const isEdit = !!item;
    Modal.open(
      isEdit ? 'Modifier la tâche' : 'Nouvelle tâche',
      `
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Tâche</label>
            <input class="input" name="text" value="${item?.text ?? ''}" placeholder="Que faut-il faire ?" autofocus>
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Priorité</label>
            <select class="input" name="priority">
              <option value="low"    ${item?.priority === 'low'    ? 'selected' : ''}>Basse</option>
              <option value="normal" ${!item?.priority || item?.priority === 'normal' ? 'selected' : ''}>Normale</option>
              <option value="high"   ${item?.priority === 'high'   ? 'selected' : ''}>Haute</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Date d'échéance (optionnel)</label>
            <input class="input" type="date" name="dueDate" value="${item?.dueDate ?? ''}">
          </div>
        </div>
      `,
      async () => {
        const text     = Modal.getInput('text')?.trim();
        const priority = Modal.getInput('priority') ?? 'normal';
        const dueDate  = Modal.getInput('dueDate') || null;
        if (!text) return;

        if (isEdit) {
          await TodosState.update(item.id, { text, priority, dueDate });
        } else {
          await TodosState.add(text, priority, dueDate);
        }
        render();
      }
    );
  }

  render();
}

// ── Expose renderFn ──
window["renderTodos"] = renderTodos;
