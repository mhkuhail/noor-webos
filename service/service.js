/*
 * com.noor.webos.service — Noor's background service on the TV (Developer Mode, no root).
 *
 * Keeps running while the TV is on (screen on OR "screen off" mode) and, for every prayer:
 *   T-60s  turn the screen on (if it was off), bring Noor to the front with {prayer, at}
 *   T      Noor plays the adhan itself
 *   T+6m   once a day: renew Developer Mode (LG's official extend), then hand control back
 *
 * Methods (luna://com.noor.webos.service/...):
 *   start  {lat,lng,method,tz,prayers,renew}   (called by Noor on every launch)
 *   status {}                                   alive / next prayer / last actions / capability results
 *   test   {what:'launch'|'screen'|'power'}     used by Noor's capability check
 *
 * Written for webOS 4.x (Node 8): no async/await.
 */
var Service = require('webos-service');
var fs = require('fs');
var path = require('path');
var adhan = require('adhan');

var SERVICE_ID = 'com.noor.webos.service';
var APP_ID = 'com.noor.webos';
var DEVMODE_ID = 'com.palmdts.devmode';
var PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
var LEAD_MS = 60000;

var service = new Service(SERVICE_ID);
var STATE_FILE = path.join(__dirname, 'state.json');
var state = { cfg: null, done: {}, lastRenew: 0, log: [] };
try { state = Object.assign(state, JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))); } catch (e) { /* first run */ }
function persist() { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch (e) { /* read-only: keep in memory */ } }
function log(msg) {
  var line = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' ' + msg;
  console.log('[noor] ' + line);
  state.log.push(line); if (state.log.length > 40) state.log = state.log.slice(-40);
}

/* ---------- luna helper ---------- */
function luna(uri, params, cb) {
  service.call(uri, params || {}, function (m) {
    var p = (m && m.payload) || {};
    if (cb) cb(p.returnValue === false ? (p.errorText || p.errorMessage || 'failed') : null, p);
  });
}
// webOS 4.x uses com.webos.applicationManager; newer use com.webos.service.applicationManager
function launch(id, params, cb) {
  luna('luna://com.webos.applicationManager/launch', { id: id, params: params || {} }, function (err, r) {
    if (!err) return cb && cb(null, r);
    luna('luna://com.webos.service.applicationManager/launch', { id: id, params: params || {} }, cb);
  });
}
function foreground(cb) { luna('luna://com.webos.applicationManager/getForegroundAppInfo', {}, function (e, r) { cb(e ? null : (r && r.appId)); }); }
function powerState(cb) { luna('luna://com.webos.service.tvpower/power/getPowerState', {}, function (e, r) { cb(e, r && r.state); }); }
function screenOn(cb) { luna('luna://com.webos.service.tvpower/power/turnOnScreen', {}, cb); }
function screenOff(cb) { luna('luna://com.webos.service.tvpower/power/turnOffScreen', {}, cb); }

/* ---------- prayer times (same library + methods as the app) ---------- */
function timesFor(dayOffset) {
  var c = state.cfg; var tz = c.tz == null ? 180 : c.tz;
  var city = new Date(Date.now() + tz * 60000); city.setUTCDate(city.getUTCDate() + dayOffset);
  var date = new Date(city.getUTCFullYear(), city.getUTCMonth(), city.getUTCDate());
  var pt = new adhan.PrayerTimes(new adhan.Coordinates(c.lat, c.lng), date, adhan.CalculationMethod[c.method || 'UmmAlQura']());
  var out = {}; PRAYERS.forEach(function (k) { out[k] = pt[k]; }); return out;
}
function nextPrayer() {
  if (!state.cfg) return null; var now = Date.now();
  for (var d = 0; d < 2; d++) { var t = timesFor(d);
    for (var i = 0; i < PRAYERS.length; i++) { var k = PRAYERS[i]; if (t[k].getTime() > now) return { prayer: k, at: t[k].getTime() }; } }
  return null;
}

/* ---------- the prayer routine ---------- */
var screenWasOff = false;
var NAMES = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
function doPrayer(prayer, at) {
  log('prayer ' + prayer + ' at ' + new Date(at).toISOString().slice(11, 16) + 'Z');
  toast('يحين بعد دقيقة أذان ' + (NAMES[prayer] || prayer));
  powerState(function (e, ps) {
    screenWasOff = !!(ps && /screen ?off/i.test(ps));
    var go = function () {
      launch(APP_ID, { prayer: prayer, at: at, source: 'service', screenWasOff: screenWasOff }, function (err) {
        log(err ? 'launch failed: ' + err : 'Noor brought to front');
      });
    };
    if (screenWasOff) screenOn(function (err) { log(err ? 'turnOnScreen failed: ' + err : 'screen turned on'); go(); });
    else go();
  });
  // once a day, after the adhan: renew Developer Mode without interrupting anyone
  if ((state.cfg.renew !== false) && Date.now() - state.lastRenew > 20 * 3600000) {
    setTimeout(function () {
      foreground(function (fg) {
        if (fg && fg !== APP_ID && fg !== DEVMODE_ID) { log('renew postponed: TV in use (' + fg + ')'); return; }
        launch(DEVMODE_ID, { extend: true }, function (err) {
          if (err) { log('devmode renew failed: ' + err); return; }
          state.lastRenew = Date.now(); persist(); log('Developer Mode renewed');
          setTimeout(function () { launch(APP_ID, { afterRenew: true, screenWasOff: screenWasOff }); }, 8000);
        });
      });
    }, 6 * 60000);
  }
}

