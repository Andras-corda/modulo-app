<div align="center">

<img src="https://github.com/Andras-corda/modulo-app/blob/main/modulo-app/assets/icons/icon.png" width="72" height="72" alt="Modulo logo">

# Modulo

**A free, open-source modular desktop productivity app.**  
Install only what you need. 100% local data. No account. No subscription.

[![Version](https://img.shields.io/badge/version-1.5.1-blue?style=flat-square)](https://github.com/Andras-corda/modulo-app/releases)
[![Electron](https://img.shields.io/badge/Electron-28-47848F?style=flat-square&logo=electron)](https://www.electronjs.org)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D4?style=flat-square&logo=windows)](https://github.com/Andras-corda/modulo-app/releases)

[**Download**](https://github.com/Andras-corda/modulo-app/releases) · [**Website**](https://modulo-web-production.up.railway.app) · [**Discord**](https://discord.gg/8JPP3wDd6e) · [**Portfolio**](https://andras-corda.github.io/portfolio-github-hosting/)

</div>

---

## Table of contents

- [Overview](#overview)
- [Repositories](#repositories)
- [Features](#features)
- [Modules](#modules)
- [Themes](#themes)
- [Architecture](#architecture)
- [Getting started](#getting-started)
  - [modulo-app](#modulo-app-desktop-client)
  - [modulo-modules](#modulo-modules-module-sources)
  - [modulo-web](#modulo-web-website--api)
- [Configuration — modulo.toml](#configuration--modulotoml)
- [IPC & Store API](#ipc--store-api)
- [Building a module](#building-a-module)
- [Internationalization](#internationalization)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [License](#license)

---

## Overview

Modulo is a desktop productivity app built with Electron. It starts as an empty shell and you install only the modules you want — a todo list, a notes editor, a QR code generator, a PDF toolkit, and more. All data is stored locally as JSON files in your `AppData` folder. Nothing is ever sent to a server.

The project is split across three repositories:

| Repo | Role |
|---|---|
| `modulo-app` | Electron desktop client |
| `modulo-modules` | Module source code + build pipeline |
| `modulo-web` | Public website + REST API (hosted on Railway) |

---

## Repositories

```
modulo-app/          Desktop application (Electron 28, Vanilla JS)
modulo-modules/      Module sources + build.js + validate.js
modulo-web/          Express API + SPA website (Railway)
```

---

## Features

- **Truly modular** — install only the modules you use, uninstall at any time
- **100% local data** — all data stored in `AppData/Roaming/modulo/` as JSON
- **No account required** — no sign-up, no login, no telemetry
- **Theme marketplace** — 16 built-in palettes (dark + light variants each), by Modulo Team
- **6 languages** — French, English, Spanish, Italian, Dutch, German
- **Anti-FOUC** — theme applied before first paint via Electron `dom-ready` injection
- **Dedicated stores** — each module has its own isolated JSON store
- **Reminder system** — native OS notifications via Electron, managed by `reminderManager.js`
- **VSCode-inspired layout** — Activity Bar, Side Panel, Main Area, Status Bar

---

## Modules

Modulo ships with **16 official modules**, all built and maintained by Modulo Team.

### Productivity

| Module | Description |
|---|---|
| **Tasks** | Todo list with priorities, due dates, filters and drag-to-reorder |
| **Notes** | Rich text notes with tags, folder organization and password protection |
| **Checklists** | Reusable checklists for routines and processes |
| **Timers** | Pomodoro and custom timers with a discrete corner overlay |
| **Reminders** | One-time and recurring reminders with native OS notifications |
| **Calendar** | Monthly event calendar |
| **UML Diagrams** | Class, sequence and flowchart diagrams — export to PNG/SVG |
| **Structogram** | Nassi-Shneiderman diagram editor with export |
| **OpenStruct** | JSON, CSV, XML and TOML file editor with auto-indent and conversion |
| **Perlin Noise** | Procedural texture generator — PNG, animated GIF, spritesheet |
| **Charts** | Bar, line, area, pie, donut and scatter charts with inline data editing |
| **QR Code** | Generate QR codes from URL, text, WiFi, vCard — pure JS encoder (ISO 18004, Level M) |
| **File Tools** | Convert images (PNG/JPG/WEBP/BMP), rotate, flip, resize, export to PDF |
| **PDF Tools** | Merge, split, rotate, compress PDFs — convert images to PDF and back |
| **Watermark** | Text or image watermarks — 9 positions, tile mode, opacity, rotation |

### Fun

| Module | Description |
|---|---|
| **Clicker** | Cookie-clicker style idle game with 15 upgrades and prestige system |

---

## Themes

Modulo includes **16 color palettes**, each with a dark and a light variant, for a total of **32 themes**.

All themes are authored by **Modulo Team** and available from the in-app Theme Marketplace.

| Palette | Tags |
|---|---|
| Nord | minimal, blue |
| Dracula | purple, vibrant |
| Catppuccin | pastel, soft |
| One Dark | neutral, editor |
| Tokyo Night | neon, city |
| Gruvbox | warm, retro |
| Solarized | classic |
| Monokai | colorful |
| Material | clean |
| GitHub | flat |
| Ayu | orange, minimal |
| Palenight | violet |
| Cobalt | blue, vibrant |
| Rose Pine | pink, muted |
| Everforest | green, nature |
| Horizon | sunset |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                 │
│  main.js — BrowserWindow, IPC handlers, store R/W       │
│  config.js — reads modulo.toml at startup               │
│  store.js — readJson / writeJson to userData/           │
│  reminderManager.js — cron-like reminder firing         │
└─────────────────────┬───────────────────────────────────┘
                      │ contextBridge (preload.js)
┌─────────────────────▼───────────────────────────────────┐
│                  Renderer Process                        │
│  index.html → app.js (bootstrap, applySettings)         │
│  router.js  — hash-free SPA router                      │
│  i18n.js    — 6-language translation engine             │
│  modules.js — ModuleManager: fetch, install, restore    │
│  pages/     — dashboard, marketplace, settings, themes  │
└─────────────────────────────────────────────────────────┘
                      │ scriptUrl (Railway CDN)
┌─────────────────────▼───────────────────────────────────┐
│               modulo-web (Railway)                       │
│  GET /api/modules    — catalog of all modules            │
│  GET /api/themes     — catalog of all themes             │
│  GET /api/downloads  — version info and download URLs   │
│  POST /api/modules/:id/download  — track installs        │
│  GET /modules/*.js  — serve built module bundles         │
└─────────────────────────────────────────────────────────┘
```

### Data stores

Each module writes to its own isolated store in `AppData/Roaming/modulo/`:

| File | Used by |
|---|---|
| `todos.json` | Tasks module |
| `notes.json` | Notes module (user notes only) |
| `checklists.json` | Checklists module |
| `timers.json` | Timers module |
| `reminders.json` | Reminders module |
| `events.json` | Calendar module |
| `charts.json` | Charts module |
| `clicker.json` | Clicker module |
| `diagrams.json` | UML Diagrams module |
| `structograms.json` | Structogram module |
| `datafiles.json` | OpenStruct module |
| `settings.json` | App-wide settings |
| `themes.json` | Active theme + installed themes |
| `modules.json` | Installed module list |
| `profile.json` | User profile |
| `devlog.json` | Developer log |

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 18
- [Git](https://git-scm.com)

---

### modulo-app (desktop client)

```bash
git clone https://github.com/Andras-corda/modulo-app.git
cd modulo-app
npm install
npm start          # dev mode (opens DevTools)
npm run build      # build Windows installer
```

> The app reads `modulo.toml` at startup to load metadata (name, version, links, icon paths).

---

### modulo-modules (module sources)

```bash
git clone https://github.com/Andras-corda/modulo-modules.git
cd modulo-modules
npm install

node build.js              # build all modules → dist/
node build.js todos        # build a single module
node build.js --watch      # watch mode
node validate.js           # validate all module.json + syntax
node validate.js qrcode    # validate a single module
```

Each built module is a single concatenated `.js` file dropped into `dist/` and then deployed to Railway under `public/modules/`.

---

### modulo-web (website & API)

```bash
git clone https://github.com/Andras-corda/modulo-web.git
cd modulo-web
npm install
node server.js             # local dev on port 3000
```

**Environment variables** (set on Railway):

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default: 3000) |

**API endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/modules` | Full module catalog |
| `GET` | `/api/modules/stats` | Module count + download stats |
| `POST` | `/api/modules/:id/download` | Track a module install |
| `GET` | `/api/themes` | Full theme catalog |
| `POST` | `/api/themes/:id/download` | Track a theme apply |
| `GET` | `/api/downloads` | App version, links, changelog |
| `POST` | `/api/downloads/track` | Track an app download |

Data is read from three JSON files: `data/modules.json`, `data/themes.json`, `data/app.json`.

---

## Configuration — modulo.toml

`modulo.toml` is the single source of truth for all application metadata. It lives at the root of `modulo-app/` and is read by `src/main/config.js` at startup, then exposed to the renderer via `window.modulo.config.get()`.

```toml
[app]
name        = "Modulo"
version     = "1.5.1"
description = "A modular desktop productivity app."
license     = "MIT"

[creator]
name      = "R3tr0___"
role      = "Developer"
portfolio = "https://andras-corda.github.io/portfolio-github-hosting/"
discord   = "https://discord.gg/8JPP3wDd6e"
github    = "https://github.com/Andras-corda"

[links]
repo      = "https://github.com/Andras-corda/modulo-app"
modules   = "https://github.com/Andras-corda/modulo-modules"
web       = "https://github.com/Andras-corda/modulo-web"
releases  = "https://github.com/Andras-corda/modulo-app/releases"
issues    = "https://github.com/Andras-corda/modulo-app/issues"

[server]
base_url    = "https://modulo-web-production.up.railway.app"
api_modules = "https://modulo-web-production.up.railway.app/api/modules"
api_themes  = "https://modulo-web-production.up.railway.app/api/themes"
api_download= "https://modulo-web-production.up.railway.app/api/downloads"

[build]
electron  = "28"
platform  = "Windows"
installer = "Modulo.Setup.1.5.1.exe"
icon_ico  = "assets/icons/icon.ico"
icon_png  = "assets/icons/icon.png"
```

To release a new version, update `version` and `installer` here — the titlebar, About page, settings and web API all read from this file automatically.

---

## IPC & Store API

The renderer accesses data through `window.modulo.*`, exposed via Electron's `contextBridge` in `preload.js`.

### Store methods

Every store exposes two methods:

```js
window.modulo.todos.getAll()        // → Promise<array>
window.modulo.todos.save(array)     // → Promise<void>
```

### Available stores

```js
window.modulo.todos
window.modulo.notes
window.modulo.checklists
window.modulo.timers
window.modulo.reminders
window.modulo.events
window.modulo.charts
window.modulo.clicker
window.modulo.diagrams
window.modulo.structograms
window.modulo.datafiles
window.modulo.settings   // .get() / .save()
window.modulo.themes     // .get() / .save()
window.modulo.modules    // .get() / .save()
window.modulo.profile    // .get() / .save()
window.modulo.devlog     // .get() / .save()
```

### Other APIs

```js
window.modulo.config.get()              // → modulo.toml as object
window.modulo.notify({ title, body })   // native OS notification
window.modulo.openExternal(url)         // open URL in browser
window.modulo.setStartup(bool)          // launch at Windows startup
window.modulo.window.minimize()
window.modulo.window.maximize()
window.modulo.window.close()
window.modulo.moduleFiles.download(id, url)
window.modulo.moduleFiles.readFile(id)
window.modulo.moduleFiles.deleteFile(id)
window.modulo.moduleFiles.listFiles()
```

---

## Building a module

A module is a folder with the following structure:

```
my-module/
├── module.json          # metadata
├── script/
│   └── state.js         # data layer (store access, business logic)
└── page/
    └── render.js        # UI (renderFn function)
```

### module.json

```json
{
  "id": "my-module",
  "name": "My Module",
  "version": "1.0.0",
  "author": "Modulo Team",
  "description": "Short description shown in the marketplace.",
  "icon": "note",
  "color": "#4285F4",
  "category": "productivity",
  "tags": ["example", "demo"],
  "navKey": "my-module",
  "navIcon": "note",
  "navLabel": { "fr": "Mon Module", "en": "My Module" },
  "renderFn": "renderMyModule",
  "changelog": [
    { "version": "1.0.0", "date": "2025-04-01", "notes": "Initial release" }
  ]
}
```

**Categories:** `productivity` · `time` · `fun`

### render.js

The render function receives a DOM container and is responsible for the entire module UI:

```js
async function renderMyModule(container) {
  // Load data
  const items = (await window.modulo.mystore.getAll()) ?? [];

  // Render
  container.innerHTML = `<div>...</div>`;

  // Save on change
  await window.modulo.mystore.save(items);
}
```

### Build and deploy

```bash
# In modulo-modules/
node validate.js my-module   # check structure and syntax
node build.js my-module      # → dist/my-module.js

# Copy to modulo-web/
cp dist/my-module.js ../modulo-web/public/modules/

# Add entry to modulo-web/data/modules.json
# Push to Railway
```

---

## Internationalization

Translations live in `src/renderer/js/i18n.js`. Six languages are supported:

| Code | Language |
|---|---|
| `fr` | Français |
| `en` | English |
| `es` | Español |
| `it` | Italiano |
| `nl` | Nederlands |
| `de` | Deutsch |

### Usage

```js
// In renderer code
t('settings_theme')         // → "Theme" / "Thème" / "Tema" …

// In HTML (auto-updated on language change)
<span data-i18n="themes">Themes</span>
```

The active language is set with `setLang('en')` and applied instantly to all `[data-i18n]` elements.

---

## Tech stack

### modulo-app

| Layer | Technology |
|---|---|
| Runtime | Electron 28 |
| Renderer | Vanilla JS (no framework) |
| Styling | CSS custom properties, hand-written design system |
| Bundler | None — modules are loaded via `<script>` injection |
| Build | electron-builder (NSIS installer for Windows) |

### modulo-modules

| Layer | Technology |
|---|---|
| Language | Vanilla JS (ES2020) |
| Build | Custom `build.js` — file concatenation + minification |
| QR encoder | Pure JS (ISO 18004, Reed-Solomon, version 1–10, Level M) |
| PDF engine | Pure JS (no PDF.js dependency) |

### modulo-web

| Layer | Technology |
|---|---|
| Server | Express 4 |
| Hosting | Railway |
| Data | Static JSON files (`data/*.json`) |
| Frontend | Vanilla JS SPA |
| Fonts | Google Fonts (Syne, DM Sans, DM Mono) |

---

## Project structure

```
modulo-app/
├── modulo.toml                  # app-wide config (version, links, icons)
├── package.json
├── assets/
│   └── icons/
│       ├── icon.ico             # Windows icon (16–256 px, 6 sizes)
│       └── icon.png
└── src/
    ├── main/
    │   ├── main.js              # Electron main process
    │   ├── preload.js           # contextBridge — window.modulo.*
    │   ├── config.js            # TOML parser + config loader
    │   ├── store.js             # JSON store read/write
    │   ├── reminderManager.js   # reminder scheduling
    │   └── modules.js           # module download/delete
    └── renderer/
        ├── index.html
        ├── css/
        │   ├── variables.css    # design tokens + 16×2 theme palettes
        │   ├── reset.css
        │   ├── layout.css
        │   └── components.css
        ├── js/
        │   ├── app.js           # bootstrap + applySettings
        │   ├── router.js        # SPA router
        │   ├── i18n.js          # translations (6 languages)
        │   ├── icons.js         # SVG icon helper
        │   ├── modules.js       # ModuleManager
        │   └── store.js         # renderer-side store helpers
        └── pages/
            ├── dashboard.js     # clock, weather, greeting
            ├── marketplace.js   # module browser + install
            ├── themes.js        # theme switcher
            ├── settings.js      # appearance, general, about
            └── profile.js       # user profile

modulo-modules/
├── build.js                     # build pipeline
├── validate.js                  # module validator
├── dist/                        # built .js files → deployed to Railway
├── template/                    # starter template for new modules
└── <module-id>/
    ├── module.json
    ├── script/state.js
    └── page/render.js

modulo-web/
├── server.js                    # Express entry point
├── data/
│   ├── modules.json             # module catalog
│   ├── themes.json              # theme catalog
│   └── app.json                 # version + download links + changelog
├── routes/
│   ├── modules.js
│   ├── downloads.js
│   └── themes.js
└── public/
    ├── index.html               # SPA shell
    ├── 404.html
    ├── favicon.svg
    ├── css/main.css
    ├── js/app.js                # SPA router + API calls
    └── modules/                 # built module bundles (served as CDN)
        ├── todos.js
        ├── notes.js
        └── …
```

---

## License

Modulo is released under the **MIT License**.  
See [LICENSE](LICENSE) for the full text.

---

<div align="center">

Built by [R3tr0___](https://andras-corda.github.io/portfolio-github-hosting/) · [Discord](https://discord.gg/8JPP3wDd6e) · [GitHub](https://github.com/Andras-corda)

</div>
