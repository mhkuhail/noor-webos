#!/bin/bash
# Installs noor-helper as a systemd service (Raspberry Pi / any Linux box that is always on).
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
command -v node >/dev/null || { echo "Install Node.js 20+ first: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"; exit 1; }
[ -f "$DIR/config.json" ] || cp "$DIR/config.example.json" "$DIR/config.json"
cd "$DIR" && npm install --omit=dev --no-audit --no-fund
sudo tee /etc/systemd/system/noor-helper.service >/dev/null <<UNIT
[Unit]
Description=Noor helper - wake LG TV for adhan
After=network-online.target
Wants=network-online.target
[Service]
WorkingDirectory=$DIR
ExecStart=$(command -v node) $DIR/noor-helper.mjs
Restart=always
User=$USER
[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload && sudo systemctl enable --now noor-helper
echo "✓ running. Logs: journalctl -u noor-helper -f"
