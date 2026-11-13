package com.redspadenetwork.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.RenderProcessGoneDetail;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    // Target Production URL
    private static final String APP_URL = "https://roastroycenetwork420.netlify.app";
    private WebView myWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        myWebView = new WebView(this);
        setContentView(myWebView);

        WebSettings webSettings = myWebView.getSettings();
        
        // Enable core engine features for Netlify SPA loading
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setLoadsImagesAutomatically(true);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Handle rendering safety and navigation
        myWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // Prevents blank screen crashes on Fire TV hardware
                return true; 
            }
        });

        // Load your Netlify app cleanly
        myWebView.loadUrl(APP_URL);
    }

    @Override
    public void onBackPressed() {
        if (myWebView.canGoBack()) {
            myWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
