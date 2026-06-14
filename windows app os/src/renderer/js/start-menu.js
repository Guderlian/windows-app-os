// ─── Windows App OS ─ Start Menu ───────────────────────────────────────
// Flyout start menu: search, pinned apps, power controls.

const StartMenu = (() => {
  let isOpen = false;
  let powerMenuOpen = false;

  const pinnedApps = [
    { id: 'rdp',     name: 'Remote Desktop',    icon: '\u{1F5A5}',  action: 'openRDP' },
    { id: 'network', name: 'Network',             icon: '\u{1F310}', action: 'openNetwork' },
    { id: 'files',   name: 'Files',              icon: '\u{1F4C2}', action: 'openFiles' },
    { id: 'terminal',name: 'Terminal',           icon: '\u25B6}',  action: 'openTerminal' },
    { id: 'settings',name: 'Settings',           icon: '\u{2699}',  action: 'openSettings' },
  ];

  // ── Initialize ────────────────────────────────────────────────────
  function init() {
    renderPinned();

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (isOpen && !e.target.closest('#start-menu') && !e.target.closest('#taskbar-start')) {
        close();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    });

    // Search input
    Utils.on('#start-search-input', 'input', Utils.debounce((e) => {
      filterPinned(e.target.value);
    }, 150));

    // Power menu
    Utils.on('#start-power-btn', 'click', (e) => {
      e.stopPropagation();
      togglePowerMenu();
    });

    // Power menu items
    Utils.on('#power-shutdown', 'click', async () => {
      close();
      if (window.winOS) await winOS.power.shutdown();
    });
    Utils.on('#power-reboot', 'click', async () => {
      close();
      if (window.winOS) await winOS.power.reboot();
    });
    Utils.on('#power-sleep', 'click', async () => {
      close();
      if (window.winOS) await winOS.power.sleep();
    });
    Utils.on('#power-logout', 'click', async () => {
      close();
      if (window.winOS) await winOS.power.logout();
    });
  }

  // ── Render pinned apps ────────────────────────────────────────────
  function renderPinned() {
    const container = document.getElementById('start-pinned-apps');
    if (!container) return;
    container.innerHTML = pinnedApps.map(app => '' +
      '<button class=\"start-pinned-item\" data-action=\"' + app.action + '\" title=\"' + app.name + '\">' +
        '<span class=\"pinned-icon\">' + app.icon + '</span>' +
        '<span>' + app.name + '</span>' +
      '</button>'
    ).join('');

    // Bind clicks
    container.querySelectorAll('.start-pinned-item').forEach(btn => {
      btn.addEventListener('click', () => {
        handlePinnedAction(btn.dataset.action);
      });
    });
  }

  // ── Filter pinned by search ───────────────────────────────────────
  function filterPinned(query) {
    const items = document.querySelectorAll('.start-pinned-item');
    const q = query.toLowerCase().trim();
    items.forEach(item => {
      const name = (item.textContent || '').toLowerCase();
      item.style.display = (!q || name.includes(q)) ? '' : 'none';
    });
  }

  // ── Pinned app action handler ─────────────────────────────────────
  function handlePinnedAction(action) {
    close();
    switch (action) {
      case 'openRDP':
        openRDPDialog();
        break;
      case 'openNetwork':
        openNetworkDialog();
        break;
      case 'openTerminal':
        openTerminal();
        break;
      case 'openFiles':
        openFiles();
        break;
      case 'openSettings':
        openSettings();
        break;
    }
  }

  // ── App launcher helpers ──────────────────────────────────────────
  function openRDPDialog() {
    const id = WindowManager.create({
      title: 'Remote Desktop Connection',
      icon: '\u{1F5A5}',
      width: 480,
      height: 400,
      content: '' +
        '<div class=\"form-group\">' +
          '<label class=\"input-label\">Computer</label>' +
          '<input class=\"input\" id=\"rdp-host\" placeholder=\"192.168.1.100 or hostname\" autofocus>' +
        '</div>' +
        '<div class=\"form-row\">' +
          '<div class=\"form-group\">' +
            '<label class=\"input-label\">Username</label>' +
            '<input class=\"input\" id=\"rdp-user\" placeholder=\"user\">' +
          '</div>' +
          '<div class=\"form-group\">' +
            '<label class=\"input-label\">Password</label>' +
            '<input class=\"input\" id=\"rdp-pass\" type=\"password\" placeholder=\"\u2022\u2022\u2022\u2022\u2022\u2022\">' +
          '</div>' +
        '</div>' +
        '<div class=\"form-row\">' +
          '<div class=\"form-group\">' +
            '<label class=\"input-label\">Port</label>' +
            '<input class=\"input\" id=\"rdp-port\" value=\"3389\" placeholder=\"3389\">' +
          '</div>' +
          '<div class=\"form-group\">' +
            '<label class=\"input-label\">Resolution</label>' +
            '<input class=\"input\" id=\"rdp-res\" value=\"1920x1080\" placeholder=\"1920x1080\">' +
          '</div>' +
        '</div>' +
        '<div style=\"margin-top: 8px;\">' +
          '<button class=\"btn btn-primary\" id=\"rdp-connect-btn\" style=\"width:100%;\">Connect</button>' +
        '</div>' +
        '<div id=\"rdp-status\" style=\"margin-top:10px;font-size:12px;color:var(--text-dim);\"></div>'
    });

    // Bind connect button after DOM ready
    setTimeout(() => {
      const body = WindowManager.getBody(id);
      if (!body) return;
      body.querySelector('#rdp-connect-btn').addEventListener('click', async () => {
        const host = body.querySelector('#rdp-host').value.trim();
        const user = body.querySelector('#rdp-user').value.trim();
        const pass = body.querySelector('#rdp-pass').value;
        const port = parseInt(body.querySelector('#rdp-port').value) || 3389;
        const res  = body.querySelector('#rdp-res').value.trim() || '1920x1080';
        const statusEl = body.querySelector('#rdp-status');

        if (!host) {
          statusEl.textContent = 'Please enter a computer name or IP.';
          statusEl.style.color = 'var(--danger)';
          return;
        }

        statusEl.textContent = 'Connecting...';
        statusEl.style.color = 'var(--accent)';

        if (window.winOS) {
          const result = await winOS.rdp.connect({ host, username: user, password: pass, port, resolution: res });
          if (result.success) {
            statusEl.textContent = 'Session ended.';
            statusEl.style.color = 'var(--success)';
          } else {
            statusEl.textContent = 'Error: ' + (result.error || 'Connection failed');
            statusEl.style.color = 'var(--danger)';
          }
        }
      });
    }, 50);
  }

  function openNetworkDialog() {
    const id = WindowManager.create({
      title: 'Network & Internet',
      icon: '\u{1F310}',
      width: 450,
      height: 440,
      content: '' +
        '<div style=\"margin-bottom:12px;\">' +
          '<button class=\"btn btn-primary btn-sm\" id=\"net-scan-btn\">Scan for Wi-Fi</button>' +
        '</div>' +
        '<ul class=\"network-list\" id=\"network-list\" style=\"max-height:300px;overflow:auto;\">' +
          '<li class=\"network-item\" style=\"color:var(--text-dim);\">Click "Scan for Wi-Fi" to find networks...</li>' +
        '</ul>'
    });

    setTimeout(() => {
      const body = WindowManager.getBody(id);
      if (!body) return;
      body.querySelector('#net-scan-btn').addEventListener('click', async () => {
        const list = body.querySelector('#network-list');
        list.innerHTML = '<li class=\"network-item\" style=\"color:var(--text-dim);\">Scanning...</li>';
        if (window.winOS) {
          const nets = await winOS.network.scan();
          if (nets.error) {
            list.innerHTML = '<li class=\"network-item\" style=\"color:var(--danger);\">' + nets.error + '</li>';
          } else if (nets.length === 0) {
            list.innerHTML = '<li class=\"network-item\" style=\"color:var(--text-dim);\">No networks found.</li>';
          } else {
            list.innerHTML = nets.map(function(n) {
              return '<li class=\"network-item\" data-ssid=\"' + n.ssid + '\" data-sec=\"' + n.security + '\">' +
                '<span class=\"ni-left\">' +
                  '<span>\u{1F4F6}</span>' +
                  '<span>' + (n.ssid || '(hidden)') + '</span>' +
                '</span>' +
                '<span style=\"font-size:11px;color:var(--text-dim);\">' + n.signal + '% ' + (n.security ? '\u{1F512}' : '') + '</span>' +
              '</li>';
            }).join('');

            // Click to connect
            list.querySelectorAll('.network-item').forEach(item => {
              item.addEventListener('click', () => {
                const ssid = item.dataset.ssid;
                const sec = item.dataset.sec;
                if (sec) {
                  const pw = prompt('Enter password for "' + ssid + '":');
                  if (pw !== null && window.winOS) {
                    winOS.network.connect(ssid, pw).then(res => {
                      Utils.toast(res.success ? 'Connected to ' + ssid : 'Connection failed: ' + (res.error || ''), res.success ? 'success' : 'error');
                    });
                  }
                } else if (window.winOS) {
                  winOS.network.connect(ssid).then(res => {
                    Utils.toast(res.success ? 'Connected to ' + ssid : 'Connection failed', res.success ? 'success' : 'error');
                  });
                }
              });
            });
          }
        }
      });
    }, 50);
  }

  function openTerminal() {
    WindowManager.create({
      title: 'Terminal',
      icon: '\u{25B6}',
      width: 700,
      height: 420,
      content: '' +
        '<div style=\"font-family:var(--font-mono);font-size:13px;background:rgba(0,0,0,0.3);border-radius:var(--radius-sm);padding:16px;height:100%;overflow:auto;\">' +
          '<div style=\"color:var(--accent);\">Windows App OS \u2014 Terminal Emulator</div>' +
          '<div style=\"color:var(--text-dim);margin-top:8px;\">This is a web terminal placeholder.</div>' +
          '<div style=\"color:var(--text-dim);\">Full PTY integration via node-pty coming in Step 3.</div>' +
          '<div style=\"margin-top:12px;\">$ <span style=\"color:var(--success);\">_</span></div>' +
        '</div>' +
        '<div style=\"margin-top:8px;\">' +
          '<span style=\"font-size:11px;color:var(--text-dim);\">Terminal requires <code>node-pty</code> package for full shell access.</span>' +
        '</div>'
    });
  }

  function openFiles() {
    WindowManager.create({
      title: 'File Explorer',
      icon: '\u{1F4C2}',
      width: 700,
      height: 460,
      content: '' +
        '<div style=\"color:var(--text-dim);padding:20px;text-align:center;\">' +
          '<div style=\"font-size:48px;margin-bottom:16px;\">\u{1F4C1}</div>' +
          '<div>File Explorer (web-based) \u2014 planned for Step 4.</div>' +
          '<div style=\"margin-top:8px;font-size:12px;\">Will use Thunar or a custom Electron file manager.</div>' +
        '</div>'
    });
  }

  function openSettings() {
    WindowManager.create({
      title: 'Settings',
      icon: '\u{2699}',
      width: 560,
      height: 420,
      content: '' +
        '<div class=\"card\" style=\"margin-bottom:12px;\">' +
          '<div class=\"card-header\">System Information</div>' +
          '<div id=\"settings-sysinfo\" style=\"font-size:12px;color:var(--text-dim);\">Loading...</div>' +
        '</div>' +
        '<div class=\"card\">' +
          '<div class=\"card-header\">Display</div>' +
          '<div style=\"font-size:12px;color:var(--text-dim);\">Window Manager: Openbox</div>' +
          '<div style=\"font-size:12px;color:var(--text-dim);\">Compositor: xcompmgr (optional)</div>' +
        '</div>'
    });

    // Load system info
    if (window.winOS) {
      winOS.system.getInfo().then(info => {
        const el = document.getElementById('settings-sysinfo');
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

  // ── Toggle ────────────────────────────────────────────────────────
  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  function open() {
    document.getElementById('start-menu').classList.add('open');
    document.getElementById('taskbar-start').classList.add('active');
    document.getElementById('start-search-input').value = '';
    document.getElementById('start-search-input').focus();
    filterPinned('');
    isOpen = true;
  }

  function close() {
    document.getElementById('start-menu').classList.remove('open');
    document.getElementById('taskbar-start').classList.remove('active');
    closePowerMenu();
    isOpen = false;
  }

  // ── Power sub-menu ────────────────────────────────────────────────
  function togglePowerMenu() {
    const pm = document.getElementById('power-menu');
    if (powerMenuOpen) {
      closePowerMenu();
    } else {
      pm.classList.add('open');
      powerMenuOpen = true;
    }
  }

  function closePowerMenu() {
    document.getElementById('power-menu').classList.remove('open');
    powerMenuOpen = false;
  }

  return { init, toggle, open, close };
})();
