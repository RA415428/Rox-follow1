export interface AdSession {
  id: string;
  type?: 'WATCH_AD' | 'BANNER_CLICK' | 'SOCIAL_BAR';
  startTime: number;
  rewardCoins: number;
  screen?: string;
  duration: number; // Target Duration in seconds (15 for video ads, 2 for banner clicks)
  claimed: boolean;
}

const STORAGE_KEY = 'roxyefollow_pending_ad_session';

/**
 * Save current ad session state into localStorage before launching Smartlink or opening ad modal
 */
export const saveAdSession = (
  rewardCoins: number = 50,
  screen: string = 'HOME',
  duration: number = 15,
  type: 'WATCH_AD' | 'BANNER_CLICK' | 'SOCIAL_BAR' = 'WATCH_AD'
): AdSession => {
  const session: AdSession = {
    id: `ad_session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    startTime: Date.now(),
    rewardCoins,
    screen,
    duration,
    claimed: false,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent('roxyefollow_ad_session_updated', { detail: session }));
  } catch (e) {
    console.error('Failed to save ad session to localStorage:', e);
  }

  return session;
};

/**
 * Specifically save an instant Click & Earn banner session
 */
export const registerBannerAdClick = (
  rewardCoins: number = 5,
  screen: string = 'HOME'
): AdSession => {
  return saveAdSession(rewardCoins, screen, 2, 'BANNER_CLICK');
};

/**
 * Get active pending session if present and not claimed
 */
export const getActiveAdSession = (): AdSession | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const session: AdSession = JSON.parse(data);
    if (session && !session.claimed && session.startTime) {
      return session;
    }
  } catch (e) {
    console.error('Error reading ad session:', e);
  }
  return null;
};

/**
 * Get exact remaining seconds using wall-clock time calculation
 */
export const getAdSessionRemainingSeconds = (): number => {
  const session = getActiveAdSession();
  if (!session || session.claimed) return 0;
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const targetDuration = session.duration || 15;
  return Math.max(0, targetDuration - elapsed);
};

/**
 * Clear current pending ad session
 */
export const clearAdSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear ad session:', e);
  }
};

export type AdCheckResult =
  | { status: 'COMPLETED'; coins: number; screen: string; session: AdSession }
  | { status: 'PENDING'; remainingSeconds: number; session: AdSession }
  | { status: 'NONE' };

/**
 * Process pending session. Guarantees atomic check to prevent duplicate rewards.
 * For BANNER_CLICK, returning to the app after viewing the ad credits coins immediately.
 * For WATCH_AD, if full time elapsed or user returned, either marks complete or returns remaining time.
 */
export const processAdSession = (
  onRewardClaimed?: (coins: number, screen?: string, type?: string) => void
): AdCheckResult => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { status: 'NONE' };

    const session: AdSession = JSON.parse(data);
    if (!session || session.claimed || !session.startTime) {
      return { status: 'NONE' };
    }

    const elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000);
    const targetDuration = session.duration || (session.type === 'BANNER_CLICK' ? 1 : 15);

    // If user returned after viewing ad for full duration or it's a banner click
    if (elapsedSeconds >= targetDuration || session.type === 'BANNER_CLICK') {
      // Mark as claimed atomically before triggering reward callback
      session.claimed = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      
      // Cleanup storage after marking
      clearAdSession();

      if (onRewardClaimed) {
        onRewardClaimed(session.rewardCoins, session.screen, session.type);
      }

      return {
        status: 'COMPLETED',
        coins: session.rewardCoins,
        screen: session.screen || 'HOME',
        session,
      };
    } else {
      const remainingSeconds = Math.max(1, targetDuration - elapsedSeconds);
      return {
        status: 'PENDING',
        remainingSeconds,
        session,
      };
    }
  } catch (e) {
    console.error('Error processing ad session:', e);
    clearAdSession();
    return { status: 'NONE' };
  }
};
