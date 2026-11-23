package com.noor.tv;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Toast;

/** Banners drawn over any app (films, channels, HDMI). Styling from Noor TV by majedphotos (MIT). */
final class Overlay {
    static final int TOP = 215, SECOND = 365;

    private Overlay() {
    }

    static boolean allowed(Context c) {
        return Settings.canDrawOverlays(c);
    }

    /** Big green adhan / iqamah banner at the top. Falls back to a system toast without the overlay permission. */
    static void banner(Context c, String text, int ms) {
        show(c, text, ms, 30, 0xE60F3D2E, 0xFFFFE08A, TOP);
    }

    /** The smaller reminder line (salawat, Friday). */
    static void line(Context c, String text, int ms) {
        show(c, text, ms, 22, 0xCC0F3D2E, 0, SECOND);
    }

    private static void show(Context c, String text, int ms, int size, int color, int stroke, int y) {
        Context app = c.getApplicationContext();
        new Handler(Looper.getMainLooper()).post(() -> {
            if (!allowed(app)) {
                Toast.makeText(app, text, Toast.LENGTH_LONG).show();
                return;
            }
            WindowManager wm = app.getSystemService(WindowManager.class);
            TextView v = new TextView(app);
            v.setText(text);
            v.setTextColor(Color.WHITE);
            v.setTextSize(size);
            v.setTypeface(Typeface.DEFAULT_BOLD);
            v.setPadding(56, 24, 56, 24);
            GradientDrawable bg = new GradientDrawable();
            bg.setColor(color);
            bg.setCornerRadius(48);
            if (stroke != 0) bg.setStroke(3, stroke);
            v.setBackground(bg);
            WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
                    PixelFormat.TRANSLUCENT);
            lp.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
            lp.y = y;
            try {
                wm.addView(v, lp);
            } catch (Exception e) {
                Toast.makeText(app, text, Toast.LENGTH_LONG).show();
                return;
            }
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    wm.removeView(v);
                } catch (Exception ignored) {
                }
            }, ms);
        });
    }
}
