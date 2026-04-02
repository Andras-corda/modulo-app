const { contextBridge, ipcRenderer } = require('electron');

// Helper pour créer les handlers CRUD d'un store
function storeApi(name) {
  return {
    getAll: () => ipcRenderer.invoke(`${name}:getAll`),
    save: (data) => ipcRenderer.invoke(`${name}:save`, data),
  };
}

contextBridge.exposeInMainWorld('modulo', {
  // ─── Stores ──────────────────────────────────────────────────────────────
  todos:      storeApi('todos'),
  checklists: storeApi('checklists'),
  timers:     storeApi('timers'),
  events:     storeApi('events'),
  notes:      storeApi('notes'),
  settings:   {
    get:  () => ipcRenderer.invoke('settings:getAll'),
    save: (data) => ipcRenderer.invoke('settings:save', data),
  },
  profile: {
    get:  () => ipcRenderer.invoke('profile:getAll'),
    save: (data) => ipcRenderer.invoke('profile:save', data),
  },
  modules: {
    get:  () => ipcRenderer.invoke('modules:getAll'),
    save: (data) => ipcRenderer.invoke('modules:save', data),
  },
  devlog: {
    get:  () => ipcRenderer.invoke('devlog:getAll'),
    save: (data) => ipcRenderer.invoke('devlog:save', data),
  },

  // ─── Reminders ───────────────────────────────────────────────────────────
  reminders: {
    getAll: () => ipcRenderer.invoke('reminders:getAll'),
    save:   (data) => ipcRenderer.invoke('reminders:save', data),
    onFired: (callback) => {
      ipcRenderer.on('reminder:fired', (_, reminder) => callback(reminder));
    },
  },

  // ─── Module files ─────────────────────────────────────────────────────────
  moduleFiles: {
    download:   (id, url) => ipcRenderer.invoke('module:download', { id, url }),
    readFile:   (id) => ipcRenderer.invoke('module:readFile', id),
    deleteFile: (id) => ipcRenderer.invoke('module:deleteFile', id),
    listFiles:  () => ipcRenderer.invoke('module:listFiles'),
  },

  // ─── System ───────────────────────────────────────────────────────────────
  notify:       ({ title, body }) => ipcRenderer.invoke('notify', { title, body }),
  setStartup:   (enable) => ipcRenderer.invoke('setStartup', enable),
  openExternal: (url) => ipcRenderer.invoke('openExternal', url),

  // ─── Window controls ──────────────────────────────────────────────────────
  window: {
    minimize:    () => ipcRenderer.invoke('window:minimize'),
    maximize:    () => ipcRenderer.invoke('window:maximize'),
    close:       () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
});
