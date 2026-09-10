/**
 * Per-Ad Cooldown Manager for Picture / Banner / Native "Click & Earn" Ads
 * Ensures only the specific ad that was clicked runs its cooldown timer,
 * while other ads remain active and ready!
 */

const BASE_STORAGE_PREFIX = 'roxyefollow_ad_cooldown_';
export const BANNER_COOLDOWN_DURATION_SEC = 180; // 3 Minutes = 180 seconds

/**
 * Start cooldown timer for a specific ad instance (by adId)
 */
export const startBannerCooldown = (
  adId: string = 'default_banner',
  durationSec: number = BANNER_COOLDOWN_DURATION_SEC
): number => {
  const expiryTimestamp = Date.now() + durationSec * 1000;
  const storageKey = `${BASE_STORAGE_PREFIX}${adId}`;

  try {
    localStorage.setItem(storageKey, expiryTimestamp.toString());
    // Notify components with detail specifying exactly which ad was clicked
    window.dispatchEvent(
      new CustomEvent('roxyefollow_banner_cooldown_started', {
        detail: { adId, expiryTimestamp },
      })
    );
  } catch (e) {
    console.error('Failed to set ad cooldown:', e);
  }
  return expiryTimestamp;
};

/**
 * Get remaining cooldown seconds for a specific ad instance (returns 0 if not on cooldown or finished)
 */
export const getBannerCooldownRemainingSeconds = (adId: string = 'default_banner'): number => {
  try {
    const storageKey = `${BASE_STORAGE_PREFIX}${adId}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return 0;
    const expiryTimestamp = parseInt(raw, 10);
    if (isNaN(expiryTimestamp)) return 0;

    const remainingMs = expiryTimestamp - Date.now();
    if (remainingMs <= 0) {
      // Clean up expired entry
      localStorage.removeItem(storageKey);
      return 0;
    }
    return Math.ceil(remainingMs / 1000);
  } catch (e) {
    return 0;
  }
};

/**
 * Format seconds to MM:SS string (e.g. 180 -> 03:00, 125 -> 02:05, 59 -> 00:59)
 */
export const formatCooldownTime = (seconds: number): string => {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
