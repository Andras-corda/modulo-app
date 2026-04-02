# Modulo — Documentation développeur

> Version 1.3.2 — Application Electron de productivité modulaire

---

## Démarrage rapide

```bash
# Installer les dépendances
npm install

# Lancer en mode développement (DevTools ouverts)
npm run dev

# Lancer normalement
npm start
```

---

## Structure du projet

```
modulo-app/
├── package.json
├── DOCUMENTATION.md
├── assets/icons/          ← icon.ico / icon.icns / icon.png
└── src/
    ├── main/
    │   ├── main.js         ← BrowserWindow, IPC, Tray
    │   ├── preload.js      ← window.modulo (contextBridge)
    │   ├── store.js        ← readJson / writeJson (userData/data/)
    │   └── reminderManager.js
    └── renderer/
        ├── index.html
        ├── css/
        │   ├── variables.css   ← tokens CSS (couleurs, radii, fonts…)
        │   ├── reset.css
        │   ├── layout.css      ← titlebar, sidebar, app-content
        │   └── components.css  ← btn, card, input, modal, badge…
        ├── js/
        │   ├── icons.js        ← icon(name, size) → SVG string
        │   ├── i18n.js         ← t(key), setLang(lang)
        │   ├── store.js        ← Store.get/set (cache renderer)
        │   ├── router.js       ← Router.register/navigate
        │   ├── modules.js      ← DevLog, Modal, Sound, TimerOverlay,
        │   │                      ModuleLoader, ModuleManager, utils
        │   └── app.js          ← bootstrap, rebuildNav, applySettings
        └── pages/
            ├── marketplace.js
            ├── settings.js
            └── profile.js
```

---

## API `window.modulo` (renderer → main via IPC)

| Namespace | Méthodes |
|-----------|----------|
| `todos` | `getAll()`, `save(items)` |
| `checklists` | `getAll()`, `save(items)` |
| `reminders` | `getAll()`, `save(items)`, `onFired(cb)` |
| `timers` | `getAll()`, `save(items)` |
| `events` | `getAll()`, `save(items)` |
| `notes` | `getAll()`, `save(items)` |
| `settings` | `get()`, `save(data)` |
| `profile` | `get()`, `save(data)` |
| `modules` | `get()`, `save(data)` |
| `devlog` | `get()`, `save(data)` |
| `moduleFiles` | `download(id, url)`, `readFile(id)`, `deleteFile(id)`, `listFiles()` |
| `window` | `minimize()`, `maximize()`, `close()`, `isMaximized()` |
| — | `notify({ title, body })` |
| — | `setStartup(bool)` |
| — | `openExternal(url)` |

---

## Globales renderer

Ces fonctions sont disponibles dans tous les modules :

```js
// Icônes
icon('check', '18px')          // → '<svg ...>...</svg>'

// i18n
t('marketplace_title')          // → 'Marketplace'
setLang('en')

// Utilitaires
uid()                           // → identifiant unique
today()                         // → '2025-01-01'
formatDate('2025-01-01')        // → '01/01/2025' (selon settings)
formatTime(90)                  // → '01:30'
stripHtml('<b>hello</b>')       // → 'hello'

// UI
Modal.open(title, html, onConfirm)
Modal.close()
Modal.getInput('name')
Router.navigate('todos')
DevLog.info/warn/error/debug(msg)
Sound.play('ding')              // ding | beep | alarm | chime
TimerOverlay.sync(items, state)

// Settings globaux
window._settings                // { theme, lang, dateFormat, fontScale, sounds, … }
```

---

## Créer un module

### Structure minimale

```
mon-module/
├── module.json
├── script/
│   └── state.js
└── page/
    └── render.js
```

### `render.js` — squelette

```js
async function renderMonModule(container) {
  // 1. Charger les données
  const items = await window.modulo.todos.getAll() ?? [];

  // 2. Rendre l'UI
  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <div class="page-title">Mon Module</div>
      </div>
      <!-- … -->
    </div>
  `;

  // 3. Binder les events
  // container.querySelector('button').addEventListener(...)

  // 4. Sauvegarder lors des mutations
  // await window.modulo.todos.save(items);
}
```

### Règles importantes

- La fonction doit être `async` et définie au niveau global
- Préfixer tous les helpers : `MonModuleState`, `_monModuleHelper()`
- Ne jamais utiliser `localStorage` / `sessionStorage`
- Ne jamais utiliser `import` / `export`
- Utiliser les classes CSS de l'app (`card`, `btn`, `input`, `item-row`…)
- Utiliser les variables CSS (`--blue`, `--bg-card`, `--text-primary`…)

---

## Design system

### Classes CSS disponibles

| Classe | Usage |
|--------|-------|
| `.card` | Conteneur carte |
| `.card-sm`, `.card-lg` | Variantes de taille |
| `.btn` | Bouton de base |
| `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost` | Variantes |
| `.btn-sm`, `.btn-lg`, `.btn-icon` | Tailles |
| `.input` | Input, textarea, select |
| `.badge`, `.badge-blue`, `.badge-green`… | Badges |
| `.item-row` | Ligne d'item dans une liste |
| `.empty-state` | État vide |
| `.progress-bar` + `.progress-bar-fill` | Barre de progression |
| `.spinner` | Indicateur de chargement |
| `.switch` | Toggle switch |
| `.tag` | Étiquette inline |
| `.divider` | Séparateur horizontal |
| `.page` | Conteneur de page (padding + animation) |
| `.page-header`, `.page-title`, `.page-subtitle` | En-tête de page |

### Variables CSS clés

```css
--blue, --green, --red, --yellow, --orange, --purple, --teal
--bg-base, --bg-surface, --bg-card, --bg-elevated, --bg-hover, --bg-active
--text-primary, --text-secondary, --text-tertiary, --text-accent
--border, --border-strong
--radius-sm, --radius-md, --radius-lg, --radius-xl, --radius-full
--font-sans, --font-mono, --font-scale
--shadow-sm, --shadow-md, --shadow-lg
```

---

## Build

```bash
npm run build:win    # Windows (.exe)
npm run build:mac    # macOS (.dmg)
npm run build:linux  # Linux (.AppImage)
```

Les binaires sont générés dans `dist/`.

---

## Données locales

Tout est stocké dans `app.getPath('userData')/data/*.json` :

| Fichier | Contenu |
|---------|---------|
| `todos.json` | `Todo[]` |
| `checklists.json` | `Checklist[]` |
| `reminders.json` | `Reminder[]` |
| `timers.json` | `Timer[]` |
| `events.json` | `Event[]` |
| `notes.json` | `Note[]` |
| `modules.json` | `{ installed: string[] }` |
| `settings.json` | Paramètres |
| `profile.json` | Profil local |
| `devlog.json` | Journal (200 entrées max) |

Les fichiers JS des modules distants sont dans `userData/modules/<id>.js`.

---

## Sécurité

- `contextIsolation: true` — le renderer ne peut pas accéder à Node.js directement
- Toutes les APIs Node passent par `contextBridge` (`window.modulo`)
- CSP : `script-src 'self' 'unsafe-inline' blob:` — blob: requis pour l'injection des modules
- Aucune donnée utilisateur n'est envoyée sur un serveur
- Le mot de passe est hashé en djb2 localement (pour les notes sécurisées uniquement)
