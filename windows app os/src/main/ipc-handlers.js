'use strict';

// ─── IPC Handlers ─────────────────────────────────────────────────────────
// Wires system modules to renderer via Electron IPC.
// All handlers are async — main process event loop stays clear.
// ───────────────────────────────────────────────────────────────────────────

const { BrowserWindow } = require('electron');
const network = require('./system/network');
const rdp     = require('./system/rdp');
const power   = require('./system/power');
const info    = require('./system/info');

function register(ipcMain) {

  // ── Network ──────────────────────────────────────────────────────────
  ipcMain.handle('network:getDevices',         async () => network.getDevices());
  ipcMain.handle('network:getConnections',     async () => network.getConnections());
  ipcMain.handle('network:getActiveConnection', async () => network.getActiveConnection());
  ipcMain.handle('network:connect',            async (_e, ssid, pw) => network.connect(ssid, pw));
  ipcMain.handle('network:disconnect',         async (_e, iface) => network.disconnect(iface));
  ipcMain.handle('network:scan',               async (_e, iface) => network.scan(iface));

  // ── RDP ──────────────────────────────────────────────────────────────
  ipcMain.handle('rdp:connect',    async (_e, opts) => rdp.connect(opts));
  ipcMain.handle('rdp:disconnect', async ()        => rdp.disconnect());
  ipcMain.handle('rdp:status',     async ()        => rdp.getStatus());

  // ── System Info ──────────────────────────────────────────────────────
  ipcMain.handle('system:getInfo',   async () => info.getInfo());
  ipcMain.handle('system:getUptime', async () => info.getUptime());
  ipcMain.handle('system:getMemory', async () => info.getMemory());
  ipcMain.handle('system:getCPU',    async () => info.getCPU());

  // ── Power ────────────────────────────────────────────────────────────
  ipcMain.handle('power:shutdown', async () => power.shutdown());
  ipcMain.handle('power:reboot',   async () => power.reboot());
  ipcMain.handle('power:logout',   async () => power.logout());
  ipcMain.handle('power:sleep',    async () => power.sleep());

  // ── Window Controls ──────────────────────────────────────────────────
  ipcMain.handle('window:minimize', async () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });
  ipcMain.handle('window:maximize', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.handle('window:close', async () => {
    BrowserWindow.getFocusedWindow()?.close();
  });

  // ── App Launch ───────────────────────────────────────────────────────
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  ipcMain.handle('app:launch', async (_e, cmd) => {
    try {
      await execAsync(cmd, { timeout: 10000 });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { register };
