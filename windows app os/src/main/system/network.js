'use strict';

// ─── Network Manager ──────────────────────────────────────────────────────
// Debian package: network-manager (provides nmcli)
// All calls use child_process.exec — never blocking.
// ───────────────────────────────────────────────────────────────────────────

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const NMCLI = '/usr/bin/nmcli';

// Helper: parse nmcli tabular output into array of objects
function parseNmcliTable(stdout) {
  const lines = stdout.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].trim().split(/\s{2,}/).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  return lines.slice(1).map(line => {
    const values = line.trim().split(/\s{2,}/);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

async function getDevices() {
  try {
    const { stdout } = await execAsync(${NMCLI} -t device status, { timeout: 5000 });
    return stdout.trim().split('\n').filter(Boolean).map(line => {
      const parts = line.split(':');
      return { device: parts[0] || '', type: parts[1] || '', state: parts[2] || '', connection: parts[3] || '' };
    });
  } catch (err) {
    return { error: err.message };
  }
}

async function getConnections() {
  try {
    const { stdout } = await execAsync(${NMCLI} -t connection show, { timeout: 5000 });
    return stdout.trim().split('\n').filter(Boolean).map(line => {
      const parts = line.split(':');
      return { name: parts[0] || '', uuid: parts[1] || '', type: parts[2] || '', device: parts[3] || '' };
    });
  } catch (err) {
    return { error: err.message };
  }
}

async function getActiveConnection() {
  try {
    const { stdout } = await execAsync(${NMCLI} -t connection show --active, { timeout: 5000 });
    const lines = stdout.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return null;
    const parts = lines[0].split(':');
    return { name: parts[0] || '', uuid: parts[1] || '', type: parts[2] || '', device: parts[3] || '' };
  } catch (err) {
    return { error: err.message };
  }
}

async function scan(iface = 'wlan0') {
  try {
    await execAsync(${NMCLI} device wifi rescan, { timeout: 10000 });
    // Small delay for scan to populate
    await new Promise(r => setTimeout(r, 2000));
    const { stdout } = await execAsync(${NMCLI} -t device wifi list ifname , { timeout: 10000 });
    return stdout.trim().split('\n').filter(Boolean).map(line => {
      const parts = line.split(':');
      return {
        bssid: parts[0] || '', ssid: parts[2] || '', mode: parts[3] || '',
        chan: parts[4] || '', rate: parts[5] || '', signal: parseInt(parts[6]) || 0,
        security: parts[9] || '',
      };
    }).sort((a, b) => b.signal - a.signal);
  } catch (err) {
    return { error: err.message };
  }
}

async function connect(ssid, password) {
  try {
    const cmd = password
      ? ${NMCLI} device wifi connect "" password ""
      : ${NMCLI} device wifi connect "";
    const { stdout } = await execAsync(cmd, { timeout: 30000 });
    return { success: true, message: stdout.trim() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function disconnect(iface = 'wlan0') {
  try {
    await execAsync(${NMCLI} device disconnect , { timeout: 10000 });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { getDevices, getConnections, getActiveConnection, scan, connect, disconnect };
