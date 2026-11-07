# Keeping the adhan working around the clock

## Why the power button is a problem

When an LG TV is in standby its processor is suspended — no app or service can run, and an app cannot
switch the TV on by itself. LG's built-in *Power On Timer* holds one fixed time only, and turns the TV off
again after 2–4 hours without input.

## Option A — TV only (default)

Use Noor's **«إطفاء الشاشة» / Screen off** card:

1. Noor asks the TV to turn the screen off (`com.webos.service.tvpower/power/turnOffScreen`), first directly,
   then through its background service.
2. If the TV does not allow it in Developer Mode, Noor switches to **Night mode**: a black screen with a tiny
   dim clock that moves every minute. Any key returns.
   On LCD/NanoCell panels the backlight stays on; for a dark panel also enable LG's own
   *Settings → Picture → Energy Saving → Screen Off* — audio keeps playing.
3. One minute before each prayer the background service turns the screen on (if allowed) and brings Noor to
   the front. Noor plays the adhan at the exact time and, a minute after it ends, turns the screen off again
   (*Settings → Turn the screen off again after the adhan*).

The same service brings Noor over YouTube, Netflix or any other app at prayer time.

**Limits:** the TV must stay on (screen off is fine). After a power cut or reboot, open Noor once to start the service.
Run *Settings → TV capability check* to see which steps your TV allows.

## Option B — wake from full standby with a network helper

`helper/` contains **noor-helper**, a small Node.js program for any always-on device on the same network
(Raspberry Pi, NAS, home server, or a Mac that stays awake). One minute before each prayer it:

1. sends **Wake-on-LAN** to the TV,
2. connects with LG's SSAP protocol (the one the LG ThinQ app uses), sets the volume and launches Noor,
3. renews Developer Mode once a day,
4. turns the TV back off ~7 minutes later if it was off before (never while someone is watching).

TV settings: *General → Devices → External Devices → TV On With Mobile / Turn on via Wi-Fi* = **On**.
Wired Ethernet is more reliable; if the TV does not wake, try turning **Quick Start+** off (*General → Devices → TV Management*).
Reserve the TV's IP address in your router.

```bash
cd helper
cp config.example.json config.json     # set tvIp (tvMac is learned automatically after pairing)
./install-linux.sh                     # Raspberry Pi / Linux (systemd)   — or ./install-mac.sh (launchd)
node noor-helper.mjs pair              # TV on: accept the prompt on screen
node noor-helper.mjs times             # today's schedule
node noor-helper.mjs test asr          # turn the TV off first, then run this
node noor-helper.mjs renew             # renew Developer Mode now
```

| config.json | Meaning |
|---|---|
| `tvIp` | TV address |
| `tvMac` | optional; saved automatically after pairing |
| `city` | `riyadh` / `makkah` / `istanbul`, or `lat`, `lng`, `method` |
| `wakeSecondsBefore` | default 60 |
| `adhanVolume` | volume during the adhan (omit to leave unchanged) |
| `turnOffAfterMinutes` | turn the TV off again if it was off (0 = never) |
| `prayers` | which prayers to wake for |
| `renewDevMode`, `renewEveryHours` | automatic Developer Mode renewal |
