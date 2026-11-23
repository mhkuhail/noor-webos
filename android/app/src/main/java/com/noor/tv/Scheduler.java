package com.noor.tv;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.SystemClock;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Keeps the next prayer event armed in the system AlarmManager, so the adhan works with Noor closed, another app
 * in front or the box asleep. The web app hands over 30 days of prayer times (computed with the same adhan-js as
 * the LG version) every time it starts or settings change; only the next event is ever armed, and every firing
 * arms the one after it.
 */
final class Scheduler {
    static final String FIRE = "com.noor.tv.FIRE";
    static final String SALAWAT = "com.noor.tv.SALAWAT";
    static final long LEAD = 60_000;            // Noor comes up one minute before the adhan, like the LG service
    static final long SALAWAT_EVERY = 45 * 60_000L;
    static final String[] KEYS = {"fajr", "dhuhr", "asr", "maghrib", "isha"};

    private Scheduler() {
    }

    static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences("noor", Context.MODE_PRIVATE);
    }

    static JSONObject cfg(Context c) {
        try {
            return new JSONObject(prefs(c).getString("cfg", "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static boolean ar(Context c) {
        return !"en".equals(cfg(c).optString("lang", "ar"));
    }

    /** Called by the web app's service "start" with its settings and upcoming times. */
    static JSONObject configure(Context c, JSONObject p) {
        SharedPreferences.Editor e = prefs(c).edit();
        JSONArray days = p.optJSONArray("days");
        if (days != null) {
            e.putString("days", days.toString());
            p.remove("days");
        }
        e.putString("cfg", p.toString()).apply();
        schedule(c);
        if (p.optBoolean("phone", true)) MessageServer.start(c);
        else c.stopService(new Intent(c, MessageServer.class));
        return next(c);
    }

    static void trial(Context c, String prayer, long at) {
        prefs(c).edit().putString("trial", prayer).putLong("trialAt", at).apply();
        NLog.w(c, "TEST scheduled: Noor should appear in " + Math.round((at - LEAD - System.currentTimeMillis()) / 1000.0) + " s");
        schedule(c);
    }

    /** One upcoming event: {type: adhan|iqamah|trial, prayer, at (prayer time), when (alarm time)}. */
    static JSONObject nextEvent(Context c) {
        long now = System.currentTimeMillis();
        JSONObject cfg = cfg(c);
        JSONObject iq = cfg.optJSONObject("iqamah");
        boolean adhanOn = cfg.optBoolean("adhan", true);
        String done = prefs(c).getString("done", "");
        JSONObject best = null;
        try {
            JSONArray days = new JSONArray(prefs(c).getString("days", "[]"));
            for (int i = 0; i < days.length(); i++) {
                JSONObject d = days.getJSONObject(i);
                String k = d.getString("k");
                long at = d.getLong("at");
                long pre = at - LEAD;
                // Up to 2 minutes late still counts (the box may have been waking up).
                if (adhanOn && pre > now - 120_000 && !done.contains("|a" + at)) best = earlier(best, "adhan", k, at, Math.max(pre, now + 1000));
                if (iq != null && !d.optBoolean("fri")) {
                    int mins = iq.optInt(k, 0);
                    long t = at + mins * 60_000L;
                    if (mins > 0 && t > now && !done.contains("|i" + at)) best = earlier(best, "iqamah", k, at, t);
                }
                if (best != null && at - LEAD > best.getLong("when") + 86_400_000L) break;
            }
            long trialAt = prefs(c).getLong("trialAt", 0);
            if (trialAt > now - 120_000) best = earlier(best, "trial", prefs(c).getString("trial", "dhuhr"), trialAt, Math.max(trialAt - LEAD, now + 1000));
        } catch (Exception e) {
            NLog.w(c, "schedule error " + e);
        }
        return best;
    }

    private static JSONObject earlier(JSONObject best, String type, String k, long at, long when) throws Exception {
        if (best != null && best.getLong("when") <= when) return best;
        return new JSONObject().put("type", type).put("prayer", k).put("at", at).put("when", when);
    }

    static JSONObject next(Context c) {
        JSONObject n = new JSONObject();
        try {
            JSONArray days = new JSONArray(prefs(c).getString("days", "[]"));
            long now = System.currentTimeMillis();
            for (int i = 0; i < days.length(); i++) {
                JSONObject d = days.getJSONObject(i);
                if (d.getLong("at") > now) return n.put("prayer", d.getString("k")).put("at", d.getLong("at"));
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    /** Marks an event handled so a late duplicate alarm never plays it twice. */
    static void markDone(Context c, String type, long at) {
        String tag = ("iqamah".equals(type) ? "|i" : "|a") + at;
        String done = prefs(c).getString("done", "") + tag;
        if (done.length() > 600) done = done.substring(done.length() - 600);
        SharedPreferences.Editor e = prefs(c).edit().putString("done", done);
        if ("trial".equals(type)) e.remove("trialAt");
        e.apply();
    }

    static void schedule(Context c) {
        Context app = c.getApplicationContext();
        AlarmManager am = app.getSystemService(AlarmManager.class);
        JSONObject ev = nextEvent(app);
        Intent fire = new Intent(app, AlarmReceiver.class).setAction(FIRE);
        if (ev != null) fire.putExtra("ev", ev.toString());
        PendingIntent pi = PendingIntent.getBroadcast(app, 1, fire, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        am.cancel(pi);
        if (ev != null) {
            long when = ev.optLong("when");
            boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
            try {
                if (exact) {
                    // An "alarm clock" alarm is the one Android never defers, even in deep idle.
                    PendingIntent show = PendingIntent.getActivity(app, 2, new Intent(app, MainActivity.class), PendingIntent.FLAG_IMMUTABLE);
                    am.setAlarmClock(new AlarmManager.AlarmClockInfo(when, show), pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
                }
            } catch (SecurityException se) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
                exact = false;
            }
            prefs(app).edit().putString("armed", ev.toString()).putBoolean("exact", exact).apply();
        } else {
            prefs(app).edit().remove("armed").apply();
        }
        // Salawat line every 45 minutes (Noor TV's reminder), only while enabled.
        PendingIntent sp = PendingIntent.getBroadcast(app, 3, new Intent(app, AlarmReceiver.class).setAction(SALAWAT),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        am.cancel(sp);
        if (cfg(app).optBoolean("salawat", true)) {
            am.setInexactRepeating(AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + SALAWAT_EVERY, SALAWAT_EVERY, sp);
        }
    }

    /** For the diagnostics screen. */
    static JSONObject summary(Context c) {
        JSONObject s = new JSONObject();
        try {
            s.put("armed", new JSONObject(prefs(c).getString("armed", "{}")));
            s.put("exactAlarms", prefs(c).getBoolean("exact", false));
            JSONArray days = new JSONArray(prefs(c).getString("days", "[]"));
            if (days.length() > 0) s.put("timesUntil", new java.util.Date(days.getJSONObject(days.length() - 1).getLong("at")).toString());
        } catch (Exception ignored) {
        }
        return s;
    }
}
