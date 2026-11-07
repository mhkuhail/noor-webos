import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { CITIES, COUNTRIES, METHODS, PRAYERS, T, ADHKAR, RECITER_URL, EZAN_FILES, ADHAN_SOURCES } from './content.js';

/* ================= state & storage ================= */
const NOOR_VERSION = typeof __NOOR_VERSION__ !== 'undefined' ? __NOOR_VERSION__ : '';
const DEFAULTS = { method: 'auto', iqamah: true, iqamahSound: true, iq: { fajr: 22, dhuhr: 17, asr: 17, maghrib: 7, isha: 17 }, reOff: true, renewDev: true, city: 'riyadh', lang: 'ar', theme: 'zakhrafa', h12: false, adhan: true, hijriAdj: 0, oled: true, adhanStyle: 'turkish', continuous: true, follow: true,
  src: { fajr: 'local', dhuhr: 'local', asr: 'local', maghrib: 'local', isha: 'local' } };
function load(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage full or unavailable */ } }

const S = Object.assign({}, DEFAULTS, load('noor.settings', {}));
S.src = Object.assign({}, DEFAULTS.src, S.src || {});
S.iq = Object.assign({}, DEFAULTS.iq, S.iq || {});
// v1.3 migration: bundled adhans become the default; old theme names map to the new Islamic themes
if (load('noor.ver', 0) < 13) { S.src = Object.assign({}, DEFAULTS.src); S.theme = 'masjid'; save('noor.ver', 13); save('noor.settings', S); }
if (load('noor.ver', 0) < 14) { S.theme = 'zakhrafa'; save('noor.ver', 14); save('noor.settings', S); }
if (['zakhrafa', 'masjid', 'awqat'].indexOf(S.theme) < 0) S.theme = 'zakhrafa';
if (!CITIES[S.city]) S.city = 'riyadh';
let firedKey = load('noor.fired', '');
let view = 'home';           // home | index | player | dhikr | settings | adhan
let menuIdx = 0, rowIdx = 0, dhikrIdx = 0, scrollY = 0;
let weather = null, reminderIdx = 0;

const $ = (id) => document.getElementById(id);
const tr = () => T[S.lang];
// Effective city: tz resolved ('tv' → the TV's current UTC offset, follows daylight saving) + optional method override
const city = () => {
  const c = CITIES[S.city] || CITIES.riyadh;
  return Object.assign({}, c, { tz: c.tz === 'tv' ? -new Date().getTimezoneOffset() : c.tz, method: S.method && S.method !== 'auto' ? S.method : c.method });
};

/* ================= webOS system calls (PalmServiceBridge = what webOSTV.js uses internally) ================= */
function luna(uri, params, cb, ms) {
  let done = false; const fin = (err, res) => { if (!done) { done = true; if (cb) cb(err, res || {}); } };
  if (typeof window.PalmServiceBridge === 'undefined') { fin('no-bridge'); return; }
  try {
    const b = new window.PalmServiceBridge();
    b.onservicecallback = (msg) => { let r = {}; try { r = JSON.parse(msg); } catch (e) { /* ignore */ }
      fin(r.returnValue === false ? (r.errorText || r.errorMessage || ('error ' + r.errorCode)) : null, r); };
    b.call(uri, JSON.stringify(params || {}));
    setTimeout(() => fin('timeout'), ms || 8000);
  } catch (e) { fin(String(e)); }
}
const SVC = 'luna://com.noor.webos.service/';
const appLog = load('noor.applog', []);
function alog(m) { appLog.push(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(5, 19).replace('T', ' ') + ' ' + m); while (appLog.length > 25) appLog.shift(); save('noor.applog', appLog); }
function tvToast(message) {
  luna('luna://com.webos.notification/createToast', { sourceId: 'com.noor.webos', message: message, noaction: false, onclick: { appId: 'com.noor.webos' } }, (e) => {
    if (e) luna(SVC + 'toast', { message: message }, () => {});
  }, 4000);
}
// Bring Noor in front of YouTube/Netflix/… (the same call that opens YouTube from Noor)
function selfLaunch(params, cb) {
  const p = { id: 'com.noor.webos', params: params };
  luna('luna://com.webos.applicationManager/launch', p, (e) => {
    if (!e) { alog('brought to front (app)'); return cb && cb(null); }
    luna(SVC + 'launch', p, (e2) => { alog(e2 ? 'bring-to-front failed: ' + e + ' / ' + e2 : 'brought to front (service)'); if (cb) cb(e2); }, 6000);
  }, 4000);
}
// A live subscription keeps webOS from stopping the background service while Noor is alive
let hbBridge = null;
function heartbeat() {
  if (typeof window.PalmServiceBridge === 'undefined') return;
  try {
    hbBridge = new window.PalmServiceBridge();
    hbBridge.onservicecallback = () => {};
    hbBridge.call(SVC + 'heartbeat', JSON.stringify({ subscribe: true }));
  } catch (e) { /* ignore */ }
}
function startService() {
  const c = city();
  luna(SVC + 'start', { lat: c.lat, lng: c.lng, method: c.method, tz: c.tz, renew: S.renewDev, iqamah: S.iqamah ? S.iq : null }, (err) => { serviceOk = !err; });
}
let serviceOk = false;
function screenCtl(on, cb) {
  cb = cb || (() => {});
  luna('luna://com.webos.service.tvpower/power/' + (on ? 'turnOnScreen' : 'turnOffScreen'), {}, (e) => {
    if (!e) return cb(null, 'app');
    luna(SVC + 'screen', { on: on }, (e2) => cb(e2 ? e + ' / service: ' + e2 : null, 'service'), 6000);
  }, 3000);
}
function screenOff(cb) { screenCtl(false, cb); }
function screenOn(cb) { nightMode(false); screenCtl(true, cb); }
// Night mode: Noor's own black screen — works without any permission; Noor stays in front so the adhan plays on time.
let nightTimer = null;
function nightMode(on) {
  const el = $('night'); if (!el) return;
  el.classList.toggle('hidden', !on); document.body.classList.toggle('nightOn', on);
  clearInterval(nightTimer);
  if (on) { const upd = () => { const c = cityNow(); $('nightClock').textContent = toAr(pad(c.getUTCHours()) + ':' + pad(c.getUTCMinutes()));
      $('nightClock').style.left = (10 + Math.random() * 75) + '%'; $('nightClock').style.top = (10 + Math.random() * 75) + '%'; };
    $('nightHint').textContent = tr().nightHint; upd(); nightTimer = setInterval(upd, 60000);
    setTimeout(() => { if ($('nightHint')) $('nightHint').textContent = ''; }, 8000); }
}
const nightOn = () => !$('night').classList.contains('hidden');

/* ================= time helpers (city time, independent of TV timezone) ================= */
// Returns a Date whose UTC fields equal the wall-clock time in the selected city.
function cityNow(d) { return new Date((d || new Date()).getTime() + city().tz * 60000); }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function fmtTime(d, withSec) {
  const c = cityNow(d); let h = c.getUTCHours(); const m = c.getUTCMinutes();
  let suf = '';
  if (S.h12) { suf = h < 12 ? tr().am : tr().pm; h = h % 12 || 12; }
  return (S.h12 ? h : pad(h)) + ':' + pad(m) + (withSec ? ':' + pad(c.getUTCSeconds()) : '') + (suf ? ' ' + suf : '');
}

function timesFor(dayOffset) {
  const c = cityNow(); c.setUTCDate(c.getUTCDate() + (dayOffset || 0));
  const date = new Date(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate()); // adhan reads Y/M/D only
  const params = CalculationMethod[city().method]();
  const pt = new PrayerTimes(new Coordinates(city().lat, city().lng), date, params);
  return { fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha };
}

/* ================= Hijri date ================= */
// Uses the Umm al-Qura calendar from the TV's ICU data; falls back to the tabular algorithm.
function hijri(d) {
  const shifted = new Date(cityNow(d).getTime() + S.hijriAdj * 86400000);
  try {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
    if (f.resolvedOptions().calendar.indexOf('islamic') === 0) {
      const p = f.format(shifted).match(/(\d+)\D+(\d+)\D+(\d+)/);
      if (p) return { m: +p[1], d: +p[2], y: +p[3] };
    }
  } catch (e) { /* fall through */ }
  // Tabular (Kuwaiti) algorithm
  const jd = Math.floor(shifted.getTime() / 86400000) + 2440588;
  let l = jd - 1948440 + 10632; const n = Math.floor((l - 1) / 10631); l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const m = Math.floor((24 * l) / 709); const day = l - Math.floor((709 * m) / 24); const y = 30 * n + j - 30;
  return { m: m, d: day, y: y };
}

