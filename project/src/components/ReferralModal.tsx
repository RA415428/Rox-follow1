import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  Users, 
  Coins, 
  Gift, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  MessageCircle, 
  Send, 
  ShieldCheck,
  Award
} from 'lucide-react';
import { UserWallet, AdminConfig } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { claimReferralBonus, fetchUserReferralHistory, traceReferralClick } from '../utils/storage';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: UserWallet;
  adminConfig?: AdminConfig;
  onUpdateWallet?: (newWallet: UserWallet) => void;
  onShowToast?: (msg: string) => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  wallet,
  adminConfig,
  onUpdateWallet,
  onShowToast
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimStatusMsg, setClaimStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Live Referral Stats
  const [stats, setStats] = useState({
    totalReferrals: wallet.totalReferralsCount || 0,
    successfulReferrals: wallet.totalReferralsCount || 0,
    coinsEarned: wallet.totalReferralCoinsEarned || ((wallet.totalReferralsCount || 0) * 100),
    history: [] as Array<{
      id: string;
      referredUid: string;
      status: string;
      coinsEarned: number;
      dateFormatted: string;
    }>
  });

  const memberId = wallet.memberId || '100001';
  const displayId = `#${memberId}`;
  const userReferralCode = wallet.referralCode || `ROX${memberId}`;
  const [copiedCode, setCopiedCode] = useState(false);
  
  // AppCreator24 APK Download + Referral URL
  const baseDownloadUrl = adminConfig?.pricing?.referralAppDownloadUrl?.trim() || 'https://www.appcreator24.com/app4146352-inodq9';
  const cleanBaseUrl = baseDownloadUrl.split('?')[0];
  const referralLink = `${cleanBaseUrl}?ref=${memberId}`;

  useEffect(() => {
    if (!isOpen) return;
    fetchUserReferralHistory(memberId).then((data) => {
      if (data) {
        setStats({
          totalReferrals: data.totalSuccessfulReferrals || wallet.totalReferralsCount || 0,
          successfulReferrals: data.totalSuccessfulReferrals || wallet.totalReferralsCount || 0,
          coinsEarned: data.totalReferralCoinsEarned || wallet.totalReferralCoinsEarned || 0,
          history: data.history || []
        });
      }
    }).catch(() => {});
  }, [isOpen, memberId, wallet.totalReferralsCount, wallet.totalReferralCoinsEarned]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    copyToClipboard(userReferralCode);
    setCopiedCode(true);
    onShowToast?.(`📋 Referral Code ${userReferralCode} copied!`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    copyToClipboard(referralLink);
    setCopiedLink(true);
    onShowToast?.('📋 Referral Link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyId = () => {
    copyToClipboard(displayId);
    setCopiedId(true);
    onShowToast?.(`📋 My ID ${displayId} copied!`);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleNativeShare = async () => {
    traceReferralClick(memberId);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Download RoxyeFollow & Get +50 Free Coins!',
          text: `🔥 Instagram Followers, Likes aur Views bilkul free me badhao!\n🎁 Sign up karte waqt mera Referral Code daalein: ${userReferralCode}\n👉 Download App: ${referralLink}\n\n`,
          url: referralLink
        });
        onShowToast?.('🎉 Download link shared successfully!');
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    traceReferralClick(memberId);
    const text = encodeURIComponent(
      `🔥 *Download RoxyeFollow App & Get Free Instagram Followers & Likes!*\n\n` +
      `🎁 Sign up karte waqt mera Referral Code use karo aur turant *+50 FREE Coins* pao!\n\n` +
      `🔑 *Referral Code:* *${userReferralCode}*\n` +
      `👉 *Download App:* ${referralLink}\n` +
      `🆔 *Member ID:* ${displayId}\n\n` +
      `⚡ 100% Real & Instant delivery!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleTelegramShare = () => {
    traceReferralClick(memberId);
    const text = encodeURIComponent(
      `🔥 Download RoxyeFollow App & Get Free Instagram Followers & Likes!\n` +
      `🎁 Mere link se app download karo aur turant +50 FREE Coins pao!\n` +
      `👉 Download: ${referralLink} (My ID: ${displayId})`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, '_blank');
  };

  const handleManualClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = friendIdInput.trim().replace(/^#+/, '');
    if (!cleanInput) {
      setClaimStatusMsg({ text: 'Kripya apne dost ki User ID (jaise #123456) enter karein.', isError: true });
      return;
    }

    if (cleanInput === memberId) {
      setClaimStatusMsg({ text: '❌ Aap khud ki User ID se bonus claim nahi kar sakte.', isError: true });
      return;
    }

    setClaiming(true);
    setClaimStatusMsg(null);

    try {
      const res = await claimReferralBonus(cleanInput, memberId);
      if (res.success) {
        setClaimStatusMsg({ text: res.message, isError: false });
        onShowToast?.(res.message);
        setFriendIdInput('');
        if (onUpdateWallet) {
          onUpdateWallet({
            ...wallet,
            coins: (wallet.coins || 0) + (res.rewardCoins || 50),
            referralClaimed: true,
            referredBy: `#${cleanInput}`
          });
        }
      } else {
        setClaimStatusMsg({ text: res.message, isError: true });
      }
    } catch (err: any) {
      setClaimStatusMsg({ text: 'Network error. Kripya punah prayas karein.', isError: true });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div id="referral_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="referral_modal_container" 
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-pink-500/30 rounded-3xl shadow-2xl shadow-pink-500/10 overflow-hidden text-white"
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Invite Friends & Earn
                <span className="px-2 py-0.5 text-[11px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-full">
                  +100 Coins
                </span>
              </h2>
              <p className="text-xs text-slate-400">Share your link and earn big rewards instantly</p>
            </div>
          </div>
          <button
            id="btn_close_referral_modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
          {/* Rewards Banner */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-pink-950/60 via-purple-950/40 to-slate-900 border border-pink-500/30 shadow-inner">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-pink-500/20 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  You Get
                </span>
                <div className="text-xl font-extrabold text-pink-400 flex items-center justify-center gap-1.5">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  +100 Coins
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">per successful invite</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-purple-500/20 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Friend Gets
                </span>
                <div className="text-xl font-extrabold text-purple-400 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  +50 Coins
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">instant welcome bonus</span>
              </div>
            </div>
          </div>

          {/* User ID & Referral Link Section */}
          <div className="space-y-3">
            {/* My Unique Referral Code Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900 border border-pink-500/30 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] font-semibold text-pink-300 flex items-center gap-1 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  My Unique Referral Code
                </span>
                <span className="text-xl font-black text-white tracking-widest font-mono">{userReferralCode}</span>
              </div>
              <button
                id="btn_copy_referral_code"
                onClick={handleCopyCode}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 active:scale-95 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md shadow-pink-600/30 cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4 text-white" />}
                {copiedCode ? 'Copied' : 'Copy Code'}
              </button>
            </div>

            {/* My User ID Card */}
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">My Member ID</span>
                <span className="text-base font-extrabold text-slate-200 tracking-wider font-mono">{displayId}</span>
              </div>
              <button
                id="btn_copy_referral_id"
                onClick={handleCopyId}
                className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-95 text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                {copiedId ? 'Copied' : 'Copy ID'}
              </button>
            </div>

            {/* Referral Link Box */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 block">APK Download & Referral Link</span>
                <span className="text-[10px] text-pink-400 font-mono">AppCreator24</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-pink-300 font-mono select-all focus:outline-none"
                />
                <button
                  id="btn_copy_referral_link"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 active:scale-95 text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-md shadow-pink-600/30 whitespace-nowrap"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Share this link with friends. When they download and open the app, bonus coins are added automatically!
              </p>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">Quick Share</span>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                id="btn_share_whatsapp"
                onClick={handleWhatsAppShare}
                className="py-2.5 px-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 active:scale-95 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950"
              >
                <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                WhatsApp
              </button>
              <button
                id="btn_share_telegram"
                onClick={handleTelegramShare}
                className="py-2.5 px-3 rounded-xl bg-sky-600/90 hover:bg-sky-500 active:scale-95 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-sky-950"
              >
                <Send className="w-4 h-4" />
                Telegram
              </button>
              <button
                id="btn_share_system"
                onClick={handleNativeShare}
                className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-95 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Share2 className="w-4 h-4 text-pink-400" />
                Share
              </button>
            </div>
          </div>

          {/* Live Referral Stats */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-yellow-400" />
                Your Referral Stats
              </span>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Realtime
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">Total Invites</span>
                <span className="text-base font-bold text-white">{stats.totalReferrals}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">Successful</span>
                <span className="text-base font-bold text-emerald-400">{stats.successfulReferrals}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">Earned</span>
                <span className="text-base font-bold text-yellow-400">+{stats.coinsEarned}</span>
              </div>
            </div>
          </div>

          {/* Have a friend's ID section */}
          {!wallet.referralClaimed && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">Have a Friend's Referral ID?</span>
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-purple-500/20 text-purple-300 rounded-md">
                  +50 Coins
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Enter your friend's User ID (e.g. #123456) to claim 50 free welcome coins!
              </p>
              
              <form onSubmit={handleManualClaim} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. #123456"
                  value={friendIdInput}
                  onChange={(e) => setFriendIdInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={claiming}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition-all shadow-md shadow-purple-900 whitespace-nowrap"
                >
                  {claiming ? 'Verifying...' : 'Claim +50'}
                </button>
              </form>

              {claimStatusMsg && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${claimStatusMsg.isError ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300' : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'}`}>
                  {claimStatusMsg.isError ? <X className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{claimStatusMsg.text}</span>
                </div>
              )}
            </div>
          )}

          {/* How It Works Steps */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              How Referral Works
            </span>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>Share your personal link or User ID <strong className="text-white font-mono">{displayId}</strong> with friends.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>Friend opens the app using your link as a new user.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>You instantly get <strong className="text-emerald-400">+100 Coins</strong> and your friend gets <strong className="text-purple-300">+50 Welcome Coins</strong>!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Instant & Secure Rewards</span>
          </div>
          <button
            id="btn_modal_done"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
