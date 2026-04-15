const fs   = require('fs');
const path = require('path');

const PATHS = {
  app:     path.join(__dirname, 'data', 'app.json'),
  modules: path.join(__dirname, 'data', 'modules.json'),
  themes:  path.join(__dirname, 'data', 'themes.json'),
};

function _read(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function _write(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

// App 

function getApp() {
  return _read(PATHS.app);
}

function updateApp(patch) {
  const app = _read(PATHS.app);
  _write(PATHS.app, { ...app, ...patch });
}

// Modules 

function getModules(filter = {}) {
  let modules = _read(PATHS.modules);
  if (filter.category) modules = modules.filter(m => m.category === filter.category);
  if (filter.q) {
    const q = filter.q.toLowerCase();
    modules = modules.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.tags?.some(t => t.toLowerCase().includes(q))
    );
  }
  return modules;
}

function getModule(id) {
  return _read(PATHS.modules).find(m => m.id === id) ?? null;
}

function upsertModule(mod) {
  const modules = _read(PATHS.modules);
  const idx     = modules.findIndex(m => m.id === mod.id);
  if (idx >= 0) modules[idx] = { ...modules[idx], ...mod };
  else          modules.push(mod);
  _write(PATHS.modules, modules);
}

function deleteModule(id) {
  const modules = _read(PATHS.modules).filter(m => m.id !== id);
  _write(PATHS.modules, modules);
}

function incrementModuleDownloads(id) {
  const modules = _read(PATHS.modules);
  const mod     = modules.find(m => m.id === id);
  if (mod) { mod.downloads = (mod.downloads ?? 0) + 1; _write(PATHS.modules, modules); }
}

// Themes

function getThemes(filter = {}) {
  let themes = _read(PATHS.themes);
  if (filter.tag) themes = themes.filter(t => t.tags?.includes(filter.tag));
  if (filter.q) {
    const q = filter.q.toLowerCase();
    themes = themes.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      t.author?.toLowerCase().includes(q) ||
      t.tags?.some(tg => tg.toLowerCase().includes(q))
    );
  }
  return themes;
}

function getTheme(id) {
  return _read(PATHS.themes).find(t => t.id === id) ?? null;
}

function upsertTheme(theme) {
  const themes = _read(PATHS.themes);
  const idx    = themes.findIndex(t => t.id === theme.id);
  if (idx >= 0) themes[idx] = { ...themes[idx], ...theme };
  else          themes.push(theme);
  _write(PATHS.themes, themes);
}

function deleteTheme(id) {
  const themes = _read(PATHS.themes).filter(t => t.id !== id);
  _write(PATHS.themes, themes);
}

function incrementThemeDownloads(id) {
  const themes = _read(PATHS.themes);
  const theme  = themes.find(t => t.id === id);
  if (theme) { theme.downloads = (theme.downloads ?? 0) + 1; _write(PATHS.themes, themes); }
}

// Stats

function getStats() {
  const modules = _read(PATHS.modules);
  const app     = _read(PATHS.app);
  const themes  = _read(PATHS.themes);
  return {
    total:          modules.length,
    downloads:      modules.reduce((s, m) => s + (m.downloads ?? 0), 0),
    builtIn:        modules.filter(m => m.builtIn).length,
    community:      modules.filter(m => !m.builtIn).length,
    appDownloads:   app.appDownloads ?? 0,
    totalThemes:    themes.length,
    themeDownloads: themes.reduce((s, t) => s + (t.downloads ?? 0), 0),
  };
}

module.exports = {
  // App
  getApp, updateApp,
  // Modules
  getModules, getModule, upsertModule, deleteModule, incrementModuleDownloads,
  // Themes
  getThemes, getTheme, upsertTheme, deleteTheme, incrementThemeDownloads,
  // Stats
  getStats,
};
