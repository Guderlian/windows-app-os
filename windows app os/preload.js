'use strict';

// ─── Windows App OS ─ Preload Script ──────────────────────────────────────
// This bridge exposes a minimal, secure API to the renderer process.
// All system operations go through IPC to the main process.
// ───────────────────────────────────────────────────────────────────────────

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('winOS', {
  // ── Network (nmcli) ───────────────────────────────────────────────────
  network: {
    getDevices:       () => ipcRenderer.invoke('network:getDevices'),
    getConnections:   () => ipcRenderer.invoke('network:getConnections'),
    getActiveConnection: () => ipcRenderer.invoke('network:getActiveConnection'),
    connect:          (ssid, password) => ipcRenderer.invoke('network:connect', ssid, password),
    disconnect:       (iface) => ipcRenderer.invoke('network:disconnect', iface),
    scan:             (iface) => ipcRenderer.invoke('network:scan', iface),
  },

  // ── RDP (xfreerdp) ────────────────────────────────────────────────────
  rdp: {
    connect:    (opts) => ipcRenderer.invoke('rdp:connect', opts),
    disconnect: ()     => ipcRenderer.invoke('rdp:disconnect'),
    status:     ()     => ipcRenderer.invoke('rdp:status'),
  },

  // ── System Info ───────────────────────────────────────────────────────
  system: {
    getInfo:    () => ipcRenderer.invoke('system:getInfo'),
    getUptime:  () => ipcRenderer.invoke('system:getUptime'),
    getMemory:  () => ipcRenderer.invoke('system:getMemory'),
    getCPU:     () => ipcRenderer.invoke('system:getCPU'),
  },

  // ── Power Management ──────────────────────────────────────────────────
  power: {
    shutdown:   () => ipcRenderer.invoke('power:shutdown'),
    reboot:     () => ipcRenderer.invoke('power:reboot'),
    logout:     () => ipcRenderer.invoke('power:logout'),
    sleep:      () => ipcRenderer.invoke('power:sleep'),
  },

  // ── Window Controls (for Electron window) ─────────────────────────────
  window: {
    minimize:  () => ipcRenderer.invoke('window:minimize'),
    maximize:  () => ipcRenderer.invoke('window:maximize'),
    close:     () => ipcRenderer.invoke('window:close'),
  },

  // ── App Management ────────────────────────────────────────────────────
  app: {
    launch:    (cmd) => ipcRenderer.invoke('app:launch', cmd),
  },

  // ── Platform info ─────────────────────────────────────────────────────
  platform: process.platform,
});
