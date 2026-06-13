// ─── Windows App OS ─ Desktop ──────────────────────────────────────────
// Desktop background, icons, and wallpaper management.

const Desktop = (() => {

  const desktopIcons = [
    { name: 'Computer',   icon: '\u{1F4BB}', action: 'openSettings' },
    { name: 'Network',    icon: '\u{1F310}', action: 'openNetwork' },
    { name: 'Terminal',   icon: '\u{25B6}',  action: 'openTerminal' },
    { name: 'Files',      icon: '\u{1F4C2}',  action: 'openFiles' },
  ];

  // ── Initialize ────────────────────────────────────────────────────
  function init() {
    renderIcons();

    // Double-click desktop to open start menu
    const desktop = document.getElementById('desktop');
    desktop.addEventListener('dblclick', (e) => {
      // Only if clicking the background, not a window or icon
      if (e.target === desktop || e.target.id === 'desktop') {
        StartMenu.toggle();
      }
    });
  }

  // ── Render desktop icons ──────────────────────────────────────────
  function renderIcons() {
    const container = document.getElementById('desktop-icons');
    if (!container) return;

    container.innerHTML = desktopIcons.map(icon => '' +
      '<button class=\"desktop-icon\" data-action=\"' + icon.action + '\">' +
        '<span class=\"dicon-img\">' + icon.icon + '</span>' +
        '<span>' + icon.name + '</span>' +
      '</button>'
    ).join('');

    // Bind double-click
    container.querySelectorAll('.desktop-icon').forEach(btn => {
      btn.addEventListener('dblclick', () => {
        const action = btn.dataset.action;
        if (action === 'openSettings') StartMenu.handlePinnedAction ? StartMenu.handlePinnedAction('openSettings') : openSettingsViaApp();
        if (action === 'openNetwork')  StartMenu.handlePinnedAction ? StartMenu.handlePinnedAction('openNetwork') : null;
        if (action === 'openTerminal') StartMenu.handlePinnedAction ? StartMenu.handlePinnedAction('openTerminal') : null;
        if (action === 'openFiles')    StartMenu.handlePinnedAction ? StartMenu.handlePinnedAction('openFiles') : null;
      });
    });
  }

  // Fallback if StartMenu methods aren't available directly
  function openSettingsViaApp() {
    WindowManager.create({
      title: 'Settings',
      icon: '\u{2699}',
      width: 560,
      height: 420,
      content: '' +
        '<div class=\"card\" style=\"margin-bottom:12px;\">' +
          '<div class=\"card-header\">System Information</div>' +
          '<div id=\"desktop-sysinfo\" style=\"font-size:12px;color:var(--text-dim);\">Loading...</div>' +
        '</div>' +
        '<div class=\"card\">' +
          '<div class=\"card-header\">Display</div>' +
          '<div style=\"font-size:12px;color:var(--text-dim);\">Window Manager: Openbox</div>' +
        '</div>'
    });
    if (window.winOS) {
      winOS.system.getInfo().then(info => {
        const el = document.getElementById('desktop-sysinfo');
        if (el && !info.error) {
          el.innerHTML = '' +
            'Hostname: ' + info.hostname + '<br>' +
            'Kernel: ' + info.kernel + '<br>' +
            'Uptime: ' + Utils.formatUptime(info.uptime) + '<br>' +
            'CPU: ' + info.cpu.model + ' (' + info.cpu.cores + ' cores)<br>' +
            'Memory: ' + Utils.formatMB(info.memory.used) + ' / ' + Utils.formatMB(info.memory.total);
        }
      });
    }
  }

  return { init };
})();
