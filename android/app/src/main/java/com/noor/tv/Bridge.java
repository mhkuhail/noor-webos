package com.noor.tv;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Base64;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * The webOS system calls the Noor web app makes (luna://…), answered with Android equivalents. The JS side
 * (android-shim.js) wraps this in a PalmServiceBridge, so src/main.js runs unchanged on LG and on Android.
 */
final class Bridge {
    private static final String SVC = "luna://com.noor.webos.service/";
    private static final String SELF = "com.noor.webos";
    private static final String[] YOUTUBE = {"com.google.android.youtube.tv", "com.google.android.youtube.googletv", "com.google.android.youtube"};

    private final MainActivity act;
    private final Context app;

    Bridge(MainActivity a) {
        act = a;
        app = a.getApplicationContext();
    }

    @JavascriptInterface
    public String launchParams() {
        String p = act.launchParams;
        act.launchParams = "{}";        // once, like webOS: a reload must not replay an old adhan launch
        return p;
    }

    @JavascriptInterface
    public void exit() {
        act.runOnUiThread(act::moveTaskToBack0);
    }

    @JavascriptInterface
    public String info() {
        JSONObject o = new JSONObject();
        try {
            String ip = ip();
            o.put("phoneUrl", ip == null ? "" : "http://" + ip + ":" + MessageServer.PORT);
            o.put("model", Build.MANUFACTURER + " " + Build.MODEL).put("sdk", Build.VERSION.SDK_INT);
            o.put("overlay", Overlay.allowed(app)).put("sleepAdmin", SleepAdmin.active(app));
        } catch (Exception ignored) {
        }
        return o.toString();
    }

    @JavascriptInterface
    public String call(String uri, String paramsJson) {
        try {
            JSONObject p = paramsJson == null || paramsJson.isEmpty() ? new JSONObject() : new JSONObject(paramsJson);
            JSONObject r = route(uri, p);
            if (!r.has("returnValue")) r.put("returnValue", true);
            return r.toString();
        } catch (Exception e) {
            return err(String.valueOf(e.getMessage())).toString();
        }
    }

    private static JSONObject err(String text) {
        try {
            return new JSONObject().put("returnValue", false).put("errorText", text);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private JSONObject route(String uri, JSONObject p) throws Exception {
        String m = uri.substring(uri.lastIndexOf('/') + 1);
        boolean svc = uri.startsWith(SVC);
        if (m.equals("createToast") || (svc && m.equals("toast"))) {
            Overlay.banner(app, p.optString("message", "Noor"), 6000);
            return new JSONObject();
        }
        if (m.equals("launch")) return launch(p.optString("id"), p.optJSONObject("params"));
        if (m.equals("listLaunchPoints") || m.equals("listApps") || (svc && m.equals("apps"))) {
            return new JSONObject().put("launchPoints", apps());
        }
        if (m.equals("turnOnScreen")) return screen(true);
        if (m.equals("turnOffScreen")) return screen(false);
        if (m.equals("getPowerState")) return new JSONObject().put("state", Wake.screenIsOn(app) ? "Active" : "Screen Off");
        if (!svc) return err("not available on Android: " + uri);

        switch (m) {
            case "start":
                JSONObject next = Scheduler.configure(app, p);
                return new JSONObject().put("running", true).put("next", next == null ? JSONObject.NULL : next);
            case "heartbeat":
                return new JSONObject().put("subscribed", false).put("running", true);
            case "screen":
                return screen(p.optBoolean("on", true));
            case "trial": {
                long at = System.currentTimeMillis() + p.optLong("seconds", 180) * 1000;
                Scheduler.trial(app, p.optString("prayer", "dhuhr"), at);
                return new JSONObject().put("at", at);
            }
            case "status": {
                Object next2 = Scheduler.next(app);
                return new JSONObject().put("running", true).put("cfg", Scheduler.prefs(app).contains("cfg"))
                        .put("subscribers", MainActivity.visible ? 1 : 0).put("next", next2 == null ? JSONObject.NULL : next2)
                        .put("sched", Scheduler.summary(app)).put("stateFile", "Android SharedPreferences")
                        .put("uptime", SystemClock.elapsedRealtime() / 1000).put("log", NLog.all(app));
            }
            case "test":
                if ("launch".equals(p.optString("what"))) {
                    JSONObject cap = new JSONObject().put("capTest", true);
                    new Handler(Looper.getMainLooper()).postDelayed(() -> act.bringToFront(cap), 800);
                    return new JSONObject();
                }
                return err("not needed on Android");
            default:
                return err("not available on Android: " + uri);
        }
    }

    private JSONObject screen(boolean on) throws Exception {
        if (on) {
            Wake.screenOn(app);
            return new JSONObject();
        }
        // Real standby needs the optional device admin; otherwise the web app falls back to its Night mode.
        if (SleepAdmin.sleep(app)) return new JSONObject();
        return err("screen off needs: adb shell dpm set-active-admin com.noor.tv/.SleepAdmin");
    }

    private JSONObject launch(String id, JSONObject params) throws Exception {
        if (SELF.equals(id) || app.getPackageName().equals(id)) {
            act.bringToFront(params == null ? new JSONObject() : params);
            return new JSONObject();
        }
        Set<String> tries = new java.util.LinkedHashSet<>();
        if (id.startsWith("youtube") || id.equals("com.webos.app.youtube")) Collections.addAll(tries, YOUTUBE);
        else if (id.equals("netflix")) tries.add("com.netflix.ninja");
        else if (id.equals("amazon")) tries.add("com.amazon.amazonvideo.livingroom");
        tries.add(id);
        PackageManager pm = app.getPackageManager();
        for (String pkg : tries) {
            Intent i = pm.getLeanbackLaunchIntentForPackage(pkg);
            if (i == null) i = pm.getLaunchIntentForPackage(pkg);
            if (i == null) continue;
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            Intent fi = i;
            act.runOnUiThread(() -> act.startActivity(fi));
            return new JSONObject();
        }
        return err("not installed: " + id);
    }

    /** Every app with a TV (or phone) launcher entry, with its banner or icon as a data: URL. */
    private JSONArray apps() throws Exception {
        PackageManager pm = app.getPackageManager();
        JSONArray out = new JSONArray();
        Set<String> seen = new HashSet<>();
        seen.add(app.getPackageName());
        for (String cat : new String[]{Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER}) {
            Intent q = new Intent(Intent.ACTION_MAIN).addCategory(cat);
            for (ResolveInfo r : pm.queryIntentActivities(q, 0)) {
                String pkg = r.activityInfo.packageName;
                if (!seen.add(pkg)) continue;
                ApplicationInfo ai = r.activityInfo.applicationInfo;
                Drawable banner = r.activityInfo.loadBanner(pm);
                if (banner == null) banner = ai.loadBanner(pm);
                Drawable icon = banner != null ? banner : r.loadIcon(pm);
                out.put(new JSONObject().put("id", pkg).put("title", String.valueOf(r.loadLabel(pm)))
                        .put("icon", dataUrl(icon, banner != null ? 240 : 128, banner != null ? 135 : 128))
                        .put("bgColor", banner != null ? "#202020" : "rgba(255,255,255,.08)"));
            }
        }
        return out;
    }

    private static String dataUrl(Drawable d, int w, int h) {
        if (d == null) return "";
        try {
            Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
            Canvas c = new Canvas(bmp);
            d.setBounds(0, 0, w, h);
            d.draw(c);
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            bmp.compress(Bitmap.CompressFormat.PNG, 100, b);
            return "data:image/png;base64," + Base64.encodeToString(b.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return "";
        }
    }

    private static String ip() {
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (a instanceof Inet4Address && !a.isLoopbackAddress()) return a.getHostAddress();
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }
}