function loop() {
  if (!state.cfg) return;
  var now = Date.now();
  // iqamah notifications (Friday Dhuhr = Jumu'ah: no iqamah alert)
  if (state.cfg.iqamah) {
    var t0 = timesFor(0); var tz = state.cfg.tz == null ? 180 : state.cfg.tz;
    var fri = new Date(now + tz * 60000).getUTCDay() === 5;
    PRAYERS.forEach(function (k) {
      if (k === 'dhuhr' && fri) return;
      var mins = state.cfg.iqamah[k]; if (!mins) return;
      var at = t0[k].getTime() + mins * 60000; var key = new Date(at).toISOString().slice(0, 10) + ':iq:' + k;
      if (now >= at && now < at + 90000 && !state.done[key]) {
        state.done[key] = 1; persist(); log('iqamah ' + k); toast('حان موعد إقامة صلاة ' + (NAMES[k] || k));
      }
    });
  }
  [0, 1].forEach(function (d) {
    var t = timesFor(d);
    PRAYERS.forEach(function (k) {
      if (state.cfg.prayers && state.cfg.prayers.indexOf(k) < 0) return;
      var at = t[k].getTime(); var key = new Date(at).toISOString().slice(0, 10) + ':' + k;
      if (now >= at - LEAD_MS && now < at + 120000 && !state.done[key]) {
        state.done[key] = 1;
        var keys = Object.keys(state.done); if (keys.length > 30) keys.slice(0, keys.length - 30).forEach(function (x) { delete state.done[x]; });
        persist(); doPrayer(k, at);
      }
    });
  });
}

/* ---------- stay alive ---------- */
var keepAlive = null, timer = null;
function ensureRunning() {
  if (!keepAlive) {
    keepAlive = true;
    try {
      service.activityManager.create('noor-keepalive', function (activity) { keepAlive = activity || true; log('keep-alive activity ' + (activity ? 'held' : 'not granted')); });
    } catch (e) { log('keep-alive failed: ' + e.message); }
  }
  if (!timer) { timer = setInterval(loop, 10000); loop(); setInterval(scheduleActivities, 3 * 3600000); }
}

/* ---------- methods ---------- */
service.register('start', function (msg) {
  var p = msg.payload || {};
  if (p.lat != null) state.cfg = { lat: p.lat, lng: p.lng, method: p.method, tz: p.tz, prayers: p.prayers, renew: p.renew, iqamah: p.iqamah || null };
  persist(); ensureRunning(); loop(); scheduleActivities();
  var n = nextPrayer();
  msg.respond({ returnValue: true, running: true, next: n, lastRenew: state.lastRenew });
});
service.register('status', function (msg) {
  msg.respond({ returnValue: true, running: !!timer, cfg: !!state.cfg, next: nextPrayer(), lastRenew: state.lastRenew, sched: state.sched, subscribers: Object.keys(subs).length, log: state.log.slice(-15) });
});
function callWithTimeout(uri, params, ms, cb) {
  var done = false; var t = setTimeout(function () { if (!done) { done = true; cb('timeout'); } }, ms);
  luna(uri, params, function (e, r) { if (done) return; done = true; clearTimeout(t); cb(e, r); });
}
var LIST_METHODS = [
  ['luna://com.webos.applicationManager/listLaunchPoints', {}],
  ['luna://com.webos.service.applicationManager/listLaunchPoints', {}],
  ['luna://com.webos.applicationManager/listApps', {}],
  ['luna://com.webos.service.applicationManager/listApps', {}],
];
/* ---------- notifications ---------- */
function toast(message) {
  luna('luna://com.webos.notification/createToast', { sourceId: APP_ID, message: message, noaction: false, onclick: { appId: APP_ID } }, function (e) {
    if (e) log('toast failed: ' + e);
  });
}
service.register('toast', function (msg) { toast((msg.payload || {}).message || 'Noor'); msg.respond({ returnValue: true }); });

