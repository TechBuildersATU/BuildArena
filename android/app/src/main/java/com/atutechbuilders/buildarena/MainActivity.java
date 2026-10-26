package com.atutechbuilders.buildarena;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * BuildArena on the booth tablet: full screen (the system bars are hidden; a swipe from the edge
 * shows them for a moment), the screen never goes to sleep while the app is open, and the
 * on-screen keyboard opens over the game instead of shrinking it.
 */
public class MainActivity extends BridgeActivity {

    private int keyboardPx = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
        watchKeyboard();
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
