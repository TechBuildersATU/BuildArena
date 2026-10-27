package com.atutechbuilders.buildarena;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * BuildArena on the booth tablet: full screen (the system bars are hidden; a swipe from the edge
 * shows them for a moment), the screen never goes to sleep while the app is open, and the
 * on-screen keyboard opens over the game instead of shrinking it. The launch screen (paper with
 * the turning four-colour ring) stays until the game's opening animation is ready.
 */
public class MainActivity extends BridgeActivity {

    /** Longest the launch screen waits for the web app, so a slow start never hangs on it. */
    private static final long LAUNCH_MAX_MS = 8000;

    private int keyboardPx = 0;
    private volatile boolean webReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        long started = SystemClock.uptimeMillis();
        long until = started + LAUNCH_MAX_MS;
        splash.setKeepOnScreenCondition(() -> !webReady && SystemClock.uptimeMillis() < until);
        // fade into the opening animation instead of cutting to it
        splash.setOnExitAnimationListener(view -> {
            Log.i("BuildArena", "launch screen off after " + (SystemClock.uptimeMillis() - started)
                + " ms (" + (webReady ? "web app ready" : "time limit") + ")");
            view.getView().animate().alpha(0f).setDuration(260).withEndAction(view::remove).start();
        });
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
        watchKeyboard();
        waitForWebApp(until);
    }

    /**
     * The web app sets <html data-boot="ready"> once its opening animation is in the page
     * (src/components/BootIntro.tsx); until then the launch screen stays.
     */
    private void waitForWebApp(long until) {
        Handler handler = new Handler(Looper.getMainLooper());
        handler.post(new Runnable() {
            @Override
            public void run() {
                if (webReady || SystemClock.uptimeMillis() > until) return;
                WebView webView = getBridge() == null ? null : getBridge().getWebView();
                if (webView != null) {
                    webView.evaluateJavascript("document.documentElement.dataset.boot", value -> {
                        if ("\"ready\"".equals(value)) webReady = true;
                    });
                }
                handler.postDelayed(this, 60);
            }
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    /**
     * The keyboard's insets are kept away from the WebView, so the 1280×800 stage keeps its size.
     * Its height goes to the web app instead (window event "ba:keyboard", CSS pixels), which lifts
     * the stage only as far as needed to keep the field being typed in above the keyboard.
     */
    private void watchKeyboard() {
        View decor = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            boolean visible = insets.isVisible(WindowInsetsCompat.Type.ime());
            int height = visible ? insets.getInsets(WindowInsetsCompat.Type.ime()).bottom : 0;
            if (height != keyboardPx) {
                keyboardPx = height;
                sendKeyboardHeight(height);
                if (!visible) hideSystemBars();
            }
            WindowInsetsCompat withoutKeyboard = new WindowInsetsCompat.Builder(insets)
                .setInsets(WindowInsetsCompat.Type.ime(), Insets.NONE)
                .build();
            return ViewCompat.onApplyWindowInsets(v, withoutKeyboard);
        });
    }

    private void sendKeyboardHeight(int px) {
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        int css = Math.round(px / getResources().getDisplayMetrics().density);
        webView.post(() ->
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('ba:keyboard',{detail:{height:" + css + "}}))",
                null
            )
        );
    }
}
