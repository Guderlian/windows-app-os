'use strict';

// ─── Windows App OS ─ Electron Main Process ───────────────────────────────
// Runs on Debian Live + Openbox. This process manages the BrowserWindow,
// lifecycle events, and exposes system IPC handlers (network, RDP, power).
// All system calls are async via child_process — never block the event loop.
// ───────────────────────────────────────────────────────────────────────────

const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

// ── Keep a global reference to prevent GC ─────────────────────────────────
let mainWindow = null;
const isDev = process.argv.includes('--dev');

// ── Window creation ───────────────────────────────────────────────────────
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    frame: false,                // Frameless for full desktop takeover
    fullscreen: !isDev,
    kiosk: !isDev,               // True kiosk mode on live boot
    resizable: isDev,
    backgroundColor: '#0a0a0a',
    icon: path.join(__dirname, 'src', 'renderer', 'assets', 'icons', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,    // Security: isolate renderer
      nodeIntegration: false,    // Security: no Node in renderer
      sandbox: false,            // Required for preload child_process relay
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  // Open DevTools only in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ─────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Register IPC handlers from external module (lazy-loaded, non-blocking)
  require('./src/main/ipc-handlers').register(ipcMain);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

// Prevent multiple instances (optional, Linux desktop environment)
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ── Graceful shutdown ─────────────────────────────────────────────────────
app.on('before-quit', () => {
  // Cleanup any lingering child processes
  if (global._rdpProcess) {
    try { global._rdpProcess.kill('SIGTERM'); } catch (_) { /* ignore */ }
  }
});
