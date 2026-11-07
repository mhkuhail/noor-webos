#!/usr/bin/env node
/*
 * noor-helper — wakes the LG TV before each prayer and opens Noor so the adhan plays on time.
 *
 *   node noor-helper.mjs pair            first-time pairing (accept the prompt on the TV)
 *   node noor-helper.mjs times           show today's schedule
 *   node noor-helper.mjs test [prayer]   wake the TV now and play that adhan (default: dhuhr)
 *   node noor-helper.mjs                 run forever (installed as a background service)
 *
 * How it works, each prayer:
 *   T-60s  if the TV is off: send Wake-on-LAN, wait until it answers
 *          set the volume (optional), launch com.noor.webos with {prayer, at}
 *   T      Noor plays the adhan (its own clock)
 *   T+N    renew Developer Mode once a day (LG's official method: launch com.palmdts.devmode with
 *          {extend:true}), then turn the TV back off if it was off before (optional)
 *
 *   node noor-helper.mjs renew           renew the Developer Mode session now (TV must be on)
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import LGTV, { wake } from 'lgtv2';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CFG_PATH = process.env.NOOR_CONFIG || path.join(DIR, 'config.json');
const STATE_DIR = path.join(DIR, 'state');
fs.mkdirSync(STATE_DIR, { recursive: true });
if (!fs.existsSync(CFG_PATH)) { console.error('Missing config.json — run: cp config.example.json config.json  and set tvIp'); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));

const CITIES = {
  riyadh:   { lat: 24.7136, lng: 46.6753, method: 'UmmAlQura' },
  makkah:   { lat: 21.4225, lng: 39.8262, method: 'UmmAlQura' },
  istanbul: { lat: 41.0082, lng: 28.9784, method: 'Turkey' },
};
const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const APP_ID = 'com.noor.webos';
const LEAD_MS = (cfg.wakeSecondsBefore ?? 60) * 1000;
const KEYFILE = path.join(STATE_DIR, 'tv-key');

const log = (...a) => console.log(new Date().toISOString().replace('T', ' ').slice(0, 19), ...a);

/* ---------- prayer times (same library + methods as the TV app) ---------- */
function place() {
  const c = CITIES[cfg.city] || {};
  return { lat: cfg.lat ?? c.lat, lng: cfg.lng ?? c.lng, method: cfg.method ?? c.method ?? 'UmmAlQura', tz: cfg.utcOffsetMinutes ?? 180 };
}
function timesFor(dayOffset = 0) {
  const p = place();
  const city = new Date(Date.now() + p.tz * 60000); city.setUTCDate(city.getUTCDate() + dayOffset);
  const date = new Date(city.getUTCFullYear(), city.getUTCMonth(), city.getUTCDate());
  const pt = new PrayerTimes(new Coordinates(p.lat, p.lng), date, CalculationMethod[p.method]());
  return Object.fromEntries(PRAYERS.map((k) => [k, pt[k]]));
}
const fmt = (d) => new Date(d.getTime() + place().tz * 60000).toISOString().slice(11, 16);

/* ---------- TV connection ---------- */
function connect({ timeoutMs = 8000, allowPrompt = false } = {}) {
  return new Promise((resolve, reject) => {
    const tv = new LGTV({ host: cfg.tvIp, keyFile: KEYFILE, reconnect: 0, timeout: 10000, handshakeTimeout: 5000 });
    let done = false;
    const finish = (err) => {
      if (done) return; done = true; clearTimeout(t);
      if (err) { try { tv.disconnect(); } catch (e) { /* ignore */ } reject(err); } else resolve(tv);
    };
    const t = setTimeout(() => finish(new Error('TV did not answer')), allowPrompt ? 60000 : timeoutMs);
    tv.on('connect', () => finish());
    tv.on('prompt', () => { if (allowPrompt) log('>>> Accept the connection request on the TV screen with the remote <<<'); else finish(new Error('TV is not paired yet — run: node noor-helper.mjs pair')); });
    tv.on('mac', (m) => fs.writeFileSync(path.join(STATE_DIR, 'tv-mac.json'), JSON.stringify(m)));
    tv.on('error', () => { /* retried via timeout */ });
  });
}
const req = (tv, uri, payload = {}) => new Promise((res) => tv.request(uri, payload, (err, r) => res(err ? { error: String(err) } : r)));

