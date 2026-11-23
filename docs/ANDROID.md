# Noor on Android TV · نور على أندرويد تي في

Works on **Android TV / Google TV** (TCL, Sony Android, Xiaomi, Hisense, Philips…) and on **HDMI boxes** such as the
**STC TV box**, Chromecast with Google TV and Mi Box. A box can also turn on a TV that isn't Android (for example an older Sony).

يعمل على أجهزة **أندرويد تي في وقوقل تي في** وعلى أجهزة **HDMI** مثل **جهاز STC TV**، ويستطيع الجهاز تشغيل التلفاز القديم غير الأندرويد وقت الأذان.

**[العربية ↓](#بالعربية)**

---

## ⬇️ Download

### **[noor-android.apk](https://github.com/mhkuhail/noor-webos/releases/latest/download/noor-android.apk)** — always the newest version

---

## Install in 5 steps

You need: the TV/box, and a **Mac** (or Linux/Windows computer) on the **same Wi-Fi**.

### Step 1 — Turn on developer options on the TV / box

1. **Settings → Device Preferences → About** (on some boxes: **Settings → System → About**).
2. Go down to **Build** and press **OK 7 times**, until it says *"You are now a developer"*.
3. Press Back once. Open **Developer options** (now in Device Preferences or System).
4. Turn on **USB debugging**. If you also see **Network debugging** or **ADB over network**, turn it on too.

### Step 2 — Find the TV's IP address

**Settings → Network & Internet →** your Wi-Fi or Ethernet → note the **IP address**, for example `192.168.1.50`.

### Step 3 — Install with one command (Mac)

Open **Terminal** on the Mac and paste this, with your IP at the end:

```bash
curl -fsSL https://raw.githubusercontent.com/mhkuhail/noor-webos/v2.2.0/scripts/install-android.sh | bash -s 192.168.1.50
```

It downloads Noor, connects to the TV, installs it, gives it its permissions and opens it.

> **On the TV a window appears: "Allow USB debugging?"** → tick **Always allow from this computer** → **OK**.
> If you miss it, run the command again.

<details>
<summary><b>Windows, or doing it by hand</b></summary>

1. Download [platform-tools](https://developer.android.com/tools/releases/platform-tools) and unzip it; open a terminal in that folder.
2. Download **[noor-android.apk](https://github.com/mhkuhail/noor-webos/releases/latest/download/noor-android.apk)** into the same folder.
3. Run (use `.\adb` on Windows):

```bash
adb connect 192.168.1.50:5555          # press OK on the TV
adb install -r noor-android.apk
adb shell appops set com.noor.tv SYSTEM_ALERT_WINDOW allow
adb shell appops set com.noor.tv GET_USAGE_STATS allow
adb shell dumpsys deviceidle whitelist +com.noor.tv
adb shell dpm set-active-admin com.noor.tv/.SleepAdmin
```

</details>

### Step 4 — Set up Noor

1. Open **نور** from the apps row (it is already open if you used the one-command install).
2. Press **Menu** (or the 🔵 Blue key) → **City & times** → choose your **country** and **city**.
3. **System → TV capability check** → everything should show ✓.

### Step 5 — Only for a box (STC TV box) connected to a TV: turn on HDMI-CEC

This lets the box switch the TV on for the adhan.

| On the TV | On the box |
|---|---|
| **Sony:** Settings → External Inputs → **Bravia Sync Control** → On, and **TV Auto Power On** → On | Settings → Device Preferences → **Inputs** (or **HDMI-CEC**) → **HDMI control** → On, **Device auto power on** → On |
| Samsung: **Anynet+** · LG: **SIMPLINK** · Philips: **EasyLink** | |

**Test it:** Noor → Menu → **Adhan → Test adhan over YouTube** (3 minutes) → put the box to sleep with its remote → the TV
should turn itself back on and the adhan should play.

### Updating later

Run the same command from Step 3 again. It installs the newest version and keeps your settings.

---

## Remote control

| Button | What it does |
|---|---|
| ◀ ▲ ▼ ▶ / OK | move / open |
| **Menu** or 🔵 Blue | Settings |
| Back | back |
| 🔴 🟢 🟡 (if your remote has them) | Morning adhkar · Evening adhkar · Al-Kahf |
| Play/Pause · ⏩ ⏪ · Channel ± | Quran player |
| Home | leave Noor (the adhan still works) |

## Settings that exist only on Android

- **Adhan while a film is on:** *Play the adhan* (default: Noor comes over YouTube, a film or a channel) or *Banner only*.
- **Salawat reminder** every 45 minutes, and Surat Al-Kahf on Friday, shown over any app.
- **Messages & drawing from your phone:** open the address shown in *Settings → System* on your phone (same Wi-Fi) to send a message or draw on the TV.

## Problems

| Problem | Fix |
|---|---|
| *Not connected* | Same Wi-Fi? USB debugging ON? Did you press **OK** on the TV prompt? Run the command again. |
| `adb connect` is refused on the STC box | The box firmware blocks network debugging. Copy the APK to a USB stick, install a file manager on the box (e.g. **X-plore** from Google Play), open the APK and allow *unknown sources*. Noor works; only the adhan **over other apps** needs Step 3's permissions. |
| The adhan doesn't come over YouTube | Run the install command again (it grants the permission), then Menu → System → Adhan service log. |
| The TV doesn't turn on with the box | Step 5: HDMI-CEC must be on at **both** ends. Some operator boxes hide it under *Display & Sound*. |
| *Install failed* after an update | The script removes the old copy and installs again; re-choose your city afterwards. |

## How it works (for developers)

The Android app is the **same web app** as the LG version, inside a native WebView shell (`android/`). `android-shim.js` gives it
webOS's `PalmServiceBridge` / `PalmSystem`, and `Bridge.java` answers its `luna://` calls with Android equivalents. The web app
hands over 30 days of prayer times; `Scheduler.java` keeps the next one armed as an Android alarm. One minute before each adhan
`AlarmReceiver.java` wakes the box (HDMI-CEC turns the TV on), brings Noor to the front, or shows a banner. Phone messages, drawing
and the salawat reminder are adapted from [Noor TV](https://github.com/majedphotos/noor-tv) by majedphotos (MIT).

Build: `npm ci && bash scripts/build-android.sh` → `dist/noor-android.apk` (Node 20+, JDK 17, Android SDK). CI builds it on every
push and attaches it to each release. To sign every build with the same key, add the repository secrets `NOOR_KEYSTORE_B64`
(base64 of a `.jks`, alias `noor`) and `NOOR_KEYSTORE_PASSWORD`.

---

## بالعربية

### ⬇️ التنزيل: **[noor-android.apk](https://github.com/mhkuhail/noor-webos/releases/latest/download/noor-android.apk)** (آخر إصدار دائمًا)

تحتاج: التلفاز أو الجهاز، و**ماك** (أو كمبيوتر) على **نفس شبكة الواي فاي**.

**١. تفعيل خيارات المطوّر على الجهاز**
الإعدادات ← تفضيلات الجهاز ← حول (وفي بعض الأجهزة: الإعدادات ← النظام ← حول) ← انزل إلى **Build** واضغط **OK سبع مرات**.
ارجع خطوة ← **خيارات المطوّر** ← فعّل **تصحيح USB** (و**التصحيح عبر الشبكة** إن وُجد).

**٢. معرفة عنوان IP**
الإعدادات ← الشبكة والإنترنت ← اتصالك ← انسخ **عنوان IP** مثل `192.168.1.50`.

**٣. التثبيت بأمر واحد من الماك**
افتح **Terminal** والصق السطر التالي مع وضع عنوان جهازك في آخره:

```bash
curl -fsSL https://raw.githubusercontent.com/mhkuhail/noor-webos/v2.2.0/scripts/install-android.sh | bash -s 192.168.1.50
```

ستظهر على التلفاز رسالة **«السماح بتصحيح USB؟»** ← اختر **السماح دائمًا** ← **موافق**.
الأمر ينزّل نور ويثبّته ويعطيه الصلاحيات ويفتحه.

**٤. ضبط نور**
اضغط **Menu** (أو الزر الأزرق) ← المدينة والمواقيت ← اختر الدولة والمدينة. ثم النظام ← **فحص قدرات التلفاز** ← كل شيء ✓.

**٥. لجهاز STC TV المتصل بتلفاز: فعّل HDMI-CEC**
- **في تلفاز سوني:** الإعدادات ← المداخل الخارجية ← **Bravia Sync Control** ← تشغيل، و**التشغيل التلقائي للتلفاز** ← تشغيل.
- **في الجهاز:** الإعدادات ← تفضيلات الجهاز ← **المداخل / HDMI-CEC** ← **التحكم عبر HDMI** ← تشغيل.

**التجربة:** نور ← Menu ← الأذان ← **تجربة الأذان فوق يوتيوب** (بعد ٣ دقائق) ← أطفئ الجهاز بالريموت ← يجب أن يعمل التلفاز وحده ويُرفع الأذان.

**التحديث لاحقًا:** شغّل نفس أمر الخطوة ٣ مرة أخرى.

**إذا رفض الجهاز الاتصال:** انسخ الملف إلى فلاشة، وثبّت مدير ملفات على الجهاز (مثل **X-plore**) وافتح الملف واسمح بالمصادر غير المعروفة.
يعمل نور بذلك، لكن ظهور الأذان **فوق التطبيقات الأخرى** يحتاج الأوامر في الخطوة ٣.
