<div align="center">

# نور · Noor for webOS

**Prayer times, adhan, the full Quran and daily adhkar — on any LG webOS TV.**

مواقيت الصلاة والأذان والقرآن الكريم كاملًا والأذكار — على تلفزيونات LG بنظام webOS

[Install](#install) · [Features](#features) · [Build from source](#build-from-source) · [Docs](docs/) · [العربية](#بالعربية)

<img src="docs/screenshots/zakhrafa.jpg" width="49%"> <img src="docs/screenshots/masjid.jpg" width="49%">

</div>

Noor is an open-source TV app inspired by [Noor TV](https://github.com/majedphotos/noor-tv) (Android TV),
rebuilt from scratch for **LG webOS**, which cannot run Android apps. It runs in LG's official
**Developer Mode** — no rooting required.

## Features

| | |
|---|---|
| 🕌 **Prayer times** | Calculated on the TV (works offline) with [adhan-js](https://github.com/batoulapps/adhan-js): Umm al-Qura for Riyadh/Makkah, Diyanet for Istanbul. Big countdown to the next prayer, Jumu'ah on Fridays. |
| 📢 **Adhan** | Plays automatically at every prayer — a different recording (and Turkish makam) per prayer: Saba, Uşşak, Rast, Segâh, Hicaz. |
| ⏰ **Always on** | A background service on the TV brings Noor to the front at prayer time, even over YouTube/Netflix, and wakes the screen from *Screen off* / *Night mode*. |
| 📖 **Full Quran** | All 114 surahs recited by **Sheikh Badr Al-Turki** (Hafs), Uthmani text that follows the recitation, continuous play, resume. |
| 🤲 **Adhkar** | Morning & evening adhkar with a tasbih counter; Ayat al-Kursi and the Mu'awwidhat loaded from a verified Quran API. |
| 🔔 **Reminders** | Friday (Al-Kahf, salawat), the White Days, Monday/Thursday fasting, adhkar times. |
| 🎨 **Themes** | Noor TV design: *Zakhrafa*, *Masjid at night*, *Times of day* (changes with Fajr/Asr/Isha). |
| 📺 **Launcher** | YouTube and all TV apps from Noor's dock. |
| 🛠 **Self-maintaining** | Renews Developer Mode automatically; built-in capability check shows what your TV allows. |
| 🌐 **Arabic / English** | RTL-first interface, Hijri + Gregorian dates, weather (Open-Meteo). |

<img src="docs/screenshots/adhan.jpg" width="32%"> <img src="docs/screenshots/apps.jpg" width="32%"> <img src="docs/screenshots/settings.jpg" width="32%">

## Install

**Requirements:** LG TV with webOS 4.0 or later (2018+), a free [LG developer account](https://webostv.developer.lge.com/), a computer on the same network.

1. On the TV: install **Developer Mode** from the LG Content Store, sign in, turn on *Dev Mode Status* (the TV restarts), then turn on *Key Server*.
2. On the computer: install [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop/releases) and add the TV (IP + passphrase from the Developer Mode app).
3. Download `com.noor.webos_<version>_all.ipk` from [Releases](../../releases) → Dev Manager → **Install**.
4. Open **Noor** on the TV → 🔵 Blue → *TV capability check*.

Full guide with screenshots and macOS notes: **[docs/INSTALL.md](docs/INSTALL.md)**.

### Remote control

| Button | Action |
|---|---|
| ◀ ▶ / OK | Move along the dock / open |
| 🔴 Red · 🟢 Green · 🟡 Yellow · 🔵 Blue | Morning adhkar · Evening adhkar · Al-Kahf · Settings |
| ▲ ▼ | Scroll Quran / adhkar · previous/next surah in the player |
| ◀ ▶ in the player | Seek 15 s |
| Back | Return (on the home screen Noor stays open so the adhan keeps working) |

### Keeping the adhan working

Nothing runs while an LG TV is in standby, so **don't use the power button** at night — use Noor's
**«إطفاء الشاشة» / Screen off** card. Noor turns the screen off (or shows a black *Night mode* if your TV
doesn't allow it), keeps running, and plays the adhan on time. Details and the optional network helper that
can wake a TV from full standby: **[docs/ALWAYS-ON.md](docs/ALWAYS-ON.md)**.

## Build from source

```bash
git clone https://github.com/<you>/noor-webos.git && cd noor-webos
npm install
# optional: put your adhan MP3s in app/audio/ (see app/audio/README.md)
npm run package            # → dist/com.noor.webos_<version>_all.ipk
npm run install-tv         # ares-install to the device named "tv" (ares-setup-device)
```

Requires Node.js 20+. `ffmpeg` is optional (loudness-normalises the adhan files).
Architecture and code tour: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

```
src/        TV app (ES2015 → bundled for Chromium 53)    service/   background JS service (Node 8)
app/        HTML, CSS, icons, wallpapers, chime          helper/    optional Wake-on-LAN helper (Mac / Raspberry Pi)
scripts/    build                                         docs/      documentation and screenshots
```

## Troubleshooting

Wallpapers missing, *apps list timeout*, *screen off not allowed*, Developer Mode expired, Wake-on-LAN —
see **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**.

## Credits & license

Code: [MIT](LICENSE). Design and wallpapers adapted from [Noor TV](https://github.com/majedphotos/noor-tv) (MIT).
Prayer times: adhan-js · Quran text: [alquran.cloud](https://alquran.cloud) · Recitation: [mp3quran.net](https://mp3quran.net) ·
Weather: [Open-Meteo](https://open-meteo.com) · Fonts: Cairo & Amiri (SIL OFL). Full list: [NOTICE.md](NOTICE.md).

Not affiliated with LG Electronics. *webOS* and *LG* are trademarks of LG Electronics.

---

## بالعربية

**نور** تطبيق مفتوح المصدر لتلفزيونات LG بنظام webOS، مستوحى من مشروع Noor TV لأجهزة Android TV،
ومبني من الصفر لأن webOS لا يشغّل تطبيقات أندرويد. يعمل في «وضع المطوّر» الرسمي من LG دون الحاجة إلى روت.

**المزايا:** مواقيت صلاة محسوبة على التلفاز (أم القرى / ديانت) · أذان تلقائي لكل صلاة بمقام مختلف (صبا، عشاق، راست، سيكاه، حجاز) ·
خدمة خلفية تُظهر نور فوق يوتيوب ونتفليكس وقت الأذان وتوقظ الشاشة · القرآن الكريم كاملًا بصوت الشيخ بدر التركي مع النص العثماني ·
أذكار الصباح والمساء مع عدّاد · تذكير الجمعة والأيام البيض وصيام الاثنين والخميس · ثلاث خلفيات (زخرفة، مسجد الليل، أوقات اليوم) ·
تشغيل يوتيوب وكل تطبيقات التلفاز · تجديد وضع المطوّر تلقائيًا · فحص قدرات التلفاز.

**التثبيت:** فعّل وضع المطوّر على التلفاز ← ثبّت webOS Dev Manager على الكمبيوتر ← نزّل ملف ‎.ipk من صفحة Releases ← Install.
**مهم:** لا تطفئ التلفاز بزر الطاقة ليلًا؛ استخدم بطاقة «إطفاء الشاشة» في نور ليبقى الأذان يعمل.
**ملفات الأذان** غير مضمّنة في المستودع لحقوق النشر — ضع ملفاتك في `app/audio/` قبل البناء.

الدليل الكامل: [docs/INSTALL.md](docs/INSTALL.md) · حل المشكلات: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