/* ================= rendering: home ================= */
function applyChrome() {
  setThemeClass();
  document.documentElement.lang = S.lang;
  document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  $('cityPill').textContent = city()[S.lang];
  const L = tr();
  // Noor TV-style dock cards: [action, colour, subtitle]
  const items = [['quran', 'green', L.reciter], ['kahf', 'gold', L.reciter], ['morning', 'orange', L.adhkarSub], ['evening', 'indigo', L.adhkarSub], ['baqarah', 'teal', L.reciter], ['youtube', 'yt', L.youtubeSub], ['apps', 'slate', L.appsSub], ['screenoff', 'night', L.screenoffSub], ['settings', 'mint', city()[S.lang]]];
  $('menu').innerHTML = items.map((it, i) => '<button class="btn c-' + it[1] + '" data-i="' + i + '" data-act="' + it[0] + '"><span class="bt">' + L[it[0]] + '</span><span class="bs">' + escapeHtml(it[2]) + '</span></button>').join('');
  Array.prototype.forEach.call($('menu').children, (b) => b.addEventListener('click', () => { menuIdx = +b.dataset.i; activateMenu(); }));
  renderWeather();
  $('gearBtn').onclick = openSettings;
  focusMenu();
  tick(true);
}

function focusMenu() {
  Array.prototype.forEach.call($('menu').children, (b, i) => b.classList.toggle('focus', i === menuIdx && view === 'home'));
  const b = $('menu').children[menuIdx]; if (b) $('bigTitle').textContent = tr()[b.dataset.act];
  if (b) { const dockW = $('dock').clientWidth - 44, cardW = b.offsetWidth + 18, total = $('menu').children.length * cardW;
    const x = Math.max(0, Math.min(total - dockW, menuIdx * cardW - dockW / 2 + cardW / 2));
    $('menu').style.transform = 'translateX(' + (-x) + 'px)'; }
}
// 'awqat' theme follows the time of day: morning (Fajr→Asr), evening (Asr→Isha), night (Isha→Fajr)
let mood = 'night';
const BASE = { zakhrafa: '#04170f', masjid: '#040a1c', morning: '#0a1126', evening: '#1a0f26', night: '#0a1126' };
function applyWall(name) {
  const w = $('wall'); w.style.backgroundImage = 'url("wall/' + name + '.jpg")'; w.style.backgroundColor = BASE[name] || '#04170f';
  Array.prototype.forEach.call(document.querySelectorAll('.pwall'), (el) => {
    el.style.backgroundImage = 'url("wall/' + name + '-blur.jpg")'; el.style.backgroundColor = BASE[name] || '#04170f'; });
}
function setThemeClass() {
  if (S.theme === 'awqat') {
    try { const t = timesFor(0), n = new Date(); mood = (n >= t.fajr && n < t.asr) ? 'morning' : (n >= t.asr && n < t.isha) ? 'evening' : 'night'; } catch (e) { mood = 'night'; }
  }
  // Wallpapers are set directly (not through CSS variables): the TV's Chromium 53 ignores url() inside var().
  const wall = S.theme === 'awqat' ? mood : S.theme;
  if (applyWall.last !== wall) { applyWall.last = wall; applyWall(wall); }
  const keep = ['dim', 'adhanOn', 'iqOn'].filter((x) => document.body.classList.contains(x));
  document.body.className = ['theme-' + S.theme].concat(S.theme === 'awqat' ? ['mood-' + mood] : [], keep).join(' ');
}
const toAr = (str) => (S.lang === 'ar' ? String(str).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]) : String(str));

let lastMinute = -1; let iqFired = load('noor.iqfired', ''); let wokeKey = ''; const LEAD = 60000;
function tick(force) {
  const now = new Date(); const c = cityNow(now); const L = tr();
  // clock
  const parts = fmtTime(now, false).split(' ');
  $('clock').innerHTML = toAr(parts[0]) + (parts[1] ? '<small>' + parts[1] + '</small>' : '');

  const today = timesFor(0);
  const isFri = c.getUTCDay() === 5;
  // next prayer (skip sunrise as a "prayer" for the countdown but still show it)
  let nextKey = null, nextTime = null;
  for (const k of PRAYERS) { if (k !== 'sunrise' && today[k] > now) { nextKey = k; nextTime = today[k]; break; } }
  if (!nextKey) { nextKey = 'fajr'; nextTime = timesFor(1).fajr; }
  const diff = Math.max(0, Math.floor((nextTime - now) / 1000));
  const nm = (nextKey === 'dhuhr' && isFri) ? L.jumuah : L[nextKey];
  const iqa = iqamahWindow(today, now, isFri);
  if (iqa) {
    const d2 = Math.max(0, Math.floor((iqa.at - now) / 1000));
    $('nextLine').innerHTML = L.iqamahIn + ' ' + escapeHtml(L[iqa.k]) + ' ' + L.after + ' <span class="cd">' + Math.floor(d2 / 60) + ':' + pad(d2 % 60) + '</span>';
  } else {
    $('nextLine').innerHTML = escapeHtml(nm) + ' ' + L.after + ' <span class="cd">' + Math.floor(diff / 3600) + ':' + pad(Math.floor(diff / 60) % 60) + ':' + pad(diff % 60) + '</span>';
  }
  // iqamah alert
  for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    if (!S.iqamah || (k === 'dhuhr' && isFri)) continue;
    const at = today[k].getTime() + (S.iq[k] || 0) * 60000; const key = c.toISOString().slice(0, 10) + ':iq:' + k;
    if (now >= at && now - at < 90000 && iqFired !== key) { iqFired = key; save('noor.iqfired', key); fireIqamah(k); }
  }
  $('greetText').textContent = isFri ? L.jumuahMubarak : L.salam;

  // pre-wake: if Noor is behind another app, come to the front ~1 min before the adhan
  for (const k of PRAYERS) {
    if (k === 'sunrise' || !S.adhan) continue;
    const dt = now - today[k]; const key = c.toISOString().slice(0, 10) + ':' + k;
    if (dt >= -LEAD && dt < 120000 && wokeKey !== key && document.hidden) {
      wokeKey = key; alog('pre-wake ' + k + ' (Noor was in the background)');
      tvToast(L.toastSoon + ' ' + L[(k === 'dhuhr' && isFri) ? 'jumuah' : k]);
      selfLaunch({ prayer: k, at: today[k].getTime(), source: 'self' });
    }
  }
  // adhan trigger: within the first 3 minutes after a prayer time
  for (const k of PRAYERS) {
    if (k === 'sunrise') continue;
    const dt = now - today[k];
    const key = c.toISOString().slice(0, 10) + ':' + k;
    if (dt >= 0 && dt < 180000 && firedKey !== key) {
      firedKey = key; save('noor.fired', key);
      if (S.adhan) showAdhan((k === 'dhuhr' && isFri) ? 'jumuah' : k);
    }
  }

  if (!force && c.getUTCMinutes() === lastMinute) return;
  lastMinute = c.getUTCMinutes();

  // prayer tiles
  const current = nextKey; // highlight the upcoming prayer
  $('prayers').innerHTML = PRAYERS.map((k) =>
    '<div class="p' + (k === current ? ' now' : '') + (k === 'sunrise' ? ' sun' : '') + '"><div class="n">' +
    ((k === 'dhuhr' && isFri) ? L.jumuah : L[k]) + '</div><div class="t">' + fmtTime(today[k]) + '</div></div>').join('');

  // dates
  const h = hijri(now);
  $('hijri').textContent = h.d + ' ' + L.hmonths[h.m - 1] + ' ' + h.y + ' ' + L.hSuffix;
  $('greg').textContent = L.weekdays[c.getUTCDay()] + ' ' + toAr(c.getUTCDate()) + ' ' + L.months[c.getUTCMonth()];
  setThemeClass();

  // OLED care: pixel shift each minute, dim late night
  if (S.oled) {
    const dx = Math.round(Math.random() * 24 - 12), dy = Math.round(Math.random() * 16 - 8);
    $('stage').style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    const lateNight = now > new Date(today.isha.getTime() + 90 * 60000) || now < new Date(today.fajr.getTime() - 30 * 60000);
    document.body.classList.toggle('dim', lateNight && view === 'home');
  } else {
    $('stage').style.transform = ''; document.body.classList.remove('dim');
  }

  if (force) rotateReminder(today, now, c, h);
}

function reminders(today, now, c, h) {
  const L = tr(); const out = [];
  const wd = c.getUTCDay();
  if (wd === 5) { out.push(L.remKahf); out.push(L.remSalawat); }
  if (wd === 4 && now > today.maghrib) out.push(L.remSalawat);
  if (h.d >= 13 && h.d <= 15) out.push(L.remWhiteToday);
  if (h.d === 12 && now > today.maghrib - 0) out.push(L.remWhiteTomorrow);
  if ((wd === 0 || wd === 3) && now > today.maghrib) out.push(L.remMonThu(wd === 0 ? L.mon : L.thu));
  if (now > today.fajr && now < new Date(today.sunrise.getTime() + 3 * 3600000)) out.push(L.remMorning);
  if (now > today.asr && now < new Date(today.maghrib.getTime() + 2 * 3600000)) out.push(L.remEvening);
  out.push(L.remDefault);
  return out;
}
function rotateReminder(today, now, c, h) {
  const list = reminders(today, now, c, h);
  reminderIdx = (reminderIdx + 1) % list.length;
  $('reminder').innerHTML = '<span class="tag">' + tr().reminderTag + '</span>' + escapeHtml(list[reminderIdx]);
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }

