const config = require('./config');
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, shell } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const store = require('./store');
const reminderManager = require('./reminderManager');

const isDev = process.argv.includes('--dev');
let mainWindow = null;
let tray = null;

// ─── Window ────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false, // Permet fetch() vers Railway depuis file://
    },
    icon: path.join(__dirname, '../../', config.build?.icon_png ?? 'assets/icons/icon.png'),
  });

  // Injecter le thème avant le premier paint (anti-FOUC)
  mainWindow.webContents.on('dom-ready', async () => {
    try {
      const settings   = store.readJson('settings') ?? {};
      const themesData = store.readJson('themes')   ?? {};
      const theme = themesData.active ?? settings.theme ?? 'dark';
      await mainWindow.webContents.executeJavaScript(
        `document.documentElement.setAttribute('data-theme',${JSON.stringify(theme)});window.__MODULO_THEME__=${JSON.stringify(theme)};`
      );
    } catch (_e) { /* ignore */ }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Tray ───────────────────────────────────────────────────────────────────

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/icons/icon.png');
  if (!fs.existsSync(iconPath)) return;

  tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Ouvrir Modulo', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quitter', click: () => app.quit() },
  ]);
  tray.setToolTip('Modulo');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// ─── App lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  createTray();
  reminderManager.start(mainWindow);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

// ─── IPC — Window controls ──────────────────────────────────────────────────

ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

// ─── IPC — Store ────────────────────────────────────────────────────────────

const STORES = ['todos', 'checklists', 'reminders', 'timers', 'events', 'notes', 'settings', 'profile', 'modules', 'devlog', 'themes'];

for (const name of STORES) {
  ipcMain.handle(`${name}:getAll`, () => store.readJson(name));
  ipcMain.handle(`${name}:save`, (_, data) => { store.writeJson(name, data); return true; });
}

// ─── IPC — Module files ─────────────────────────────────────────────────────

const modulesDir = path.join(app.getPath('userData'), 'modules');
fs.mkdirSync(modulesDir, { recursive: true });

ipcMain.handle('module:download', async (_, { id, url }) => {
  return new Promise((resolve, reject) => {
    const dest = path.join(modulesDir, `${id}.js`);
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
});

ipcMain.handle('module:readFile', (_, id) => {
  const filePath = path.join(modulesDir, `${id}.js`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
});

ipcMain.handle('module:deleteFile', (_, id) => {
  const filePath = path.join(modulesDir, `${id}.js`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
});

ipcMain.handle('module:listFiles', () => {
  return fs.readdirSync(modulesDir)
    .filter(f => f.endsWith('.js'))
    .map(f => f.replace('.js', ''));
});

// ─── IPC — Notifications ────────────────────────────────────────────────────

ipcMain.handle('notify', (_, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

// ─── IPC — Startup ──────────────────────────────────────────────────────────

ipcMain.handle('setStartup', (_, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe'),
  });
  return true;
});

// ─── IPC — Shell ────────────────────────────────────────────────────────────

ipcMain.handle('openExternal', (_, url) => shell.openExternal(url));
ipcMain.handle('config:get', () => config);
