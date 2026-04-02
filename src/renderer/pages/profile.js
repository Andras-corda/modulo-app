// ── Page Profile ──

// Hash djb2 — identique à ce qui est défini dans le cahier des charges
function _djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

async function renderProfile(container) {
  let profile = (await window.modulo.profile.get()) ?? {};

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <div class="page-title">${t('profile_title')}</div>
      </div>

      <div style="max-width:440px;display:flex;flex-direction:column;gap:16px">

        <!-- Avatar -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
          <div style="
            width:64px;height:64px;border-radius:50%;
            background:var(--blue);
            display:flex;align-items:center;justify-content:center;
            font-size:26px;font-weight:500;color:#fff;
            flex-shrink:0
          " id="profile-avatar">
            ${profile.pseudo ? profile.pseudo.charAt(0).toUpperCase() : icon('user', '28px')}
          </div>
          <div>
            <div style="font-size:16px;font-weight:500">${profile.pseudo || 'Utilisateur'}</div>
            <div style="font-size:12px;color:var(--text-tertiary);margin-top:2px">
              ${profile.created ? 'Depuis ' + formatDate(profile.created) : 'Compte local'}
            </div>
          </div>
        </div>

        <!-- Pseudo -->
        <div class="card">
          <div style="font-size:13px;font-weight:500;margin-bottom:8px">${t('profile_pseudo')}</div>
          <input class="input" id="pseudo-input" value="${profile.pseudo ?? ''}" placeholder="Votre nom…">
        </div>

        <!-- Mot de passe -->
        <div class="card">
          <div style="font-size:13px;font-weight:500;margin-bottom:4px">${t('profile_password')}</div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:10px">
            ${profile.pwHash ? t('profile_change_pw') : t('profile_no_pw')}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <input class="input" type="password" id="pw-input" placeholder="Nouveau mot de passe…">
            <input class="input" type="password" id="pw-confirm-input" placeholder="Confirmer le mot de passe…">
          </div>
          <div id="pw-error" style="font-size:11px;color:var(--red);margin-top:6px;display:none"></div>
        </div>

        <!-- Actions -->
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-primary" id="profile-save">
            ${icon('check', '14px')} ${t('profile_save')}
          </button>
          <div id="profile-saved" style="font-size:12px;color:var(--green);display:none">${t('success')} !</div>
        </div>

        <!-- Stats -->
        <div class="card" style="margin-top:8px">
          <div style="font-size:12px;font-weight:500;color:var(--text-secondary);margin-bottom:12px">Données locales</div>
          <div id="profile-stats" style="font-size:12px;color:var(--text-tertiary)">Chargement…</div>
        </div>
      </div>
    </div>
  `;

  // Charger les stats
  async function loadStats() {
    const el = container.querySelector('#profile-stats');
    if (!el) return;
    try {
      const [todos, notes, events, reminders, checklists, timers] = await Promise.all([
        window.modulo.todos.getAll(),
        window.modulo.notes.getAll(),
        window.modulo.events.getAll(),
        window.modulo.reminders.getAll(),
        window.modulo.checklists.getAll(),
        window.modulo.timers.getAll(),
      ]);

      const rows = [
        ['Tâches', todos?.length ?? 0],
        ['Notes', notes?.length ?? 0],
        ['Événements', events?.length ?? 0],
        ['Rappels', reminders?.length ?? 0],
        ['Listes', checklists?.length ?? 0],
        ['Minuteurs', timers?.length ?? 0],
      ];

      el.innerHTML = rows.map(([label, count]) => `
        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)">
          <span>${label}</span>
          <span style="color:var(--text-primary);font-weight:500">${count}</span>
        </div>
      `).join('');
    } catch {
      el.textContent = 'Impossible de charger les stats.';
    }
  }

  loadStats();

  // Sauvegarder
  container.querySelector('#profile-save')?.addEventListener('click', async () => {
    const pseudo = container.querySelector('#pseudo-input')?.value?.trim() ?? '';
    const pw     = container.querySelector('#pw-input')?.value ?? '';
    const pwConf = container.querySelector('#pw-confirm-input')?.value ?? '';
    const errEl  = container.querySelector('#pw-error');

    if (pw && pw !== pwConf) {
      errEl.textContent = 'Les mots de passe ne correspondent pas.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    profile.pseudo = pseudo;
    if (!profile.created) profile.created = today();
    if (pw) profile.pwHash = _djb2(pw);

    await window.modulo.profile.save(profile);

    // Mettre à jour avatar
    const avatar = container.querySelector('#profile-avatar');
    if (avatar) avatar.innerHTML = pseudo ? pseudo.charAt(0).toUpperCase() : icon('user', '28px');

    const saved = container.querySelector('#profile-saved');
    if (saved) { saved.style.display = 'block'; setTimeout(() => { saved.style.display = 'none'; }, 2000); }

    // Reset password fields
    container.querySelector('#pw-input').value = '';
    container.querySelector('#pw-confirm-input').value = '';
  });
}
