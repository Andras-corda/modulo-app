const { ipcMain } = require('electron');
const store = require('./store');

let interval = null;
let win = null;

function checkReminders() {
  const reminders = store.readJson('reminders');
  if (!Array.isArray(reminders)) return;

  const now = new Date();
  const nowStr = now.toISOString().slice(0, 16); // 'YYYY-MM-DDTHH:MM'

  let changed = false;

  for (const r of reminders) {
    if (r.done || r.fired) continue;
    if (!r.datetime) continue;

    // Compare to the nearest minute
    const reminderTime = r.datetime.slice(0, 16);
    if (reminderTime <= nowStr) {
      r.fired = true;
      changed = true;

      // Send to renderer
      if (win && !win.isDestroyed()) {
        win.webContents.send('reminder:fired', r);
      }
    }
  }

  if (changed) {
    store.writeJson('reminders', reminders);
  }
}

function start(mainWindow) {
  win = mainWindow;

  // Check every 60 seconds
  interval = setInterval(checkReminders, 60 * 1000);

  // Immediate check at startup
  checkReminders();
}

function stop() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

module.exports = { start, stop };
