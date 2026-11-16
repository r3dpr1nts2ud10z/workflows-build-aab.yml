package com.redspade.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    private static final String TARGET_URL = "https://872a8717-939b-44e4-9e6b-02dc0950c19d-00-31y1djitaq6e1.spock.replit.dev";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#0B0B0D"));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    String fallbackHtml = "<html><body style='background:#0B0B0D;color:#FFFFFF;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px;'>"
                            + "<h2>Connection Unavailable</h2>"
                            + "<p style='color:#A0A0AB;'>Unable to reach Red Spade Network. Check your internet connection and try again.</p>"
                            + "<button onclick=\"window.location.href='" + TARGET_URL + "'\" style='margin-top:16px;padding:12px 24px;background:#E11D48;color:#FFF;border:none;border-radius:8px;font-size:16px;'>Retry</button>"
                            + "</body></html>";
                    view.loadDataWithBaseURL(null, fallbackHtml, "text/html", "UTF-8", null);
                }
            }
        });

        setContentView(webView);
        webView.loadUrl(TARGET_URL);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
