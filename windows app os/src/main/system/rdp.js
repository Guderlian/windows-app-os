'use strict';

// ─── RDP Client ───────────────────────────────────────────────────────────
// Debian package: freerdp2-x11 (provides /usr/bin/xfreerdp)
// Passwords are handled in-memory via stdin, never written to disk.
// ───────────────────────────────────────────────────────────────────────────

const { spawn } = require('child_process');

// Track the current RDP session globally so we can kill it
let currentProcess = null;
let sessionStatus = 'disconnected'; // 'connecting' | 'connected' | 'disconnected' | 'error'

function getStatus() {
  return { status: sessionStatus, pid: currentProcess ? currentProcess.pid : null };
}

async function connect(opts) {
  // Clean up any existing session
  if (currentProcess) {
    try { currentProcess.kill('SIGTERM'); } catch (_) { /* ignore */ }
    currentProcess = null;
  }

  const {
    host,           // required
    port      = 3389,
    username  = '',
    password  = '',   // NEVER written to disk, passed via /stdin or env
    domain    = '',
    resolution = '1920x1080',
    fullscreen = true,
    security  = 'nla',  // nla | tls | rdp
    certIgnore = true,
  } = opts;

  if (!host) {
    return { success: false, error: 'RDP host is required' };
  }

  // Build arguments — password passed via stdin (FreeRDP's /stdin:password support)
  const args = [
    /v:System.Management.Automation.Internal.Host.InternalHost,
    /port:,
    /size:,
    /sec:,
    /audio-mode:0,              // Redirect audio to remote
    /clipboard,
    /drive:home,/home,
    +fonts,
    /microphone:sys:alsa,
  ];

  if (username) args.push(/u:);
  if (domain)   args.push(/d:);
  if (fullscreen) args.push('/f');
  if (certIgnore) args.push('/cert:ignore');

  sessionStatus = 'connecting';

  return new Promise((resolve) => {
    const child = spawn('/usr/bin/xfreerdp', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DISPLAY: ':0' },
    });

    currentProcess = child;

    child.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('connected') || msg.includes('Connection established')) {
        sessionStatus = 'connected';
      }
    });

    child.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Authentication failure')) {
        sessionStatus = 'error';
        resolve({ success: false, error: 'Authentication failed' });
      }
    });

    child.on('error', (err) => {
      sessionStatus = 'error';
      currentProcess = null;
      resolve({ success: false, error: err.message });
    });

    child.on('close', (code) => {
      sessionStatus = 'disconnected';
      currentProcess = null;
      if (code === 0) {
        resolve({ success: true, message: 'Session ended normally' });
      } else {
        resolve({ success: false, error: xfreerdp exited with code  });
      }
    });

    // If a password is provided, pump it through stdin
    if (password) {
      child.stdin.write(password + '\n');
      child.stdin.end();
    }
  });
}

async function disconnect() {
  if (currentProcess) {
    try {
      currentProcess.kill('SIGTERM');
      sessionStatus = 'disconnected';
      currentProcess = null;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: true, message: 'No active session' };
}

module.exports = { connect, disconnect, getStatus };
