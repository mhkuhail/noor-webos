#!/usr/bin/env bash
# Builds Noor for Android TV / Google TV: the same web app as the LG build, inside a native WebView shell.
#   bash scripts/build-android.sh          → dist/noor-android-<version>.apk
# Needs Node 20+, JDK 17 and the Android SDK (ANDROID_HOME). CI does this on every push.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./package.json').version")
bash scripts/build.sh
WWW=android/app/src/main/assets/www
rm -rf "$WWW" && mkdir -p "$WWW"
cp -r build/app/. "$WWW/"
rm -f "$WWW/appinfo.json"
cp android/web/android-shim.js "$WWW/"
# the shim must run before app.js
node -e "const f='$WWW/index.html',fs=require('fs');let h=fs.readFileSync(f,'utf8');if(!h.includes('<script src=\"app.js\"></script>'))throw new Error('app.js tag not found');fs.writeFileSync(f,h.replace('<script src=\"app.js\"></script>','<script src=\"android-shim.js\"></script>\n<script src=\"app.js\"></script>'))"
(cd android && ./gradlew --no-daemon -q assembleRelease)
mkdir -p dist
cp android/app/build/outputs/apk/release/app-release.apk "dist/noor-android-$VERSION.apk"
# fixed name, so …/releases/latest/download/noor-android.apk always points at the newest version
cp android/app/build/outputs/apk/release/app-release.apk dist/noor-android.apk
echo "✓ dist/noor-android-$VERSION.apk + dist/noor-android.apk"
