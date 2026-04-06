// ── Page Dashboard ──

async function renderDashboard(container) {
  const profile  = (await window.modulo.profile.get()) ?? {};
  const settings = (await window.modulo.settings.get()) ?? {};
  const lang     = settings.lang ?? 'fr';

  const greet = () => {
    const h = new Date().getHours();
    if (lang === 'en') {
      if (h < 12) return 'Good morning';
      if (h < 18) return 'Good afternoon';
      return 'Good evening';
    }
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const name = profile.pseudo || (lang === 'en' ? 'there' : '');

  // Charger les stats de tous les modules
  let todos = [], notes = [], events = [], reminders = [], timers = [], checklists = [];
  try {
    [todos, notes, events, reminders, timers, checklists] = await Promise.all([
      window.modulo.todos.getAll(),
      window.modulo.notes.getAll(),
      window.modulo.events.getAll(),
      window.modulo.reminders.getAll(),
      window.modulo.timers.getAll(),
      window.modulo.checklists.getAll(),
    ]);
    todos      = todos      ?? [];
    notes      = notes?.filter(n => !n.tags?.includes('__diagram__') && !n.tags?.includes('__datafile__') && !n.tags?.includes('__structogram__')) ?? [];
    events     = events     ?? [];
    reminders  = reminders  ?? [];
    timers     = timers     ?? [];
    checklists = checklists ?? [];
  } catch { /* modules pas installés */ }

  const todayStr    = today();
  const doneTodos   = todos.filter(t => t.done).length;
  const lateTodos   = todos.filter(t => !t.done && t.dueDate && t.dueDate < todayStr).length;
  const todayEvents = events.filter(e => e.date === todayStr);
  const lateRem     = reminders.filter(r => !r.done && r.datetime && r.datetime < new Date().toISOString());

  // Prochains événements (7 jours)
  const soon = new Date(); soon.setDate(soon.getDate() + 7);
  const soonStr = soon.toISOString().slice(0, 10);
  const upcomingEvents = events
    .filter(e => e.date >= todayStr && e.date <= soonStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  // Tâches urgentes
  const urgentTodos = todos
    .filter(t => !t.done && (t.priority === 'high' || (t.dueDate && t.dueDate <= todayStr)))
    .slice(0, 6);

  // Modules installés
  const data      = (await window.modulo.modules.get()) ?? { installed: [] };
  const installed = data.installed ?? [];

  container.innerHTML = `
    <div class="page" style="max-width:900px;padding:28px 32px">

      <!-- Salutation -->
      <div style="margin-bottom:32px">
        <div style="font-size:24px;font-weight:500;color:var(--text-primary)">
          ${greet()}${name ? ', <span style="color:var(--blue-light)">' + name + '</span>' : ''} 👋
        </div>
        <div style="font-size:13px;color:var(--text-tertiary);margin-top:4px">
          ${new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </div>
      </div>

      <!-- Cartes stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:32px">
        ${_dashStat(icon('check','18px'), lang==='en'?'Tasks':'Tâches', `${doneTodos}/${todos.length}`, lateTodos ? `${lateTodos} ${lang==='en'?'late':'en retard'}` : null, lateTodos ? 'var(--red)' : 'var(--blue)')}
        ${_dashStat(icon('note','18px'), 'Notes', notes.length, null, 'var(--purple,#9C27B0)')}
        ${_dashStat(icon('calendar','18px'), lang==='en'?'Today':'Aujourd\'hui', todayEvents.length, lang==='en'?'event(s)':'événement(s)', 'var(--green,#388E3C)')}
        ${_dashStat(icon('bell','18px'), lang==='en'?'Reminders':'Rappels', reminders.filter(r=>!r.done).length, lateRem.length ? `${lateRem.length} ${lang==='en'?'due':'en retard'}` : null, lateRem.length ? 'var(--red)' : 'var(--yellow,#F57F17)')}
        ${_dashStat(icon('list','18px'), lang==='en'?'Lists':'Listes', checklists.length, null, 'var(--cyan,#00838F)')}
      </div>

      <!-- Grille principale -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">

        <!-- Tâches urgentes -->
        <div class="card">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:14px;display:flex;align-items:center;gap:6px">
            ${icon('check','14px')}
            ${lang==='en'?'Priority tasks':'Tâches prioritaires'}
            ${lateTodos ? `<span style="margin-left:auto;font-size:10px;color:var(--red);background:rgba(234,67,53,.12);padding:2px 7px;border-radius:var(--radius-full)">${lateTodos} ${lang==='en'?'late':'en retard'}</span>` : ''}
          </div>
          ${!urgentTodos.length ? `
            <div style="font-size:12px;color:var(--text-tertiary);text-align:center;padding:12px 0">
              ${lang==='en'?'No urgent tasks':'Aucune tâche urgente'} 🎉
            </div>
          ` : urgentTodos.map(t => `
            <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
              <div style="width:12px;height:12px;border-radius:3px;border:1.5px solid ${t.priority==='high'?'var(--red)':'var(--border-strong)'};flex-shrink:0"></div>
              <span style="font-size:12px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.text}</span>
              ${t.dueDate && t.dueDate < todayStr ? `<span style="font-size:10px;color:var(--red)">${t.dueDate}</span>` : ''}
              ${t.priority==='high' ? `<span style="font-size:10px;color:var(--red);font-weight:600">!</span>` : ''}
            </div>
          `).join('')}
          <button class="btn btn-ghost btn-sm" style="margin-top:10px;font-size:11px;width:100%" onclick="Router.navigate('todos')">
            ${lang==='en'?'See all tasks →':'Voir toutes les tâches →'}
          </button>
        </div>

        <!-- Événements à venir -->
        <div class="card">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:14px;display:flex;align-items:center;gap:6px">
            ${icon('calendar','14px')}
            ${lang==='en'?'Upcoming (7 days)':'Prochains événements (7j)'}
          </div>
          ${!upcomingEvents.length ? `
            <div style="font-size:12px;color:var(--text-tertiary);text-align:center;padding:12px 0">
              ${lang==='en'?'No upcoming events':'Aucun événement à venir'}
            </div>
          ` : upcomingEvents.map(e => `
            <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
              <div style="width:3px;height:32px;border-radius:2px;background:${e.color??'var(--blue)'};flex-shrink:0"></div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.title}</div>
                <div style="font-size:10px;color:var(--text-tertiary)">${e.date === todayStr ? (lang==='en'?'Today':'Aujourd\'hui') : formatDate(e.date)}</div>
              </div>
            </div>
          `).join('')}
          <button class="btn btn-ghost btn-sm" style="margin-top:10px;font-size:11px;width:100%" onclick="Router.navigate('calendar')">
            ${lang==='en'?'Open calendar →':'Ouvrir le calendrier →'}
          </button>
        </div>

        <!-- Modules installés -->
        <div class="card">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:14px;display:flex;align-items:center;gap:6px">
            ${icon('dashboard','14px')}
            ${lang==='en'?'Installed modules':'Modules installés'}
            <span style="margin-left:auto;font-size:11px;color:var(--text-tertiary)">${installed.length}</span>
          </div>
          ${!installed.length ? `
            <div style="font-size:12px;color:var(--text-tertiary);text-align:center;padding:12px 0">
              ${lang==='en'?'No modules installed yet':'Aucun module installé'}
            </div>
            <button class="btn btn-primary btn-sm" style="width:100%;margin-top:8px" onclick="Router.navigate('marketplace')">
              ${lang==='en'?'Browse marketplace':'Découvrir le marketplace'}
            </button>
          ` : `
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${installed.map(id => {
                const mod = ModuleManager.getCatalog().find(m => m.id === id);
                return `<div style="display:flex;align-items:center;gap:5px;padding:4px 9px;border-radius:var(--radius-md);background:var(--bg-elevated);cursor:pointer;font-size:11px" onclick="Router.navigate('${mod?.navKey??id}')">
                  <span style="color:${mod?.color??'var(--blue)'}">${icon(mod?.icon??'dashboard','13px')}</span>
                  ${mod?.name??id}
                </div>`;
              }).join('')}
            </div>
          `}
        </div>

        <!-- À propos / Créateur -->
        <div class="card" style="background:linear-gradient(135deg,rgba(66,133,244,.06) 0%,transparent 100%)">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:14px;display:flex;align-items:center;gap:6px">
            ${icon('eye','14px')} Modulo
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <div style="width:40px;height:40px;border-radius:10px;background:var(--blue);display:flex;align-items:center;justify-content:center">
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="7" height="7" rx="2" fill="#fff"/>
                <rect x="11" y="2" width="7" height="7" rx="2" fill="#fff" opacity=".6"/>
                <rect x="2" y="11" width="7" height="7" rx="2" fill="#fff" opacity=".6"/>
                <rect x="11" y="11" width="7" height="7" rx="2" fill="#fff" opacity=".3"/>
              </svg>
            </div>
            <div>
              <div style="font-size:13px;font-weight:500">Modulo v1.4.7</div>
              <div style="font-size:11px;color:var(--text-tertiary)">par <span style="color:var(--blue-light)">R3tr0___</span></div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn btn-secondary btn-sm dash-ext-link" data-url="https://discord.gg/8JPP3wDd6e" style="justify-content:flex-start;gap:8px;font-size:11px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              Discord — R3tr0___
            </button>
            <button class="btn btn-secondary btn-sm dash-ext-link" data-url="https://andras-corda.github.io/portfolio-github-hosting/" style="justify-content:flex-start;gap:8px;font-size:11px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              Portfolio
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  // Liens externes
  container.querySelectorAll('.dash-ext-link').forEach(btn => {
    btn.addEventListener('click', () => window.modulo.openExternal(btn.dataset.url));
  });
}

function _dashStat(iconHtml, label, value, sub, color) {
  return `
    <div class="card" style="padding:16px">
      <div style="color:${color};margin-bottom:6px">${iconHtml}</div>
      <div style="font-size:22px;font-weight:600;color:var(--text-primary);line-height:1">${value}</div>
      <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">${label}</div>
      ${sub ? `<div style="font-size:10px;color:${color};margin-top:2px">${sub}</div>` : ''}
    </div>
  `;
}
