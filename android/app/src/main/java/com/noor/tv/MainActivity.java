package com.noor.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONObject;

/**
 * Hosts the Noor web app (the same code as the LG webOS version) in a full-screen WebView. android-shim.js gives it
 * webOS's PalmServiceBridge / PalmSystem, implemented in {@link Bridge}. While Noor is in the background its
 * JavaScript is paused and {@link AlarmReceiver} takes over, so nothing plays twice.
 */
public class MainActivity extends Activity {
    static final String ORIGIN = "https://appassets.androidplatform.net";
    static volatile boolean visible;
    private static MainActivity current;

    private WebView web;
    private boolean pageReady;
    volatile String launchParams = "{}";

    static MainActivity current() {
        return current;
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        current = this;
        if (Build.VERSION.SDK_INT < 27) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        readParams(getIntent());

        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);   // the adhan must start by itself
        s.setUseWideViewPort(true);                     // the app is laid out for 1920×1080 (viewport meta)
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(false);
        s.setTextZoom(100);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.addJavascriptInterface(new Bridge(this), "NoorAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return loader.shouldInterceptRequest(r.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                return !ORIGIN.equals(u.getScheme() + "://" + u.getHost());
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                pageReady = true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                if (m.messageLevel() == ConsoleMessage.MessageLevel.ERROR) NLog.w(MainActivity.this, "js: " + m.message() + " @" + m.lineNumber());
                return true;
            }
        });
        setContentView(web);
        web.requestFocus(View.FOCUS_DOWN);
        web.loadUrl(ORIGIN + "/assets/www/index.html");
    }

    private void readParams(Intent i) {
        String p = i == null ? null : i.getStringExtra("params");
        launchParams = p == null ? "{}" : p;
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        setIntent(i);
        readParams(i);
        if (pageReady && i.hasExtra("params")) relaunch(launchParams);
    }

    /** webOS's "webOSRelaunch" event, as the LG service sends it. */
    void relaunch(String json) {
        runOnUiThread(() -> web.evaluateJavascript("window.__noorRelaunch&&__noorRelaunch(" + json + ")", null));
    }

    /** Bring Noor to the front with launch parameters (from the web app itself, an alarm or the capability check). */
    void bringToFront(JSONObject params) {
        Wake.launchNoor(this, params);
    }

    /** Settings → Exit: like webOS platformBack, Noor goes to the background (the alarms keep working). */
    void moveTaskToBack0() {
        moveTaskToBack(true);
    }

    @Override
    protected void onStart() {
        super.onStart();
        visible = true;
        web.onResume();
        web.resumeTimers();
    }

    @Override
    protected void onStop() {
        visible = false;
        // In the background the alarms do the work: pause JS so the web app never plays an adhan behind a film.
        web.onPause();
        web.pauseTimers();
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        if (current == this) current = null;
        web.destroy();
        super.onDestroy();
    }

    /** Remote keys the WebView would not pass as webOS key codes: colours, Back, media, channel ±, Menu → Settings. */
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int code = webosKey(e.getKeyCode());
        if (code == 0) return super.dispatchKeyEvent(e);
        if (e.getAction() == KeyEvent.ACTION_DOWN) {
            web.evaluateJavascript("window.__noorKey&&__noorKey(" + code + ")", null);
        }
        return true;
    }

    static int webosKey(int k) {
        switch (k) {
            case KeyEvent.KEYCODE_BACK: return 461;
            case KeyEvent.KEYCODE_PROG_RED: return 403;
            case KeyEvent.KEYCODE_PROG_GREEN: return 404;
            case KeyEvent.KEYCODE_PROG_YELLOW: return 405;
            case KeyEvent.KEYCODE_PROG_BLUE:
            case KeyEvent.KEYCODE_MENU:
            case KeyEvent.KEYCODE_SETTINGS: return 406;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE: return 10252;
            case KeyEvent.KEYCODE_MEDIA_PLAY: return 415;
            case KeyEvent.KEYCODE_MEDIA_PAUSE: return 19;
            case KeyEvent.KEYCODE_MEDIA_STOP: return 413;
            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD: return 417;
            case KeyEvent.KEYCODE_MEDIA_REWIND: return 412;
            case KeyEvent.KEYCODE_CHANNEL_UP: return 33;
            case KeyEvent.KEYCODE_CHANNEL_DOWN: return 34;
            default: return 0;
        }
    }
}
