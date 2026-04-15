// Profile

function _djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  return (hash >>> 0).toString(16);
}

// Updates the avatar in the sidebar
async function _updateSidebarProfile() {
  const profile = (await window.modulo.profile.get()) ?? {};
  const avatar  = document.getElementById('sidebar-avatar');
  const uname   = document.getElementById('sidebar-username');

  if (avatar) {
    if (profile.photo) {
      avatar.innerHTML = `<img src="${profile.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else if (profile.pseudo) {
      avatar.textContent = profile.pseudo.charAt(0).toUpperCase();
      avatar.style.background = 'var(--blue)';
    } else {
      avatar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    }
  }
  if (uname) uname.textContent = profile.pseudo || 'Profil';
}

async function renderProfile(container) {
  let profile  = (await window.modulo.profile.get()) ?? {};
  const lang   = (await window.modulo.settings.get())?.lang ?? 'fr';
  const _l     = (fr, en) => lang === 'en' ? en : fr;

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <div class="page-title">${_l('Profil', 'Profile')}</div>
      </div>

      <div style="max-width:460px;display:flex;flex-direction:column;gap:16px">

        <!-- Avatar + photo -->
        <div class="card">
          <div style="font-size:13px;font-weight:500;margin-bottom:14px">${_l('Photo de profil', 'Profile picture')}</div>
          <div style="display:flex;align-items:center;gap:20px">
            <!-- Avatar preview -->
            <div id="avatar-preview" style="
              width:72px;height:72px;border-radius:50%;
              background:var(--blue);display:flex;align-items:center;justify-content:center;
              font-size:28px;font-weight:600;color:#fff;flex-shrink:0;overflow:hidden;
              border:2px solid var(--border);
            ">
              ${profile.photo
                ? `<img src="${profile.photo}" style="width:100%;height:100%;object-fit:cover">`
                : profile.pseudo
                  ? profile.pseudo.charAt(0).toUpperCase()
                  : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button class="btn btn-secondary btn-sm" id="photo-choose">
                ${_l('Choisir une image…', 'Choose image…')}
              </button>
              ${profile.photo ? `<button class="btn btn-ghost btn-sm" id="photo-remove" style="color:var(--red);font-size:11px">${_l('Retirer la photo', 'Remove photo')}</button>` : ''}
              <input type="file" id="photo-input" accept="image/*" style="display:none">
              <div style="font-size:10px;color:var(--text-tertiary)">${_l('PNG, JPG, GIF — max 2MB', 'PNG, JPG, GIF — max 2MB')}</div>
            </div>
          </div>
        </div>

        <!-- Pseudo -->
        <div class="card">
          <div style="font-size:13px;font-weight:500;margin-bottom:8px">${_l('Pseudo', 'Username')}</div>
          <input class="input" id="pseudo-input" value="${profile.pseudo ?? ''}" placeholder="${_l('Votre nom…', 'Your name…')}">
        </div>

        <!-- Mot de passe -->
        <div class="card">
          <div style="font-size:13px;font-weight:500;margin-bottom:4px">${_l('Mot de passe', 'Password')}</div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:10px">
            ${profile.pwHash ? _l('Modifier le mot de passe', 'Change password') : _l('Aucun mot de passe défini', 'No password set')}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <input class="input" type="password" id="pw-input" placeholder="${_l('Nouveau mot de passe…', 'New password…')}">
            <input class="input" type="password" id="pw-confirm-input" placeholder="${_l('Confirmer…', 'Confirm…')}">
          </div>
          <div id="pw-error" style="font-size:11px;color:var(--red);margin-top:6px;display:none"></div>
        </div>

        <!-- Actions -->
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-primary" id="profile-save">
            ${icon('check', '14px')} ${_l('Sauvegarder', 'Save')}
          </button>
          <div id="profile-saved" style="font-size:12px;color:var(--green);display:none">${_l('Sauvegardé !', 'Saved!')} ✓</div>
        </div>

        <!-- Stats -->
        <div class="card" style="margin-top:4px">
          <div style="font-size:12px;font-weight:500;color:var(--text-secondary);margin-bottom:12px">${_l('Données locales', 'Local data')}</div>
          <div id="profile-stats" style="font-size:12px;color:var(--text-tertiary)">${_l('Chargement…', 'Loading…')}</div>
        </div>
      </div>
    </div>
  `;

  // Stats
  async function loadStats() {
    const el = container.querySelector('#profile-stats');
    if (!el) return;
    try {
      const [todos, notes, events, reminders, checklists, timers] = await Promise.all([
        window.modulo.todos.getAll(), window.modulo.notes.getAll(),
        window.modulo.events.getAll(), window.modulo.reminders.getAll(),
        window.modulo.checklists.getAll(), window.modulo.timers.getAll(),
      ]);
      const realNotes = (notes ?? []).filter(n => !n.tags?.includes('__diagram__') && !n.tags?.includes('__datafile__') && !n.tags?.includes('__structogram__'));
      const rows = [
        [_l('Tâches','Tasks'),         todos?.length ?? 0],
        [_l('Notes','Notes'),          realNotes.length],
        [_l('Événements','Events'),    events?.length ?? 0],
        [_l('Rappels','Reminders'),    reminders?.length ?? 0],
        [_l('Listes','Lists'),         checklists?.length ?? 0],
        [_l('Minuteurs','Timers'),     timers?.length ?? 0],
      ];
      el.innerHTML = rows.map(([label, count]) => `
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
          <span>${label}</span>
          <span style="color:var(--text-primary);font-weight:500">${count}</span>
        </div>
      `).join('');
    } catch { el.textContent = _l('Impossible de charger.', 'Unable to load.'); }
  }

  loadStats();

  container.querySelector('#photo-choose')?.addEventListener('click', () => {
    container.querySelector('#photo-input')?.click();
  });

  container.querySelector('#photo-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(_l('Image trop lourde (max 2MB)', 'Image too large (max 2MB)'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data64 = ev.target.result;
      profile.photo = data64;
      const preview = container.querySelector('#avatar-preview');
      if (preview) preview.innerHTML = `<img src="${data64}" style="width:100%;height:100%;object-fit:cover">`;
    };
    reader.readAsDataURL(file);
  });

  container.querySelector('#photo-remove')?.addEventListener('click', () => {
    profile.photo = null;
    const preview = container.querySelector('#avatar-preview');
    if (preview) preview.innerHTML = profile.pseudo ? profile.pseudo.charAt(0).toUpperCase() : '?';
    renderProfile(container); // rerendre pour cacher le bouton
  });

  container.querySelector('#profile-save')?.addEventListener('click', async () => {
    const pseudo  = container.querySelector('#pseudo-input')?.value?.trim() ?? '';
    const pw      = container.querySelector('#pw-input')?.value ?? '';
    const pwConf  = container.querySelector('#pw-confirm-input')?.value ?? '';
    const errEl   = container.querySelector('#pw-error');

    if (pw && pw !== pwConf) {
      errEl.textContent = _l('Les mots de passe ne correspondent pas.', 'Passwords do not match.');
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    profile.pseudo = pseudo;
    if (!profile.created) profile.created = today();
    if (pw) profile.pwHash = _djb2(pw);

    await window.modulo.profile.save(profile);
    await _updateSidebarProfile();

    const saved = container.querySelector('#profile-saved');
    if (saved) { saved.style.display = 'block'; setTimeout(() => saved.style.display = 'none', 2000); }
    container.querySelector('#pw-input').value = '';
    container.querySelector('#pw-confirm-input').value = '';
  });
}
