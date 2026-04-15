// ── Modulo Module: Listes (checklists) v1.1.0 ──
// Author: Modulo Team
// Built: 2026-04-02T23:54:51.076Z
// renderFn: renderChecklists
// ── checklists\script\state.js ──
// ── Checklists State ──

const ChecklistsState = {
  _lists: [],

  async load() {
    this._lists = (await window.modulo.checklists.getAll()) ?? [];
    return this._lists;
  },

  async save() {
    await window.modulo.checklists.save(this._lists);
  },

  async addList(name) {
    const list = { id: uid(), name, items: [], createdAt: today() };
    this._lists.unshift(list);
    await this.save();
    return list;
  },

  async removeList(id) {
    this._lists = this._lists.filter(l => l.id !== id);
    await this.save();
  },

  async addItem(listId, text) {
    const list = this._lists.find(l => l.id === listId);
    if (!list) return;
    list.items.push({ id: uid(), text, checked: false });
    await this.save();
  },

  async toggleItem(listId, itemId) {
    const list = this._lists.find(l => l.id === listId);
    const item = list?.items.find(i => i.id === itemId);
    if (item) { item.checked = !item.checked; await this.save(); }
  },

  async removeItem(listId, itemId) {
    const list = this._lists.find(l => l.id === listId);
    if (list) { list.items = list.items.filter(i => i.id !== itemId); await this.save(); }
  },

  async resetList(listId) {
    const list = this._lists.find(l => l.id === listId);
    if (list) { list.items.forEach(i => i.checked = false); await this.save(); }
  },
};

// ── checklists\page\render.js ──
// ── Checklists Render ──

async function renderChecklists(container) {
  let _selected = null;

  await ChecklistsState.load();

  function render() {
    const lists = ChecklistsState._lists;
    const list  = _selected ? lists.find(l => l.id === _selected) : null;

    container.innerHTML = `
      <div class="page" style="padding:0">
        <div style="display:flex;height:calc(100vh - 36px)">

          <!-- Sidebar -->
          <div style="width:220px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column">
            <div style="padding:12px;border-bottom:1px solid var(--border)">
              <button class="btn btn-primary" style="width:100%" id="cl-add-list">
                ${icon('plus','14px')} Nouvelle liste
              </button>
            </div>
            <div style="flex:1;overflow-y:auto">
              ${!lists.length ? `
                <div style="padding:20px;text-align:center;font-size:12px;color:var(--text-tertiary)">Aucune liste</div>
              ` : lists.map(l => {
                const done  = l.items.filter(i => i.checked).length;
                const total = l.items.length;
                return `
                  <div class="cl-list-item ${_selected === l.id ? 'cl-active' : ''}" data-id="${l.id}">
                    <div style="display:flex;align-items:center;justify-content:space-between">
                      <span style="font-size:13px;font-weight:500">${l.name}</span>
                      <span style="font-size:11px;color:var(--text-tertiary)">${done}/${total}</span>
                    </div>
                    ${total ? `
                      <div class="progress-bar" style="margin-top:5px;height:3px">
                        <div class="progress-bar-fill" style="width:${total ? Math.round(done/total*100) : 0}%;background:var(--green)"></div>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Détail -->
          <div style="flex:1;overflow-y:auto">
            ${!list ? `
              <div class="empty-state">
                ${icon('list','40px')}
                <div class="empty-state-title">Sélectionnez une liste</div>
              </div>
            ` : `
              <div style="padding:20px 24px">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
                  <div style="font-size:18px;font-weight:500;flex:1">${list.name}</div>
                  <button class="btn btn-secondary btn-sm" id="cl-reset">${icon('reset','13px')} Réinitialiser</button>
                  <button class="btn btn-secondary btn-sm" id="cl-del-list" style="color:var(--red)">${icon('trash','13px')}</button>
                </div>

                <!-- Ajouter item -->
                <div style="display:flex;gap:8px;margin-bottom:16px">
                  <input class="input" id="cl-new-item" placeholder="Ajouter un élément…" style="flex:1">
                  <button class="btn btn-primary" id="cl-add-item">${icon('plus','14px')}</button>
                </div>

                <!-- Items -->
                <div id="cl-items">
                  ${!list.items.length ? `
                    <div style="padding:24px;text-align:center;color:var(--text-tertiary);font-size:13px">Liste vide</div>
                  ` : list.items.map(item => `
                    <div class="item-row" style="margin-bottom:6px;${item.checked ? 'opacity:.5' : ''}">
                      <div class="checkbox ${item.checked ? 'checked' : ''} cl-check" data-list="${list.id}" data-item="${item.id}">
                        ${item.checked ? icon('check','12px') : ''}
                      </div>
                      <span style="flex:1;font-size:13px;${item.checked ? 'text-decoration:line-through' : ''}">${item.text}</span>
                      <button class="btn btn-ghost btn-icon btn-sm cl-del-item" data-list="${list.id}" data-item="${item.id}">
                        ${icon('trash','13px')}
                      </button>
                    </div>
                  `).join('')}
                </div>
              </div>
            `}
          </div>
        </div>
      </div>

      <style>
        .cl-list-item { padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border) }
        .cl-list-item:hover { background:var(--bg-hover) }
        .cl-active { background:var(--bg-active) }
      </style>
    `;

    _bindEvents(list);
  }

  function _bindEvents(list) {
    container.querySelector('#cl-add-list')?.addEventListener('click', () => {
      Modal.open('Nouvelle liste', `<input class="input" name="name" placeholder="Nom de la liste…">`, async () => {
        const name = Modal.getInput('name')?.trim();
        if (!name) return;
        const l = await ChecklistsState.addList(name);
        _selected = l.id;
        render();
      });
    });

    container.querySelectorAll('.cl-list-item').forEach(el => {
      el.addEventListener('click', () => { _selected = el.dataset.id; render(); });
    });

    if (!list) return;

    container.querySelector('#cl-del-list')?.addEventListener('click', async () => {
      await ChecklistsState.removeList(list.id);
      _selected = null;
      render();
    });

    container.querySelector('#cl-reset')?.addEventListener('click', async () => {
      await ChecklistsState.resetList(list.id);
      render();
    });

    const addItem = async () => {
      const input = container.querySelector('#cl-new-item');
      const text  = input?.value?.trim();
      if (!text) return;
      await ChecklistsState.addItem(list.id, text);
      input.value = '';
      render();
    };

    container.querySelector('#cl-add-item')?.addEventListener('click', addItem);
    container.querySelector('#cl-new-item')?.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });

    container.querySelectorAll('.cl-check').forEach(cb => {
      cb.addEventListener('click', async () => {
        await ChecklistsState.toggleItem(cb.dataset.list, cb.dataset.item);
        render();
      });
    });

    container.querySelectorAll('.cl-del-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        await ChecklistsState.removeItem(btn.dataset.list, btn.dataset.item);
        render();
      });
    });
  }

  render();
}

// ── Expose renderFn ──
window["renderChecklists"] = renderChecklists;
