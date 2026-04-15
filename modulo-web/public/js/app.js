const API = window.location.origin;
const pages = ['home','marketplace','themes','download','docs','privacy'];

// Router
function navigate(page) {
  if (!pages.includes(page)) page = 'home';
  pages.forEach(p => {
    document.getElementById('page-'+p)?.classList.toggle('active', p===page);
  });
  document.querySelectorAll('.nav-link').forEach(a =>
    a.classList.toggle('active', a.dataset.page===page));

  // Close mobile menu
  document.getElementById('nav-links')?.classList.remove('open');

  if (page==='marketplace' && !_s.mp)  loadMarketplace();
  if (page==='download'    && !_s.dl)  loadDownload();
  if (page==='docs'        && !_s.docs) initDocs();
  if (page==='home'        && !_s.home) loadHome();
  if (page==='themes'      && !_s.th)  loadThemes();

  history.pushState({page}, '', page==='home' ? '/' : '/'+page);
  window.scrollTo(0,0);
}

const _s = { home:false, mp:false, dl:false, docs:false, th:false };
let _catalog = [], _filter = 'all', _query = '';

// RGPD
function initRgpd() {
  const banner = document.getElementById('rgpd-banner');
  if (!banner) return;
  if (!getCookie('modulo_rgpd')) setTimeout(() => banner.classList.add('visible'), 700);
  document.getElementById('rgpd-accept')?.addEventListener('click', () => {
    setCookie('modulo_rgpd','accepted',365); banner.classList.remove('visible');
  });
  document.getElementById('rgpd-refuse')?.addEventListener('click', () => banner.classList.remove('visible'));
  document.querySelectorAll('.rgpd-link').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); navigate('privacy'); }));
}
function setCookie(n,v,d) { const e=new Date(); e.setTime(e.getTime()+d*86400000); document.cookie=`${n}=${v};expires=${e.toUTCString()};path=/;SameSite=Strict`; }
function getCookie(n) { const v=document.cookie.match('(^|;)\\s*'+n+'\\s*=\\s*([^;]+)'); return v?v.pop():''; }

// Home
async function loadHome() {
  _s.home = true;
  // Stats
  try {
    const r = await fetch(API+'/api/modules/stats');
    const d = await r.json();
    const hm = document.getElementById('hs-modules');
    const hd = document.getElementById('hs-downloads');
    if (hm) hm.textContent = d.total ?? '—';
    if (hd) hd.textContent = d.downloads ? (d.downloads+d.appDownloads).toLocaleString() : '—';
    const bar = document.getElementById('stats-bar');
    if (bar) bar.innerHTML = `
      <div class="stat-item"><div class="stat-value">${d.total??0}</div><div class="stat-label">modules</div></div>
      <div class="stat-item"><div class="stat-value">${(d.downloads??0).toLocaleString()}</div><div class="stat-label">installs</div></div>
      <div class="stat-item"><div class="stat-value">${(d.appDownloads??0).toLocaleString()}</div><div class="stat-label">app downloads</div></div>`;
  } catch {}

  // Modules preview
  const grid = document.getElementById('home-modules-preview');
  if (!grid) return;
  try {
    const r = await fetch(API+'/api/modules');
    _catalog = await r.json();
    grid.innerHTML = _catalog.slice(0,12).map(m => `
      <div class="module-preview-card">
        <div style="width:34px;height:34px;border-radius:8px;flex-shrink:0;background:${m.color??'#4285F4'}18;display:flex;align-items:center;justify-content:center;color:${m.color??'#4285F4'}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
        </div>
        <div style="min-width:0"><div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.name}</div><div style="font-size:10px;color:var(--text-tertiary)">v${m.version}</div></div>
      </div>`).join('');
  } catch { grid.innerHTML=''; }
}

// Marketplace
async function loadMarketplace() {
  _s.mp = true;
  const grid = document.getElementById('module-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    if (!_catalog.length) { const r=await fetch(API+'/api/modules'); _catalog=await r.json(); }
    renderGrid();
    // Stats bar
    const bar = document.getElementById('stats-bar');
    if (bar) bar.innerHTML = `<div class="stat-item"><div class="stat-value">${_catalog.length}</div><div class="stat-label">modules</div></div>`;
  } catch { grid.innerHTML='<div class="empty-state"><div class="empty-state-title">Could not load catalog</div></div>'; }
}

