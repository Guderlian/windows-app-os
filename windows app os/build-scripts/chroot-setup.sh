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

# ── Variables ──────────────────────────────────────────────────────────
APP_DIR="/opt/windows-app-os"
OPENBOX_AUTOSTART_DIR="/etc/xdg/openbox"
OPENBOX_AUTOSTART_FILE="${OPENBOX_AUTOSTART_DIR}/autostart"
GETTY_OVERRIDE_DIR="/etc/systemd/system/getty@tty1.service.d"
GETTY_OVERRIDE_FILE="${GETTY_OVERRIDE_DIR}/autologin.conf"
SYSTEMD_SERVICE_FILE="/etc/systemd/system/windows-app-os.service"
ROOT_PROFILE="/root/.profile"
XINITRC="/root/.xinitrc"

# ── Step 0: Prevent systemd services from starting in chroot ───────────
# This is THE most critical fix. Without policy-rc.d, apt-get install
# of packages like network-manager will try to start their systemd
# services via postinst scripts. Inside a chroot, systemctl fails,
# causing apt-get to exit non-zero and abort the entire build.
# ───────────────────────────────────────────────────────────────────────
log "Step 0/10: Disabling service auto-start in chroot..."
printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d
chmod +x /usr/sbin/policy-rc.d
log "policy-rc.d created — services will NOT attempt to start during install."

# ── Step 1: Ensure DNS + switch to Alibaba Cloud mirror ────────────────
log "Step 1/10: Configuring DNS and apt mirrors..."
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "nameserver 223.5.5.5" >> /etc/resolv.conf

# Replace default Debian mirrors with Alibaba Cloud (faster in China)
# The mirror switch is safe — lb build already used Tsinghua for bootstrap,
# but we also set it here for any runtime apt operations inside chroot.
MIRROR="https://mirrors.aliyun.com"
sed -i "s|http://deb.debian.org/debian|${MIRROR}/debian|g" /etc/apt/sources.list 2>/dev/null || true
sed -i "s|http://security.debian.org|${MIRROR}/debian-security|g" /etc/apt/sources.list 2>/dev/null || true
log "Apt sources switched to Alibaba Cloud mirror."

# ── Step 2: Update apt ────────────────────────────────────────────────
log "Step 2/10: Updating apt sources..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq || fail "apt-get update failed"

# ── Step 3: Install base system packages ──────────────────────────────
# Added unclutter (was missing — referenced by openbox autostart).
# ───────────────────────────────────────────────────────────────────────
log "Step 3/10: Installing system packages..."
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
    unclutter \
    live-config \
    live-boot \
    systemd \
    dbus \
    || fail "apt-get install packages failed"

log "System packages installed successfully."

# ── Step 4: Clean up policy-rc.d after install ────────────────────────
# Remove it so the live system will start services normally at boot.
log "Step 4/10: Removing policy-rc.d (live system needs service starts)..."
rm -f /usr/sbin/policy-rc.d
log "policy-rc.d removed."

# ── Step 5: Install Node.js 22 ────────────────────────────────────────
# Fallback strategy: try nodesource first, if it fails, use binary tarball
# from Alibaba Cloud OSS mirror (no external apt repo needed).
# ───────────────────────────────────────────────────────────────────────
log "Step 5/10: Installing Node.js 22..."
NODE_MAJOR=22
NODE_VERSION="22.12.0"

# Try nodesource first
if curl -fsSL --connect-timeout 10 "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - 2>/dev/null; then
    apt-get install -y -qq nodejs || fail "nodejs install via nodesource failed"
else
    # Fallback: download prebuilt binary from Alibaba Cloud mirror
    log "nodesource unavailable, downloading Node.js binary from Alibaba mirror..."
    NODE_URL="https://mirrors.aliyun.com/nodejs-release/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
    curl -fsSL --connect-timeout 30 "${NODE_URL}" -o /tmp/node.tar.xz || fail "Node.js binary download failed"
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1
    rm -f /tmp/node.tar.xz
fi

# Verify installation
node --version || fail "node --version check failed"
npm --version  || fail "npm --version check failed"

log "Node.js $(node --version) / npm $(npm --version) installed."

# ── Step 6: Create systemd service for the Electron app ────────────────
# Fixed: removed Requires=display-manager.service (doesn't exist in
# this startx-based kiosk setup, would mark the unit as failed).
# ───────────────────────────────────────────────────────────────────────
log "Step 6/10: Creating systemd service..."
cat > "${SYSTEMD_SERVICE_FILE}" << 'SYSTEMDEOF'
[Unit]
Description=Windows App OS Desktop
After=network.target
Wants=network.target

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

# ── Step 7: Configure tty1 auto-login for root ────────────────────────
log "Step 7/10: Configuring tty1 auto-login..."
mkdir -p "${GETTY_OVERRIDE_DIR}"

cat > "${GETTY_OVERRIDE_FILE}" << 'GETTYEOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin root --noclear %I $TERM
Type=idle
GETTYEOF

chmod 644 "${GETTY_OVERRIDE_FILE}"
log "Getty auto-login configured for root on tty1."

# ── Step 8: Configure root .profile to auto-start X ────────────────────
log "Step 8/10: Configuring auto-startx on login..."
cat >> "${ROOT_PROFILE}" << 'PROFILEEOF'

# ── Windows App OS: auto-start X11 if on tty1 ─────────────────────────
if [ -z "${DISPLAY}" ] && [ "$(tty)" = "/dev/tty1" ]; then
    echo "[win-os] Starting Xorg + Openbox..."
    startx
fi
PROFILEEOF

log "Root .profile updated for auto-startx."

# ── Step 9: Create .xinitrc to launch Openbox ─────────────────────────
log "Step 9/10: Creating .xinitrc..."
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

# ── Step 10: Configure Openbox autostart ───────────────────────────────
log "Step 10/10: Configuring Openbox autostart..."
mkdir -p "${OPENBOX_AUTOSTART_DIR}"

cat > "${OPENBOX_AUTOSTART_FILE}" << 'OBAEOF'
#!/bin/bash
# ── Windows App OS ─ Openbox Autostart ─────────────────────────────────

# Start NetworkManager applet
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

# ── Cleanup ────────────────────────────────────────────────────────────
log "Cleaning apt cache and temporary files..."
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