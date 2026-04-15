// ── Modulo Module: Calendrier (calendar) v1.0.0 ──
// Author: Modulo Team
// Built: 2026-04-02T23:54:51.073Z
// renderFn: renderCalendar
// ── calendar\script\state.js ──
// ── Calendar State ──

const CalendarState = {
  _events: [],

  async load() {
    this._events = (await window.modulo.events.getAll()) ?? [];
    return this._events;
  },

  async save() {
    await window.modulo.events.save(this._events);
  },

  async add({ title, date, endDate = null, color = '#4285F4', allDay = true, description = '' }) {
    const ev = { id: uid(), title, date, endDate, color, allDay, description, createdAt: today() };
    this._events.push(ev);
    await this.save();
    return ev;
  },

  async update(id, patch) {
    const ev = this._events.find(e => e.id === id);
    if (ev) { Object.assign(ev, patch); await this.save(); }
  },

  async remove(id) {
    this._events = this._events.filter(e => e.id !== id);
    await this.save();
  },

  forMonth(year, month) {
    // month : 0-indexed
    return this._events.filter(ev => {
      if (!ev.date) return false;
      const [y, m] = ev.date.split('-').map(Number);
      return y === year && m === month + 1;
    });
  },

  forDay(dateStr) {
    return this._events.filter(ev => ev.date === dateStr);
  },
};

const CAL_COLORS = ['#4285F4','#34A853','#EA4335','#FBBC04','#FF6D00','#9C27B0','#00BCD4'];

// ── calendar\page\render.js ──
// ── Calendar Render ──

