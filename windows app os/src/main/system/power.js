'use strict';

// ─── Power Management ─────────────────────────────────────────────────────
// Uses systemd commands (Debian default init system).
// Debian packages: systemd (pre-installed on Debian), pm-utils (for sleep)
// ───────────────────────────────────────────────────────────────────────────

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// systemctl: poweroff
async function shutdown() {
  try {
    await execAsync('/usr/bin/systemctl poweroff', { timeout: 5000 });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// systemctl: reboot
async function reboot() {
  try {
    await execAsync('/usr/bin/systemctl reboot', { timeout: 5000 });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Log out: close the Openbox session (terminates Electron by proxy)
async function logout() {
  try {
    // openbox --exit gracefully ends the window manager session
    await execAsync('/usr/bin/openbox --exit', { timeout: 5000 });
    return { success: true };
  } catch (err) {
    // Fallback: kill X session
    try {
      await execAsync('/usr/bin/pkill -u ', { timeout: 5000 });
    } catch (_) { /* ignore */ }
    return { success: true };
  }
}

// Sleep / suspend: pm-suspend or systemctl suspend
async function sleep() {
  try {
    // Try systemctl suspend first (Debian 10+)
    await execAsync('/usr/bin/systemctl suspend', { timeout: 5000 });
    return { success: true };
  } catch (err) {
    // Fallback to pm-suspend (install pm-utils if needed)
    try {
      await execAsync('/usr/sbin/pm-suspend', { timeout: 5000 });
      return { success: true };
    } catch (_) {
      return { success: false, error: 'Suspend not available' };
    }
  }
}

module.exports = { shutdown, reboot, logout, sleep };
