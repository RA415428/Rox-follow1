export const DEFAULT_ADSTERRA_SMARTLINK = 'https://doubtfulimpatient.com/bhetpw4me?key=b10856b9df41e998764e3e76a118f915';

/**
 * Safe and 100% reliable ad link / popunder opener for:
 * - AppCreator24 APK Android WebView
 * - Mobile Chrome / Safari / Opera / Firefox
 * - Web & Desktop Browsers
 */
export const openExternalAdLink = (url?: string): boolean => {
  const targetUrl = (url || DEFAULT_ADSTERRA_SMARTLINK).trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return false;
  }

  let windowOpened = false;

  // 1. First try standard window.open (works in most browsers with user gesture)
  try {
    const win = window.open(targetUrl, '_blank');
    if (win && !win.closed) {
      windowOpened = true;
    }
  } catch (e) {
    console.warn('window.open attempt failed:', e);
  }

  // 2. Try AppCreator24 / Cordova system browser target
  if (!windowOpened) {
    try {
      const winSys = window.open(targetUrl, '_system');
      if (winSys) {
        windowOpened = true;
      }
    } catch (e) {}
  }

  // 3. Try simulated real DOM link click (Handles mobile browsers & WebViews with popup blockers)
  try {
    const a = document.createElement('a');
    a.href = targetUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      } catch (e) {}
    }, 500);
    windowOpened = true;
  } catch (err) {
    console.warn('Anchor dispatch failed:', err);
  }

  return windowOpened;
};

/**
 * Adsterra Popunder / SmartLink Opener
 */
export const openAdsterraPopunder = (url?: string): boolean => {
  console.log('[Adsterra] Opening Smartlink Popunder:', url || DEFAULT_ADSTERRA_SMARTLINK);
  return openExternalAdLink(url || DEFAULT_ADSTERRA_SMARTLINK);
};

export const showRewardedAd = openAdsterraPopunder;
export const showAppCreator24Interstitial = openAdsterraPopunder;
export const triggerAppAd = openAdsterraPopunder;
export const triggerNativeRewardedAd = openAdsterraPopunder;
export const watchAdClick = openAdsterraPopunder;
export const showAppCreator24Rewarded = openAdsterraPopunder;

// Global hooks for direct calling anywhere in app, HTML, or console
if (typeof window !== 'undefined') {
  (window as any).openAdsterraPopunder = openAdsterraPopunder;
  (window as any).watchAdClick = () => openAdsterraPopunder();
  (window as any).triggerNativeRewardedAd = () => openAdsterraPopunder();
  (window as any).triggerAppAd = () => openAdsterraPopunder();
  (window as any).showInterstitial = () => openAdsterraPopunder();
  (window as any).showRewarded = () => openAdsterraPopunder();
  (window as any).showRewardedAd = () => openAdsterraPopunder();
}


