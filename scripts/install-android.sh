#!/usr/bin/env bash
# One-step installer for Noor on an Android TV / Google TV / STC TV box, from a Mac or Linux computer.
#   bash install-android.sh 192.168.1.50
# Downloads the newest noor-android.apk, connects to the TV over Wi-Fi, installs it and grants its permissions.
set -uo pipefail
IP="${1:-}"
APK_URL="https://github.com/mhkuhail/noor-webos/releases/latest/download/noor-android.apk"
PKG=com.noor.tv

say() { printf '\n\033[1;32m▶ %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }

if [ -z "$IP" ]; then
  read -r -p "TV / box IP address (Settings → Network on the TV): " IP
fi
[ -n "$IP" ] || die "No IP address given."
case "$IP" in *:*) ;; *) IP="$IP:5555" ;; esac

if ! command -v adb >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    say "Installing adb (Android platform-tools)…"
    brew install --cask android-platform-tools || die "Could not install adb."
  else
    die "adb is missing. Mac: install Homebrew (https://brew.sh) then run: brew install --cask android-platform-tools"
  fi
fi

say "Downloading the newest Noor…"
TMP=$(mktemp -d)
curl -fL --progress-bar -o "$TMP/noor-android.apk" "$APK_URL" || die "Download failed: $APK_URL"

say "Connecting to $IP — if the TV asks «Allow USB debugging?», tick «Always allow» and press OK."
adb disconnect "$IP" >/dev/null 2>&1
adb connect "$IP"
for i in $(seq 1 30); do
  STATE=$(adb -s "$IP" get-state 2>/dev/null)
  [ "$STATE" = "device" ] && break
  sleep 2
done
[ "$STATE" = "device" ] || die "Not connected. Check: same Wi-Fi, USB debugging is ON on the TV, and you pressed OK on the TV prompt. Then run this again."

say "Installing Noor…"
if ! adb -s "$IP" install -r "$TMP/noor-android.apk"; then
  say "An older Noor signed differently is installed — removing it and trying again…"
  adb -s "$IP" uninstall "$PKG" >/dev/null 2>&1
  adb -s "$IP" install "$TMP/noor-android.apk" || die "Install failed."
fi

say "Granting permissions…"
adb -s "$IP" shell appops set $PKG SYSTEM_ALERT_WINDOW allow && echo "  ✓ show the adhan over other apps"
adb -s "$IP" shell appops set $PKG GET_USAGE_STATS allow && echo "  ✓ know when a film is playing"
adb -s "$IP" shell dumpsys deviceidle whitelist +$PKG >/dev/null 2>&1 && echo "  ✓ never put to sleep by battery saving"
adb -s "$IP" shell dpm set-active-admin $PKG/.SleepAdmin >/dev/null 2>&1 && echo "  ✓ can put the box to sleep after the adhan" || echo "  – sleep after adhan not allowed on this device (Noor uses Night mode instead)"

say "Opening Noor on the TV…"
adb -s "$IP" shell monkey -p $PKG -c android.intent.category.LEANBACK_LAUNCHER 1 >/dev/null 2>&1 \
  || adb -s "$IP" shell monkey -p $PKG 1 >/dev/null 2>&1
rm -rf "$TMP"
printf '\n\033[1;32m✓ Done.\033[0m On the TV: press Menu → choose your country and city.\n'
