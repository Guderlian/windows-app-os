// ─── Windows App OS ─ Taskbar ──────────────────────────────────────────
// Manages the taskbar: clock, system tray, app buttons, quick settings.

const Taskbar = (() => {
  let quickSettingsOpen = false;

  // ── Initialize ────────────────────────────────────────────────────
  function init() {
    updateClock();
    setInterval(updateClock, 1000);

    // Start button opens start menu
    Utils.on('#taskbar-start', 'click', () => {
      StartMenu.toggle();
    });

    // Clock click toggles quick settings
    Utils.on('#tray-clock-container', 'click', () => {
      toggleQuickSettings();
    });

    // Close quick settings on click outside
    document.addEventListener('click', (e) => {
      if (quickSettingsOpen && !e.target.closest('#quick-settings') && !e.target.closest('#tray-clock-container')) {
        closeQuickSettings();
      }
    });

    // Listen for window manager updates
    Utils.listen('taskbar:update', renderAppButtons);

    // Initial system info refresh
    refreshSystemTray();
    setInterval(refreshSystemTray, 10000); // Refresh every 10s
  }

  // ── Clock ──────────────────────────────────────────────────────────
  function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('tray-clock');
    const dateEl = document.getElementById('tray-date');
    if (clockEl) clockEl.textContent = Utils.formatTime(now);
    if (dateEl) dateEl.textContent = Utils.formatDate(now);
  }

  // ── System tray refresh ────────────────────────────────────────────
  async function refreshSystemTray() {
    if (!window.winOS) return;
    try {
      const [network, system] = await Promise.all([
        winOS.network.getActiveConnection(),
        winOS.system.getInfo().catch(() => null),
      ]);
      updateNetworkIcon(network);
      updateQuickSettings(network, system);
    } catch (_) { /* Offline — ignore */ }
  }

  function updateNetworkIcon(net) {
    const netEl = document.getElementById('tray-network-icon');
    if (!netEl) return;
    if (net && net.error === undefined && net.name) {
      netEl.textContent = net.type === 'wifi' ? '\u{1F4F6}' : '\u{1F310}';
      netEl.title = ${net.name} ();
    } else {
      netEl.textContent = '\u{26A0}';
      netEl.title = 'No network';
    }
  }

  function updateQuickSettings(net, system) {
    const qs = document.getElementById('quick-settings');
    if (!qs || !quickSettingsOpen) return;
    // Only update when open to avoid wasted DOM writes
    const netStatus = qs.querySelector('.qs-network-status');
    const memStatus = qs.querySelector('.qs-memory-status');
    if (netStatus && net) {
      netStatus.textContent = (net && net.name) ? net.name : 'Disconnected';
    }
    if (memStatus && system && system.memory) {
      memStatus.textContent = ${Utils.formatMB(system.memory.used)} / ;
    }
  }

  // ── Quick settings popup ───────────────────────────────────────────
  function toggleQuickSettings() {
    const qs = document.getElementById('quick-settings');
    if (quickSettingsOpen) {
      closeQuickSettings();
    } else {
      qs.classList.add('open');
      quickSettingsOpen = true;
      refreshSystemTray(); // Immediately refresh when opening
    }
  }

  function closeQuickSettings() {
    const qs = document.getElementById('quick-settings');
    qs.classList.remove('open');
    quickSettingsOpen = false;
  }

  // ── Render app buttons from window manager ─────────────────────────
  function renderAppButtons({ apps }) {
    const container = document.getElementById('taskbar-apps');
    if (!container) return;

    // Remove old buttons, keep existing if no change
    const existingIds = new Set(Array.from(container.children).map(c => c.dataset.appid));
    const incomingIds = new Set(apps.map(a => a.id));

    // Remove stale buttons
    container.querySelectorAll('.taskbar-app').forEach(btn => {
      if (!incomingIds.has(btn.dataset.appid)) btn.remove();
    });

    // Add new / update existing
    apps.forEach(app => {
      let btn = container.querySelector([data-appid=""]);
      if (!btn) {
        btn = document.createElement('button');
        btn.className = 'taskbar-app';
        btn.dataset.appid = app.id;
        btn.title = app.title;
        btn.textContent = app.icon || '\u{1F4BB}';
        btn.addEventListener('click', () => {
          WindowManager.focusOrRestore(app.id);
        });
        container.appendChild(btn);
      }
      // Update active state
      if (app.focused && !app.minimized) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  return { init, refreshSystemTray };
})();
