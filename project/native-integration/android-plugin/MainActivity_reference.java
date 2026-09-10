package com.roxfollow.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

// This is a REFERENCE only. `npx cap add android` already generates a
// MainActivity.java for you at:
//   android/app/src/main/java/com/roxfollow/app/MainActivity.java
// Just add the registerPlugin(...) line shown below to that existing file -
// do not create a second MainActivity.
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UnityRewardedAdsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