function macs() {
  const list = [].concat(cfg.tvMac || []);
  try { const m = JSON.parse(fs.readFileSync(path.join(STATE_DIR, 'tv-mac.json'), 'utf8')); Object.values(m || {}).forEach((x) => x && list.push(x)); } catch (e) { /* none saved */ }
  return [...new Set(list.filter(Boolean))];
}

async function wakeAndConnect(maxMs = 75000) {
  try { return { tv: await connect({ timeoutMs: 4000 }), wasOn: true }; } catch (e) { if (/paired/.test(e.message)) { log('✗', e.message); throw e; } }
  const m = macs();
  if (!m.length) throw new Error('TV MAC unknown — set "tvMac" in config.json or pair once while the TV is on');
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    log('Wake-on-LAN ->', m.join(', '));
    for (const addr of [].concat(cfg.broadcast || '255.255.255.255')) await wake(m, Object.assign({ address: addr }, cfg.wolPort ? { port: cfg.wolPort } : {})).catch(() => {});
    try { return { tv: await connect({ timeoutMs: 6000 }), wasOn: false }; } catch (e) { /* keep trying */ }
  }
  throw new Error('TV did not wake up');
}

/* ---------- Developer Mode renewal ---------- */
const RENEW = path.join(STATE_DIR, 'renew.json');
const DEVMODE_ID = 'com.palmdts.devmode';
function lastRenew() { try { return JSON.parse(fs.readFileSync(RENEW, 'utf8')).at || 0; } catch (e) { return 0; } }
const renewDue = () => (cfg.renewDevMode ?? true) && Date.now() - lastRenew() > (cfg.renewEveryHours ?? 24) * 3600000;
async function renewDevMode(tv, { backToNoor = true } = {}) {
  log('renewing Developer Mode session…');
  const r = await req(tv, 'ssap://system.launcher/launch', { id: DEVMODE_ID, params: { extend: true } });
  if (!(r && r.returnValue)) { log('✗ renewal failed', JSON.stringify(r)); return false; }
  await new Promise((res) => setTimeout(res, 8000));            // let the Developer Mode app extend the session
  fs.writeFileSync(RENEW, JSON.stringify({ at: Date.now(), when: new Date().toISOString() }));
  log('✓ Developer Mode session renewed');
  if (backToNoor) await req(tv, 'ssap://system.launcher/launch', { id: APP_ID });
  return true;
}

/* ---------- one prayer ---------- */
async function runPrayer(prayer, at, { test = false } = {}) {
  log(`▶ ${prayer} at ${fmt(at)}${test ? ' (test)' : ''}`);
  let tv, wasOn;
  try { ({ tv, wasOn } = await wakeAndConnect()); } catch (e) { log('✗', e.message); return; }
  log(wasOn ? 'TV was already on' : 'TV woke up');
  if (!wasOn) await new Promise((r) => setTimeout(r, (cfg.bootWaitSeconds ?? 6) * 1000)); // let the launcher settle
  if (Number.isFinite(cfg.adhanVolume)) log('volume', cfg.adhanVolume, (await req(tv, 'ssap://audio/setVolume', { volume: cfg.adhanVolume })).returnValue ? 'ok' : '');
  const r = await req(tv, 'ssap://system.launcher/launch', { id: APP_ID, params: { prayer, at: at.getTime(), source: 'noor-helper', test } });
  log(r && r.returnValue ? '✓ Noor launched' : '✗ launch failed ' + JSON.stringify(r));
  tv.disconnect();
  const offMin = cfg.turnOffAfterMinutes ?? 7;
  const turnOff = !wasOn && offMin > 0;
  if (!turnOff && !renewDue()) return;
  // after the adhan has finished: renew Developer Mode (once a day), then turn the TV off if it was off
  const afterMin = turnOff ? offMin : Math.max(6, cfg.renewAfterAdhanMinutes ?? 6);
  const when = Math.max(at.getTime(), Date.now()) + afterMin * 60000;
  log(`after the adhan (${fmt(new Date(when))}): ${[renewDue() && 'renew Developer Mode', turnOff && 'turn TV off'].filter(Boolean).join(' + ')}`);
  setTimeout(async () => {
    try {
      const t2 = await connect({ timeoutMs: 8000 });
      const fg = await req(t2, 'ssap://com.webos.applicationManager/getForegroundAppInfo');
      const busy = fg && fg.appId && fg.appId !== APP_ID && fg.appId !== DEVMODE_ID;
      if (busy) { log(`TV is in use (${fg.appId}) — not interrupting; will renew after a later prayer`); t2.disconnect(); return; }
      if (renewDue()) await renewDevMode(t2, { backToNoor: !turnOff });
      if (turnOff) { await req(t2, 'ssap://system/turnOff'); log('TV turned off'); }
      t2.disconnect();
    } catch (e) { log('post-adhan step skipped:', e.message); }
  }, when - Date.now());
}

