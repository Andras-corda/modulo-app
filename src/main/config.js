// ── Modulo Config — lit modulo.toml au démarrage ──

const fs   = require('fs');
const path = require('path');

// ── Parser TOML minimal (sections + clés string) ─────────────────────────────
function parseTOML(content) {
  const result = {};
  let section  = null;

  for (const raw of content.split('\n')) {
    const line = raw.trim();

    // Commentaire ou vide
    if (!line || line.startsWith('#')) continue;

    // Section [nom]
    const secMatch = line.match(/^\[([^\]]+)\]$/);
    if (secMatch) {
      section = secMatch[1].trim();
      result[section] = result[section] ?? {};
      continue;
    }

    // Clé = valeur
    const eqIdx = line.indexOf('=');
    if (eqIdx < 0) continue;

    const key = line.slice(0, eqIdx).trim();
    let   val = line.slice(eqIdx + 1).trim();

    // Inline comment
    val = val.replace(/\s+#.*$/, '');

    // String entre guillemets
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // Booléen
    else if (val === 'true')  val = true;
    else if (val === 'false') val = false;
    // Nombre
    else if (!isNaN(val) && val !== '') val = Number(val);

    if (section) result[section][key] = val;
    else         result[key] = val;
  }

  return result;
}

// ── Charger la config ─────────────────────────────────────────────────────────
function loadConfig() {
  // Chercher modulo.toml à la racine du projet (dev) ou à côté de l'exe (prod)
  const candidates = [
    path.join(__dirname, '../../modulo.toml'),           // dev: src/main → racine
    path.join(process.resourcesPath ?? '', 'modulo.toml'), // prod: resources/
    path.join(path.dirname(process.execPath), 'modulo.toml'), // prod: dossier exe
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw    = fs.readFileSync(p, 'utf-8');
        const config = parseTOML(raw);
        console.log('[Config] Loaded from:', p);
        return config;
      }
    } catch (e) {
      console.warn('[Config] Failed to read', p, e.message);
    }
  }

  // Fallback hardcodé si le fichier est introuvable
  console.warn('[Config] modulo.toml not found — using fallback');
  return {
    app:     { name:'Modulo', version:'1.4.8', description:'Modular productivity app', license:'MIT' },
    creator: { name:'R3tr0___', portfolio:'', discord:'', github:'' },
    links:   { repo:'', releases:'' },
    server:  { base_url:'https://modulo-web-production.up.railway.app' },
    build:   { platform:'Windows' },
  };
}

const config = loadConfig();
module.exports = config;
