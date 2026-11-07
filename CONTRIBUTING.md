# Contributing

Thanks for helping! Bug reports with your **TV model, webOS version and a photo of Settings → TV capability check** are the most useful.

## Development

```bash
npm install
npm run package                  # build + .ipk in dist/
npm run install-tv               # needs `ares-setup-device` with a device named "tv"
TV=mytv npm run launch-tv
```

Quick UI iteration in a desktop browser: `npm run build`, then open `build/app/index.html` at 1920×1080
(TV-only calls fail gracefully without `PalmServiceBridge`; `window.__noor` exposes helpers for testing).

## Rules of thumb

- The app must run on **Chromium 53**: keep the esbuild target, avoid new CSS (`inset`, flex `gap`, `url()` in CSS variables).
- Service code runs on **Node 8**: no `async/await`.
- Every privileged webOS call needs a fallback and should show up in the capability check.
- Never type Quranic text by hand — load it from the Quran API.
- Don't commit adhan recordings or other copyrighted audio.
