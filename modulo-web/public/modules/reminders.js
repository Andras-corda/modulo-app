// ── Modulo Module: Rappels (reminders) v1.1.0 ──
// Author: Modulo Team
// Built: 2026-04-02T23:54:51.079Z
// renderFn: renderReminders
// ── reminders\script\state.js ──
// ── Reminders State ──

const RemindersState = {
  _items: [],

  async load() {
    this._items = (await window.modulo.reminders.getAll()) ?? [];
    return this._items;
  },

  async save() {
    await window.modulo.reminders.save(this._items);
  },

  async add({ label, datetime, recurrence = 'none' }) {
    const item = { id: uid(), label, datetime, recurrence, done: false, fired: false, createdAt: today() };
    this._items.unshift(item);
    await this.save();
    return item;
  },

  async remove(id) {
    this._items = this._items.filter(i => i.id !== id);
    await this.save();
  },

  async markDone(id) {
    const item = this._items.find(i => i.id === id);
    if (item) { item.done = true; await this.save(); }
  },

  upcoming() {
    const now = new Date().toISOString().slice(0, 16);
    return this._items
      .filter(i => !i.done)
      .sort((a, b) => (a.datetime ?? '').localeCompare(b.datetime ?? ''));
  },

  past() {
    return this._items.filter(i => i.done)
      .sort((a, b) => (b.datetime ?? '').localeCompare(a.datetime ?? ''));
  },
};

// ── reminders\page\render.js ──
// ── Reminders Render ──

async function renderReminders(container) {
  await RemindersState.load();

  const RECURRENCE = [
    { value: 'none',    label: 'Aucune' },
    { value: 'daily',   label: 'Quotidien' },
    { value: 'weekly',  label: 'Hebdomadaire' },
    { value: 'monthly', label: 'Mensuel' },
  ];

  function _recLabel(v) {
    return RECURRENCE.find(r => r.value === v)?.label ?? 'Aucune';
  }

  function _isOverdue(datetime) {
    if (!datetime) return false;
    return datetime.slice(0, 16) < new Date().toISOString().slice(0, 16);
  }

  function render() {
    const upcoming = RemindersState.upcoming();
    const past     = RemindersState.past();

    container.innerHTML = `
      <div class="page">
        <div class="page-header">
          <div>
            <div class="page-title">${icon('bell','20px')} Rappels</div>
            <div class="page-subtitle">${upcoming.length} à venir</div>
          </div>
          <button class="btn btn-primary" id="rem-add">${icon('plus','16px')} Ajouter</button>
        </div>

        <!-- À venir -->
        ${!upcoming.length ? `
          <div class="empty-state" style="padding:32px">
            ${icon('bell','36px')}
            <div class="empty-state-title">Aucun rappel</div>
            <div class="empty-state-sub">Planifiez votre premier rappel</div>
          </div>
        ` : `
          <div style="margin-bottom:24px">
            ${upcoming.map(item => `
              <div class="item-row" style="margin-bottom:8px;border-left:3px solid ${_isOverdue(item.datetime) ? 'var(--red)' : item.fired ? 'var(--yellow)' : 'var(--orange)'}">
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:500">${item.label}</div>
                  <div style="display:flex;gap:8px;margin-top:3px;align-items:center">
                    <span style="font-size:11px;color:${_isOverdue(item.datetime) ? 'var(--red)' : 'var(--text-tertiary)'}">
                      ${icon('clock','11px')} ${item.datetime?.replace('T',' ').slice(0,16) ?? '—'}
                    </span>
                    ${item.recurrence !== 'none' ? `<span class="badge badge-yellow">${_recLabel(item.recurrence)}</span>` : ''}
                    ${item.fired ? `<span class="badge badge-gray">Déclenché</span>` : ''}
                    ${_isOverdue(item.datetime) ? `<span class="badge badge-red">En retard</span>` : ''}
                  </div>
                </div>
                <button class="btn btn-success btn-sm rem-done" data-id="${item.id}" title="Marquer comme fait">
                  ${icon('check','13px')}
                </button>
                <button class="btn btn-ghost btn-icon btn-sm rem-del" data-id="${item.id}">
                  ${icon('trash','14px')}
                </button>
              </div>
            `).join('')}
          </div>
        `}

        <!-- Historique -->
        ${past.length ? `
          <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:10px;font-weight:500">Historique</div>
          ${past.slice(0, 10).map(item => `
            <div class="item-row" style="margin-bottom:6px;opacity:.5">
              <div class="checkbox checked">${icon('check','12px')}</div>
              <div style="flex:1">
                <div style="font-size:13px;text-decoration:line-through">${item.label}</div>
                <div style="font-size:11px;color:var(--text-tertiary)">${item.datetime?.replace('T',' ').slice(0,16) ?? '—'}</div>
              </div>
              <button class="btn btn-ghost btn-icon btn-sm rem-del" data-id="${item.id}">${icon('trash','13px')}</button>
            </div>
          `).join('')}
        ` : ''}
      </div>
    `;

    _bindEvents();
  }

  function _bindEvents() {
    container.querySelector('#rem-add')?.addEventListener('click', () => {
      // datetime-local par défaut = maintenant + 1h
      const def = new Date(Date.now() + 3600000).toISOString().slice(0, 16);
      Modal.open('Nouveau rappel', `
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Rappel</label>
            <input class="input" name="label" placeholder="Que voulez-vous rappeler ?">
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Date et heure</label>
            <input class="input" type="datetime-local" name="datetime" value="${def}">
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Récurrence</label>
            <select class="input" name="recurrence">
              ${RECURRENCE.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
            </select>
          </div>
        </div>
      `, async () => {
        const label      = Modal.getInput('label')?.trim();
        const datetime   = Modal.getInput('datetime');
        const recurrence = Modal.getInput('recurrence') ?? 'none';
        if (!label || !datetime) return;
        await RemindersState.add({ label, datetime, recurrence });
        render();
      });
    });

    container.querySelectorAll('.rem-done').forEach(btn => {
      btn.addEventListener('click', async () => { await RemindersState.markDone(btn.dataset.id); render(); });
    });

    container.querySelectorAll('.rem-del').forEach(btn => {
      btn.addEventListener('click', async () => { await RemindersState.remove(btn.dataset.id); render(); });
    });
  }

  render();
}

// ── Expose renderFn ──
window["renderReminders"] = renderReminders;
