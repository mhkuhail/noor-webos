#!/usr/bin/env bash
# Builds Noor into ./build/app (web app) and ./build/service (JS service).
# `npm run package` then turns them into dist/com.noor.webos_<version>_all.ipk
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./package.json').version")
rm -rf build && mkdir -p build/app/fonts build/app/audio build/service

# 1) static app files
cp -r app/index.html app/style.css app/icon.png app/largeIcon.png app/chime.mp3 app/wall build/app/
node -e "const f='app/appinfo.json',a=require('./'+f);a.version='$VERSION';require('fs').writeFileSync('build/app/appinfo.json',JSON.stringify(a,null,2))"

# 2) fonts (SIL OFL) straight from npm
for w in 400 700; do cp node_modules/@fontsource/amiri/files/amiri-arabic-$w-normal.woff2 build/app/fonts/; done
for s in arabic latin; do for w in 300 400 700 800; do cp node_modules/@fontsource/cairo/files/cairo-$s-$w-normal.woff2 build/app/fonts/; done; done

# 3) adhan recordings from app/audio/ (copied as-is; NORMALIZE=1 re-encodes new files with ffmpeg loudnorm)
shopt -s nullglob
AUDIO=(app/audio/ezan-*.mp3)
if [ ${#AUDIO[@]} -gt 0 ]; then
  if command -v ffmpeg >/dev/null && [ "${NORMALIZE:-0}" = "1" ]; then
    for f in "${AUDIO[@]}"; do ffmpeg -y -loglevel error -i "$f" -map 0:a -map_metadata -1 -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 44100 -ac 2 -b:a 128k "build/app/audio/$(basename "$f")"; done
  else cp "${AUDIO[@]}" build/app/audio/; fi
  echo "✓ bundled ${#AUDIO[@]} adhan recording(s)"
else
  echo "ℹ no app/audio/ezan-*.mp3 found — the app will use the built-in chime (or online adhan streams)"
fi

# 4) JavaScript: app for the TV's Chromium 53, service for webOS Node 0.12 (ES5)
npx esbuild src/main.js --bundle --format=iife --target=chrome53 --minify --define:__NOOR_VERSION__="\"$VERSION\"" --outfile=build/app/app.js --log-level=warning
node scripts/service-es5.cjs build/service/service.js   # webOS 4.x runs services on Node.js 0.12
cp service/services.json build/service/
node -e "require('fs').writeFileSync('build/service/package.json',JSON.stringify({name:'com.noor.webos.service',version:'$VERSION',main:'service.js'},null,2))"
echo "✓ build/ ready (v$VERSION) — run: npm run package"
