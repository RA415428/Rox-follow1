import React, { useState, useEffect } from 'react';
import { ExternalLink, Sparkles, X, Gift, Coins, CheckCircle2 } from 'lucide-react';
import { AdminConfig, UserWallet } from '../types';
import { openExternalAdLink } from '../utils/openAdLink';

interface TopSlidingAdProps {
  smartlinkUrl?: string;
  adminConfig?: AdminConfig;
  wallet?: UserWallet;
  onRewardClaim?: (coins: number, isVideoAd?: boolean) => void;
  onShowToast?: (msg: string) => void;
}

export const TopSlidingAd: React.FC<TopSlidingAdProps> = ({
  smartlinkUrl,
  adminConfig,
  wallet,
  onRewardClaim,
  onShowToast
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [todayClaims, setTodayClaims] = useState<number>(0);

  const rawSmartlink = smartlinkUrl || adminConfig?.ads?.directSmartlinkUrl;
  const activeSmartlink = rawSmartlink && !rawSmartlink.includes('omg10') 
    ? rawSmartlink 
    : 'https://doubtfulimpatient.com/bhetpw4me?key=b10856b9df41e998764e3e76a118f915';
  
  // Customizable reward coins & daily limit from admin config
  const rewardCoins = adminConfig?.ads?.coinsPerSlidingBannerAd ?? 5;
  const dailyLimit = adminConfig?.ads?.dailySlidingBannerAdLimit ?? 10;

  const todayKey = `rox_sliding_ad_claims_${new Date().toISOString().split('T')[0]}`;

  useEffect(() => {
    // Read today's claim count from storage
    try {
      const savedCount = parseInt(localStorage.getItem(todayKey) || '0', 10);
      setTodayClaims(savedCount);
    } catch {
      setTodayClaims(0);
    }

    // Slide down automatically after 1.5 seconds on app load / screen change
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [todayKey]);

  if (!isVisible) return null;

  const isLimitReached = todayClaims >= dailyLimit;

  const handleTopAdClick = () => {
    if (isLimitReached) {
      if (onShowToast) {
        onShowToast(`⚠️ Daily limit reached (${dailyLimit}/${dailyLimit}) for Sliding Banner Ad. Come back tomorrow!`);
      }
      openExternalAdLink(activeSmartlink);
      setIsVisible(false);
      return;
    }

    const nextCount = todayClaims + 1;
    setTodayClaims(nextCount);
    try {
      localStorage.setItem(todayKey, nextCount.toString());
    } catch {
      // ignore
    }

    if (onRewardClaim) {
      onRewardClaim(rewardCoins, false);
    }
    if (onShowToast) {
      onShowToast(`🎁 Sliding Banner Bonus Claimed! +${rewardCoins} Coins added (${nextCount}/${dailyLimit} today).`);
    }
    openExternalAdLink(activeSmartlink);
    setIsVisible(false);
  };

  return (
    <div className="w-full px-3 py-1.5 z-40 transition-all duration-300 animate-in slide-in-from-top fade-in duration-500">
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-pink-950 border border-pink-500/50 rounded-2xl p-2.5 shadow-xl flex items-center justify-between gap-2 text-white relative overflow-hidden group">
        {/* Glow effect */}
        <div className="absolute -top-10 -left-10 w-20 h-20 bg-pink-500/30 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-amber-400 p-0.5 shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Gift className="w-4 h-4 text-amber-400 animate-bounce" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[8px] font-black uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/30 px-1.5 py-0.5 rounded">
                SLIDING BANNER AD
              </span>
              <span className="text-[10px] font-extrabold text-amber-300 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> +{rewardCoins} Coins
              </span>
              <span className="text-[9px] font-bold text-slate-400">
                ({todayClaims}/{dailyLimit} today)
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-100 truncate mt-0.5">
              {isLimitReached ? 'Daily claim limit completed! Tap to browse sponsor offer.' : 'AppCreator24 Sponsor Offer: Tap Claim & Earn Coins!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleTopAdClick}
            className={`${
              isLimitReached 
                ? 'bg-slate-800 text-slate-300 border border-slate-700' 
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-slate-950 animate-pulse'
            } hover:opacity-90 font-black text-[11px] py-1.5 px-2.5 rounded-xl shadow-md flex items-center gap-1 active:scale-95 transition-all cursor-pointer`}
          >
            {isLimitReached ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Done</span>
              </>
            ) : (
              <>
                <Coins className="w-3 h-3 text-slate-950 fill-current" />
                <span>Claim</span>
              </>
            )}
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Close banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
