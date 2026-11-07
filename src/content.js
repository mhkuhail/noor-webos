// Static content: UI strings, adhkar. Quranic text is NOT typed here — it is
// fetched from api.alquran.cloud (Uthmani script) and cached on the TV, so
// every ayah shown comes from a verified Mushaf source.

export const CITIES = {
  riyadh:   { ar: 'الرياض',  en: 'Riyadh',   lat: 24.7136, lng: 46.6753, tz: 180, method: 'UmmAlQura' },
  istanbul: { ar: 'إسطنبول', en: 'Istanbul', lat: 41.0082, lng: 28.9784, tz: 180, method: 'Turkey' },
  makkah:   { ar: 'مكة المكرمة', en: 'Makkah', lat: 21.4225, lng: 39.8262, tz: 180, method: 'UmmAlQura' },
};

export const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const T = {
  ar: {
    quran: 'القرآن الكريم', reciter: 'بدر التركي', surahWord: 'سورة', ayahsWord: 'آية',
    indexHint: '◀▶▲▼ للتنقل · OK للتشغيل · رجوع للعودة',
    playerHint: 'OK تشغيل/إيقاف · ◀▶ ١٥ ثانية · ▲▼ سورة سابقة/تالية',
    audioErr: 'تعذّر تشغيل التلاوة — تحقق من اتصال الإنترنت',
    continuous: 'التلاوة المتواصلة (السورة التالية تلقائيًا)', follow: 'تحريك النص مع التلاوة',
    adhanStyle: 'نمط الأذان', styleTr: 'تركي — مقام لكل صلاة', styleOne: 'صوت واحد لكل الصلوات',
    maqamWord: 'مقام', adhanFor: 'أذان', preview: 'OK للاستماع', previewing: '♪ يُشغَّل الآن — OK للإيقاف', found: 'موجود ✓', missing: 'غير موجود — يُستخدم البديل',
    maqam: { fajr: 'صبا', dhuhr: 'عشاق', asr: 'راست', maghrib: 'سيكاه', isha: 'حجاز' },
    fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء', jumuah: 'الجمعة',
    next: 'الصلاة القادمة', in: 'بعد',
    morning: 'أذكار الصباح', evening: 'أذكار المساء', kahf: 'سورة الكهف', baqarah: 'سورة البقرة', mulk: 'سورة الملك', settings: 'الإعدادات',
    readerHint: '▲▼ للتمرير · رجوع للعودة', dhikrHint: '▲▼ للتنقل · OK للعدّ · رجوع للعودة',
    settingsHint: '▲▼ للتنقل · ◀▶ للتغيير · رجوع للحفظ',
    loading: 'جارِ التحميل…', offline: 'تعذّر التحميل — تأكد من اتصال التلفاز بالإنترنت ثم أعد المحاولة',
    city: 'المدينة', lang: 'اللغة', theme: 'المظهر', clock: 'نظام الساعة', adhanOn: 'الأذان عند دخول الوقت',
    hijriAdj: 'تعديل التاريخ الهجري', oled: 'حماية شاشة OLED (تحريك + تعتيم ليلي)', test: 'تجربة الأذان', exit: 'الخروج من التطبيق',
    on: 'تشغيل', off: 'إيقاف', h24: '24 ساعة', h12: '12 ساعة', days: 'يوم', run: 'تشغيل',
    themes: { zakhrafa: 'زخرفة', masjid: 'مسجد الليل', awqat: 'أوقات اليوم' }, after: 'بعد', jumuahMubarak: 'جمعة مباركة', salam: 'السلام عليكم', adhkarSub: 'حصن المسلم',
    adhanSub: 'حان الآن موعد أذان', adhanSoon: 'يحين بعد دقيقة أذان',
    apps: 'التطبيقات', appsSub: 'كل تطبيقات التلفاز', youtube: 'YouTube', youtubeSub: 'يوتيوب', appsHint: '◀▶▲▼ للتنقل · OK للفتح · رجوع للعودة', appsFail: 'تعذّر قراءة قائمة التطبيقات', openFail: 'تعذّر فتح التطبيق', iqamahIn: 'إقامة', iqamahNow: 'حان موعد إقامة صلاة', iqamahOn: 'تنبيه الإقامة', iqamahSound: 'صوت تنبيه عند الإقامة', iqamahFor: 'الإقامة بعد أذان', minWord: 'دقيقة', diag: 'سجل خدمة الأذان', diagTitle: 'سجل خدمة الأذان', toastSoon: 'يحين بعد دقيقة أذان', toastNow: 'حان الآن موعد أذان', cap_toast: 'إشعار فوق التطبيقات الأخرى', cap_bg: 'جدولة الأذان في نظام التلفاز', screenoff: 'إطفاء الشاشة', screenoffSub: 'ويبقى الأذان يعمل', screenOffFail: 'لم يسمح التلفاز بإطفاء الشاشة — افتح فحص القدرات من الإعدادات', nightHint: 'وضع الليل — اضغط أي زر للعودة · سيُرفع الأذان في وقته', cap_screenSvc: 'إطفاء الشاشة عبر الخدمة الخلفية', capNight: 'إن لم يُسمح بإطفاء الشاشة: يستخدم نور «وضع الليل» (شاشة سوداء) ويُرفع الأذان في وقته دون أي صلاحية.',
    reOff: 'إعادة إطفاء الشاشة بعد الأذان', renewDev: 'تجديد وضع المطوّر تلقائيًا', caps: 'فحص قدرات التلفاز', capsHint: 'رجوع للعودة',
    capsTitle: 'فحص قدرات التلفاز', capRunning: 'جارِ الفحص…', capOk: 'يعمل', capNo: 'غير مسموح',
    cap_bridge: 'الاتصال بنظام التلفاز', cap_service: 'خدمة نور الخلفية', cap_power: 'قراءة حالة الشاشة', cap_screen: 'إطفاء وتشغيل الشاشة (ستنطفئ 3 ثوانٍ)',
    cap_launch: 'فتح نور فوق التطبيقات الأخرى', cap_devmode: 'تجديد وضع المطوّر',
    capAllOk: '✓ كل شيء يعمل: استخدم «إطفاء الشاشة» بدل زر الطاقة، وسيُرفع الأذان تلقائيًا.',
    capSome: 'بعض الصلاحيات غير متاحة في وضع المطوّر على هذا التلفاز — أرسل لي صورة هذه الشاشة.',
    serviceOn: 'خدمة الأذان تعمل', serviceOff: 'خدمة الأذان متوقفة', adhanHint: 'اضغط أي زر لإيقاف الأذان',
    times: 'مرات', once: 'مرة',
    remKahf: 'يوم الجمعة — لا تنسَ قراءة سورة الكهف (الزر الأصفر)',
    remSalawat: 'أكثروا من الصلاة على النبي ﷺ يوم الجمعة: اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    remWhiteTomorrow: 'غدًا أول الأيام البيض (١٣–١٥) — صيامها سنة',
    remWhiteToday: 'اليوم من الأيام البيض — صيامها سنة',
    remMonThu: function (d) { return 'غدًا ' + d + ' — صيامه سنة'; }, mon: 'الاثنين', thu: 'الخميس',
    remMorning: 'وقت أذكار الصباح (الزر الأحمر)', remEvening: 'وقت أذكار المساء (الزر الأخضر)',
    remDefault: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    reminderTag: 'تذكير',
    wx: { 0:'صحو', 1:'غائم جزئيًا', 2:'غائم جزئيًا', 3:'غائم', 45:'ضباب', 48:'ضباب', 51:'رذاذ', 53:'رذاذ', 55:'رذاذ', 61:'مطر خفيف', 63:'مطر', 65:'مطر غزير', 71:'ثلج', 73:'ثلج', 75:'ثلج كثيف', 80:'زخات مطر', 81:'زخات مطر', 82:'زخات غزيرة', 95:'عاصفة رعدية', 96:'عاصفة رعدية', 99:'عاصفة رعدية' },
    weekdays: ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
    months: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    hmonths: ['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'],
    am: 'ص', pm: 'م', hSuffix: 'هـ',
  },
  en: {
    quran: 'Holy Quran', reciter: 'Badr Al-Turki', surahWord: 'Surah', ayahsWord: 'ayahs',
    indexHint: '◀▶▲▼ move · OK play · Back to return',
    playerHint: 'OK play/pause · ◀▶ 15s · ▲▼ previous/next surah',
    audioErr: 'Could not play the recitation — check the internet connection',
    continuous: 'Continuous recitation (auto next surah)', follow: 'Move text with the recitation',
    adhanStyle: 'Adhan style', styleTr: 'Turkish — maqam per prayer', styleOne: 'Single adhan for all',
    maqamWord: 'Makam', adhanFor: 'Adhan:', preview: 'OK to preview', previewing: '♪ Playing — OK to stop', found: 'found ✓', missing: 'missing — using fallback',
    maqam: { fajr: 'Saba', dhuhr: 'Uşşak', asr: 'Rast', maghrib: 'Segâh', isha: 'Hicaz' },
    fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', jumuah: "Jumu'ah",
    next: 'Next prayer', in: 'in',
    morning: 'Morning adhkar', evening: 'Evening adhkar', kahf: 'Surah Al-Kahf', baqarah: 'Surah Al-Baqarah', mulk: 'Surah Al-Mulk', settings: 'Settings',
    readerHint: '▲▼ scroll · Back to return', dhikrHint: '▲▼ move · OK to count · Back to return',
    settingsHint: '▲▼ move · ◀▶ change · Back to save',
    loading: 'Loading…', offline: 'Could not load — check the TV internet connection and try again',
    city: 'City', lang: 'Language', theme: 'Theme', clock: 'Clock format', adhanOn: 'Adhan at prayer time',
    hijriAdj: 'Hijri date adjustment', oled: 'OLED protection (pixel shift + night dim)', test: 'Test adhan', exit: 'Exit app',
    on: 'On', off: 'Off', h24: '24-hour', h12: '12-hour', days: 'days', run: 'Run',
    themes: { zakhrafa: 'Zakhrafa', masjid: 'Masjid at night', awqat: 'Times of day' }, after: 'in', jumuahMubarak: "Jumu'ah Mubarak", salam: 'Assalamu alaikum', adhkarSub: 'Hisn al-Muslim',
    adhanSub: 'It is now time for', adhanSoon: 'In one minute: adhan of',
    apps: 'Apps', appsSub: 'All TV apps', youtube: 'YouTube', youtubeSub: 'YouTube', appsHint: '◀▶▲▼ move · OK open · Back to return', appsFail: 'Could not read the app list', openFail: 'Could not open the app', iqamahIn: 'Iqamah of', iqamahNow: 'Iqamah time for', iqamahOn: 'Iqamah alert', iqamahSound: 'Tone at iqamah', iqamahFor: 'Iqamah after adhan:', minWord: 'min', diag: 'Adhan service log', diagTitle: 'Adhan service log', toastSoon: 'In one minute: adhan of', toastNow: 'It is now time for the adhan of', cap_toast: 'Notification over other apps', cap_bg: 'Adhan scheduled in the TV system', screenoff: 'Screen off', screenoffSub: 'adhan stays on', screenOffFail: 'The TV did not allow turning the screen off — run the capability check in Settings', nightHint: 'Night mode — press any key to return · the adhan will still play on time', cap_screenSvc: 'Screen off via background service', capNight: 'If screen-off is not allowed, Noor uses Night mode (black screen) and the adhan still plays on time with no special permission.',
    reOff: 'Turn the screen off again after the adhan', renewDev: 'Renew Developer Mode automatically', caps: 'TV capability check', capsHint: 'Back to return',
    capsTitle: 'TV capability check', capRunning: 'Checking…', capOk: 'works', capNo: 'not allowed',
    cap_bridge: 'Access to the TV system', cap_service: 'Noor background service', cap_power: 'Read screen state', cap_screen: 'Screen off / on (screen goes dark for 3 s)',
    cap_launch: 'Open Noor over other apps', cap_devmode: 'Developer Mode renewal',
    capAllOk: '✓ Everything works: use “Screen off” instead of the power button and the adhan will play automatically.',
    capSome: 'Some permissions are not available in Developer Mode on this TV — send me a photo of this screen.',
    serviceOn: 'Adhan service running', serviceOff: 'Adhan service stopped', adhanHint: 'Press any button to stop the adhan',
    times: 'times', once: 'once',
    remKahf: "It's Friday — remember to read Surah Al-Kahf (yellow button)",
    remSalawat: 'Send abundant salawat upon the Prophet ﷺ on Friday',
    remWhiteTomorrow: 'Tomorrow begins the White Days (13–15) — sunnah fasting',
    remWhiteToday: 'Today is one of the White Days — sunnah fasting',
    remMonThu: function (d) { return 'Tomorrow is ' + d + ' — sunnah fasting'; }, mon: 'Monday', thu: 'Thursday',
    remMorning: 'Time for the morning adhkar (red button)', remEvening: 'Time for the evening adhkar (green button)',
    remDefault: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    reminderTag: 'Reminder',
    wx: { 0:'Clear', 1:'Partly cloudy', 2:'Partly cloudy', 3:'Cloudy', 45:'Fog', 48:'Fog', 51:'Drizzle', 53:'Drizzle', 55:'Drizzle', 61:'Light rain', 63:'Rain', 65:'Heavy rain', 71:'Snow', 73:'Snow', 75:'Heavy snow', 80:'Showers', 81:'Showers', 82:'Heavy showers', 95:'Thunderstorm', 96:'Thunderstorm', 99:'Thunderstorm' },
    weekdays: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    hmonths: ['Muharram','Safar','Rabi al-Awwal','Rabi al-Thani','Jumada al-Ula','Jumada al-Akhirah','Rajab',"Sha'ban",'Ramadan','Shawwal',"Dhu al-Qa'dah",'Dhu al-Hijjah'],
    am: 'AM', pm: 'PM', hSuffix: 'AH',
  },
};

