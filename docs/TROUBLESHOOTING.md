# Troubleshooting

**Wallpaper missing — only colours show**
Fixed in 1.7.3 (Chromium 53 ignores `url()` inside CSS variables). Update, then close Noor completely or restart the TV.

**Apps screen: “Could not read the app list … timeout”**
Some TVs don't share the installed-app list with Developer-Mode apps. Since 1.7.1 Noor shows a built-in list of popular
apps immediately and replaces it with the real list when the TV allows. Opening apps works either way.

**“The TV did not allow turning the screen off”**
Developer-Mode permission. Since 1.7.2 Noor tries its background service and otherwise uses *Night mode*; the adhan still
plays on time. Run *Settings → TV capability check* and include a photo when reporting an issue.

**No adhan sound**
- Settings → *Adhan at prayer time* = On, and *Test adhan*.
- Check the TV volume / output (soundbar).
- Settings lists each `audio/ezan-*.mp3` with ✓ when found. Without files, Noor uses the online source chosen per prayer, then a chime.

**The adhan didn't play while watching YouTube / Netflix** · *Settings → System → service log* says `SERVICE: not reachable`
Fixed in 2.0.0 (the service crashed on webOS 4.x's Node.js 0.12). Open Noor once after installing (that starts the service and schedules the prayers), then switch to YouTube.
If it still doesn't come up, open *Settings → Adhan service log* and *TV capability check* and send photos of both.

**The adhan didn't play at night**
The TV was probably switched off with the power button — see [ALWAYS-ON.md](ALWAYS-ON.md).

**Noor disappeared from the TV**
Developer Mode expired or was reset. Turn it on again, reinstall the `.ipk`, and keep *Renew Developer Mode automatically* on.

**Quran text: “Could not load”**
The TV needs internet the first time each surah is opened; afterwards it is cached.

**Wrong prayer time by a few minutes**
Check the city (Riyadh/Makkah = Umm al-Qura, Istanbul = Diyanet). Times use the city's UTC offset, not the TV's time zone.
Hijri date one day off: Settings → *Hijri date adjustment*.

**macOS: “webOS Dev Manager Not Opened”**
System Settings → Privacy & Security → *Open Anyway*, or `xattr -cr "/Applications/webOS Dev Manager.app"`.

**Helper: TV doesn't wake**
Enable *TV On With Mobile / Turn on via Wi-Fi*, prefer Ethernet, try Quick Start+ off, reserve the TV's IP, run
`node noor-helper.mjs pair` with the TV on. Logs: `helper/noor-helper.log` (macOS) or `journalctl -u noor-helper -f` (Linux).
