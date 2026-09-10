package com.roxfollow.app

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.unity3d.ads.IUnityAdsInitializationListener
import com.unity3d.ads.IUnityAdsLoadListener
import com.unity3d.ads.IUnityAdsShowListener
import com.unity3d.ads.UnityAds
import com.unity3d.ads.UnityAdsShowOptions

/**
 * Bridges the web app's Store screen "Watch Ad" button to a real Unity
 * REWARDED video ad. Interstitial ads are intentionally NOT used here.
 *
 * JS side calls: Capacitor.Plugins.UnityRewardedAds.showRewardedAd()
 * -> resolves { status: "REWARDED" | "SKIPPED" | "FAILED" | "NOT_READY" | "NOT_INITIALIZED", reason?: string }
 * Coins must only be credited by the caller when status === "REWARDED".
 *
 * DEBUG BUILD: this version retries init/load automatically and returns the
 * real Unity error message in `reason` so failures are visible in the app's
 * toast instead of silently doing nothing forever. Once ads are confirmed
 * working, the retry noise can stay (it's harmless) but you can drop the
 * `reason` field from the toast in App.tsx if you don't want it user-facing.
 */
@CapacitorPlugin(name = "UnityRewardedAds")
class UnityRewardedAdsPlugin : Plugin() {

    companion object {
        private const val TAG = "UnityRewardedAds"

        // From Unity Dashboard -> Rox Follow app -> Rewarded placement (Android)
        private const val GAME_ID = "800368206"
        private const val REWARDED_PLACEMENT_ID = "Rewarded_Android"

        // Set to true ONLY while testing with Unity's test ads, then set back to false.
        // TIP: if ads never show even with this true, the problem is build/wiring
        // (package name, permissions, SDK not linked). If TEST_MODE=true works but
        // TEST_MODE=false never fills, the problem is Unity dashboard config or
        // real-demand fill (common for brand-new, unpublished, low-traffic apps).
        private const val TEST_MODE = false

        private const val INIT_RETRY_DELAY_MS = 5000L
        private const val LOAD_RETRY_DELAY_MS = 4000L
        private const val MAX_INIT_RETRIES = 5
    }

    private var isSdkInitialized = false
    private var isAdLoaded = false
    private var pendingCall: PluginCall? = null
    private var initRetryCount = 0
    private val mainHandler = Handler(Looper.getMainLooper())
    private var lastInitError: String? = null
    private var lastLoadError: String? = null

    override fun load() {
        super.load()
        initializeUnityAds()
    }

    private fun initializeUnityAds() {
        val act: Activity = activity
        Log.d(TAG, "Initializing Unity Ads (gameId=$GAME_ID, testMode=$TEST_MODE, attempt=${initRetryCount + 1})")
        UnityAds.initialize(act.applicationContext, GAME_ID, TEST_MODE, object : IUnityAdsInitializationListener {
            override fun onInitializationComplete() {
                isSdkInitialized = true
                initRetryCount = 0
                lastInitError = null
                Log.d(TAG, "Unity Ads initialized OK")
                preloadRewardedAd()
            }

            override fun onInitializationFailed(
                error: UnityAds.UnityAdsInitializationError?,
                message: String?
            ) {
                isSdkInitialized = false
                lastInitError = "$error: $message"
                Log.e(TAG, "Unity Ads init failed: $lastInitError")
                if (initRetryCount < MAX_INIT_RETRIES) {
                    initRetryCount++
                    mainHandler.postDelayed({ initializeUnityAds() }, INIT_RETRY_DELAY_MS)
                }
            }
        })
    }

    private fun preloadRewardedAd() {
        Log.d(TAG, "Loading rewarded placement: $REWARDED_PLACEMENT_ID")
        UnityAds.load(REWARDED_PLACEMENT_ID, object : IUnityAdsLoadListener {
            override fun onUnityAdsAdLoaded(placementId: String?) {
                isAdLoaded = true
                lastLoadError = null
                Log.d(TAG, "Rewarded ad loaded OK")
            }

            override fun onUnityAdsFailedToLoad(
                placementId: String?,
                error: UnityAds.UnityAdsLoadError?,
                message: String?
            ) {
                isAdLoaded = false
                lastLoadError = "$error: $message"
                Log.e(TAG, "Rewarded ad failed to load: $lastLoadError")
                // Keep retrying quietly in the background so the ad is ready
                // by the time the user taps "Watch Ad" again.
                mainHandler.postDelayed({ if (isSdkInitialized) preloadRewardedAd() }, LOAD_RETRY_DELAY_MS)
            }
        })
    }

    @PluginMethod
    fun isAdReady(call: PluginCall) {
        val ret = JSObject()
        ret.put("ready", isAdLoaded)
        call.resolve(ret)
    }

    @PluginMethod
    fun showRewardedAd(call: PluginCall) {
        if (!isSdkInitialized) {
            val ret = JSObject()
            ret.put("status", "NOT_INITIALIZED")
            ret.put("reason", lastInitError ?: "SDK still initializing, please wait a moment")
            call.resolve(ret)
            return
        }

        if (!isAdLoaded) {
            val ret = JSObject()
            ret.put("status", "NOT_READY")
            ret.put("reason", lastLoadError ?: "Ad not loaded yet")
            call.resolve(ret)
            preloadRewardedAd()
            return
        }

        pendingCall = call
        val act: Activity = activity

        UnityAds.show(act, REWARDED_PLACEMENT_ID, UnityAdsShowOptions(), object : IUnityAdsShowListener {
            override fun onUnityAdsShowFailure(
                placementId: String?,
                error: UnityAds.UnityAdsShowError?,
                message: String?
            ) {
                Log.e(TAG, "Rewarded ad show failed: $error: $message")
                isAdLoaded = false
                resolveShow("FAILED", "$error: $message")
                preloadRewardedAd()
            }

            override fun onUnityAdsShowStart(placementId: String?) {}

            override fun onUnityAdsShowClick(placementId: String?) {}

            override fun onUnityAdsShowComplete(
                placementId: String?,
                state: UnityAds.UnityAdsShowCompletionState?
            ) {
                isAdLoaded = false
                if (state == UnityAds.UnityAdsShowCompletionState.COMPLETED) {
                    resolveShow("REWARDED", null)
                } else {
                    resolveShow("SKIPPED", "User closed ad before it finished")
                }
                preloadRewardedAd()
            }
        })
    }

    private fun resolveShow(status: String, reason: String?) {
        val ret = JSObject()
        ret.put("status", status)
        if (reason != null) ret.put("reason", reason)
        pendingCall?.resolve(ret)
        pendingCall = null
    }
}
