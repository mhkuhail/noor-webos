package com.noor.tv;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.PowerManager;

import org.json.JSONObject;

import java.util.List;

/** Turning the screen on and bringing Noor to the front, from anywhere (alarm, background, standby). */
final class Wake {
    private Wake() {
    }

    static boolean screenIsOn(Context c) {
        return c.getSystemService(PowerManager.class).isInteractive();
    }

    /**
     * Wakes the box. On an HDMI box (STC TV, Fire TV, Chromecast…) waking sends HDMI-CEC "One Touch Play", so a TV
     * with CEC enabled (Sony: Bravia Sync) turns on and switches to the box.
     */
    @SuppressWarnings("deprecation")
    static void screenOn(Context c) {
        PowerManager pm = c.getSystemService(PowerManager.class);
        if (pm.isInteractive()) return;
        PowerManager.WakeLock wl = pm.newWakeLock(PowerManager.SCREEN_BRIGHT_WAKE_LOCK
                | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE, "noor:adhan");
        wl.acquire(20_000);
    }

    /** Opens Noor (or hands it new launch parameters if it is already open). */
    static void launchNoor(Context c, JSONObject params) {
        Context app = c.getApplicationContext();
        Intent i = new Intent(app, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                .putExtra("params", params.toString());
        boolean canStart = Build.VERSION.SDK_INT < 29 || Overlay.allowed(app) || MainActivity.visible;
        if (canStart) {
            try {
                app.startActivity(i);
                return;
            } catch (Exception e) {
                NLog.w(app, "startActivity failed: " + e.getMessage());
            }
        }
        // Android 10+ without the overlay permission: a full-screen notification is the allowed way to open an activity.
        NotificationManager nm = app.getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel("adhan", "الأذان", NotificationManager.IMPORTANCE_HIGH));
        PendingIntent pi = PendingIntent.getActivity(app, 4, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        String prayer = params.optString("prayer", "");
        Notification n = new Notification.Builder(app, "adhan")
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(Scheduler.ar(app) ? "نور" : "Noor")
                .setContentText(name(app, prayer))
                .setCategory(Notification.CATEGORY_ALARM)
                .setFullScreenIntent(pi, true)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        nm.notify(7, n);
        NLog.w(app, "opened through full-screen notification (grant the overlay permission for a direct start)");
    }

    /** True while a film, a channel or another app is playing — used by the "banner only" setting. */
    static boolean watching(Context c) {
        if (c.getSystemService(AudioManager.class).isMusicActive()) return true;
        String top = topApp(c);
        return top != null && !top.equals(c.getPackageName()) && !isLauncher(c, top);
    }

    static boolean isLauncher(Context c, String pkg) {
        Intent home = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME);
        List<ResolveInfo> l = c.getPackageManager().queryIntentActivities(home, 0);
        for (ResolveInfo r : l) if (pkg.equals(r.activityInfo.packageName)) return true;
        return false;
    }

    /** The app in front, from usage events (needs PACKAGE_USAGE_STATS, granted over adb), or null if unknown. */
    static String topApp(Context c) {
        try {
            UsageStatsManager usm = c.getSystemService(UsageStatsManager.class);
            long now = System.currentTimeMillis();
            UsageEvents ev = usm.queryEvents(now - 6 * 3600_000L, now);
            UsageEvents.Event e = new UsageEvents.Event();
            String top = null;
            while (ev.hasNextEvent()) {
                ev.getNextEvent(e);
                if (e.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) top = e.getPackageName();
            }
            return top;
        } catch (Exception e) {
            return null;
        }
    }

    static String name(Context c, String k) {
        boolean ar = Scheduler.ar(c);
        switch (k) {
            case "fajr": return ar ? "الفجر" : "Fajr";
            case "dhuhr": return ar ? "الظهر" : "Dhuhr";
            case "asr": return ar ? "العصر" : "Asr";
            case "maghrib": return ar ? "المغرب" : "Maghrib";
            case "isha": return ar ? "العشاء" : "Isha";
            case "jumuah": return ar ? "الجمعة" : "Jumu'ah";
            default: return k;
        }
    }
}
