#!/bin/bash
# Installs noor-helper as a background service on macOS (starts at login, restarts if it stops,
# and keeps the Mac awake while on power so prayers are never missed).
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then echo "Node.js is required: install it from https://nodejs.org (LTS) or run: brew install node"; exit 1; fi
[ -f "$DIR/config.json" ] || cp "$DIR/config.example.json" "$DIR/config.json"
cd "$DIR" && npm install --omit=dev --no-audit --no-fund
PL="$HOME/Library/LaunchAgents/com.noor.helper.plist"
cat > "$PL" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.noor.helper</string>
  <key>ProgramArguments</key><array>
    <string>/usr/bin/caffeinate</string><string>-s</string><string>-i</string>
    <string>$NODE</string><string>$DIR/noor-helper.mjs</string>
  </array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$DIR/noor-helper.log</string>
  <key>StandardErrorPath</key><string>$DIR/noor-helper.log</string>
</dict></plist>
PLIST
launchctl unload "$PL" 2>/dev/null || true
launchctl load "$PL"
echo "✓ noor-helper is running. Log: $DIR/noor-helper.log"
echo "  Stop:  launchctl unload $PL"