/* ================= iqamah ================= */
function iqamahWindow(today, now, isFri) {
  if (!S.iqamah) return null;
  for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    if (k === 'dhuhr' && isFri) continue;
    const a = today[k].getTime(), at = a + (S.iq[k] || 0) * 60000;
    if (now >= a && now < at) return { k: k, at: at };
  }
  return null;
}
let iqTimer = null;
function fireIqamah(k) {
  const L = tr(); alog('iqamah ' + k + (document.hidden ? ' (Noor in background)' : ''));
  // the background service posts the TV notification; Noor posts it itself only if the service isn't reachable
  if (document.hidden || !serviceOk) tvToast(L.iqamahNow + ' ' + L[k]);
  if (S.iqamahSound) { const a = $('iqamahAudio'); try { a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
  const el = $('iqamahBanner'); $('iqamahText').textContent = L.iqamahNow + ' ' + L[k];
  el.classList.remove('hidden'); document.body.classList.add('iqOn'); clearTimeout(iqTimer); iqTimer = setTimeout(() => { el.classList.add('hidden'); document.body.classList.remove('iqOn'); }, 90000);
}

/* ================= weather (Open-Meteo, no key) ================= */
function fetchWeather() {
  const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + city().lat + '&longitude=' + city().lng + '&current_weather=true';
  fetch(u).then((r) => r.json()).then((j) => { weather = j.current_weather; renderWeather(); }).catch(() => { weather = null; renderWeather(); });
}
function renderWeather() {
  if (!weather) { $('weather').textContent = ''; return; }
  const L = tr();
  $('weather').textContent = '· ' + Math.round(weather.temperature) + '° ' + (L.wx[weather.weathercode] || '');
}

/* ================= Quran (alquran.cloud, cached) ================= */
function getJSON(url, cacheKey) {
  const cached = load(cacheKey, null);
  if (cached) return Promise.resolve(cached);
  return fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((j) => { save(cacheKey, j.data); return j.data; });
}
function surah(n) { return getJSON('https://api.alquran.cloud/v1/surah/' + n + '/quran-uthmani', 'noor.q.s' + n); }
function ayah(ref) { return getJSON('https://api.alquran.cloud/v1/ayah/' + ref + '/quran-uthmani', 'noor.q.a' + ref); }

// The Uthmani text embeds the basmala in ayah 1 of every surah except 1 and 9; show it separately.
function splitBasmala(n, text) {
  if (n === 1 || n === 9) return { bism: false, text: text };
  const words = text.split(' ');
  if (words[0].indexOf('بِسْمِ') === 0 && words.length > 4) return { bism: true, text: words.slice(4).join(' ') };
  return { bism: false, text: text };
}
const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const arNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

function surahHtml(n, data) {
  let bism = false;
  const body = data.ayahs.map((a, i) => {
    let t = a.text;
    if (i === 0) { const s = splitBasmala(n, t); bism = s.bism; t = s.text; }
    return escapeHtml(t) + '<span class="ayah-n">﴿' + arNum(a.numberInSurah) + '﴾</span>';
  }).join(' ');
  return (bism ? '<div class="bism">' + BASMALA + '</div>' : '') + '<div class="quran">' + body + '</div>';
}

/* ================= Quran: index of 114 surahs ================= */
let surahMeta = load('noor.q.meta', null);   // [{number,name,englishName,numberOfAyahs}]
let idxFocus = 0;
const COLS = 6;
function fetchMeta() {
  if (surahMeta) return Promise.resolve(surahMeta);
  return fetch('https://api.alquran.cloud/v1/surah').then((r) => r.json()).then((j) => { surahMeta = j.data; save('noor.q.meta', surahMeta); return surahMeta; });
}
function surahName(n) {
  const m = surahMeta && surahMeta[n - 1];
  if (!m) return tr().surahWord + ' ' + n;
  return S.lang === 'ar' ? m.name.replace(/^سُورَةُ\s*/, '') : m.englishName;
}
function openIndex(focusN) {
  view = 'index'; scrollY = 0;
  const last = load('noor.q.last', { n: 1, t: 0 });
  idxFocus = (focusN || last.n || 1) - 1;
  $('readerTitle').textContent = tr().quran + ' — ' + tr().reciter;
  $('readerHint').textContent = tr().indexHint;
  show('reader');
  renderIndex();
  fetchMeta().then(() => { if (view === 'index') renderIndex(); }).catch(() => {});
}
function renderIndex() {
  const L = tr(); let h = '<div id="readerScroll"><div class="sgrid">';
  for (let n = 1; n <= 114; n++) {
    const m = surahMeta && surahMeta[n - 1];
    h += '<div class="stile" data-n="' + n + '"><span class="snum">' + (S.lang === 'ar' ? arNum(n) : n) + '</span>' +
      '<span class="sname">' + escapeHtml(surahName(n)) + '</span>' +
      (m ? '<span class="sayahs">' + (S.lang === 'ar' ? arNum(m.numberOfAyahs) : m.numberOfAyahs) + ' ' + L.ayahsWord + '</span>' : '') + '</div>';
  }
  $('readerBody').innerHTML = h + '</div></div>';
  Array.prototype.forEach.call(document.querySelectorAll('.stile'), (el) => el.addEventListener('click', () => openPlayer(+el.dataset.n)));
  focusIndex();
}
function focusIndex() {
  const els = document.querySelectorAll('.stile');
  Array.prototype.forEach.call(els, (el, i) => el.classList.toggle('focus', i === idxFocus));
  const el = els[idxFocus]; if (!el) return;
  const viewH = $('readerBody').clientHeight;
  if (el.offsetTop - scrollY < 0) scrollY = el.offsetTop - 10;
  if (el.offsetTop + el.offsetHeight - scrollY > viewH) scrollY = el.offsetTop + el.offsetHeight - viewH + 10;
  applyScroll();
}

/* ================= Quran: player (Badr Al-Turki) + Uthmani text ================= */
const qa = () => $('quranAudio');
let playing = 0, manualScrollAt = 0;
function pad3(n) { return ('00' + n).slice(-3); }
function openPlayer(n, startAt) {
  view = 'player'; scrollY = 0; playing = n;
  const L = tr();
  $('readerTitle').textContent = L.surahWord + ' ' + surahName(n);
  $('readerHint').textContent = L.playerHint;
  $('readerBody').innerHTML = '<div id="readerScroll"><div class="msg">' + L.loading + '</div></div>';
  $('player').classList.remove('hidden');
  show('reader');
  // audio
  const a = qa();
  const last = load('noor.q.last', { n: 0, t: 0 });
  const resume = startAt != null ? startAt : (last.n === n ? last.t : 0);
  a.src = RECITER_URL + pad3(n) + '.mp3';
  a.onloadedmetadata = () => { if (resume > 5 && resume < a.duration - 5) a.currentTime = resume; };
  a.onerror = () => { $('pStatus').textContent = L.audioErr; };
  a.onended = () => { if (S.continuous && n < 114 && view === 'player') openPlayer(n + 1, 0); else updatePlayer(); };
  const p = a.play(); if (p && p.catch) p.catch(() => {});
  updatePlayer();
  // text
  fetchMeta().catch(() => {});
  surah(n).then((d) => { if (view === 'player' && playing === n) { $('readerScroll').innerHTML = surahHtml(n, d); applyScroll(); } })
    .catch(() => { if (playing === n) $('readerScroll').innerHTML = '<div class="msg">' + L.offline + '</div>'; });
}
function fmtDur(t) { if (!isFinite(t)) return '--:--'; t = Math.floor(t); const h = Math.floor(t / 3600); return (h ? h + ':' + pad(Math.floor(t / 60) % 60) : Math.floor(t / 60)) + ':' + pad(t % 60); }
function updatePlayer() {
  const a = qa(); if (!playing) return;
  const L = tr();
  $('pIcon').textContent = a.paused ? '▶' : '❚❚';
  $('pName').textContent = surahName(playing) + ' · ' + L.reciter;
  $('pTime').textContent = fmtDur(a.currentTime) + ' / ' + fmtDur(a.duration);
  $('pBar').style.width = (a.duration ? (100 * a.currentTime / a.duration) : 0) + '%';
  if (!a.paused && !a.error) $('pStatus').textContent = '';
}
function playerTick() {
  const a = qa();
  if (!playing) return;
  updatePlayer();
  if (!a.paused && a.duration) {
    if (Math.floor(a.currentTime) % 5 === 0) save('noor.q.last', { n: playing, t: a.currentTime });
    // follow: scroll text proportionally to the recitation (pauses 12s after manual scrolling)
    if (S.follow && view === 'player' && Date.now() - manualScrollAt > 12000) {
      const sc = $('readerScroll'); const viewH = $('readerBody').clientHeight;
      if (sc) { scrollY = Math.max(0, (sc.scrollHeight) * (a.currentTime / a.duration) - viewH * 0.35); applyScroll(); }
    }
  }
}
function togglePlay() { const a = qa(); if (a.paused) { const p = a.play(); if (p && p.catch) p.catch(() => {}); } else a.pause(); updatePlayer(); }
function seek(d) { const a = qa(); if (a.duration) a.currentTime = Math.max(0, Math.min(a.duration - 1, a.currentTime + d)); updatePlayer(); }

function applyScroll() {
  const sc = $('readerScroll'); if (!sc) return;
  const max = Math.max(0, sc.scrollHeight - $('readerBody').clientHeight);
  scrollY = Math.max(0, Math.min(scrollY, max));
  sc.style.transform = 'translateY(' + (-scrollY) + 'px)';
}

/* ================= adhkar ================= */
let dhikrItems = [];
function openAdhkar(kind) {
  view = 'dhikr'; scrollY = 0; dhikrIdx = 0;
  const L = tr();
  $('readerTitle').textContent = L[kind === 'm' ? 'morning' : 'evening'];
  $('readerHint').textContent = L.dhikrHint;
  dhikrItems = ADHKAR.filter((x) => !x.when || x.when === kind).map((x) => ({
    src: x, left: x.count, text: x.t || x[kind] || '', label: x.label ? x.label[S.lang] : '',
  }));
  $('readerBody').innerHTML = '<div id="readerScroll">' + dhikrItems.map((it, i) =>
    '<div class="dhikr" data-i="' + i + '"><div class="txt">' + (it.text ? escapeHtml(it.text) : L.loading) + '</div>' +
    '<div class="meta"><span>' + escapeHtml(it.label || '') + (it.src.src ? (it.label ? ' · ' : '') + it.src.src : '') + '</span>' +
    '<span class="cnt">' + countLabel(it.left) + '</span></div></div>').join('') + '</div>';
  show('reader');
  Array.prototype.forEach.call(document.querySelectorAll('.dhikr'), (el) => el.addEventListener('click', () => { dhikrIdx = +el.dataset.i; countDhikr(); }));
  focusDhikr();
  // load Quranic items
  dhikrItems.forEach((it, i) => {
    const el = document.querySelectorAll('.dhikr')[i];
    if (it.src.ayah) ayah(it.src.ayah).then((a) => { el.querySelector('.txt').textContent = a.text + ' ﴿' + arNum(a.numberInSurah) + '﴾'; applyScroll(); })
      .catch(() => { el.querySelector('.txt').textContent = L.offline; });
    if (it.src.surah) surah(it.src.surah).then((d) => { el.querySelector('.txt').innerHTML = surahHtml(it.src.surah, d).replace('class="quran"', 'class="quran" style="font-size:42px;line-height:1.9"').replace('class="bism"', 'class="bism" style="font-size:38px;margin-bottom:6px"'); applyScroll(); })
      .catch(() => { el.querySelector('.txt').textContent = L.offline; });
  });
}
function countLabel(n) { const L = tr(); return n <= 0 ? '' : (n === 1 ? L.once : (S.lang === 'ar' ? arNum(n) : n) + ' ' + L.times); }
function focusDhikr() {
  const els = document.querySelectorAll('.dhikr');
  Array.prototype.forEach.call(els, (el, i) => el.classList.toggle('focus', i === dhikrIdx));
  const el = els[dhikrIdx]; if (!el) return;
  const viewH = $('readerBody').clientHeight;
  if (el.offsetTop - scrollY < 0) scrollY = el.offsetTop - 10;
  if (el.offsetTop + el.offsetHeight - scrollY > viewH) scrollY = el.offsetTop + el.offsetHeight - viewH + 10;
  applyScroll();
}
function countDhikr() {
  const it = dhikrItems[dhikrIdx]; if (!it) return;
  if (it.left > 0) it.left--;
  const el = document.querySelectorAll('.dhikr')[dhikrIdx];
  el.querySelector('.cnt').textContent = countLabel(it.left);
  if (it.left === 0) { el.classList.add('done'); if (dhikrIdx < dhikrItems.length - 1) { dhikrIdx++; } }
  focusDhikr();
}

/* ================= settings ================= */
const onOff = (v) => (v ? tr().on : tr().off);
const countryOf = () => (CITIES[S.city] || CITIES.riyadh).country;
const ROWS = [
  // City & prayer times
  { sec: 'city', k: 'country', label: 'country', get: countryOf, opts: () => Object.keys(COUNTRIES), fmt: (v) => COUNTRIES[v][S.lang],
    set: (v) => { S.city = Object.keys(CITIES).filter((k) => CITIES[k].country === v)[0]; } },
  { sec: 'city', k: 'city', opts: () => Object.keys(CITIES).filter((k) => CITIES[k].country === countryOf()), fmt: (v) => CITIES[v][S.lang] },
  { sec: 'city', k: 'method', opts: () => ['auto'].concat(Object.keys(METHODS)),
    fmt: (v) => (v === 'auto' ? tr().methodAuto + ' — ' + METHODS[(CITIES[S.city] || CITIES.riyadh).method][S.lang] : METHODS[v][S.lang]) },
  { sec: 'city', k: 'hijriAdj', opts: [-2, -1, 0, 1, 2], fmt: (v) => (v > 0 ? '+' : '') + v + ' ' + tr().days },
  { sec: 'city', k: 'h12', label: 'clock', opts: [false, true], fmt: (v) => (v ? tr().h12 : tr().h24) },
  // Adhan
  { sec: 'adhan', k: 'adhan', label: 'adhanOn', opts: [true, false], fmt: onOff },
  ...['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((p) => ({
    sec: 'adhan', k: 'src', p: p, opts: ADHAN_SOURCES.map((x) => x.id),
    lbl: () => tr().adhanFor + ' ' + tr()[p] + ' · ' + tr().maqamWord + ' ' + tr().maqam[p],
    fmt: (v) => { const x = ADHAN_SOURCES.filter((o) => o.id === v)[0]; return x ? x[S.lang] : v; },
  })),
  { sec: 'adhan', k: 'reOff', opts: [true, false], fmt: onOff },
  { sec: 'adhan', k: 'test', action: () => { closePanels(); showAdhan('dhuhr'); } },
  // Iqamah
  { sec: 'iqamah', k: 'iqamah', label: 'iqamahOn', opts: [true, false], fmt: onOff },
  ...['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((p) => ({ sec: 'iqamah', k: 'iq', p: p, iq: true, opts: [3, 5, 7, 10, 12, 15, 17, 20, 22, 25, 30, 35, 40, 45],
    lbl: () => tr().iqamahFor + ' ' + tr()[p], fmt: (v) => v + ' ' + tr().minWord })),
  { sec: 'iqamah', k: 'iqamahSound', opts: [true, false], fmt: onOff },
  // Display & language
  { sec: 'display', k: 'lang', opts: ['ar', 'en'], fmt: (v) => (v === 'ar' ? 'العربية' : 'English') },
  { sec: 'display', k: 'theme', opts: ['zakhrafa', 'masjid', 'awqat'], fmt: (v) => tr().themes[v] },
  { sec: 'display', k: 'oled', opts: [true, false], fmt: onOff },
  // Quran
  { sec: 'quran', k: 'continuous', opts: [true, false], fmt: onOff },
  { sec: 'quran', k: 'follow', opts: [true, false], fmt: onOff },
  // System & support
  { sec: 'system', k: 'renewDev', opts: [true, false], fmt: onOff },
  { sec: 'system', k: 'caps', action: () => openCaps() },
  { sec: 'system', k: 'diag', action: () => openDiag() },
  { sec: 'system', k: 'exit', action: exitApp },
];
const ICON = {
  city: 'M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z',
  adhan: 'M12 3c2.5 2 4.5 3.6 4.5 6.2H7.5C7.5 6.6 9.5 5 12 3ZM6 10h12v10H6zM2.5 8h2v12h-2zM19.5 8h2v12h-2zM10.5 14a1.5 1.5 0 0 1 3 0v6h-3z',
  iqamah: 'M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.8V3.5a1.5 1.5 0 0 0-3 0v.7A7 7 0 0 0 5 11v5l-2 2v1h18v-1z',
  display: 'M12 3a9 9 0 0 0 0 18c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8ZM6.5 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
  quran: 'M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5a1.5 1.5 0 0 0 0 3H20v1H6.5A2.5 2.5 0 0 1 4 19.5z',
  system: 'M19.14 12.94a7 7 0 0 0 0-1.88l2.03-1.58-1.92-3.32-2.39.96a7 7 0 0 0-1.62-.94L14.88 3.5h-3.84l-.36 2.68c-.59.24-1.13.57-1.62.94l-2.39-.96-1.92 3.32 2.03 1.58a7 7 0 0 0 0 1.88l-2.03 1.58 1.92 3.32 2.39-.96c.5.38 1.03.7 1.62.94l.36 2.68h3.84l.36-2.68c.59-.24 1.13-.56 1.62-.94l2.39.96 1.92-3.32zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z',
};
const SECTIONS = [
  { id: 'city', title: 'secCity', sum: () => city()[S.lang] + ' · ' + METHODS[city().method][S.lang] },
  { id: 'adhan', title: 'secAdhan', sum: () => (S.adhan ? tr().on : tr().off) + ' · ' + tr().reciter },
  { id: 'iqamah', title: 'secIqamah', sum: () => (S.iqamah ? ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((p) => tr()[p] + ' ' + S.iq[p]).join(' · ') : tr().off) },
  { id: 'display', title: 'secDisplay', sum: () => tr().themes[S.theme] + ' · ' + (S.lang === 'ar' ? 'العربية' : 'English') },
  { id: 'quran', title: 'secQuran', sum: () => tr().reciter },
  { id: 'system', title: 'secSystem', sum: () => 'Noor ' + NOOR_VERSION },
];
let settingsSec = null;
const VR = () => (settingsSec ? ROWS.filter((r) => r.sec === settingsSec) : []);
const rowVal = (r) => (r.get ? r.get() : r.iq ? S.iq[r.p] : r.p ? S.src[r.p] : S[r.k]);
const rowOpts = (r) => (typeof r.opts === 'function' ? r.opts() : r.opts);
function openSettings() { view = 'settings'; settingsSec = null; rowIdx = 0; renderSettings(); show('settings'); }
function renderSettings() {
  const L = tr();
  let html;
  if (!settingsSec) {
    $('settingsTitle').textContent = L.settings; $('settingsHint').textContent = L.secHint;
    html = '<div class="secGrid">' + SECTIONS.map((sc, i) =>
      '<div class="secCard' + (i === rowIdx ? ' focus' : '') + '" data-i="' + i + '"><svg viewBox="0 0 24 24"><path d="' + ICON[sc.id] + '" fill="currentColor"/></svg>' +
      '<div><b>' + L[sc.title] + '</b><small>' + escapeHtml(sc.sum()) + '</small></div></div>').join('') + '</div>';
  } else {
    const sc = SECTIONS.filter((x) => x.id === settingsSec)[0];
    $('settingsTitle').textContent = L.settings + ' › ' + L[sc.title]; $('settingsHint').textContent = L.settingsHint;
    html = VR().map((r, i) =>
      '<div class="row' + (r.action ? ' action' : '') + (i === rowIdx ? ' focus' : '') + '" data-i="' + i + '"><span>' +
      (r.lbl ? r.lbl() + (r.iq ? '' : '<small class="pv">' + (previewRow === i ? L.previewing : (i === rowIdx ? L.preview : '')) + '</small>') : L[r.label || r.k]) + '</span>' +
      '<span class="val">' + (r.action ? (r.k === 'test' ? '▶' : r.k === 'caps' ? '✓' : r.k === 'diag' ? '☰' : '⏻') : escapeHtml(r.fmt(rowVal(r)))) + '</span></div>').join('') +
      (settingsSec === 'adhan' ? ezanStatusHtml() : '') +
      (settingsSec === 'system' ? '<div class="note">Noor ' + NOOR_VERSION + ' for webOS · prayer times calculated on-device (adhan-js) · Quran text: alquran.cloud · Recitation: Badr Al-Turki (mp3quran.net) · Weather: Open-Meteo · github.com/mhkuhail/noor-webos</div>' : '');
  }
  $('settingsBody').innerHTML = '<div id="setScroll">' + html + '</div>';
  Array.prototype.forEach.call(document.querySelectorAll('#settingsBody .row, #settingsBody .secCard'), (el) => el.addEventListener('click', () => {
    rowIdx = +el.dataset.i; if (!settingsSec) { settingsSec = SECTIONS[rowIdx].id; rowIdx = 0; renderSettings(); } else changeRow(1); }));
  const rowEl = document.querySelectorAll('#settingsBody .row, #settingsBody .secCard')[rowIdx], box = $('settingsBody'), inner = $('setScroll');
  if (rowEl) {
    const viewH = box.clientHeight; let y = 0;
    if (rowEl.offsetTop + rowEl.offsetHeight > viewH - 20) y = rowEl.offsetTop + rowEl.offsetHeight - viewH + 20;
    if (settingsSec && rowIdx === VR().length - 1) y = Math.max(y, inner.scrollHeight - viewH);
    inner.style.transform = 'translateY(' + (-Math.max(0, y)) + 'px)';
  }
}
let previewRow = -1;
function stopPreview() { if (previewRow >= 0) { const a = $('adhanAudio'); a.onerror = null; a.pause(); previewRow = -1; } }
function previewSource(i) {
  const r = VR()[i]; const a = $('adhanAudio');
  if (previewRow === i) { stopPreview(); renderSettings(); return; }
  stopPreview(); previewRow = i;
  const list = adhanList(r.p);
  let idx = 0; const next = () => { if (idx < list.length) { a.src = list[idx++]; const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); } };
  a.onerror = next; a.onended = () => { previewRow = -1; if (view === 'settings') renderSettings(); };
  next(); renderSettings();
}
function changeRow(dir) {
  const r = VR()[rowIdx]; if (!r) return;
  if (r.action) { r.action(); return; }
  if (r.iq) {
    const i = r.opts.indexOf(S.iq[r.p]);
    S.iq[r.p] = r.opts[((i < 0 ? 0 : i) + dir + r.opts.length) % r.opts.length];
    save('noor.settings', S); startService(); renderSettings(); return;
  }
  if (r.p) {
    const i = r.opts.indexOf(S.src[r.p]);
    S.src[r.p] = r.opts[(i + dir + r.opts.length) % r.opts.length];
    save('noor.settings', S); stopPreview(); renderSettings(); return;
  }
  const opts = rowOpts(r); const cur = opts.indexOf(rowVal(r));
  const v = opts[((cur < 0 ? 0 : cur) + dir + opts.length) % opts.length];
  if (r.set) r.set(v); else S[r.k] = v;
  save('noor.settings', S);
  if (['country', 'city', 'method', 'renewDev', 'iqamah'].indexOf(r.k) >= 0) { startService(); weather = null; fetchWeather(); tick(true); }
  applyChrome(); renderSettings();
}

