// nativeAdsBridge.ts
// Bridges the existing "Watch Ad" button (Store screen) to the native Android
// Unity LevelPlay (Unity Ads) Rewarded Video SDK via a Capacitor plugin.
//
// IMPORTANT: This file does NOT render any UI. It only talks to native Android
// code. When running inside the Android app, calling showRewardedAd() will:
//   1. Ask native Android to show a real Unity Rewarded Video ad.
//   2. Wait for the native "ad watched completely" callback.
//   3. Only then invoke onReward() so the caller can credit admin-configured coins.
// If the app is opened in a normal web browser (no native bridge present),
// onUnavailable() is called so existing web behaviour is unaffected.

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: {
        UnityRewardedAds?: {
          showRewardedAd: () => Promise<{ status: string; reason?: string }>;
          isAdReady?: () => Promise<{ ready: boolean }>;
        };
      };
    };
  }
}

export const isNativeAdsAvailable = (): boolean => {
  try {
    return !!(
      typeof window !== 'undefined' &&
      window.Capacitor &&
      window.Capacitor.isNativePlatform &&
      window.Capacitor.isNativePlatform() &&
      window.Capacitor.Plugins &&
      window.Capacitor.Plugins.UnityRewardedAds
    );
  } catch {
    return false;
  }
};

interface ShowRewardedAdCallbacks {
  onReward: () => void;
  onFailedOrCancelled: (reason: string) => void;
  onUnavailable: () => void;
}

/**
 * Shows the Unity rewarded video ad through the native Android bridge.
 * Reward is only granted if the native side reports the ad was watched fully.
 */
export const showNativeRewardedAd = async ({
  onReward,
  onFailedOrCancelled,
  onUnavailable
}: ShowRewardedAdCallbacks): Promise<void> => {
  if (!isNativeAdsAvailable()) {
    onUnavailable();
    return;
  }

  try {
    const plugin = window.Capacitor!.Plugins!.UnityRewardedAds!;
    const result = await plugin.showRewardedAd();
    if (result && result.status === 'REWARDED') {
      onReward();
    } else {
      const reasonText = result?.reason ? ` (${result.reason})` : '';
      onFailedOrCancelled(`${result?.status || 'UNKNOWN'}${reasonText}`);
    }
  } catch (err: any) {
    onFailedOrCancelled(err?.message || 'NATIVE_AD_ERROR');
  }
};