/* ---------- heartbeat: Noor keeps a subscription open so webOS doesn't stop this service ---------- */
var subs = {};
service.register('heartbeat', function (msg) {
  if (msg.isSubscription) subs[msg.uniqueToken] = msg;
  msg.respond({ returnValue: true, subscribed: !!msg.isSubscription, running: true });
}, function (msg) { delete subs[msg.uniqueToken]; });

/* ---------- persistent wake-ups via the system Activity Manager ----------
   Even if webOS stops this service, the Activity Manager starts it again at T-60 s and calls /wake. */
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function utcStamp(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) + ' ' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ':' + pad2(d.getUTCSeconds()); }
var AM = ['luna://com.webos.service.activitymanager/create', 'luna://com.palm.activitymanager/create'];
state.sched = state.sched || {};
function scheduleActivities() {
  if (!state.cfg) return;
  var now = Date.now(); var list = [];
  [0, 1].forEach(function (d) { var t = timesFor(d); PRAYERS.forEach(function (k) {
    if (state.cfg.prayers && state.cfg.prayers.indexOf(k) < 0) return;
    var at = t[k].getTime(); if (at - LEAD_MS > now + 5000) list.push({ k: k, at: at }); }); });
  list.forEach(function (it) {
    var key = new Date(it.at).toISOString().slice(0, 10) + ':' + it.k;
    if (state.sched[key]) return;
    var activity = { name: 'noor.adhan.' + key.replace(/[^0-9a-z]/gi, ''), description: 'Noor adhan ' + it.k,
      type: { foreground: true, persist: true },
      schedule: { start: utcStamp(it.at - LEAD_MS), local: false },
      callback: { method: 'luna://' + SERVICE_ID + '/wake', params: { prayer: it.k, at: it.at } } };
    var i = 0;
    (function tryNext(lastErr) {
      if (i >= AM.length) { state.sched[key] = 'failed'; log('schedule ' + key + ' failed: ' + lastErr); persist(); return; }
      callWithTimeout(AM[i++], { activity: activity, start: true, replace: true, subscribe: false }, 5000, function (e, r) {
        if (e) return tryNext(e);
        state.sched[key] = 'ok'; persist(); log('scheduled ' + key + ' (' + (r && r.activityId) + ')');
      });
    })();
  });
  var ks = Object.keys(state.sched); if (ks.length > 20) ks.slice(0, ks.length - 20).forEach(function (x) { delete state.sched[x]; });
}
service.register('wake', function (msg) {
  var p = msg.payload || {}; var key = new Date(p.at).toISOString().slice(0, 10) + ':' + p.prayer;
  log('wake from Activity Manager: ' + p.prayer);
  ensureRunning();
  if (!state.done[key]) { state.done[key] = 1; persist(); doPrayer(p.prayer, p.at); }
  if (p.$activity && p.$activity.activityId) luna('luna://com.webos.service.activitymanager/complete', { activityId: p.$activity.activityId }, function () {});
  msg.respond({ returnValue: true });
});

service.register('apps', function (msg) {
  var errors = [], i = 0;
  (function next() {
    if (i >= LIST_METHODS.length) return msg.respond({ returnValue: false, errorText: errors.join(' | ') });
    var m = LIST_METHODS[i++];
    callWithTimeout(m[0], m[1], 4000, function (e, r) {
      var list = r && (r.launchPoints || r.apps);
      if (!e && list && list.length) return msg.respond({ returnValue: true, launchPoints: list, via: m[0] });
      errors.push(m[0].replace('luna://', '') + ': ' + (e || 'empty')); next();
    });
  })();
});
service.register('screen', function (msg) {
  var on = !!(msg.payload || {}).on;
  callWithTimeout('luna://com.webos.service.tvpower/power/' + (on ? 'turnOnScreen' : 'turnOffScreen'), {}, 4000, function (e) {
    msg.respond(e ? { returnValue: false, errorText: String(e) } : { returnValue: true });
  });
});
service.register('launch', function (msg) {
  var p = msg.payload || {};
  launch(p.id, p.params || {}, function (e) { msg.respond(e ? { returnValue: false, errorText: String(e) } : { returnValue: true }); });
});
service.register('test', function (msg) {
  var what = (msg.payload || {}).what;
  if (what === 'power') return powerState(function (e, s) { msg.respond({ returnValue: !e, state: s, error: e }); });
  if (what === 'launch') {
    // relaunch Noor from the service: proves the service may bring Noor over other apps
    return launch(APP_ID, { capTest: Date.now() }, function (e) { msg.respond({ returnValue: !e, error: e }); });
  }
  if (what === 'devmode') {
    return luna('luna://com.webos.applicationManager/getAppInfo', { id: DEVMODE_ID }, function (e, r) { msg.respond({ returnValue: !e, installed: !!(r && r.appInfo), error: e }); });
  }
  msg.respond({ returnValue: false, errorText: 'unknown test' });
});

ensureRunning();
log('service started');