// Adhkar. Items with `ayah` or `surah` are loaded from the Quran API.
// `when`: 'm' morning only, 'e' evening only, undefined = both.
// For texts that differ between morning/evening, `m` and `e` hold each version.
export const ADHKAR = [
  { ayah: '2:255', count: 1, label: { ar: 'آية الكرسي', en: 'Ayat al-Kursi' } },
  { surah: 112, count: 3, label: { ar: 'سورة الإخلاص', en: 'Al-Ikhlas' } },
  { surah: 113, count: 3, label: { ar: 'سورة الفلق', en: 'Al-Falaq' } },
  { surah: 114, count: 3, label: { ar: 'سورة الناس', en: 'An-Nas' } },
  {
    count: 1, src: 'مسلم',
    m: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
    e: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
  },
  {
    count: 1, src: 'الترمذي',
    m: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
    e: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
  },
  {
    count: 1, src: 'البخاري', label: { ar: 'سيد الاستغفار', en: 'Sayyid al-Istighfar' },
    t: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
  },
  { count: 3, src: 'أبو داود والترمذي', t: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ' },
  { count: 3, src: 'أبو داود والترمذي', t: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا' },
  { count: 3, src: 'أبو داود', t: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ' },
  { count: 7, src: 'أبو داود', t: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ' },
  { count: 1, src: 'النسائي والحاكم', t: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ' },
  { count: 3, src: 'مسلم', when: 'e', t: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ' },
  { count: 10, src: 'متفق عليه', t: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ' },
  { count: 100, src: 'مسلم', t: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ' },
  { count: 10, src: 'الطبراني', t: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ' },
];

// Badr Al-Turki — Hafs 'an 'Asim, one MP3 per surah (mp3quran.net)
export const RECITER_URL = 'https://server10.mp3quran.net/bader/Rewayat-Hafs-A-n-Assem/';

// Turkish tradition: one makam per prayer (Saba, Uşşak, Rast, Segâh, Hicaz).
// Put recordings in the app folder with these names; missing ones fall back to adhan.mp3, then chime.mp3.
export const EZAN_FILES = { fajr: 'audio/ezan-fajr.mp3', dhuhr: 'audio/ezan-dhuhr.mp3', asr: 'audio/ezan-asr.mp3', maghrib: 'audio/ezan-maghrib.mp3', isha: 'audio/ezan-isha.mp3' };

// Adhan recordings streamed from assabile.com (direct download links).
// 'local' = the per-prayer file in the app folder (ezan-<prayer>.mp3).
export const ADHAN_SOURCES = [
  { id: 'local', url: null, ar: 'الأذان المدمج في التطبيق', en: 'Built-in adhan (in the app)' },
  { id: 'as68',  url: 'https://www.assabile.com/download/adhan/68',  ar: 'أنور دومان — تركيا', en: 'Anuar Duman — Türkiye' },
  { id: 'as247', url: 'https://www.assabile.com/download/adhan/247', ar: 'مؤذن تركي (٢:٥٨)', en: 'Turkish muezzin (2:58)' },
  { id: 'as248', url: 'https://www.assabile.com/download/adhan/248', ar: 'مؤذن تركي — قصير (٠:٤٧)', en: 'Turkish muezzin — short (0:47)' },
  { id: 'as54',  url: 'https://www.assabile.com/download/adhan/54',  ar: 'مكة — محمد رمضان سعد', en: 'Makkah — Muhammad Ramadan Saad' },
  { id: 'as129', url: 'https://www.assabile.com/download/adhan/129', ar: 'المدينة — عاصم بخاري', en: 'Madinah — Assem Bukhari' },
  { id: 'as151', url: 'https://www.assabile.com/download/adhan/151', ar: 'الأقصى — ناجي قزاز', en: 'Al-Aqsa — Najee Qazaz' },
];