/* ================= TV apps (YouTube, Netflix, …) ================= */
const YOUTUBE_IDS = ['youtube.leanback.v4', 'youtube.leanback.v3', 'com.webos.app.youtube'];
let appList = [], appIdx = 0;
function lunaOrService(uri, svcMethod, params, cb) {
  luna(uri, params, (e, r) => { if (!e) return cb(null, r); luna(SVC + svcMethod, params, cb); });
}
function openApp(ids, title) {
  ids = [].concat(ids); let i = 0;
  const tryNext = (lastErr) => {
    if (i >= ids.length) { toast(tr().openFail + (lastErr ? ' (' + lastErr + ')' : '')); return; }
    const id = ids[i++];
    lunaOrService('luna://com.webos.applicationManager/launch', 'launch', { id: id }, (e) => { if (e) tryNext(e); });
  };
  tryNext();
}
function openApps() {
  view = 'apps'; appIdx = 0; const L = tr();
  $('readerTitle').textContent = L.apps; $('readerHint').textContent = L.appsHint;
  $('readerBody').innerHTML = '<div id="readerScroll"></div>';
  show('reader');
  const cached = load('noor.applist', null);
  renderApps((cached && cached.length) ? cached : APP_CATALOG, '');          // instant
  loadAppList((e, list, via) => {                                           // then the TV's real list, if it shares it
    if (view !== 'apps') return;
    renderApps(list, via === 'fallback' ? L.appsFail + ' — ' + String(e || '') : '');
  });
}
function renderApps(list, note) {
  const keepId = appList[appIdx] && appList[appIdx].id;
  appList = list.filter((a) => a.id !== 'com.noor.webos' && a.title && !/^com\.webos\.app\.(factorywin|tvhotkey)/.test(a.id));
  appList.sort((a, b) => (YOUTUBE_IDS.indexOf(b.id) >= 0) - (YOUTUBE_IDS.indexOf(a.id) >= 0));
  const k = appList.map((a) => a.id).indexOf(keepId); appIdx = k >= 0 ? k : Math.min(appIdx, appList.length - 1);
  const icon = (a) => { const f = a.largeIcon || a.icon || ''; return f ? (f.charAt(0) === '/' ? 'file://' + f : f) : ''; };
  $('readerScroll').innerHTML = '<div class="agrid">' + appList.map((a, i) =>
    '<div class="atile" data-i="' + i + '" style="background-color:' + (a.bgColor || 'rgba(255,255,255,.08)') + '">' +
    (icon(a) ? '<img src="' + escapeHtml(icon(a)) + '" onerror="this.style.display=\'none\'">' : '') +
    '<span' + (isLight(a.bgColor) ? ' class="dark"' : '') + '>' + escapeHtml(a.title) + '</span></div>').join('') + '</div>' +
    (note ? '<div class="note" style="direction:ltr;text-align:left">' + escapeHtml(note) + '</div>' : '');
  Array.prototype.forEach.call(document.querySelectorAll('.atile'), (el) => el.addEventListener('click', () => { appIdx = +el.dataset.i; launchSelected(); }));
  focusApp();
}
const ACOLS = 6;
// Popular apps on LG TVs in Saudi Arabia / Türkiye — used only if the TV refuses to share its app list.
const APP_CATALOG = [
  { id: 'youtube.leanback.v4', title: 'YouTube', bgColor: '#ffffff' }, { id: 'netflix', title: 'Netflix', bgColor: '#000000' },
  { id: 'com.mbc.shahid', title: 'Shahid', bgColor: '#141414' }, { id: 'amazon', title: 'Prime Video', bgColor: '#0f171e' },
  { id: 'com.disney.disneyplus-prod', title: 'Disney+', bgColor: '#0b1a4a' }, { id: 'com.apple.appletv', title: 'Apple TV', bgColor: '#111111' },
  { id: 'com.osn.osnplus', title: 'OSN+', bgColor: '#1d1d1d' }, { id: 'spotify-beehive', title: 'Spotify', bgColor: '#121212' },
  { id: 'com.webos.app.livetv', title: 'Live TV', bgColor: '#2b3a55' }, { id: 'com.webos.app.browser', title: 'Web Browser', bgColor: '#3b5998' },
  { id: 'com.webos.app.hdmi1', title: 'HDMI 1', bgColor: '#333333' }, { id: 'com.webos.app.hdmi2', title: 'HDMI 2', bgColor: '#333333' },
  { id: 'com.webos.app.hdmi3', title: 'HDMI 3', bgColor: '#333333' }, { id: 'com.webos.app.hdmi4', title: 'HDMI 4', bgColor: '#333333' },
  { id: 'com.webos.app.mediadiscovery', title: 'Media Player', bgColor: '#2d4a3e' }, { id: 'com.webos.app.photovideo', title: 'Photo & Video', bgColor: '#2d4a3e' },
  { id: 'com.webos.app.discovery', title: 'LG Content Store', bgColor: '#a50034' }, { id: 'com.webos.app.settings', title: 'Settings', bgColor: '#444444' },
];
function loadAppList(cb) {
  const cached = load('noor.applist', null);
  const tries = ['luna://com.webos.applicationManager/listLaunchPoints', 'luna://com.webos.service.applicationManager/listLaunchPoints',
    'luna://com.webos.applicationManager/listApps'];
  const errs = []; let i = 0;
  const next = () => {
    if (i < tries.length) {
      const uri = tries[i++];
      luna(uri, {}, (e, r) => { const list = r && (r.launchPoints || r.apps);
        if (!e && list && list.length) { save('noor.applist', list.map((a) => ({ id: a.id, title: a.title, icon: a.icon, largeIcon: a.largeIcon, bgColor: a.bgColor }))); return cb(null, list, uri); }
        errs.push(uri.split('/').slice(-2).join('/') + ': ' + (e || 'empty')); next(); }, 3000);
      return;
    }
    if (i === tries.length) { i++;
      luna(SVC + 'apps', {}, (e, r) => { if (!e && r.launchPoints && r.launchPoints.length) { save('noor.applist', r.launchPoints); return cb(null, r.launchPoints, 'service'); }
        errs.push('service: ' + (e || 'empty')); next(); }, 18000);
      return;
    }
    // last resort: the list we saw before, or the built-in catalog of popular apps
    cb(errs.join(' · '), (cached && cached.length) ? cached : APP_CATALOG, 'fallback');
  };
  next();
}
function isLight(c) { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return false; const n = parseInt(m[1], 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 170; }
function focusApp() {
  const els = document.querySelectorAll('.atile');
  Array.prototype.forEach.call(els, (el, i) => el.classList.toggle('focus', i === appIdx));
  const el = els[appIdx]; if (!el) return;
  const viewH = $('readerBody').clientHeight;
  if (el.offsetTop - scrollY < 0) scrollY = el.offsetTop - 10;
  if (el.offsetTop + el.offsetHeight - scrollY > viewH) scrollY = el.offsetTop + el.offsetHeight - viewH + 10;
  applyScroll();
}
function launchSelected() { const a = appList[appIdx]; if (a) openApp([a.id]); }

/* ================= service log (diagnostics) ================= */
function openDiag() {
  view = 'caps'; const L = tr();
  $('readerTitle').textContent = L.diagTitle; $('readerHint').textContent = L.capsHint;
  $('readerBody').innerHTML = '<div id="readerScroll"><pre id="diagPre" class="diag">' + L.loading + '</pre></div>';
  show('reader');
  luna(SVC + 'status', {}, (e, r) => {
    const lines = [];
    lines.push('Noor ' + NOOR_VERSION + ' · ' + city().en + ' (UTC' + (city().tz >= 0 ? '+' : '') + (city().tz / 60) + ') · bridge: ' + (typeof window.PalmServiceBridge !== 'undefined') + ' · service log times are UTC');
    if (e) lines.push('SERVICE: not reachable (' + e + ')');
    else {
      lines.push('SERVICE: running=' + r.running + ' cfg=' + r.cfg + ' subscribers=' + r.subscribers + ' next=' + (r.next ? r.next.prayer + ' ' + new Date(r.next.at).toISOString().slice(11, 16) + 'Z' : '-'));
      lines.push('scheduled: ' + JSON.stringify(r.sched || {}));
      lines.push('--- service log ---'); (r.log || []).forEach((x) => lines.push(x));
    }
    lines.push('--- app log ---'); appLog.slice(-15).forEach((x) => lines.push(x));
    $('diagPre').textContent = lines.join('\n');
  }, 6000);
}

/* ================= capability check ================= */
let capLaunchSeen = false;
function openCaps() {
  view = 'caps'; const L = tr();
  $('readerTitle').textContent = L.capsTitle; $('readerHint').textContent = L.capsHint;
  const ids = ['bridge', 'service', 'power', 'screen', 'launch', 'toast', 'bg', 'devmode'];
  $('readerBody').innerHTML = '<div id="readerScroll">' + ids.map((k) => '<div class="row capRow" id="cap-' + k + '"><span>' + L['cap_' + k] + '</span><span class="cv">' + L.capRunning + '</span></div>').join('') + '<div class="note" id="capVerdict"></div></div>';
  show('reader');
  const res = {};
  const set = (k, ok, extra) => { res[k] = ok; const el = $('cap-' + k); if (!el) return;
    el.querySelector('.cv').innerHTML = ok ? '<b class="okc">✓ ' + L.capOk + '</b>' : '<b class="noc">✗ ' + L.capNo + '</b>' + (extra ? ' <small>' + escapeHtml(String(extra)).slice(0, 60) + '</small>' : ''); };
  const steps = [
    (next) => { set('bridge', typeof window.PalmServiceBridge !== 'undefined'); next(); },
    (next) => luna(SVC + 'start', { lat: city().lat, lng: city().lng, method: city().method, tz: city().tz, renew: S.renewDev }, (e) => { set('service', !e, e); next(); }),
    (next) => luna('luna://com.webos.service.tvpower/power/getPowerState', {}, (e, r) => { set('power', !e, e || r.state); next(); }),
    (next) => screenOff((e, via) => { if (e) { set('screen', false, e); next(); return; } setTimeout(() => screenOn((e2) => { set('screen', !e2, e2 || (via === 'service' ? 'via service' : '')); next(); }), 3000); }),
    (next) => { capLaunchSeen = false; luna(SVC + 'test', { what: 'launch' }, (e) => { setTimeout(() => { set('launch', !e && capLaunchSeen, e || (capLaunchSeen ? '' : 'no relaunch')); next(); }, 2500); }); },
    (next) => luna('luna://com.webos.notification/createToast', { sourceId: 'com.noor.webos', message: 'Noor ✓' }, (e) => {
      if (!e) { set('toast', true); next(); return; }
      luna(SVC + 'toast', { message: 'Noor ✓' }, (e2) => { set('toast', !e2, e2 ? e + ' / ' + e2 : 'via service'); next(); }, 6000); }, 4000),
    (next) => setTimeout(() => luna(SVC + 'status', {}, (e, r) => { const sc = (r && r.sched) || {}; const vals = Object.keys(sc).map((k) => sc[k]);
      set('bg', !e && vals.indexOf('ok') >= 0, e || (vals.length ? vals.join(',') : 'none')); next(); }, 6000), 1500),
    (next) => luna(SVC + 'test', { what: 'devmode' }, (e, r) => { set('devmode', !e && r.installed !== false, e); next(); }),
  ];
  let i = 0; const run = () => { if (view !== 'caps') return; if (i < steps.length) steps[i++](run); else { const all = ids.every((k) => res[k]); $('capVerdict').textContent = all ? L.capAllOk : (res.launch ? L.capNight : L.capSome); } };
  run();
}

/* ================= adhan overlay ================= */
// Which local ezan files exist (probed once at start-up)
const ezanFound = {};
function probeEzan() {
  Object.keys(EZAN_FILES).concat(['adhan']).forEach((k) => {
    const f = k === 'adhan' ? 'adhan.mp3' : EZAN_FILES[k];
    const a = new Audio(); a.preload = 'metadata';
    a.onloadedmetadata = () => { ezanFound[k] = true; a.src = ''; if (view === 'settings') renderSettings(); };
    a.onerror = () => { ezanFound[k] = false; if (view === 'settings') renderSettings(); };
    a.src = f;
  });
}
function ezanStatusHtml() {
  const L = tr();
  return '<div class="ezanTable">' + Object.keys(EZAN_FILES).map((k) =>
    '<div class="ez"><b>' + L[k] + '</b><span>' + L.maqamWord + ' ' + L.maqam[k] + '</span><span class="' + (ezanFound[k] ? 'ok' : 'no') + '">' +
    (ezanFound[k] ? L.found : L.missing) + '</span><code>' + EZAN_FILES[k] + '</code></div>').join('') + '</div>';
}
// Chosen source first, then the local maqam file, then adhan.mp3, then the built-in chime.
function adhanList(p) {
  const id = S.src[p]; const src = ADHAN_SOURCES.filter((x) => x.id === id)[0];
  const list = [];
  if (src && src.url) list.push(src.url);
  if (EZAN_FILES[p]) list.push(EZAN_FILES[p]);   // bundled file (always available offline)
  return list.concat(['adhan.mp3', 'chime.mp3']);
}
function showAdhan(k) {
  const L = tr();
  const base = k === 'jumuah' ? 'dhuhr' : k;
  view = 'adhan'; document.body.classList.remove('dim');
  screenOn();
  if (document.hidden) { alog('adhan ' + k + ' while hidden → bring to front'); tvToast(L.toastNow + ' ' + L[k]); selfLaunch({ prayer: base, at: Date.now(), source: 'adhan' }); }
  const q = qa(); if (!q.paused) q.pause();
  $('adhanSub').textContent = L.adhanSub; $('adhanName').textContent = L[k];
  ['reader', 'settings'].forEach((x) => $(x).classList.add('hidden')); document.body.classList.add('adhanOn');
  const srcObj = ADHAN_SOURCES.filter((x) => x.id === S.src[base])[0];
  $('adhanMaqam').textContent = (L.maqam[base] ? L.maqamWord + ' ' + L.maqam[base] : '') + (srcObj && srcObj.url ? ' · ' + srcObj[S.lang] : '');
  $('adhanHint').textContent = L.adhanHint;
  show('adhan');
  const list = adhanList(base);
  alog('adhan ' + k + ' shown (visible=' + !document.hidden + ')');
  const a = $('adhanAudio'); let idx = 0; let retried = false; needTap = false;
  const blocked = (why) => {
    alog('adhan audio blocked: ' + why);
    if (!retried) { retried = true; setTimeout(() => { const p2 = a.play(); if (p2 && p2.catch) p2.catch((e2) => blocked('retry ' + (e2 && e2.name))); }, 1500); return; }
    needTap = true; $('adhanHint').textContent = L.adhanTap;
  };
  const tryPlay = () => {
    if (idx >= list.length) { alog('adhan audio: no playable file'); return; }
    a.src = list[idx++]; a.load();
    const p = a.play();
    if (p && p.catch) p.catch((e) => { if (e && e.name === 'NotAllowedError') blocked(e.name); else if (e && e.name !== 'AbortError') alog('play() error ' + e.name); });
  };
  a.onplaying = () => { needTap = false; $('adhanHint').textContent = L.adhanHint; alog('adhan audio playing: ' + String(a.currentSrc || a.src).split('/').pop()); };
  a.onerror = () => { alog('adhan audio error ' + (a.error ? a.error.code : '?') + ' ' + String(a.src).split('/').pop()); tryPlay(); };
  // if nothing is playing after 4 s, treat it as blocked (some webOS builds fail silently)
  setTimeout(() => { if (view === 'adhan' && a.paused && !needTap) blocked('not started after 4 s'); }, 4000);
  a.onended = () => { setTimeout(() => { if (view === 'adhan') stopAdhan(); }, 60000); };
  tryPlay();
  setTimeout(() => { if (view === 'adhan') stopAdhan(); }, 8 * 60000);
}
function stopAdhan() { document.body.classList.remove('adhanOn');
  if (S.reOff && (wakeFromOff || load('noor.offByNoor', false))) { wakeFromOff = false; setTimeout(() => { if (view === 'home') screenOff((err) => { if (err) nightMode(true); }); }, 60000); } const a = $('adhanAudio'); a.onerror = null; a.pause(); closePanels(); }

/* ================= panels & navigation ================= */
function show(id) {
  ['reader', 'settings', 'adhan'].forEach((x) => $(x).classList.toggle('hidden', x !== id));
  $('player').classList.toggle('hidden', !(id === 'reader' && view === 'player'));
  document.body.classList.remove('dim'); focusMenu();
}
function closePanels() {
  if (view === 'index' || view === 'player') { const q = qa(); if (!q.paused) { save('noor.q.last', { n: playing, t: q.currentTime }); q.pause(); } }
  ['reader', 'settings', 'adhan', 'player'].forEach((x) => $(x).classList.add('hidden'));
  view = 'home'; focusMenu(); tick(true);
}

function activateMenu() {
  const act = $('menu').children[menuIdx].dataset.act;
  if (act === 'quran') openIndex();
  else if (act === 'morning') openAdhkar('m');
  else if (act === 'evening') openAdhkar('e');
  else if (act === 'kahf') openPlayer(18);
  else if (act === 'baqarah') openPlayer(2);
  else if (act === 'settings') openSettings();
  else if (act === 'screenoff') doScreenOff();
  else if (act === 'apps') openApps();
  else if (act === 'youtube') openApp(YOUTUBE_IDS);
}

function doScreenOff() {
  save('noor.offByNoor', true);
  screenOff((err) => { if (err) { nightMode(true); } });   // not allowed → Noor's night mode instead
}
function toast(msg) {
  $('reminder').innerHTML = '<span class="tag">!</span>' + escapeHtml(msg); soonUntil = Date.now() + 15000;
}
function exitApp() {
  try { if (window.PalmSystem && window.PalmSystem.platformBack) { window.PalmSystem.platformBack(); return; } } catch (e) { /* ignore */ }
  window.close();
}

const K = { PLAY: 415, PAUSE: 19, PLAYPAUSE: 10252, STOP: 413, FF: 417, REW: 412, CHUP: 33, CHDOWN: 34, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 461, ESC: 27, BKSP: 8, RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406 };
document.addEventListener('keydown', (e) => {
  const k = e.keyCode; const rtl = S.lang === 'ar';
  if (nightOn() && view !== 'adhan') { nightMode(false); save('noor.offByNoor', false); e.preventDefault(); return; }
  if (!$('iqamahBanner').classList.contains('hidden')) { $('iqamahBanner').classList.add('hidden'); document.body.classList.remove('iqOn'); e.preventDefault(); return; }
  if (view === 'adhan') { if (needTap && (k === 13 || k === 415)) { const a = $('adhanAudio'); const p = a.play(); if (p && p.catch) p.catch((er) => alog('tap play failed ' + (er && er.name))); needTap = false; } else stopAdhan(); e.preventDefault(); return; }
  if (k === K.RED) { openAdhkar('m'); return; }
  if (k === K.GREEN) { openAdhkar('e'); return; }
  if (k === K.YELLOW) { openPlayer(18); return; }
  if (k === K.BLUE) { openSettings(); return; }
  const back = k === K.BACK || k === K.ESC || k === K.BKSP;

  if (view === 'home') {
    const n = $('menu').children.length;
    // visual direction: in RTL the first button is on the right
    if (k === K.LEFT) menuIdx = (menuIdx - 1 + n) % n;      // dock is laid out left→right like Noor TV
    else if (k === K.RIGHT) menuIdx = (menuIdx + 1) % n;
    else if (k === K.OK) activateMenu();
    else if (back) { /* stay open so the adhan always works; exit is in Settings */ }
    document.body.classList.remove('dim');
    focusMenu();
  } else if (view === 'apps') {
    const dir = rtl ? -1 : 1;
    if (k === K.RIGHT) appIdx += dir; else if (k === K.LEFT) appIdx -= dir;
    else if (k === K.DOWN) appIdx += ACOLS; else if (k === K.UP) appIdx -= ACOLS;
    else if (k === K.OK) return launchSelected();
    else if (back) return closePanels();
    appIdx = Math.max(0, Math.min(appList.length - 1, appIdx)); focusApp();
  } else if (view === 'caps') {
    if (back || k === K.OK) return closePanels();
  } else if (view === 'index') {
    const colStep = rtl ? -1 : 1;
    if (k === K.RIGHT) idxFocus += colStep; else if (k === K.LEFT) idxFocus -= colStep;
    else if (k === K.DOWN) idxFocus += COLS; else if (k === K.UP) idxFocus -= COLS;
    else if (k === K.OK) return openPlayer(idxFocus + 1);
    else if (back) return closePanels();
    idxFocus = Math.max(0, Math.min(113, idxFocus));
    focusIndex();
  } else if (view === 'player') {
    if (k === K.OK || k === K.PLAYPAUSE) togglePlay();
    else if (k === K.PLAY) { const p = qa().play(); if (p && p.catch) p.catch(() => {}); }
    else if (k === K.PAUSE) qa().pause();
    else if (k === K.STOP) { qa().pause(); qa().currentTime = 0; }
    else if (k === K.LEFT) seek(rtl ? 15 : -15); else if (k === K.RIGHT) seek(rtl ? -15 : 15);
    else if (k === K.FF) seek(60); else if (k === K.REW) seek(-60);
    else if (k === K.DOWN || k === K.CHDOWN) { if (playing < 114) return openPlayer(playing + 1, 0); }
    else if (k === K.UP || k === K.CHUP) { if (playing > 1) return openPlayer(playing - 1, 0); }
    else if (back) { save('noor.q.last', { n: playing, t: qa().currentTime }); return openIndex(playing); }
    updatePlayer();
  } else if (view === 'dhikr') {
    if (k === K.DOWN) dhikrIdx = Math.min(dhikrItems.length - 1, dhikrIdx + 1);
    else if (k === K.UP) dhikrIdx = Math.max(0, dhikrIdx - 1);
    else if (k === K.OK) return countDhikr();
    else if (back) return closePanels();
    focusDhikr();
  } else if (view === 'settings') {
    if (!settingsSec) {
      const n = SECTIONS.length, cols = 2;
      if (k === K.DOWN) rowIdx = Math.min(n - 1, rowIdx + cols); else if (k === K.UP) rowIdx = Math.max(0, rowIdx - cols);
      else if (k === K.LEFT) rowIdx = Math.max(0, Math.min(n - 1, rowIdx + (rtl ? 1 : -1)));
      else if (k === K.RIGHT) rowIdx = Math.max(0, Math.min(n - 1, rowIdx + (rtl ? -1 : 1)));
      else if (k === K.OK) { settingsSec = SECTIONS[rowIdx].id; rowIdx = 0; }
      else if (back) return closePanels();
      renderSettings(); e.preventDefault(); return;
    }
    const rows = VR();
    if (k === K.DOWN) { stopPreview(); rowIdx = Math.min(rows.length - 1, rowIdx + 1); }
    else if (k === K.UP) { stopPreview(); rowIdx = Math.max(0, rowIdx - 1); }
    else if (k === K.LEFT) return changeRow(rtl ? 1 : -1);
    else if (k === K.OK && rows[rowIdx].p && !rows[rowIdx].iq) return previewSource(rowIdx);
    else if (k === K.RIGHT || k === K.OK) return changeRow(rtl ? -1 : 1);
    else if (back) { stopPreview(); const id = settingsSec; settingsSec = null; rowIdx = SECTIONS.map((x) => x.id).indexOf(id); renderSettings(); e.preventDefault(); return; }
    renderSettings();
  }
  e.preventDefault();
});

// Magic Remote wheel scrolls the reader
document.addEventListener('wheel', (e) => { if (view === 'player' || view === 'dhikr' || view === 'index') { manualScrollAt = Date.now(); scrollY += e.deltaY > 0 ? 160 : -160; applyScroll(); } });

/* ================= launch from the network helper (noor-helper) =================
   The helper wakes the TV ~1 min before a prayer and launches Noor with
   params { prayer: 'asr', at: <epoch ms>, source: 'noor-helper' }.
   Noor goes to the home screen, shows a "coming" banner, and the normal
   scheduler plays the adhan at the exact time. */
let soonUntil = 0; let wakeFromOff = false; let adhanTimer = null; let needTap = false;
function handleLaunch(params) {
  if (!params) return;
  if (typeof params === 'string') { try { params = JSON.parse(params); } catch (e) { return; } }
  if (params.capTest) { capLaunchSeen = true; return; }
  if (params.afterRenew) { closePanels(); if (params.screenWasOff && S.reOff) screenOff(); return; }
  if (!params.prayer) return;
  alog('launched by ' + (params.source || '?') + ' for ' + params.prayer + (params.at ? ' at ' + new Date(+params.at).toTimeString().slice(0, 8) : ''));
  if (params.screenWasOff) wakeFromOff = true;
  // own timer for the exact adhan time (doesn't depend on the 1 s clock tick)
  if (params.at && !params.test) {
    const at = +params.at, ms = at - Date.now();
    clearTimeout(adhanTimer);
    if (ms > -180000) adhanTimer = setTimeout(() => {
      const key = cityNow(new Date(at)).toISOString().slice(0, 10) + ':' + params.prayer;
      if (firedKey === key || view === 'adhan') return;
      firedKey = key; save('noor.fired', key);
      const fri = cityNow(new Date(at)).getUTCDay() === 5;
      alog('adhan timer fired for ' + params.prayer);
      if (S.adhan) showAdhan(params.prayer === 'dhuhr' && fri ? 'jumuah' : params.prayer);
    }, Math.max(0, ms));
  }
  if (view === 'adhan') return;
  stopPreview && stopPreview();
  closePanels(); document.body.classList.remove('dim');
  soonUntil = params.at ? +params.at : Date.now() + 70000;
  const L = tr(); const name = L[params.prayer] || params.prayer;
  $('reminder').innerHTML = '<span class="tag">' + L.adhanSoon + '</span>' + escapeHtml(name);
  if (params.test) showAdhan(params.prayer);
}
function readLaunchParams() {
  try { if (window.PalmSystem && window.PalmSystem.launchParams) return JSON.parse(window.PalmSystem.launchParams || '{}'); } catch (e) { /* ignore */ }
  try { const q = location.search.match(/[?&]params=([^&]+)/); if (q) return JSON.parse(decodeURIComponent(q[1])); } catch (e) { /* ignore */ }
  return null;
}
document.addEventListener('webOSRelaunch', (ev) => { handleLaunch(ev.detail || readLaunchParams()); });

/* ================= boot ================= */
applyChrome();
fetchWeather();
startService();
heartbeat();
setInterval(startService, 30 * 60000);
probeEzan();
setInterval(playerTick, 1000);
fetchMeta().catch(() => {});
setInterval(() => tick(false), 1000);
setInterval(fetchWeather, 30 * 60000);
setInterval(() => { if (view === 'home' && Date.now() > soonUntil + 30000) { const c = cityNow(); const h = hijri(); rotateReminder(timesFor(0), new Date(), c, h); } }, 20000);
// Re-render when the TV wakes from standby (timers may have been paused)
let hiddenTimer = null;
document.addEventListener('visibilitychange', () => {
  clearTimeout(hiddenTimer);
  if (!document.hidden) { tick(true); return; }
  alog('Noor went to the background');
  // exact timer for the next pre-wake (setInterval may be throttled in the background)
  try { const t = timesFor(0), t1 = timesFor(1), now = Date.now(); let next = null;
    ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach((k) => { [t[k], t1[k]].forEach((d) => {
      [d.getTime() - LEAD, S.iqamah ? d.getTime() + (S.iq[k] || 0) * 60000 : 0].forEach((ts) => { const ms = ts - now; if (ms > 0 && (next === null || ms < next)) next = ms; }); }); });
    if (next !== null) hiddenTimer = setTimeout(() => { tick(false); if (document.hidden) document.dispatchEvent(new Event('visibilitychange')); }, next + 500);
  } catch (e) { /* ignore */ }
});

// debug hooks for testing in a desktop browser
setTimeout(() => handleLaunch(readLaunchParams()), 300);
window.__noor = { handleLaunch: handleLaunch, S: S, showAdhan: showAdhan, openAdhkar: openAdhkar, openIndex: openIndex, openPlayer: openPlayer, openSettings: openSettings, closePanels: closePanels };
