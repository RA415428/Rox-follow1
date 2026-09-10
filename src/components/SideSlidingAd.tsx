import React, { useState, useEffect } from 'react';
import { ExternalLink, X, Sparkles, Gift, Flame, ChevronLeft, ChevronRight, Coins, Bell, Zap } from 'lucide-react';
import { AdminConfig, UserWallet } from '../types';
import { saveAdSession } from '../utils/adSessionManager';
import { openExternalAdLink } from '../utils/openAdLink';

interface SideSlidingAdProps {
  smartlinkUrl?: string;
  adminConfig?: AdminConfig;
  wallet?: UserWallet;
  onOpenAdModal?: () => void;
  onRewardClaim?: (coins: number, isVideoAd?: boolean) => void;
  onShowToast?: (msg: string) => void;
}

export const SideSlidingAd: React.FC<SideSlidingAdProps> = ({
  smartlinkUrl = 'https://doubtfulimpatient.com/bhetpw4me?key=b10856b9df41e998764e3e76a118f915',
  adminConfig,
  wallet,
  onOpenAdModal,
  onRewardClaim,
  onShowToast
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [hasAppeared, setHasAppeared] = useState<boolean>(false);

  const rewardCoins = adminConfig?.ads?.coinsPerSocialBarAd ?? adminConfig?.ads?.coinsPerRewardAd ?? 10;
  const activeSmartlink = smartlinkUrl || adminConfig?.ads?.directSmartlinkUrl || 'https://doubtfulimpatient.com/bhetpw4me?key=b10856b9df41e998764e3e76a118f915';

  useEffect(() => {
    // Auto slide in from the coin balance side after 1.2 seconds
    const timer = setTimeout(() => {
      setHasAppeared(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const handleAdClick = () => {
    saveAdSession(rewardCoins, 'HOME', 30);

    if (activeSmartlink) {
      openExternalAdLink(activeSmartlink);
    }

    if (onRewardClaim) {
      onRewardClaim(rewardCoins, false);
    } else if (onOpenAdModal) {
      onOpenAdModal();
    }

    if (onShowToast) {
      onShowToast(`🎉 Social Bar Ad Claimed! +${rewardCoins} Coins added to your wallet.`);
    }

    setIsCollapsed(true);
  };

  return (
    <div className="fixed top-[58px] left-0 right-0 max-w-md mx-auto pointer-events-none z-50 flex justify-end overflow-visible px-2">
      <div className={`pointer-events-auto transition-all duration-500 ease-out ${hasAppeared ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
        {isCollapsed ? (
          /* Collapsed Floating Trigger Tab attached right by the Coin Balance */
          <button
            onClick={() => setIsCollapsed(false)}
            className="bg-gradient-to-l from-pink-600 via-purple-600 to-amber-500 text-white py-1.5 px-3 rounded-l-2xl shadow-2xl flex items-center gap-1.5 border-l-2 border-y border-pink-400/60 active:scale-95 transition-transform hover:pr-4 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
            <div className="relative">
              <Gift className="w-4 h-4 text-amber-300" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-200">+{rewardCoins} Coins</span>
          </button>
        ) : (
          /* Expanded Side Sliding Notification Social Bar Card */
          <div className="max-w-[270px] sm:max-w-[300px] bg-slate-900/95 border-2 border-pink-500/60 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl relative overflow-hidden ring-4 ring-pink-500/20 animate-in slide-in-from-right duration-300">
            {/* Ambient Radial Glow */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-pink-500/30 to-amber-500/20 rounded-full blur-xl pointer-events-none" />

            {/* Close & Minimize Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-800 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-pink-400 to-amber-400 bg-clip-text text-transparent flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> Social Bar Ad
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsCollapsed(true)}
                  title="Minimize side ad"
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors text-xs cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  title="Close"
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors text-xs cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ad Body Content */}
            <div onClick={handleAdClick} className="cursor-pointer group space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-pink-500/30 shrink-0">
                  <Gift className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-extrabold text-white leading-tight truncate">
                    Social Bonus Boost Coins
                  </p>
                  <p className="text-[9px] text-pink-300 font-medium truncate">
                    Tap to claim instant coins reward
                  </p>
                </div>
              </div>

              {/* Action CTA Button */}
              <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:opacity-95 text-slate-950 font-black text-xs py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/30 transition-all active:scale-95 group-hover:scale-[1.01]">
                <Coins className="w-3.5 h-3.5 text-slate-950 fill-current" />
                <span>Tap & Claim +{rewardCoins} Coins</span>
                <ExternalLink className="w-3 h-3 text-slate-950" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

