# Architecture

```
┌──────────────────────── LG webOS TV (Developer Mode) ────────────────────────┐
│                                                                              │
│  com.noor.webos  (web app, Chromium 53)          com.noor.webos.service      │
│  ─────────────────────────────────────           (JS service, Node 8)        │
│  • UI: home, dock, Quran, adhkar, settings       • keep-alive activity       │
│  • prayer times (adhan-js), Hijri, reminders     • 10 s prayer loop          │
│  • adhan player (bundled MP3 → stream → chime)   • T-60 s: turnOnScreen +    │
│  • Quran player (mp3quran) + text (alquran)        launch Noor {prayer, at}  │
│  • screen off / night mode, app launcher         • daily Developer Mode      │
│  • capability check                                renewal (devmode extend)  │
│        │  luna:// via PalmServiceBridge  ▲         • apps / launch / screen  │
│        └─────────────────────────────────┘           fallbacks for the app   │
└──────────────────────────────────────────────────────────────────────────────┘
          ▲ optional: Wake-on-LAN + SSAP (wss://tv:3001)
┌─────────┴──────────┐
│ helper/noor-helper │  Raspberry Pi / Mac — wakes the TV from standby
└────────────────────┘
```

## Source layout

| Path | What |
|---|---|
| `src/main.js` | Entire TV app: state, time/Hijri, rendering, Quran player, adhkar, settings, adhan, launcher, capability check, key handling |
| `src/content.js` | UI strings (ar/en), cities, adhkar texts (hadith-sourced; Quranic items are fetched, never typed) |
| `service/service.js` | Background service (`webos-service`) |
| `app/` | `index.html`, `style.css`, `appinfo.json`, icons, wallpapers, fallback chime |
| `helper/` | Optional network helper (`lgtv2`, `adhan`) |
| `scripts/build.sh` | Copies assets + fonts, bundles JS with esbuild, prepares `build/` for `ares-package` |

## Platform constraints (webOS 4.x)

- **Chromium 53**: no `inset`, flex `gap`, logical properties, optional chaining; and **no `url()` inside CSS
  variables** — wallpapers are therefore set from JavaScript. esbuild targets `chrome53`.
- **Node 8** in services: no `async/await` in service code; bundled with `--target=node8`.
- Luna calls are made through `PalmServiceBridge` (what `webOSTV.js` uses internally). Developer-Mode apps may be
  denied some methods; every privileged step has a fallback (app → service → degraded mode), and the capability
  check reports which path works.
- Prayer times are computed for the selected city's UTC offset, independent of the TV's own time zone.

## Data sources

| Data | Source | Cached |
|---|---|---|
| Prayer times | adhan-js, on device | — |
| Quran text (Uthmani) | `api.alquran.cloud` | localStorage per surah |
| Recitation | `server10.mp3quran.net/bader/Rewayat-Hafs-A-n-Assem/NNN.mp3` | browser cache |
| Weather | `api.open-meteo.com` | 30 min |
| Optional adhan streams | `assabile.com` | — |

## Launch parameters

Noor accepts `{ prayer, at, source, test, screenWasOff, afterRenew, capTest }` via `PalmSystem.launchParams`
and the `webOSRelaunch` event — used by the service, the helper and the capability check.
