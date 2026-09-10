import React, { useState, useEffect } from 'react';
import { 
  Coins, Play, CreditCard, Sparkles, Check, Zap, Gift, ShieldCheck, 
  AlertTriangle, Lock, Share2, Copy, Send, Users, CheckCircle2, MessageSquare, Info, X,
  Link as LinkIcon, History, Clock
} from 'lucide-react';
import { AdminConfig, CoinPackage, UserWallet } from '../types';
import { coinPackages, subscriptionPackage } from '../data/appData';
import { formatCoins } from '../utils/format';
import { claimReferralBonus, traceReferralClick, fetchUserReferralHistory } from '../utils/storage';
import { copyToClipboard } from '../utils/clipboard';

interface CoinsScreenProps {
  wallet: UserWallet;
  adminConfig?: AdminConfig;
  onOpenAdModal: () => void;
  onRewardClaim?: (coins: number, isVideoAd?: boolean) => void;
  onSelectPaymentPackage: (pkg: CoinPackage) => void;
  onOpenOrders?: () => void;
  onShowToast?: (msg: string) => void;
}

export const CoinsScreen: React.FC<CoinsScreenProps> = ({
  wallet,
  adminConfig,
  onOpenAdModal,
  onRewardClaim,
  onSelectPaymentPackage,
  onOpenOrders,
  onShowToast
}) => {
  const maxDailyAds = adminConfig?.ads?.maxDailyAdsPerUser ?? wallet.maxDailyAds ?? 10;
  const rewardCoins = adminConfig?.ads?.coinsPerRewardAd ?? 50;
  const isLimitReached = wallet.dailyAdsWatched >= maxDailyAds;

  // 10-Second Ad Click Cooldown State & Wall-Clock Timer
  const [adCooldownSeconds, setAdCooldownSeconds] = useState<number>(() => {
    try {
      const expiry = parseInt(localStorage.getItem('roxyefollow_watch_ad_cooldown') || '0', 10);
      return Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const checkCooldown = () => {
      try {
        const expiry = parseInt(localStorage.getItem('roxyefollow_watch_ad_cooldown') || '0', 10);
        const remaining = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
        setAdCooldownSeconds(remaining);
      } catch {
        setAdCooldownSeconds(0);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 500);
    window.addEventListener('focus', checkCooldown);
    window.addEventListener('visibilitychange', checkCooldown);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkCooldown);
      window.removeEventListener('visibilitychange', checkCooldown);
    };
  }, []);

  const handleWatchAdClick = () => {
    if (isLimitReached) {
      onShowToast?.(`⚠️ Daily ad limit reached (${wallet.dailyAdsWatched}/${maxDailyAds})! Resets at midnight.`);
      return;
    }
    if (adCooldownSeconds > 0) {
      onShowToast?.(`⏳ Please wait ${adCooldownSeconds}s before clicking again!`);
      return;
    }
    onOpenAdModal();
  };

  const referrerBonusCoins = adminConfig?.pricing?.referralRewardCoins ?? 100; // Referrer bonus
  const newMemberBonusCoins = 50; // New member receiver bonus
  const displayUserId = `#${wallet.memberId}`;
  const baseDownloadUrl = adminConfig?.pricing?.referralAppDownloadUrl?.trim() || 'https://www.appcreator24.com/app4146352-inodq9';
  const cleanBaseUrl = baseDownloadUrl.split('?')[0];
  const referralShareUrl = `${cleanBaseUrl}?ref=${wallet.memberId}`;

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Referral History State
  const [referralHistory, setReferralHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isShareModalOpen && wallet?.memberId) {
      setLoadingHistory(true);
      fetchUserReferralHistory(wallet.memberId).then(data => {
        if (data && data.history) {
          setReferralHistory(data.history);
        }
      }).finally(() => setLoadingHistory(false));
    }
  }, [isShareModalOpen, wallet?.memberId]);

  // Manual Referral Code Entry State
  const [inputReferralCode, setInputReferralCode] = useState('');
  const [isClaimingRef, setIsClaimingRef] = useState(false);
  const [refClaimStatus, setRefClaimStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const hasAlreadyClaimed = wallet.referralClaimed || (typeof window !== 'undefined' && localStorage.getItem('instaboost_referral_claimed') === 'true');

  const handleApplyReferralCode = async () => {
    const cleanCode = inputReferralCode.trim().replace(/^#+/, '');
    if (!cleanCode) {
      setRefClaimStatus({ type: 'error', message: 'Kripya dost ka Referral Code (jaise RX100001 ya 100001) daalein.' });
      return;
    }
    if (cleanCode === wallet.memberId || cleanCode.toUpperCase() === `RX${wallet.memberId}`) {
      setRefClaimStatus({ type: 'error', message: '❌ Aap khud ka Referral Code use nahi kar sakte.' });
      return;
    }

    setIsClaimingRef(true);
    setRefClaimStatus({ type: null, message: '' });

    try {
      const res = await claimReferralBonus(cleanCode, wallet.memberId);
      if (res.success) {
        setRefClaimStatus({ 
          type: 'success', 
          message: res.message || `🎉 Mubarak! Aapko +${newMemberBonusCoins} Coins aur aapke dost ko +${referrerBonusCoins} Coins mil gaye!` 
        });
        setInputReferralCode('');
      } else {
        setRefClaimStatus({ type: 'error', message: res.message || '❌ Referral code apply karne me samasya aayi.' });
      }
    } catch (e: any) {
      setRefClaimStatus({ type: 'error', message: 'Network error. Kripya punah prayas karein.' });
    } finally {
      setIsClaimingRef(false);
    }
  };

  const userReferralCode = wallet.referralCode || `ROX${wallet.memberId}`;

  const handleCopyLink = async () => {
    traceReferralClick(wallet.memberId);
    await copyToClipboard(shareText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCodeOnly = async () => {
    await copyToClipboard(userReferralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const shareText = `🔥 RoxyeFollow App Se Free Instagram Followers & Likes Badhao!\n🔑 My Referral Code: ${userReferralCode}\n👉 Download Link: ${referralShareUrl}\n🎁 Sign up karke referral code use karein aur +50 Free Coins paayein!`;

  const handleShareWhatsApp = () => {
    traceReferralClick(wallet.memberId);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShareTelegram = () => {
    traceReferralClick(wallet.memberId);
    copyToClipboard(shareText);

    const isAndroid = /Android/i.test(navigator.userAgent);
    const telegramUrl = isAndroid
      ? `intent://msg_url?url=${encodeURIComponent(referralShareUrl)}&text=${encodeURIComponent('🔥 Download Rox Follow App & Get Free Instagram Followers & Likes!')}#Intent;package=org.telegram.messenger;scheme=tg;end`
      : `https://t.me/share/url?url=${encodeURIComponent(referralShareUrl)}&text=${encodeURIComponent('🔥 Download Rox Follow App & Get Free Instagram Followers & Likes!')}`;

    const a = document.createElement('a');
    a.href = telegramUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShareSMS = () => {
    traceReferralClick(wallet.memberId);
    const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`;
    const a = document.createElement('a');
    a.href = smsUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNativeShare = async () => {
    traceReferralClick(wallet.memberId);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rox Follow App Download & Referral',
          text: shareText,
          url: referralShareUrl,
        });
        return;
      } catch (err) {
        // Fallback to copy link
      }
    }
    handleCopyLink();
  };

  const activeCoinPackages = (adminConfig?.coinPackages && adminConfig.coinPackages.length > 0)
    ? adminConfig.coinPackages
    : coinPackages;

  const activeSubscriptionPackage: CoinPackage = adminConfig?.subscriptionPackage || subscriptionPackage;

  return (
    <div className="space-y-3 pb-20 pt-1 px-3 max-w-md mx-auto">
      {/* 1. Integrated Balance & Watch Video Ad Card (Compact & Zero-Scroll) */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-3.5 sm:p-4 text-slate-950 shadow-xl shadow-amber-500/20 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/20 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-black uppercase tracking-wider opacity-85 flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" /> Current Coin Balance
          </span>
          <span className="bg-slate-950/20 text-slate-950 font-bold text-[9px] px-2 py-0.5 rounded-full font-mono">
            Member #{wallet.memberId}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 my-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight">{formatCoins(wallet.coins)}</span>
            <span className="text-xs font-extrabold uppercase">Coins</span>
          </div>

          {/* Embedded Watch Video Ad Button with 10s Cooldown */}
          <button
            onClick={handleWatchAdClick}
            disabled={isLimitReached || adCooldownSeconds > 0}
            id="watch-rewarded-ad-store-btn"
            className={`font-black px-3.5 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-all text-xs shrink-0 ${
              isLimitReached
                ? 'bg-slate-950/70 text-slate-400 border border-slate-800 cursor-not-allowed'
                : adCooldownSeconds > 0
                ? 'bg-slate-900/90 text-amber-400 border border-amber-500/40 cursor-not-allowed font-mono shadow-inner'
                : 'bg-slate-950 hover:bg-slate-900 text-amber-300 border border-amber-400/40 shadow-slate-950/30 active:scale-95 cursor-pointer'
            }`}
          >
            {isLimitReached ? (
              <>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Limit Full</span>
              </>
            ) : adCooldownSeconds > 0 ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Wait {adCooldownSeconds}s...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
                <span>Watch Ad <strong className="text-amber-400 font-mono">+{rewardCoins}</strong></span>
              </>
            )}
          </button>
        </div>

        {/* Status subrow */}
        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-950/15 text-[10px] font-bold">
          <div className="flex items-center gap-1">
            <span>Daily Ads:</span>
            <span className="font-mono bg-slate-950/15 px-1.5 py-0.5 rounded">
              {wallet.dailyAdsWatched} / {maxDailyAds}
            </span>
          </div>

          {onOpenOrders && (
            <button
              type="button"
              onClick={onOpenOrders}
              className="text-slate-950 underline hover:opacity-80 font-extrabold flex items-center gap-1"
            >
              <CreditCard className="w-3 h-3" />
              <span>Claims Status</span>
            </button>
          )}
        </div>

        {/* Warning if limit reached */}
        {isLimitReached && (
          <div className="mt-2 p-2 bg-slate-950/80 border border-red-500/40 rounded-lg text-red-200 text-[10px] flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>Aaj ki ad limit ({maxDailyAds}/{maxDailyAds}) poori ho chuki hai. Raat 12 baje reset hogi.</span>
          </div>
        )}
      </div>

      {/* 2. COMPACT REFER & EARN CARD */}
      <div className="bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950 border border-purple-500/30 rounded-xl p-2.5 shadow-lg relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between gap-2">
          {/* Title & Info */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white">Refer & Earn</span>
                <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30 font-mono">
                  +{referrerBonusCoins} Coins
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Dost ko invite karo aur unlimited coins kamao!
              </p>
            </div>
          </div>

          {/* Action Buttons: +50 Invite Code & Share */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* +50 Invite Code Button */}
            <button
              type="button"
              onClick={() => setIsClaimModalOpen(true)}
              className="bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Gift className="w-3 h-3 text-pink-400" />
              <span>+50 Code</span>
            </button>

            {/* Share & Earn Button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-3 py-1.5 rounded-lg font-black text-[11px] shadow-sm flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* POPUP CLAIM REFERRAL CODE MODAL (+50 COINS) */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-pink-500/40 w-full max-w-sm rounded-2xl p-4 shadow-2xl space-y-3 relative overflow-hidden">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                  <Gift className="w-4 h-4 text-pink-200" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Have a Referral / Invite Code?</h3>
                  <p className="text-[10px] text-pink-400 font-bold flex items-center gap-1 mt-0.5">
                    <span>Enter friend's invite code to claim +50 FREE Coins!</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsClaimModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {hasAlreadyClaimed ? (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl space-y-1 text-center">
                <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Welcome Bonus Claimed (+50 Coins)</span>
                </div>
                <p className="text-[10.5px] text-slate-300 font-medium">
                  {wallet.referredBy ? `Aapne Member #${wallet.referredBy} ka referral code use kiya tha.` : 'Aapka +50 coins welcome bonus successfully account me add ho chuka hai.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-300 font-medium">
                  Agar aapke paas kisi dost ka Member ID ya Referral Code hai, to neeche enter karke <strong className="text-pink-400 font-black">+50 Coins</strong> turant claim karein:
                </p>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={inputReferralCode}
                    onChange={(e) => {
                      setInputReferralCode(e.target.value);
                      if (refClaimStatus.type) setRefClaimStatus({ type: null, message: '' });
                    }}
                    placeholder="Friend's Member ID (e.g. 100001)"
                    maxLength={10}
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyReferralCode}
                    disabled={isClaimingRef || !inputReferralCode.trim()}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 disabled:opacity-50 text-white font-black text-xs px-3.5 py-2 rounded-xl transition-all shadow active:scale-95 shrink-0 cursor-pointer"
                  >
                    {isClaimingRef ? 'Checking...' : 'Claim +50'}
                  </button>
                </div>

                {refClaimStatus.message && (
                  <div className={`p-2 rounded-xl text-[11px] font-medium flex items-start gap-1.5 ${
                    refClaimStatus.type === 'success' 
                      ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300' 
                      : 'bg-red-950/70 border border-red-500/40 text-red-300'
                  }`}>
                    {refClaimStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <span>{refClaimStatus.message}</span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsClaimModalOpen(false)}
              className="w-full mt-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* POPUP SHARE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-purple-500/40 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Share With Friends & Earn</h3>
                  <p className="text-xs text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                    <Coins className="w-3.5 h-3.5" /> Bhejne vale ko +{referrerBonusCoins} & Prapt karne vale ko +{newMemberBonusCoins} Coins!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsShareModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Unlimited Referral Badge & Stats */}
            <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                  <span>♾️ UNLIMITED REFERRALS</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold">No Daily Limit</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">Friends Referred</span>
                  <span className="text-sm font-black text-white font-mono">{wallet.totalReferralsCount || 0} Users</span>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">Referral Bonus Earned</span>
                  <span className="text-sm font-black text-amber-400 font-mono">+{wallet.totalReferralCoinsEarned || 0} Coins</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-300 font-bold block text-[11px]">My Referral ID:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-amber-300 font-mono font-black text-lg">{displayUserId}</span>
                  </div>
                </div>
                <button
                  onClick={handleCopyCodeOnly}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg transition-colors flex items-center gap-1 shadow"
                >
                  {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy ID'}</span>
                </button>
              </div>
            </div>

            {/* How Referral Rewards Work Box */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-amber-300 uppercase block">Aapko (Sender):</span>
                <p className="text-base font-black text-amber-400 font-mono">+{referrerBonusCoins} Coins</p>
                <p className="text-[10px] text-slate-400">Har ek dost ke join hone par</p>
              </div>
              <div className="p-2.5 bg-pink-500/10 border border-pink-500/30 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-pink-300 uppercase block">Dost ko (Receiver):</span>
                <p className="text-base font-black text-pink-400 font-mono">+{newMemberBonusCoins} Coins</p>
                <p className="text-[10px] text-slate-400">Pehli baar app open karne par</p>
              </div>
            </div>

            {/* Unique Referral Code Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Aapka Unique Referral Code:
              </label>
              <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-pink-950/40 to-slate-950 border border-pink-500/40 rounded-xl p-2.5">
                <div>
                  <span className="text-base font-black text-white font-mono tracking-widest block">
                    {userReferralCode}
                  </span>
                  <span className="text-[9px] text-pink-300/80">Friends ko signup ke waqt daalne ko bolein</span>
                </div>
                <button
                  onClick={handleCopyCodeOnly}
                  className="shrink-0 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Unique Referral Link Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Aapka Direct Referral Link:
              </label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 focus-within:border-amber-500 rounded-xl p-2">
                <input 
                  type="text" 
                  readOnly 
                  value={referralShareUrl} 
                  className="bg-transparent text-xs text-amber-300 font-mono px-1 w-full focus:outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-950" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Referral History / Activity */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <History className="w-3.5 h-3.5 text-amber-400" /> Aapke Referrals ({referralHistory.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-bold font-mono">
                  +{wallet.totalReferralCoinsEarned || (referralHistory.filter(h => h.status === 'REWARDED').length * referrerBonusCoins)} Coins Earned
                </span>
              </div>

              {loadingHistory ? (
                <div className="p-3 text-center text-xs text-slate-500">Loading referral history...</div>
              ) : referralHistory.length === 0 ? (
                <div className="p-3 bg-slate-950/60 rounded-xl text-center text-[11px] text-slate-500 border border-slate-800/80">
                  Abhi tak koi referral record nahi hai. Apne doston ko link share karke coins kamayein!
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {referralHistory.map((item) => (
                    <div key={item.id} className="bg-slate-950/80 border border-slate-800/90 rounded-lg p-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-200 block text-[11px]">
                          {item.referredName || `User #${item.referredUid}`}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {item.dateFormatted}
                        </span>
                      </div>
                      <div className="text-right">
                        {item.status === 'REWARDED' ? (
                          <span className="text-emerald-400 font-mono font-bold text-xs bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
                            +{item.coinsEarned || referrerBonusCoins} Coins
                          </span>
                        ) : item.status === 'REVIEW' ? (
                          <span className="text-amber-400 text-[10px] bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-500/30">
                            In Review
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Social Share Buttons */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Share Link to Friends:</label>
              
              {/* WhatsApp Primary Button */}
              <button
                onClick={handleShareWhatsApp}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-950/40 active:scale-98"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Share on WhatsApp (Direct)</span>
              </button>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {/* Telegram */}
                <button
                  onClick={handleShareTelegram}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-2.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors shadow-md active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Telegram</span>
                </button>

                {/* SMS / Messages */}
                <button
                  onClick={handleShareSMS}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors shadow-md active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>SMS/Text</span>
                </button>

                {/* More Apps / Share Sheet */}
                <button
                  onClick={handleNativeShare}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors shadow-md active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>More Apps</span>
                </button>
              </div>
            </div>

            {/* Verification Rule Alert Box */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-tight text-slate-300">
                <strong className="text-amber-300 font-bold">Automatic & Manual Support:</strong> Jab aapka dost aapke link se open karega ya unki app me aapka Member ID code <strong className="text-amber-300 font-mono">#{wallet.memberId}</strong> apply karega, tab aapko <strong className="text-amber-400 font-black">+{referrerBonusCoins} Coins</strong> aur dost ko <strong className="text-pink-400 font-black">+{newMemberBonusCoins} Coins</strong> milenge!
              </p>
            </div>

            <button
              onClick={() => setIsShareModalOpen(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* Auto-Refill Monthly Subscription Card (Pinned on Top of All Packages) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Monthly Auto-Refill Plan
          </h3>
          <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> VIP Best Value
          </span>
        </div>

        <div
          onClick={() => onSelectPaymentPackage(activeSubscriptionPackage)}
          className="bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950/90 border border-purple-500/50 hover:border-purple-400 rounded-2xl p-3 shadow-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] relative overflow-hidden group"
        >
          {/* Subtle Glow Accent */}
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-purple-500/20 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/30 transition-all" />

          <div className="space-y-0.5 relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wide">
                {activeSubscriptionPackage.badge || 'AUTO-REFILL MONTHLY'}
              </span>
              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> Instant Credit
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <span>{activeSubscriptionPackage.coins} Coins / Month Plan</span>
            </h4>
            <p className="text-[10px] text-slate-300">
              Har mahine {activeSubscriptionPackage.coins} coins auto-refill & VIP support.
            </p>
          </div>

          <div className="text-right shrink-0 relative z-10 pl-2.5">
            <p className="text-sm sm:text-base font-black text-amber-400 font-mono">
              ₹{activeSubscriptionPackage.priceNum ? activeSubscriptionPackage.priceNum.toFixed(2) : '30.00'}
            </p>
            <p className="text-[9px] text-slate-400 font-semibold">/ month</p>
            <button
              type="button"
              className="mt-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm group-hover:from-purple-500 group-hover:to-pink-500 transition-all flex items-center gap-1 mx-auto"
            >
              <span>Get Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Buy Coin Packages */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-pink-400" />
            Instant Coin Top-Up Packages
          </h3>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> UPI / Cards
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {activeCoinPackages.map((pkg) => (
            <div
              key={pkg.id}
              onClick={() => onSelectPaymentPackage(pkg)}
              className="bg-slate-900 border border-slate-800 hover:border-pink-500/60 rounded-xl p-3 flex flex-col justify-between space-y-2 cursor-pointer transition-colors active:opacity-80 shadow-md relative group"
            >
              {pkg.badge && (
                <span className="absolute -top-2 right-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm">
                  {pkg.badge}
                </span>
              )}

              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-0.5">
                  <Coins className="w-3.5 h-3.5" />
                  <span className="font-mono text-sm sm:text-base font-black text-white">{pkg.coins}</span>
                  <span className="text-[9px] text-slate-400 font-bold">Coins</span>
                </div>
                <p className="text-[9px] text-slate-400">Instant credit</p>
              </div>

              <button
                type="button"
                className="w-full bg-slate-800 group-hover:bg-pink-500 group-hover:text-white text-slate-200 font-black py-1.5 rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1"
              >
                <span>{pkg.priceINR}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