async function renderCalendar(container) {
  const now  = new Date();
  let _year  = now.getFullYear();
  let _month = now.getMonth();

  await CalendarState.load();

  const DAYS   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  function _daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function _firstDay(y, m)    { return (new Date(y, m, 1).getDay() + 6) % 7; } // lundi = 0
  function _pad(n)            { return String(n).padStart(2, '0'); }
  function _dateStr(y, m, d)  { return `${y}-${_pad(m+1)}-${_pad(d)}`; }
  function _isToday(y, m, d)  { return y === now.getFullYear() && m === now.getMonth() && d === now.getDate(); }

  function render() {
    const events   = CalendarState.forMonth(_year, _month);
    const days     = _daysInMonth(_year, _month);
    const firstDay = _firstDay(_year, _month);
    const todayStr = _dateStr(now.getFullYear(), now.getMonth(), now.getDate());

    // Construire la grille
    let cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= days; d++)    cells.push(d);

    container.innerHTML = `
      <div class="page">
        <div class="page-header">
          <div style="display:flex;align-items:center;gap:12px">
            <button class="btn btn-ghost btn-icon" id="cal-prev">${icon('chevron_left','18px')}</button>
            <div class="page-title" style="min-width:180px;text-align:center">${MONTHS[_month]} ${_year}</div>
            <button class="btn btn-ghost btn-icon" id="cal-next">${icon('chevron_right','18px')}</button>
          </div>
          <button class="btn btn-secondary btn-sm" id="cal-today">Aujourd'hui</button>
          <button class="btn btn-primary" id="cal-add">${icon('plus','16px')} Événement</button>
        </div>

        <!-- Grille -->
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border);border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--border)">
          <!-- Entêtes jours -->
          ${DAYS.map(d => `
            <div style="background:var(--bg-surface);padding:8px;text-align:center;font-size:11px;color:var(--text-tertiary);font-weight:500">${d}</div>
          `).join('')}

          <!-- Cellules -->
          ${cells.map((d, i) => {
            if (!d) return `<div style="background:var(--bg-base);min-height:80px"></div>`;
            const dateStr   = _dateStr(_year, _month, d);
            const dayEvents = CalendarState.forDay(dateStr);
            const isToday   = _isToday(_year, _month, d);
            return `
              <div class="cal-day" data-date="${dateStr}" style="
                background:var(--bg-card);min-height:80px;padding:6px;cursor:pointer;
                ${isToday ? 'background:var(--bg-active)' : ''}
              ">
                <div style="
                  width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;
                  font-size:12px;margin-bottom:4px;
                  ${isToday ? 'background:var(--blue);color:#fff;font-weight:600' : 'color:var(--text-secondary)'}
                ">${d}</div>
                ${dayEvents.slice(0,3).map(ev => `
                  <div class="cal-event" data-id="${ev.id}" style="
                    background:${ev.color ?? '#4285F4'}33;
                    color:${ev.color ?? '#4285F4'};
                    font-size:10px;padding:2px 5px;border-radius:3px;margin-bottom:2px;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                  ">${ev.title}</div>
                `).join('')}
                ${dayEvents.length > 3 ? `<div style="font-size:10px;color:var(--text-tertiary)">+${dayEvents.length - 3}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <!-- Événements du mois -->
        ${events.length ? `
          <div style="margin-top:24px">
            <div style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:12px">${events.length} événement(s) ce mois</div>
            ${events.sort((a,b) => a.date.localeCompare(b.date)).map(ev => `
              <div class="item-row" style="margin-bottom:6px;border-left:3px solid ${ev.color ?? '#4285F4'}">
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:500">${ev.title}</div>
                  <div style="font-size:11px;color:var(--text-tertiary)">${formatDate(ev.date)}</div>
                  ${ev.description ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:2px">${ev.description}</div>` : ''}
                </div>
                <button class="btn btn-ghost btn-icon btn-sm cal-del" data-id="${ev.id}">${icon('trash','13px')}</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <style>
        .cal-day:hover { background: var(--bg-elevated) !important; }
        .cal-event:hover { opacity: .8; cursor: pointer; }
      </style>
    `;

    _bindEvents();
  }

  function _openAddModal(date = today()) {
    Modal.open('Nouvel événement', `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Titre</label>
          <input class="input" name="title" placeholder="Mon événement…">
        </div>
        <div>
          <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Date</label>
          <input class="input" type="date" name="date" value="${date}">
        </div>
        <div>
          <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Description (optionnel)</label>
          <input class="input" name="description" placeholder="Notes…">
        </div>
        <div>
          <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">Couleur</label>
          <div style="display:flex;gap:8px">
            ${CAL_COLORS.map((c, i) => `
              <div style="width:22px;height:22px;border-radius:50%;background:${c};cursor:pointer;border:2px solid transparent"
                data-color="${c}" class="cal-color-pick" onclick="this.parentNode.querySelectorAll('.cal-color-pick').forEach(x=>x.style.borderColor='transparent');this.style.borderColor='white';document.querySelector('[name=color]').value='${c}'">
              </div>
            `).join('')}
            <input type="hidden" name="color" value="${CAL_COLORS[0]}">
          </div>
        </div>
      </div>
    `, async () => {
      const title       = Modal.getInput('title')?.trim();
      const date        = Modal.getInput('date');
      const description = Modal.getInput('description') ?? '';
      const color       = Modal.getInput('color') ?? '#4285F4';
      if (!title || !date) return;
      await CalendarState.add({ title, date, description, color });
      render();
    });
  }

  function _bindEvents() {
    container.querySelector('#cal-prev')?.addEventListener('click', () => {
      _month--; if (_month < 0) { _month = 11; _year--; } render();
    });
    container.querySelector('#cal-next')?.addEventListener('click', () => {
      _month++; if (_month > 11) { _month = 0; _year++; } render();
    });
    container.querySelector('#cal-today')?.addEventListener('click', () => {
      _year = now.getFullYear(); _month = now.getMonth(); render();
    });
    container.querySelector('#cal-add')?.addEventListener('click', () => _openAddModal());

    container.querySelectorAll('.cal-day').forEach(el => {
      el.addEventListener('click', (e) => {
        if (!e.target.closest('.cal-event')) _openAddModal(el.dataset.date);
      });
    });

    container.querySelectorAll('.cal-event').forEach(el => {
      el.addEventListener('click', (e) => { e.stopPropagation(); });
    });

    container.querySelectorAll('.cal-del').forEach(btn => {
      btn.addEventListener('click', async () => { await CalendarState.remove(btn.dataset.id); render(); });
    });
  }

  render();
}

// ── Expose renderFn ──
window["renderCalendar"] = renderCalendar;
