# noor-helper — تشغيل التلفاز للأذان تلقائيًا

يعمل على جهاز يبقى مستيقظًا في شبكة المنزل (الماك الآن، أو Raspberry Pi لاحقًا).
قبل كل صلاة بدقيقة: يوقظ التلفاز عبر الشبكة (Wake-on-LAN) ← يفتح تطبيق Noor ← يُرفع الأذان في وقته بالضبط ← يُطفأ التلفاز بعد 7 دقائق إن كان مطفأً قبلها (ولا يُطفأ إن كان أحد يشاهد).
وإن كان التلفاز يعمل على Netflix أو غيره، يُفتح Noor فوقه عند الأذان.

## 1) إعدادات التلفاز (مرة واحدة)
- Settings → General → Devices → External Devices (أو Mobile Connection) → **TV On With Mobile / Turn on via Wi-Fi = On**
- يُفضَّل توصيل التلفاز **بكابل شبكة**. إن لم يستيقظ بالواي فاي جرّب إيقاف **Quick Start+** من: General → Devices → TV Management.
- اعرف **عنوان IP** للتلفاز: Settings → Network → (Wired/Wi-Fi) → Advanced. ويُستحسن تثبيته (DHCP reservation) من راوتر هواوي أو Meraki.

## 2) على الماك
```bash
cd noor-webos/helper
cp config.example.json config.json
nano config.json            # ضع tvIp (و tvMac اختياري)
./install-mac.sh            # يثبت ويشغل الخدمة في الخلفية
node noor-helper.mjs pair   # والتلفاز يعمل: اقبل طلب الاتصال على الشاشة
node noor-helper.mjs times  # يعرض مواعيد اليوم
node noor-helper.mjs test asr   # أطفئ التلفاز بالريموت ثم جرّب: يجب أن يعمل ويُرفع الأذان
```
يحتاج Node.js 20 أو أحدث (https://nodejs.org).
الماك يجب أن يبقى مستيقظًا وموصولًا بالكهرباء والغطاء مفتوح — الخدمة تمنع النوم تلقائيًا (caffeinate) أثناء الشحن.

## 3) لاحقًا على Raspberry Pi (مستحسن، يعمل 24/7 بـ ~3 واط)
انسخ المجلد إلى الـPi ثم: `./install-linux.sh` ثم `node noor-helper.mjs pair`.

## تجديد وضع المطوّر تلقائيًا
مرة يوميًا، بعد انتهاء أحد الأذانات، يشغّل المساعد تطبيق Developer Mode بأمر التمديد الرسمي من LG
(`com.palmdts.devmode` مع `extend=true`) ثم يعود إلى Noor أو يطفئ التلفاز. لا يقاطع أحدًا يشاهد —
إن كان التلفاز مشغولًا بتطبيق آخر ينتظر الأذان التالي. ولتجديده يدويًا الآن: `node noor-helper.mjs renew`.
ملاحظة من LG: يتوقف وضع المطوّر أيضًا إذا سجّلت الدخول بنفس الحساب على تلفاز آخر، أو بعد 10 إعادات تشغيل بدون إنترنت.

## config.json
| المفتاح | المعنى |
|---|---|
| tvIp | عنوان التلفاز في الشبكة |
| tvMac | عنوان MAC (اختياري: يُحفظ تلقائيًا بعد أول اقتران) |
| city | riyadh / makkah / istanbul (أو lat, lng, method) — نفس حساب التطبيق |
| wakeSecondsBefore | كم ثانية قبل الأذان يُوقظ التلفاز (60) |
| adhanVolume | مستوى الصوت عند الأذان (احذفه لترك الصوت كما هو) |
| turnOffAfterMinutes | يطفئ التلفاز بعد الأذان إن كان مطفأً قبله (0 = لا يطفئه) |
| prayers | الصلوات المفعّلة |
| renewDevMode | تجديد وضع المطوّر تلقائيًا (true) |
| renewEveryHours | كل كم ساعة يُجدَّد (24) |

السجل: `noor-helper.log` بجانب الملف.
