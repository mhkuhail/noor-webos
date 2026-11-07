# Changelog

## 2.0.1
- When the service brings Noor back over YouTube/Netflix, Noor now sets its own timer for the exact adhan time (no longer relies only on the 1-second clock).
- If the TV blocks automatic sound, Noor retries and then shows «اضغط OK لتشغيل صوت الأذان» — OK plays the adhan instead of closing it.
- Every adhan step is written to *Settings → System → Adhan service log* (launch, adhan shown, audio playing / blocked / error).

## 2.0.0
- **Background service fixed on webOS 4.x.** LG TVs with webOS 4.x run JS services on Node.js 0.12.2 (ES5 only); the service
  crashed at start-up, so adhan/iqamah notifications never reached YouTube/Netflix. It is now compiled to ES5 with polyfills
  (`scripts/service-es5.cjs`) and verified to parse as pure ES5.
- **49 cities in 19 countries** (Saudi Arabia, Türkiye, UAE, Kuwait, Qatar, Bahrain, Oman, Jordan, Iraq, Yemen, Syria, Palestine,
  Lebanon, Egypt, Pakistan, Malaysia, Indonesia, UK, Germany), each with its calculation method; countries with daylight saving
  follow the TV's time zone. Calculation method can be overridden.
- **New Settings** with sections: City & prayer times · Adhan · Iqamah · Display & language · Holy Quran · System & support.
- Service log shows local times.

## 1.9.0
- **Iqamah alerts**: after each adhan the home screen counts down to the iqamah («إقامة العشاء بعد 12:30»), then shows a banner, plays a short tone and posts a TV notification (also over YouTube/Netflix via the background service).
- Default intervals after the adhan: Fajr 22 · Dhuhr 17 · Asr 17 · Maghrib 7 · Isha 17 min (no iqamah alert for Jumu'ah). Each is adjustable in Settings (3–45 min); the alert and tone can be switched off.
- The iqamah notification also appears while watching YouTube/Netflix (posted by Noor itself, or by the background service restarted by the TV's Activity Manager); it does not interrupt the video.
- Emoji removed from notifications (webOS 4 has no emoji font).

## 1.8.0
- **Adhan while watching YouTube/Netflix fixed.** Noor now:
  - brings itself to the front one minute before the adhan when it is in the background (same permission used to open YouTube),
  - shows a TV notification over the other app («يحين بعد دقيقة أذان …» / «حان الآن موعد أذان …»),
  - registers every prayer with the TV's Activity Manager so the background service is restarted at T-60 s even if webOS stopped it,
  - keeps a heartbeat subscription so webOS doesn't stop the service while Noor is alive.
- New **Settings → Adhan service log** and two new capability-check rows (notification, system scheduling).

## 1.7.3
- Wallpapers set from JavaScript — fixes missing backgrounds on webOS 4.x (Chromium 53 ignores `url()` in CSS variables).

## 1.7.2
- *Screen off* falls back to the background service, then to Noor's *Night mode*.
- Apps screen shows a built-in list instantly; real list loaded when the TV allows it.

## 1.7.0
- YouTube card and Apps launcher.

## 1.6.0
- Background JS service on the TV: brings Noor to the front at prayer time, wakes the screen, renews Developer Mode.
- *Screen off* card, capability check, Back no longer exits the app.

## 1.5.0
- Launch parameters from the network helper (`noor-helper`: Wake-on-LAN + SSAP).

## 1.4.x
- Noor TV design: wallpapers (Zakhrafa, Masjid at night, Times of day), glass dock, coloured cards, adhan banner.
- Larger countdown and prayer times; new gear icon; brighter backgrounds on inner screens.

## 1.3.0
- Adhan recordings bundled in the app (loudness-normalised).

## 1.2.0
- Per-prayer adhan source with preview.

## 1.1.0
- Full Quran with Sheikh Badr Al-Turki; Turkish adhan with a makam per prayer.

## 1.0.0
- First release: prayer times, adhan, adhkar, Al-Kahf, reminders, weather, themes, Arabic/English.
