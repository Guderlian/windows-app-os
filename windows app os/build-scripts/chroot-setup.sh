#!/bin/bash
# ─── Windows App OS ─ Live-Build Chroot Hook ───────────────────────────
# Runs inside the live-build chroot during `lb build` (chroot stage).
# Installs all system dependencies, Node.js 22, and configures the
# kiosk environment: auto-login → startx → openbox → Electron app.
#
# Invoked by: .github/workflows/build-iso.yml
# Placed at:  config/hooks/normal/9999-customize.hook.chroot
# ───────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Logging ────────────────────────────────────────────────────────────
log()  { echo "[chroot-hook] $(date '+%H:%M:%S')  $*"; }
fail() { echo "[chroot-hook] $(date '+%H:%M:%S')  ERROR: $*" >&2; exit 1; }

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Chroot customization started"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Variables (no hardcoded absolute paths beyond standard FHS) ────────
APP_DIR="/opt/windows-app-os"
OPENBOX_AUTOSTART_DIR="/etc/xdg/openbox"
OPENBOX_AUTOSTART_FILE="${OPENBOX_AUTOSTART_DIR}/autostart"
GETTY_OVERRIDE_DIR="/etc/systemd/system/getty@tty1.service.d"
GETTY_OVERRIDE_FILE="${GETTY_OVERRIDE_DIR}/autologin.conf"
SYSTEMD_SERVICE_FILE="/etc/systemd/system/windows-app-os.service"
ROOT_PROFILE="/root/.profile"
XINITRC="/root/.xinitrc"

# ── Step 1: Update apt sources ────────────────────────────────────────
log "Step 1/9: Updating apt sources..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq || fail "apt-get update failed"

# ── Step 2: Install base system packages ──────────────────────────────
log "Step 2/9: Installing system packages..."
# Keep this list minimal but functional
apt-get install -y -qq --no-install-recommends \
    network-manager \
    freerdp2-x11 \
    openbox \
    xorg \
    xinit \
    curl \
    ca-certificates \
    gnupg \
    fonts-dejavu-core \
    fonts-noto-mono \
    x11-xserver-utils \
    xdotool \
    pcmanfm \
    xterm \
    live-config \
    live-boot \
    systemd \
    dbus \
    || fail "apt-get install packages failed"

log "System packages installed successfully."

# ── Step 3: Install Node.js 22 ────────────────────────────────────────
log "Step 3/9: Installing Node.js 22..."
NODE_MAJOR=22

curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - || fail "nodesource setup script failed"
apt-get install -y -qq nodejs || fail "nodejs install failed"

# Verify installation
node --version || fail "node --version check failed"
npm --version  || fail "npm --version check failed"

log "Node.js $(node --version) / npm $(npm --version) installed."

# ── Step 4: Create systemd service for the Electron app ────────────────
log "Step 4/9: Creating systemd service..."
cat > "${SYSTEMD_SERVICE_FILE}" << 'SYSTEMDEOF'
[Unit]
Description=Windows App OS Desktop
After=network.target graphical.target
Wants=graphical.target
Requires=display-manager.service

[Service]
Type=simple
Environment=DISPLAY=:0
Environment=XAUTHORITY=/root/.Xauthority
WorkingDirectory=/opt/windows-app-os
ExecStartPre=/bin/sleep 2
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=3
User=root
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=graphical.target
SYSTEMDEOF

chmod 644 "${SYSTEMD_SERVICE_FILE}"
log "Systemd service created at ${SYSTEMD_SERVICE_FILE}"

# ── Step 5: Configure tty1 auto-login for root ────────────────────────
log "Step 5/9: Configuring tty1 auto-login..."
mkdir -p "${GETTY_OVERRIDE_DIR}"

cat > "${GETTY_OVERRIDE_FILE}" << 'GETTYEOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin root --noclear %I $TERM
Type=idle
GETTYEOF

chmod 644 "${GETTY_OVERRIDE_FILE}"
log "Getty auto-login configured for root on tty1."

# ── Step 6: Configure root .profile to auto-start X ────────────────────
log "Step 6/9: Configuring auto-startx on login..."
cat >> "${ROOT_PROFILE}" << 'PROFILEEOF'

# ── Windows App OS: auto-start X11 if on tty1 ─────────────────────────
if [ -z "${DISPLAY}" ] && [ "$(tty)" = "/dev/tty1" ]; then
    echo "[win-os] Starting Xorg + Openbox..."
    startx
fi
PROFILEEOF

log "Root .profile updated for auto-startx."

# ── Step 7: Create .xinitrc to launch Openbox ─────────────────────────
log "Step 7/9: Creating .xinitrc..."
cat > "${XINITRC}" << 'XINITRCEOF'
#!/bin/bash
# ── Windows App OS .xinitrc ────────────────────────────────────────────

# X resources and basic settings
xset s off          # Disable screen saver
xset -dpms          # Disable DPMS
xsetroot -solid "#0d1117"  # Dark background before Electron loads

# Launch Openbox (it reads /etc/xdg/openbox/autostart)
exec openbox-session
XINITRCEOF

chmod 755 "${XINITRC}"
log ".xinitrc created."

# ── Step 8: Configure Openbox autostart ────────────────────────────────
log "Step 8/9: Configuring Openbox autostart..."
mkdir -p "${OPENBOX_AUTOSTART_DIR}"

cat > "${OPENBOX_AUTOSTART_FILE}" << 'OBAEOF'
#!/bin/bash
# ── Windows App OS ─ Openbox Autostart ─────────────────────────────────

# Start NetworkManager applet (nm-applet) if available
nm-applet &

# Set wallpaper (dark solid color — no image needed)
xsetroot -solid "#0d1117" &

# Hide cursor after 3 seconds of inactivity
unclutter -idle 3 &

# Launch the Electron desktop environment
cd /opt/windows-app-os || exit 1
exec npm start
OBAEOF

chmod 755 "${OPENBOX_AUTOSTART_FILE}"
log "Openbox autostart configured."

# ── Step 9: Cleanup ────────────────────────────────────────────────────
log "Step 9/9: Cleaning apt cache and temporary files..."
apt-get clean -qq
apt-get autoclean -qq
rm -rf /var/lib/apt/lists/*
rm -rf /tmp/*
rm -rf /var/tmp/*

# Remove unnecessary documentation to save space
rm -rf /usr/share/doc/*
rm -rf /usr/share/man/*
rm -rf /usr/share/info/*

# Report disk usage
log "Filesystem usage after cleanup:"
df -h / | tail -1

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Chroot customization complete!"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"