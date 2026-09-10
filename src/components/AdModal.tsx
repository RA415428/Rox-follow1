import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, CheckCircle2, ShieldCheck, Zap, Clock, X, ArrowRight, Play, Film } from 'lucide-react';
import { clearAdSession, getActiveAdSession, saveAdSession } from '../utils/adSessionManager';

interface AdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardClaim?: (coins: number) => void;
  rewardCoins?: number;
  adProvider?: string;
  adUnitId?: string;
  isAutoTimerAd?: boolean;
  smartlinkUrl?: string;
}

export const AdModal: React.FC<AdModalProps> = ({
  isOpen,
  onClose,
  onRewardClaim,
  rewardCoins = 50,
  adProvider = 'Adsterra',
}) => {
  const TOTAL_DURATION = 15;
  const [rewardClaimed, setRewardClaimed] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(TOTAL_DURATION);
  const [showExitWarning, setShowExitWarning] = useState<boolean>(false);
  
  const hasClaimedRef = useRef<boolean>(false);
  const endTimeRef = useRef<number>(Date.now() + TOTAL_DURATION * 1000);

  // Claim reward function (idempotent & safe from concurrent render phase)
  const handleClaimReward = useCallback(() => {
    if (hasClaimedRef.current) return;
    hasClaimedRef.current = true;
    setRewardClaimed(true);
    clearAdSession();
    if (onRewardClaim) {
      onRewardClaim(rewardCoins);
    }
    setTimeout(() => {
      onClose();
    }, 1200);
  }, [onRewardClaim, rewardCoins, onClose]);

  // Real-time wall-clock sync function (runs on interval & window focus/visibility changes)
  const syncRemainingTime = useCallback(() => {
    if (!isOpen || hasClaimedRef.current) return;

    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
    setTimeLeft(remainingSeconds);

    if (remainingSeconds <= 0 && !hasClaimedRef.current) {
      handleClaimReward();
    }
  }, [isOpen, handleClaimReward]);

  // Native Ad bridge callbacks
  useEffect(() => {
    if (isOpen) {
      const handleNativeCompleted = () => {
        setTimeout(() => {
          handleClaimReward();
        }, 0);
      };

      const win = window as any;
      win.onAdsterraRewardEarned = handleNativeCompleted;
      win.onNativeRewardedAdCompleted = handleNativeCompleted;
      win.onAdRewardEarned = handleNativeCompleted;
    }
  }, [isOpen, handleClaimReward]);

  // Timer initialization & wall-clock countdown tracking
  useEffect(() => {
    if (!isOpen) return;

    hasClaimedRef.current = false;
    setRewardClaimed(false);
    setShowExitWarning(false);

    // Read active ad session timestamp or create one
    const activeSession = getActiveAdSession();
    let startTime = activeSession?.startTime;
    const duration = activeSession?.duration || TOTAL_DURATION;

    if (!startTime || activeSession?.claimed) {
      startTime = Date.now();
      saveAdSession(rewardCoins, 'HOME', duration, 'WATCH_AD');
    }

    endTimeRef.current = startTime + duration * 1000;

    // Immediate initial sync
    const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
    const initialRemaining = Math.max(0, duration - initialElapsed);
    setTimeLeft(initialRemaining);

    if (initialRemaining <= 0) {
      handleClaimReward();
      return;
    }

    // High precision ticker (every 300ms to avoid drift and catch background returns instantly)
    const interval = setInterval(syncRemainingTime, 300);

    // Event listeners to catch user returning from viewing the ad in another tab/browser
    const handleAppFocus = () => {
      syncRemainingTime();
    };

    window.addEventListener('focus', handleAppFocus);
    window.addEventListener('pageshow', handleAppFocus);
    document.addEventListener('visibilitychange', handleAppFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleAppFocus);
      window.removeEventListener('pageshow', handleAppFocus);
      document.removeEventListener('visibilitychange', handleAppFocus);
    };
  }, [isOpen, rewardCoins, handleClaimReward, syncRemainingTime]);

  if (!isOpen) return null;

  const progressPercent = Math.min(100, Math.max(0, ((TOTAL_DURATION - timeLeft) / TOTAL_DURATION) * 100));

  const handleCloseAttempt = () => {
    if (rewardClaimed || timeLeft <= 0) {
      if (!hasClaimedRef.current) {
        handleClaimReward();
      } else {
        onClose();
      }
    } else {
      setShowExitWarning(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 text-white flex flex-col justify-between p-3 sm:p-5 select-none overflow-y-auto animate-in fade-in duration-300 backdrop-blur-xl">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-md mx-auto pt-1 pb-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-lg">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{adProvider || 'Adsterra'} Sponsored Stream</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black rounded-xl font-mono">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>+{rewardCoins} Coins</span>
          </div>

          <button
            onClick={handleCloseAttempt}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Video Ad Screen Card */}
      <div className="relative z-10 my-auto w-full max-w-md mx-auto bg-slate-900/95 rounded-3xl border border-amber-500/30 p-4 sm:p-5 text-center space-y-4 shadow-2xl backdrop-blur-md">
        {/* Rewarded Video Screen Player Simulation */}
        <div className="relative w-full aspect-video rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-slate-800 overflow-hidden flex flex-col justify-between p-4 shadow-inner">
          {/* Top Video Overlay Info */}
          <div className="flex items-center justify-between w-full z-20">
            <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] text-amber-300 font-bold">
              <Film className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{adProvider || 'Adsterra'} Official Ad Stream</span>
            </div>

            <div className="flex items-center gap-1 bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg font-black text-xs font-mono shadow-md">
              <Clock className="w-3 h-3" />
              <span>{timeLeft}s</span>
            </div>
          </div>

          {/* Center Graphic */}
          <div className="my-auto flex flex-col items-center justify-center relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-2 shadow-lg animate-pulse">
              <Play className="w-7 h-7 text-amber-400 fill-amber-400 ml-0.5" />
            </div>
            <p className="text-sm font-black text-white">{adProvider || 'Adsterra'} Sponsored Stream</p>
            <p className="text-xs text-amber-300 font-medium mt-0.5">Sponsored Ad Playing • Earn Free Coins</p>
          </div>

          {/* Bottom Video Progress Bar */}
          <div className="w-full z-20 space-y-1">
            <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden p-0.5 border border-amber-500/20">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 rounded-full transition-all duration-1000 ease-linear shadow"
                style={{ width: `${rewardClaimed || timeLeft <= 0 ? 100 : progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>{15 - timeLeft}s elapsed</span>
              <span className="text-amber-300 font-bold">Total: 15s</span>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-black bg-gradient-to-r from-white via-amber-200 to-orange-400 bg-clip-text text-transparent">
            {rewardClaimed
              ? `🎉 +${rewardCoins} Coins Credited Successfully!`
              : timeLeft <= 0
              ? '✅ Ad Complete! Claim Coins Now'
              : `Playing Rewarded Ad (${timeLeft}s)`}
          </h2>

          <p className="text-xs text-slate-300 px-2 font-medium leading-tight">
            {rewardClaimed
              ? `Congratulations! +${rewardCoins} Coins have been added to your wallet.`
              : timeLeft <= 0
              ? `Video complete! Click below to collect your reward.`
              : `Video poora dekhne par turant +${rewardCoins} Free Coins jud jayenge.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {rewardClaimed ? (
            <div className="w-full py-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>+{rewardCoins} Coins Added To Your Balance!</span>
            </div>
          ) : timeLeft <= 0 ? (
            <button
              type="button"
              id="claim-ad-reward-btn"
              onClick={handleClaimReward}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:opacity-95 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 animate-pulse cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>CLAIM +{rewardCoins} COINS NOW</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-full py-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl text-amber-300 font-bold text-xs flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Watching Video Ad ({timeLeft}s remaining)...</span>
            </div>
          )}

          {/* Exit Confirmation Warning Modal if user tries to close early */}
          {showExitWarning && timeLeft > 0 && !rewardClaimed && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 animate-in fade-in">
              <p className="text-xs text-amber-200 font-bold">
                ⚠️ Agar abhi cut karoge to coins nahi milenge. Sirf {timeLeft}s baki hain!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowExitWarning(false)}
                  className="flex-1 py-1.5 bg-amber-500 text-slate-950 text-xs font-black rounded-lg"
                >
                  Ad Dekhna Jari Rakhein ({timeLeft}s)
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-lg"
                >
                  Exit
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified Secure Adsterra Stream • Instant Coins Delivery</span>
          </div>
        </div>
      </div>
    </div>
  );
};
