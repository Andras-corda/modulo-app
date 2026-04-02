const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(app.getPath('userData'), 'data');
fs.mkdirSync(dataDir, { recursive: true });

// Valeurs par défaut pour chaque store
const DEFAULTS = {
  todos:      [],
  checklists: [],
  reminders:  [],
  timers:     [],
  events:     [],
  notes:      [],
  modules:    { installed: [] },
  devlog:     [],
  settings: {
    theme:       'dark',
    lang:        'fr',
    dateFormat:  'dmy',
    fontScale:   1,
    sounds:      true,
    startup:     false,
    catalogUrl:  'https://modulo-web-production.up.railway.app',
    timerOverlay: { enabled: true, position: 'bottom-right', opacity: 0.9 },
  },
  profile: {
    pseudo:   '',
    pwHash:   null,
    created:  null,
  },
};

function filePath(name) {
  return path.join(dataDir, `${name}.json`);
}

function readJson(name) {
  const fp = filePath(name);
  try {
    if (!fs.existsSync(fp)) return DEFAULTS[name] ?? null;
    const raw = fs.readFileSync(fp, 'utf-8');
    const data = JSON.parse(raw);

    // Migration rétrocompat modules.json { installed, active } → { installed }
    if (name === 'modules' && Array.isArray(data.active)) {
      const merged = [...new Set([...(data.installed || []), ...data.active])];
      return { installed: merged };
    }

    return data;
  } catch {
    return DEFAULTS[name] ?? null;
  }
}

function writeJson(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { readJson, writeJson };