function renderGrid() {
  const grid = document.getElementById('module-grid');
  if (!grid) return;
  const filtered = _catalog.filter(m => {
    const matchCat = _filter==='all' || m.category===_filter;
    const q = _query.toLowerCase();
    const matchQ = !q || m.name?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  if (!filtered.length) { grid.innerHTML='<div class="empty-state"><div class="empty-state-title">No modules found</div></div>'; return; }
  grid.innerHTML = filtered.map(m => `
    <div class="card module-card" onclick="openModal('${m.id}')">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="width:40px;height:40px;border-radius:10px;flex-shrink:0;background:${m.color??'#4285F4'}18;display:flex;align-items:center;justify-content:center;color:${m.color??'#4285F4'}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500">${m.name}</div>
          <div style="font-size:10px;color:var(--text-tertiary)">v${m.version} · ${m.author??'—'}</div>
        </div>
        <span class="badge badge-gray" style="font-size:10px">${m.category??''}</span>
      </div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-top:10px">${m.description??''}</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-tertiary);margin-top:10px">
        <span>${(m.downloads??0).toLocaleString()} installs</span>
        <span style="font-family:var(--font-mono)">${m.size??'—'}</span>
      </div>
    </div>`).join('');
}

function openModal(id) {
  const m = _catalog.find(x=>x.id===id);
  if (!m) return;
  document.getElementById('modal-title').textContent = m.name;
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
      <div style="width:52px;height:52px;border-radius:12px;background:${m.color??'#4285F4'}18;display:flex;align-items:center;justify-content:center;color:${m.color??'#4285F4'};flex-shrink:0">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
      </div>
      <div>
        <div style="font-size:17px;font-weight:600">${m.name}</div>
        <div style="font-size:12px;color:var(--text-tertiary)">${m.author??'—'} · v${m.version}</div>
      </div>
    </div>
    <p style="color:var(--text-secondary);margin-bottom:16px;font-size:13px">${m.description??''}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${[['Category',m.category],['Size',m.size??'—'],['Downloads',(m.downloads??0).toLocaleString()],['License','MIT']].map(([k,v])=>`
        <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:9px 12px;border:1px solid var(--border)">
          <div style="font-size:9px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.5px">${k}</div>
          <div style="font-size:12px;font-weight:500;margin-top:3px">${v}</div>
        </div>`).join('')}
    </div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

// Themes
async function loadThemes() {
  _s.th = true;
  const grid = document.getElementById('themes-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const r = await fetch(API+'/api/themes');
    const themes = await r.json();
    if (!themes.length) { grid.innerHTML='<div class="empty-state"><div class="empty-state-title">No themes yet</div></div>'; return; }
    grid.innerHTML = themes.map(t => {
      const dv = t.variants?.dark?.preview  ?? t.preview ?? [];
      const lv = t.variants?.light?.preview ?? [];
      const moon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>';
      const sun  = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
      return `
        <div class="theme-palette-card">
          <div class="theme-palette-variants">
            <div class="theme-variant-preview">
              <div class="theme-swatches-row">${dv.map(c=>`<span style="background:${c}"></span>`).join('')}</div>
              <div class="theme-variant-label">${moon} Dark</div>
            </div>
            ${lv.length ? `<div class="theme-variant-preview">
              <div class="theme-swatches-row">${lv.map(c=>`<span style="background:${c}"></span>`).join('')}</div>
              <div class="theme-variant-label">${sun} Light</div>
            </div>` : ''}
          </div>
          <div class="theme-palette-name">${t.name}</div>
          <div class="theme-palette-author">by ${t.author??'Modulo Team'}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            ${(t.tags??[]).map(tg=>`<span class="badge badge-gray" style="font-size:10px">${tg}</span>`).join('')}
          </div>
        </div>`;
    }).join('');
  } catch { grid.innerHTML='<div class="empty-state"><div class="empty-state-title">Could not load themes</div></div>'; }
}

// Download
async function loadDownload() {
  _s.dl = true;
  const el = document.getElementById('download-content');
  if (!el) return;
  try {
    const r    = await fetch(API+'/api/downloads');
    const data = await r.json();
    const dl   = data.downloads ?? {};
    const platforms = [
      { label:'Windows', ext:dl.win?.ext??'.exe',       url:dl.win?.url??null },
      { label:'macOS',   ext:dl.mac?.ext??'.dmg',       url:null },
      { label:'Linux',   ext:dl.linux?.ext??'.AppImage', url:null },
    ];
    const changelog = (data.changelog??[]).map(c=>`
      <div class="changelog-item">
        <div><div class="changelog-version">v${c.version}</div><div class="changelog-date">${c.date??''}</div></div>
        <div class="changelog-notes">${c.notes??''}</div>
      </div>`).join('');
    el.innerHTML = `
      <div style="margin-bottom:40px">
        <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:24px">Current version: <span style="color:var(--blue-light);font-family:var(--font-mono)">v${data.version}</span></div>
        <div class="platform-grid">
          ${platforms.map(p=>`
            <div class="card platform-card">
              <div class="platform-icon" style="font-size:28px;opacity:.6">${p.label==='Windows'?'🪟':p.label==='macOS'?'🍎':'🐧'}</div>
              <div class="platform-name">${p.label}</div>
              <div class="platform-ext" style="font-family:var(--font-mono);font-size:11px;color:var(--text-tertiary)">${p.ext}</div>
              ${p.url
                ? `<a href="${p.url}" class="btn btn-primary dl-app-btn" style="width:100%;justify-content:center" rel="noopener">Download</a>`
                : `<button class="btn btn-secondary" disabled style="width:100%">Coming soon</button>`}
            </div>`).join('')}
        </div>
      </div>
      ${changelog?`<div style="font-size:18px;font-weight:600;margin-bottom:14px;letter-spacing:-.5px">Changelog</div><div class="card"><div class="changelog">${changelog}</div></div>`:''}`;
    document.querySelectorAll('.dl-app-btn').forEach(b=>b.addEventListener('click',()=>fetch(API+'/api/downloads/track',{method:'POST'}).catch(()=>{})));
  } catch { el.innerHTML='<div class="empty-state"><div class="empty-state-title">Could not load download info</div></div>'; }
}

// Docs
const DOCS = {
  intro:        { title:'Introduction', content:'<h1>Modulo</h1><p>Modulo is an open-source modular desktop productivity app for Windows. It works like an empty shell on first launch — you install only the features you need.</p><h2>Core principles</h2><ul><li><strong>Local data</strong> — Nothing leaves your machine.</li><li><strong>No account</strong> — No sign-up, no login, no subscription.</li><li><strong>Modular</strong> — Each feature is a module you install freely.</li><li><strong>Open source</strong> — Code is public and auditable.</li></ul>' },
  install:      { title:'Installation', content:'<h1>Installation</h1><h2>Windows</h2><ol><li>Download <code>Modulo.Setup.1.5.1.exe</code> from the <a href="/download" data-page="download">Download</a> page</li><li>Run the installer and follow the prompts</li><li>Modulo launches automatically</li></ol>' },
  'first-launch':{ title:'First launch', content:'<h1>First launch</h1><p>On first launch, Modulo shows Dashboard, Marketplace and Settings. Install modules to add functionality.</p>' },
  marketplace:  { title:'Marketplace', content:'<h1>Marketplace</h1><p>Browse and install modules. Each module is a JS file hosted on Railway and downloaded on demand.</p>' },
  todos:        { title:'Tasks', content:'<h1>Tasks module</h1><p>Manage tasks with priorities, due dates and filters.</p>' },
  notes:        { title:'Notes', content:'<h1>Notes module</h1><p>Rich notes with folder organization and tags.</p>' },
  diagrams:     { title:'UML Diagrams', content:'<h1>UML Diagrams</h1><p>Create UML diagrams with the Mermaid editor and export as PNG or SVG.</p>' },
  structogram:  { title:'Structogram', content:'<h1>Structogram</h1><p>Nassi-Shneiderman Diagram editor for algorithm visualization.</p>' },
  perlin:       { title:'Perlin Noise', content:'<h1>Perlin Noise</h1><p>Procedural texture generator using Perlin noise with fBm.</p>' },
  'dev-structure':{ title:'Module structure', content:'<h1>Module structure</h1><pre><code>my-module/\n├── module.json\n├── script/state.js\n└── page/render.js</code></pre>' },
  'dev-api':    { title:'Available API', content:'<h1>Available API</h1><pre><code>window.modulo.todos.getAll()\nwindow.modulo.notes.getAll()\nwindow.modulo.charts.getAll()\nwindow.modulo.diagrams.getAll()</code></pre>' },
  'privacy-short':{ title:'Privacy', content:'<h1>Privacy</h1><p>Modulo collects no personal data. See the <a href="/privacy" data-page="privacy">full privacy policy</a>.</p>' },
  license:      { title:'MIT License', content:'<h1>MIT License</h1><p>Modulo is distributed under the MIT License — free and open source.</p>' },
};

function initDocs() {
  _s.docs = true;
  loadDoc('intro');
  document.querySelectorAll('.docs-article-link').forEach(l=>l.addEventListener('click',()=>loadDoc(l.dataset.doc)));
}
function loadDoc(key) {
  const el = document.getElementById('docs-content');
  if (!el) return;
  document.querySelectorAll('.docs-article-link').forEach(l=>l.classList.toggle('active',l.dataset.doc===key));
  const doc = DOCS[key];
  if (!doc) return;
  el.innerHTML = '<div class="markdown">'+doc.content+'</div>';
  el.querySelectorAll('[data-page]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();navigate(a.dataset.page);}));
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  initRgpd();

  document.querySelectorAll('[data-page]').forEach(a => {
    if (a.classList.contains('rgpd-link')) return;
    a.addEventListener('click', e => { e.preventDefault(); navigate(a.dataset.page); });
  });

  // Hamburger
  document.getElementById('nav-hamburger')?.addEventListener('click', () => {
    document.getElementById('nav-links')?.classList.toggle('open');
  });

  // Search
  document.getElementById('mp-search')?.addEventListener('input', e => { _query=e.target.value; renderGrid(); });

  // Filters
  document.querySelectorAll('.filter-tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      _filter = t.dataset.cat;
      renderGrid();
    });
  });

  // Modal
  document.getElementById('modal-close')?.addEventListener('click', ()=>document.getElementById('modal-overlay')?.classList.add('hidden'));
  document.getElementById('modal-overlay')?.addEventListener('click', e=>{if(e.target===document.getElementById('modal-overlay')) document.getElementById('modal-overlay')?.classList.add('hidden');});
  document.addEventListener('keydown', e=>{if(e.key==='Escape') document.getElementById('modal-overlay')?.classList.add('hidden');});

  // Route initiale
  const path = window.location.pathname.replace(/^\//,'') || 'home';
  navigate(pages.includes(path) ? path : 'home');
});

window.openModal = openModal;
