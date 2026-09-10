/**
 * Production-Ready Ad Pre-loading, Caching & AppCreator24 WebView Optimization Strategy
 *
 * Features:
 * 1. Intelligent Background Ad Pre-loading & DNS Pre-fetching
 * 2. High-Performance Local Asset & Image Caching for slow networks
 * 3. Fallback Rendering Engine for AppCreator24 / Android WebViews
 * 4. Fault-tolerant Rate Cache (Preserves custom rates on packet drops / offline mode)
 */

// Key for ultra-reliable persistent rate preservation
export const ADMIN_PERSISTED_RATES_KEY = 'instaboost_persisted_admin_rates_v2';

export interface AdRateSnapshot {
  coinsPerRewardAd: number;
  maxDailyAdsPerUser: number;
  interstitialIntervalMinutes: number;
  rewardedAdCooldownSeconds: number;
  directSmartlinkUrl: string;
  bannerAdKey: string;
  verticalBannerAdKey: string;
  lastVerifiedTimestamp: number;
}

/**
 * 1. Preconnect to Ad Network & Asset CDNs to eliminate 300-800ms handshake delays
 */
export function initAdNetworkPreconnect(): void {
  if (typeof document === 'undefined') return;

  const originsToPreconnect = [
    'https://doubtfulimpatient.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ];

  originsToPreconnect.forEach((origin) => {
    // DNS Prefetch
    if (!document.querySelector(`link[rel="dns-prefetch"][href="${origin}"]`)) {
      const dnsLink = document.createElement('link');
      dnsLink.rel = 'dns-prefetch';
      dnsLink.href = origin;
      document.head.appendChild(dnsLink);
    }
    // Preconnect
    if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
      const connLink = document.createElement('link');
      connLink.rel = 'preconnect';
      connLink.href = origin;
      connLink.crossOrigin = 'anonymous';
      document.head.appendChild(connLink);
    }
  });
}

/**
 * 2. Pre-load and cache banner ad scripts and dynamic banner assets in the background
 */
const adScriptCache = new Set<string>();

export function preloadAdScripts(scriptUrls: string[]): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  scriptUrls.forEach((url) => {
    if (!url || adScriptCache.has(url)) return;
    adScriptCache.add(url);

    try {
      // Use hidden link rel="preload" as script
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'script';
      preloadLink.href = url;
      document.head.appendChild(preloadLink);
    } catch {
      // Non-blocking fallback
    }
  });
}

/**
 * 3. Preload and cache graphic images using Image API & Local Memory Cache
 */
const imageMemoryCache = new Map<string, HTMLImageElement>();

export function preloadAdImages(imageUrls: string[]): void {
  if (typeof window === 'undefined') return;

  imageUrls.forEach((url) => {
    if (!url || imageMemoryCache.has(url)) return;
    try {
      const img = new Image();
      img.src = url;
      imageMemoryCache.set(url, img);
    } catch {
      // Ignore
    }
  });
}

/**
 * 4. Reliable Admin Rate Snapshot Storage
 * Prevents dynamic rates from resetting to default on slow/intermittent connections.
 */
export function savePersistedRates(rates: Partial<AdRateSnapshot>): void {
  try {
    const existing = getPersistedRates();
    const updated: AdRateSnapshot = {
      ...existing,
      ...rates,
      lastVerifiedTimestamp: Date.now()
    };
    localStorage.setItem(ADMIN_PERSISTED_RATES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to persist ad rates:', e);
  }
}

export function getPersistedRates(): AdRateSnapshot {
  const defaultSnapshot: AdRateSnapshot = {
    coinsPerRewardAd: 50,
    maxDailyAdsPerUser: 10,
    interstitialIntervalMinutes: 3,
    rewardedAdCooldownSeconds: 30,
    directSmartlinkUrl: 'https://doubtfulimpatient.com/bhetpw4me?key=b10856b9df41e998764e3e76a118f915',
    bannerAdKey: '1fa862cdd8ff0403a4f4166d381d9698',
    verticalBannerAdKey: '19b8c46ab4ac83259b97c3f5a34e588c',
    lastVerifiedTimestamp: 0
  };

  try {
    const raw = localStorage.getItem(ADMIN_PERSISTED_RATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultSnapshot,
        ...parsed,
        // Guarantee coinsPerRewardAd is a positive number, never defaulting back if user set custom
        coinsPerRewardAd: typeof parsed.coinsPerRewardAd === 'number' && parsed.coinsPerRewardAd > 0
          ? parsed.coinsPerRewardAd
          : defaultSnapshot.coinsPerRewardAd
      };
    }
  } catch {
    // Fallback to default
  }

  return defaultSnapshot;
}

/**
 * 5. AppCreator24 WebView Hardware Acceleration & Viewport Patch
 * Fixes blank unrendered ad containers on low-end Android WebViews & AppCreator24
 */
export function applyAppCreator24WebViewFixes(): void {
  if (typeof document === 'undefined') return;

  // Add WebView Performance and rendering meta tags if missing
  const metaFixes: { name?: string; httpEquiv?: string; content: string }[] = [
    { name: 'format-detection', content: 'telephone=no' },
    { name: 'msapplication-tap-highlight', content: 'no' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' }
  ];

  metaFixes.forEach((metaData) => {
    const selector = metaData.name
      ? `meta[name="${metaData.name}"]`
      : `meta[http-equiv="${metaData.httpEquiv}"]`;
    if (!document.querySelector(selector)) {
      const meta = document.createElement('meta');
      if (metaData.name) meta.name = metaData.name;
      if (metaData.httpEquiv) meta.httpEquiv = metaData.httpEquiv;
      meta.content = metaData.content;
      document.head.appendChild(meta);
    }
  });

  // Inject CSS rules for smooth WebKit scrolling and GPU hardware compositing
  const styleId = 'appcreator24-webview-accel-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      * {
        -webkit-tap-highlight-color: transparent;
      }
      .ad-banner-container, iframe {
        -webkit-transform: translateZ(0);
        transform: translateZ(0);
        will-change: transform;
        -webkit-backface-visibility: hidden;
        backface-visibility: hidden;
      }
    `;
    document.head.appendChild(style);
  }
}
