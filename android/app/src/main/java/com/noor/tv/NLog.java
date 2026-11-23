package com.noor.tv;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** A short ring log (last 40 lines) shown in Settings → System → Adhan service log. */
final class NLog {
    private static final int KEEP = 40;

    private NLog() {
    }

    static synchronized void w(Context c, String msg) {
        SharedPreferences p = Scheduler.prefs(c);
        JSONArray a;
        try {
            a = new JSONArray(p.getString("log", "[]"));
        } catch (Exception e) {
            a = new JSONArray();
        }
        a.put(new SimpleDateFormat("MM-dd HH:mm:ss", Locale.US).format(new Date()) + " " + msg);
        JSONArray out = new JSONArray();
        for (int i = Math.max(0, a.length() - KEEP); i < a.length(); i++) out.put(a.opt(i));
        p.edit().putString("log", out.toString()).apply();
    }

    static JSONArray all(Context c) {
        try {
            return new JSONArray(Scheduler.prefs(c).getString("log", "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }
}
