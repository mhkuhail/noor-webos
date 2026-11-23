package com.noor.tv;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.util.Calendar;

/**
 * Prayer alarms, the salawat reminder, and re-arming after boot / update / clock changes.
 *
 * One minute before each adhan:
 *  - screen off (standby)      → wake the box (CEC turns the TV on) and open Noor, which plays the adhan on time
 *  - Noor already in front      → hand it the prayer (it shows "adhan in one minute")
 *  - another app in front       → "interrupt" (default): open Noor over it · "banner only": a banner while a film plays
 */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        Context app = c.getApplicationContext();
        String action = i.getAction() == null ? "" : i.getAction();
        if (Scheduler.SALAWAT.equals(action)) {
            salawat(app);
            return;
        }
        if (!Scheduler.FIRE.equals(action)) {      // boot, package replaced, time or time zone changed
            NLog.w(app, "re-armed after " + action.replace("android.intent.action.", ""));
            Scheduler.schedule(app);
            if (Scheduler.cfg(app).optBoolean("phone", true)) MessageServer.start(app);
            return;
        }
        try {
            JSONObject ev = new JSONObject(i.getStringExtra("ev"));
            Scheduler.markDone(app, ev.getString("type"), ev.getLong("at"));
            handle(app, ev);
        } catch (Exception e) {
            NLog.w(app, "alarm error " + e);
        }
        Scheduler.schedule(app);
    }

    private static void handle(Context app, JSONObject ev) throws Exception {
        String type = ev.getString("type"), k = ev.getString("prayer");
        long at = ev.getLong("at");
        boolean ar = Scheduler.ar(app);
        if ("iqamah".equals(type)) {
            if (MainActivity.visible) return;                 // Noor shows its own iqamah banner and tone
            if (!Wake.screenIsOn(app)) return;
            Overlay.banner(app, (ar ? "حان موعد إقامة صلاة " : "Iqamah time for ") + Wake.name(app, k), 20_000);
            NLog.w(app, "iqamah " + k + " → banner");
            return;
        }
        boolean trial = "trial".equals(type);
        JSONObject params = new JSONObject().put("prayer", k).put("at", at).put("source", "android").put("trial", trial);
        boolean on = Wake.screenIsOn(app);
        if (!on) {
            NLog.w(app, k + ": screen was off → waking the box");
            Wake.screenOn(app);
            params.put("screenWasOff", true);
            Wake.launchNoor(app, params);
            return;
        }
        if (MainActivity.visible) {
            NLog.w(app, k + ": Noor is in front");
            Wake.launchNoor(app, params);
            return;
        }
        String mode = Scheduler.cfg(app).optString("mode", "interrupt");
        if ("banner".equals(mode) && Wake.watching(app)) {
            String soon = (ar ? "يحين بعد دقيقة أذان " : "In one minute: adhan of ") + Wake.name(app, k);
            String now = (ar ? "حان الآن موعد أذان " : "It is now time for the adhan of ") + Wake.name(app, k);
            Overlay.banner(app, soon, (int) Math.max(5_000, at - System.currentTimeMillis()));
            new Handler(Looper.getMainLooper()).postDelayed(() -> Overlay.banner(app, now, 60_000),
                    Math.max(0, at - System.currentTimeMillis()));
            NLog.w(app, k + ": film playing → banner only");
            return;
        }
        NLog.w(app, k + ": bringing Noor over the current app");
        Wake.launchNoor(app, params);
    }

    /** Noor TV's reminder line: salawat, and on Friday (before Maghrib) Al-Kahf first. Never over Noor itself. */
    private static void salawat(Context app) {
        if (MainActivity.visible || !Wake.screenIsOn(app) || !Overlay.allowed(app)) return;
        boolean ar = Scheduler.ar(app);
        Calendar now = Calendar.getInstance();
        boolean friday = now.get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY && now.get(Calendar.HOUR_OF_DAY) < 17;
        String sal = ar ? "صلّ على النبي ﷺ" : "Send salawat upon the Prophet ﷺ";
        if (!friday) {
            Overlay.line(app, sal, 10_000);
            return;
        }
        Overlay.line(app, ar ? "اليوم الجمعة... لا تنسى سورة الكهف" : "It's Friday — don't forget Surat Al-Kahf", 10_000);
        new Handler(Looper.getMainLooper()).postDelayed(() -> Overlay.line(app, sal, 10_000), 10_500);
    }
}
