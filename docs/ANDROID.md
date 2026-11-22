# Noor for Android TV / Google TV

The same Noor app as the LG version (prayer times for 106 cities, per-prayer adhan, iqamah, the full Quran, adhkar,
themes) running on **Android TV and Google TV** — TCL, Sony Android, Xiaomi, Hisense, Philips, and HDMI boxes such as
the **STC TV box**, Chromecast with Google TV or a Mi Box. It also brings in what
[Noor TV](https://github.com/majedphotos/noor-tv) by majedphotos does on Android:

| From noor-webos | From Noor TV |
|---|---|
| Full app: 106 cities, methods, pickers, iqamah, Quran (Badr Al-Turki), adhkar, themes, Arabic/English | Messages and finger drawing from your phone (`http://<box-ip>:8080`) |
| Adhan **over YouTube/Netflix** (default) | **"Banner only"** option: a banner while a film or channel plays, nothing interrupted |
| **Wakes the box from standby** for the adhan | Salawat line every 45 min, Al-Kahf on Friday, over any app |

## How it works

```
android/  native shell (Java)                         app/ + src/  the same web app as on LG
──────────────────────────────                        ───────────────────────────────────
MainActivity   WebView, remote keys → webOS codes     main.js calls luna://… as on webOS
Bridge         answers those luna:// calls            android-shim.js = PalmServiceBridge,
Scheduler      AlarmManager "alarm clock" alarms        PalmSystem, webOSRelaunch on Android
AlarmReceiver  T-60 s: wake / bring Noor / banner
Wake           screen on → HDMI-CEC turns the TV on
MessageServer  phone page :8080 (from Noor TV)
SleepAdmin     optional real standby after the adhan
```

The web app hands the native side the next 30 days of prayer times every time it starts or a setting changes
(calculated with the same adhan-js, so LG and Android always agree). One minute before each adhan:

- **box asleep** → it wakes; on an HDMI box this sends CEC *One Touch Play*, so the TV turns on and switches input, then Noor opens and plays the adhan on time
- **Noor in front** → Noor shows "adhan in one minute" and plays it
- **another app in front** → *Adhan while a film is on* = **Play the adhan** (default) brings Noor over it; **Banner only** shows a banner instead if something is playing

While Noor is in the background its JavaScript is paused, so the adhan never plays twice.

## Install

You need a computer with `adb` ([platform-tools](https://developer.android.com/tools/releases/platform-tools)) on the same Wi-Fi.

1. On the TV/box: *Settings → Device preferences → About → Build*, press OK **7 times** → *Developer options* → turn on **USB debugging** / **Network debugging**.
2. Download `noor-android-<version>.apk` from [Releases](https://github.com/mhkuhail/noor-webos/releases) (or the `noor-apk` artifact of the latest CI run).
3. Install and grant the permissions (replace the IP):

```bash
adb connect 192.168.1.50
adb install -r noor-android-*.apk

# required: draw the adhan banner over apps and open Noor from the background (Android 10+)
adb shell appops set com.noor.tv SYSTEM_ALERT_WINDOW allow
# recommended: lets "Banner only" tell a film from the home screen
adb shell appops set com.noor.tv GET_USAGE_STATS allow
# optional: «Screen off» and "turn the screen off again after the adhan" put the box really to sleep (TV follows over CEC)
adb shell dpm set-active-admin com.noor.tv/.SleepAdmin
# optional: never let the system kill Noor's alarms to save power
adb shell dumpsys deviceidle whitelist +com.noor.tv
```

4. Open **نور** from the apps row once. Then Settings (🔵 Blue, or **Menu** on remotes without colour keys) → *System* → *TV capability check*, and *Adhan* → *Test adhan over YouTube*.

### HDMI boxes (STC TV box + Sony and similar)

For the box to switch the TV on, HDMI-CEC must be on at **both** ends:

- **TV** — Sony: *Settings → External Inputs → Bravia Sync Control* → on, and *TV Auto Power On* → on. (Samsung: Anynet+, LG: SIMPLINK, Philips: EasyLink.)
- **Box** — *Settings → Device preferences → Inputs (or HDMI-CEC)* → *HDMI control* on, *Device auto power on/off* on.

Test it: put the box to sleep with its remote, wait for the TV to go off, then run *Test adhan over YouTube* with 3 minutes to go
(start the test first, then sleep the box). Operator boxes sometimes hide or lock HDMI-CEC settings; if the TV stays off, the adhan still
plays through the box, so turn the TV on yourself the first time and check the box's CEC menu.

### Remote control

| Android remote | Noor |
|---|---|
| D-pad / OK | move / open |
| Back | back (Noor stays open on the home screen, like on LG) |
| **Menu** or 🔵 Blue | Settings |
| 🔴 🟢 🟡 (if present) | Morning adhkar · Evening adhkar · Al-Kahf |
| Play/Pause, ⏩ ⏪, Channel ± | Quran player |
| Home | leaves Noor — the adhan keeps working |

## Build

```bash
npm ci
bash scripts/build-android.sh      # → dist/noor-android-<version>.apk
```

Needs Node 20+, JDK 17 and the Android SDK (`ANDROID_HOME`). CI builds the APK on every push (`android` job in
`.github/workflows/build.yml`) and attaches it to each release next to the LG `.ipk`.

**Signing:** set repository secrets `NOOR_KEYSTORE_B64` (base64 of a `.jks` with alias `noor`) and `NOOR_KEYSTORE_PASSWORD`
so every build is signed with the same key and installs as an update over the previous one. Without them, CI uses a
throwaway debug key and you must uninstall before installing a newer build.

```bash
keytool -genkeypair -keystore noor-release.jks -alias noor -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 noor-release.jks | gh secret set NOOR_KEYSTORE_B64
gh secret set NOOR_KEYSTORE_PASSWORD
```

## Limits

- Android TV can't switch its panel off without being a system app; *Screen off* uses real standby only with the optional
  device admin above, otherwise Noor's black **Night mode**.
- If you never open Noor for 30 days in *Banner only* mode, the stored times run out (opening Noor once refreshes them;
  in the default mode every adhan opens Noor, which refreshes them).
- The phone page has no password: anyone on your home Wi-Fi can open it (turn it off in *Settings → System*).
