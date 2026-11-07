# Installation guide

Noor runs on **LG webOS 4.0+** (2018 and newer) in LG's official **Developer Mode**. Tested design target: webOS 4.5 (Chromium 53).

## 1. Enable Developer Mode on the TV

1. Create a free account at <https://webostv.developer.lge.com/>.
2. On the TV open **LG Content Store**, search for **Developer Mode** and install it.
3. Open it, sign in, switch **Dev Mode Status** on. The TV restarts.
4. Open Developer Mode again and switch **Key Server** on. Note the **IP address** and **Passphrase**.

> The session lasts up to ~1000 hours. Noor renews it automatically once a day (Settings → *Renew Developer Mode automatically*).
> LG also disables Developer Mode if you sign in with the same account on another TV, or after 10 reboots without internet.

## 2. Install webOS Dev Manager on your computer

Download it from <https://github.com/webosbrew/dev-manager-desktop/releases> (Windows, macOS, Linux).

**macOS:** the app is not notarised. If macOS says *“Apple could not verify…”*: click **Done**, then
System Settings → Privacy & Security → **Open Anyway**. Or in Terminal:

```bash
xattr -cr "/Applications/webOS Dev Manager.app"
```

Add the TV: **Add device → Use Developer Mode → Skip →** IP address + Passphrase.

## 3. Install Noor

Download `com.noor.webos_<version>_all.ipk` from the Releases page (or build it — see the main README),
then in Dev Manager click **Install** (top right) and choose the file. Updating works the same way and keeps your settings.

### Command line alternative

```bash
npm install -g @webos-tools/cli
ares-setup-device                 # add: name "tv", IP, port 9922, user prisoner
ares-novacom --device tv --getkey # enter the Passphrase
ares-install --device tv com.noor.webos_<version>_all.ipk
```

## 4. First run

1. Open **Noor** from the TV's app list.
2. 🔵 **Blue** → Settings: city (Riyadh / Makkah / Istanbul), language, theme, 12/24-hour clock.
3. Settings → **TV capability check**. Each row shows ✓ or ✗ — this tells you which features your TV allows in Developer Mode.
4. Settings → **Test adhan**.
5. Open Al-Kahf once while online so the Quran text is cached.

## 5. Adhan recordings

The five adhan recordings are in `app/audio/` and are bundled automatically. To use other recordings:

- **Before building:** put `ezan-fajr.mp3`, `ezan-dhuhr.mp3`, `ezan-asr.mp3`, `ezan-maghrib.mp3`, `ezan-isha.mp3` in `app/audio/` and run `npm run package`.
- **After installing:** Dev Manager → **Files** → `/media/developer/apps/usr/palm/applications/com.noor.webos/audio/` → upload. (Lost on reinstall.)

Per prayer, Settings also lets you choose an online recording from assabile.com and preview it with **OK**.

## 6. Night-time

Use Noor's **«إطفاء الشاشة» / Screen off** card instead of the remote's power button — see [ALWAYS-ON.md](ALWAYS-ON.md).
