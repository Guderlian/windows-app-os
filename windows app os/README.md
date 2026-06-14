# Windows App OS — Step 2: Local UI Development

A minimal Windows 11-like desktop environment built on Debian Live + Openbox + Electron.

## Architecture

```
windows-app-os/
├── main.js                    # Electron main process (BrowserWindow lifecycle)
├── preload.js                 # Secure IPC bridge (contextBridge)
├── package.json               # Dependencies & scripts
├── LICENSE                    # MIT
├── src/
│   ├── main/
│   │   ├── ipc-handlers.js    # IPC wiring for system modules
│   │   └── system/
│   │       ├── network.js     # nmcli wrapper (Wi-Fi scan, connect, disconnect)
│   │       ├── rdp.js         # xfreerdp wrapper (in-memory password, no disk)
│   │       ├── power.js       # shutdown, reboot, logout, sleep
│   │       └── info.js        # /proc filesystem readers (CPU, memory, uptime)
│   └── renderer/
│       ├── index.html         # Main UI entry point
│       ├── css/
│       │   ├── main.css       # Global reset, CSS vars, desktop
│       │   ├── components.css # Buttons, inputs, cards, modals, toasts
│       │   ├── taskbar.css    # Bottom taskbar with clock & app buttons
│       │   ├── start-menu.css # Start menu with search, pinned apps, power
│       │   └── windows.css    # Draggable/resizable app windows
│       └── js/
│           ├── utils.js       # DOM helpers, clock, debounce, toast, event emitter
│           ├── window-manager.js  # Window creation, drag, resize, min/max/close
│           ├── taskbar.js     # Clock, system tray, app button sync
│           ├── start-menu.js  # Search, pinned apps, power menu, app launchers
│           ├── desktop.js     # Desktop icons & background
│           └── app.js         # Bootstrap & keyboard shortcuts
```

## Debian Dependencies

| Package          | Purpose              | Command Used      |
|------------------|----------------------|-------------------|
| `network-manager`| Wi-Fi & networking   | `nmcli`           |
| `freerdp2-x11`   | Remote Desktop       | `xfreerdp`        |
| `openbox`        | Window manager       | `openbox --exit`  |
| `systemd`        | Power management     | `systemctl`       |

All packages are standard Debian repos. Install with:
```bash
sudo apt install network-manager freerdp2-x11 openbox xorg
```

## Quick Start (Development on Debian)

```bash
# 1. Install Node.js (if not present)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Install dependencies
cd "windows-app-os"
npm install

# 3. Run in dev mode (windowed, with DevTools)
npm run start:dev

# 4. Run in kiosk mode (fullscreen, frameless)
npm start
```

## Key Design Decisions

### Security
- `contextIsolation: true` + `nodeIntegration: false` in BrowserWindow
- All system interaction goes through the preload IPC bridge
- RDP passwords are passed via stdin to xfreerdp — never written to disk
- No `remote` module, no `shell.openExternal` with untrusted input

### Performance
- Main process never blocks: all system calls use `child_process.exec` (async)
- System info polling debounced at 10-second intervals
- Window animations use CSS `transform` and `opacity` (GPU-composited)
- Module pattern (IIFE) avoids global scope pollution in renderer

### Windows 11 Visual Style
- Dark acrylic background: `backdrop-filter: blur(20px) saturate(180%)`
- Rounded corners (6-20px radius) on all interactive elements
- Subtle border: `rgba(255,255,255,0.08)` for depth without harsh edges
- Blue accent: `#60cdff` for interactive highlights
- Taskbar: centered app icons with active indicator dot

## Next Steps (Step 3+)

- **Terminal**: Integrate `node-pty` for real PTY shell access
- **File Explorer**: Web-based file manager or Thunar integration
- **Notification Center**: Sidebar flyout for system notifications
- **Debian Live Build**: `live-build` configuration for bootable ISO
- **Openbox config**: Autostart Electron, hide Openbox decorations