/* ---------- scheduler: polls every 10 s so it survives sleep / clock changes ---------- */
const DONE = path.join(STATE_DIR, 'done.json');
let done = {}; try { done = JSON.parse(fs.readFileSync(DONE, 'utf8')); } catch (e) { /* first run */ }
function loop() {
  const now = Date.now();
  for (const off of [0, 1]) {
    const t = timesFor(off);
    for (const p of PRAYERS) {
      if ((cfg.prayers || PRAYERS).indexOf(p) < 0) continue;
      const at = t[p]; const key = at.toISOString().slice(0, 10) + ':' + p;
      const startAt = at.getTime() - LEAD_MS;
      // fire from T-lead until T+2min (covers a late wake-up of this computer)
      if (now >= startAt && now < at.getTime() + 120000 && !done[key]) {
        done[key] = 1; fs.writeFileSync(DONE, JSON.stringify(Object.fromEntries(Object.entries(done).slice(-40))));
        runPrayer(p, at);
      }
    }
  }
}

/* ---------- CLI ---------- */
const [cmd, arg] = process.argv.slice(2);
if (cmd === 'times') {
  const t = timesFor(0); const p = place();
  console.log(`City: ${cfg.city || `${p.lat},${p.lng}`}  method: ${p.method}  wake: ${LEAD_MS / 1000}s before`);
  PRAYERS.forEach((k) => console.log(`  ${k.padEnd(8)} ${fmt(t[k])}   (TV wakes ${fmt(new Date(t[k] - LEAD_MS))})`));
} else if (cmd === 'pair') {
  log('Pairing with', cfg.tvIp, '— the TV must be ON');
  connect({ allowPrompt: true }).then(async (tv) => {
    const info = await req(tv, 'ssap://system/getSystemInfo');
    log('✓ Paired' + (info && info.modelName ? ' with ' + info.modelName : '') + '. Key saved in state/.');
    const apps = await req(tv, 'ssap://com.webos.applicationManager/listLaunchPoints');
    const has = apps && apps.launchPoints && apps.launchPoints.some((a) => a.id === APP_ID);
    log(has ? '✓ Noor is installed on the TV' : '⚠ Noor (com.noor.webos) not found on the TV — install the .ipk first');
    setTimeout(() => { tv.disconnect(); process.exit(0); }, 1500);
  }).catch((e) => { log('✗', e.message); process.exit(1); });
} else if (cmd === 'renew') {
  connect({ timeoutMs: 8000 }).then(async (tv) => { await renewDevMode(tv, { backToNoor: false }); tv.disconnect(); process.exit(0); })
    .catch((e) => { log('✗', e.message, '(the TV must be on and paired)'); process.exit(1); });
} else if (cmd === 'test') {
  runPrayer(arg || 'dhuhr', new Date(), { test: true }).then(() => setTimeout(() => process.exit(0), (cfg.turnOffAfterMinutes ?? 7) * 60000 + 30000));
} else {
  log(`noor-helper running on ${os.hostname()} for TV ${cfg.tvIp}`);
  const t = timesFor(0); log('today:', PRAYERS.map((k) => `${k} ${fmt(t[k])}`).join(' · '));
  const lr = lastRenew(); log('Developer Mode last renewed:', lr ? new Date(lr).toISOString().slice(0, 16).replace('T', ' ') : 'never (will renew after the next prayer)');
  loop(); setInterval(loop, 10000);
}
