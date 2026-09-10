import React, { useState } from 'react';
import { 
  Tv, 
  CheckCircle2, 
  Clock, 
  Play, 
  RotateCcw
} from 'lucide-react';
import { AdminConfig, AdsSettings } from '../../types';

interface AdminAdsConfigProps {
  config: AdminConfig;
  onUpdateConfig: (newConfig: AdminConfig) => void;
  onTriggerTestAd: () => void;
  onResetDailyAdLimits?: () => void;
}

export const AdminAdsConfig: React.FC<AdminAdsConfigProps> = ({
  config,
  onUpdateConfig,
  onTriggerTestAd,
  onResetDailyAdLimits
}) => {
  const [adsState, setAdsState] = useState<AdsSettings>(config.ads);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const [inputStrings, setInputStrings] = useState({
    autoAdIntervalMinutes: config.ads.autoAdIntervalMinutes?.toString() || '2',
    coinsPerRewardAd: config.ads.coinsPerRewardAd?.toString() || '50',
    coinsPerSocialBarAd: config.ads.coinsPerSocialBarAd?.toString() || '10',
    coinsPerAutoSmartlinkAd: config.ads.coinsPerAutoSmartlinkAd?.toString() || '5',
    coinsPerBannerClick: config.ads.coinsPerBannerClick?.toString() || '5',
    coinsPerSlidingBannerAd: config.ads.coinsPerSlidingBannerAd?.toString() || '5',
    dailySlidingBannerAdLimit: config.ads.dailySlidingBannerAdLimit?.toString() || '10',
    maxDailyAdsPerUser: config.ads.maxDailyAdsPerUser?.toString() || '10',
  });

  const prevAdsRef = React.useRef<string>(JSON.stringify(config.ads));

  React.useEffect(() => {
    const currentKey = JSON.stringify(config.ads);
    if (currentKey !== prevAdsRef.current) {
      prevAdsRef.current = currentKey;
      setAdsState(config.ads);
      setInputStrings({
        autoAdIntervalMinutes: config.ads.autoAdIntervalMinutes?.toString() || '2',
        coinsPerRewardAd: config.ads.coinsPerRewardAd?.toString() || '50',
        coinsPerSocialBarAd: config.ads.coinsPerSocialBarAd?.toString() || '10',
        coinsPerAutoSmartlinkAd: config.ads.coinsPerAutoSmartlinkAd?.toString() || '5',
        coinsPerBannerClick: config.ads.coinsPerBannerClick?.toString() || '5',
        coinsPerSlidingBannerAd: config.ads.coinsPerSlidingBannerAd?.toString() || '5',
        dailySlidingBannerAdLimit: config.ads.dailySlidingBannerAdLimit?.toString() || '10',
        maxDailyAdsPerUser: config.ads.maxDailyAdsPerUser?.toString() || '10',
      });
    }
  }, [config.ads]);

  const handleSave = () => {
    const finalAds: AdsSettings = {
      ...adsState,
      autoAdIntervalMinutes: parseInt(inputStrings.autoAdIntervalMinutes, 10) || 2,
      coinsPerRewardAd: parseInt(inputStrings.coinsPerRewardAd, 10) || 50,
      coinsPerSocialBarAd: parseInt(inputStrings.coinsPerSocialBarAd, 10) || 10,
      coinsPerAutoSmartlinkAd: parseInt(inputStrings.coinsPerAutoSmartlinkAd, 10) || 5,
      coinsPerBannerClick: parseInt(inputStrings.coinsPerBannerClick, 10) || 5,
      coinsPerSlidingBannerAd: parseInt(inputStrings.coinsPerSlidingBannerAd, 10) || 5,
      dailySlidingBannerAdLimit: parseInt(inputStrings.dailySlidingBannerAdLimit, 10) || 10,
      maxDailyAdsPerUser: parseInt(inputStrings.maxDailyAdsPerUser, 10) || 10,
    };

    const newConfig = {
      ...config,
      ads: finalAds,
      lastUpdated: Date.now()
    };

    prevAdsRef.current = JSON.stringify(finalAds);
    onUpdateConfig(newConfig);
    setAdsState(finalAds);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-900/40 via-slate-900 to-purple-900/40 border border-pink-500/20 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-pink-500/20 text-pink-300 text-[10px] font-bold rounded uppercase tracking-wide">
              Ad Engine & Monetization
            </span>
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Connected
            </span>
          </div>
          <h2 className="text-lg font-black text-white">Ads Configuration & Active Usage Timer</h2>
          <p className="text-xs text-slate-300">
            Configure in-app ads, coin reward amounts, daily limits, and active session timers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerTestAd}
            className="px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Preview Test Ad Now
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Save Ads Settings
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Ads & Timer settings saved successfully!</span>
        </div>
      )}

      {/* Rewards & Interval Timer Settings */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" /> Coin Rewards & Usage Limits
          </h3>
          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold rounded-lg font-mono">
            Rewarded: +{inputStrings.coinsPerRewardAd} Coins
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-emerald-400">Coins Reward per Rewarded Video Ad</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={inputStrings.coinsPerRewardAd}
                onChange={(e) => setInputStrings({ ...inputStrings, coinsPerRewardAd: e.target.value })}
                placeholder="e.g. 50"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-emerald-400 font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-400 font-bold shrink-0">Coins</span>
            </div>
            <p className="text-[10px] text-slate-500">Coins credited immediately upon completing video ad.</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-white">Auto Ad Trigger Interval (Minutes)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={inputStrings.autoAdIntervalMinutes}
                onChange={(e) => setInputStrings({ ...inputStrings, autoAdIntervalMinutes: e.target.value })}
                placeholder="e.g. 2"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-amber-400 font-bold text-sm focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-slate-400 font-bold shrink-0">Mins</span>
            </div>
            <p className="text-[10px] text-slate-500">Auto ad triggers every {inputStrings.autoAdIntervalMinutes || '2'} active minutes in app.</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-pink-400">Coins per Social Bar Ad Claim</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={inputStrings.coinsPerSocialBarAd}
                onChange={(e) => setInputStrings({ ...inputStrings, coinsPerSocialBarAd: e.target.value })}
                placeholder="e.g. 10"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-pink-400 font-bold text-sm focus:outline-none focus:border-pink-500"
              />
              <span className="text-xs text-slate-400 font-bold shrink-0">Coins</span>
            </div>
            <p className="text-[10px] text-slate-500">Coins rewarded when user clicks & claims Social Bar offer.</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-2 ring-1 ring-amber-500/20">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-amber-400">Coins per Tap & Earn Ad Banner</label>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded font-mono">
                +{inputStrings.coinsPerBannerClick || '5'} Coins
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={inputStrings.coinsPerBannerClick}
                onChange={(e) => setInputStrings({ ...inputStrings, coinsPerBannerClick: e.target.value })}
                placeholder="e.g. 5"
                className="w-full px-4 py-2 bg-slate-900 border border-amber-500/40 rounded-xl text-amber-300 font-bold text-sm focus:outline-none focus:border-amber-400"
              />
              <span className="text-xs text-amber-400 font-bold shrink-0">Coins</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Customize how many coins users get instantly upon tapping "Tap & Earn Coins" banner ads.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-pink-400">Coins per Sliding Banner Ad (Top Ad)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={inputStrings.coinsPerSlidingBannerAd}
                onChange={(e) => setInputStrings({ ...inputStrings, coinsPerSlidingBannerAd: e.target.value })}
                placeholder="e.g. 5"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-pink-400 font-bold text-sm focus:outline-none focus:border-pink-500"
              />
              <span className="text-xs text-slate-400 font-bold shrink-0">Coins</span>
            </div>
            <p className="text-[10px] text-slate-500">Coins credited when user taps Claim on top sliding banner.</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-cyan-400">Daily Sliding Banner Ad Limit</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={inputStrings.dailySlidingBannerAdLimit}
                onChange={(e) => setInputStrings({ ...inputStrings, dailySlidingBannerAdLimit: e.target.value })}
                placeholder="e.g. 10"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-cyan-400 font-bold text-sm focus:outline-none focus:border-cyan-500"
              />
              <span className="text-xs text-slate-400 font-bold shrink-0">Claims/day</span>
            </div>
            <p className="text-[10px] text-slate-500">Max times a user can claim Sliding Banner coins in 24 hours.</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-purple-400">Max Daily Video Ads per User</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={inputStrings.maxDailyAdsPerUser}
                onChange={(e) => setInputStrings({ ...inputStrings, maxDailyAdsPerUser: e.target.value })}
                placeholder="e.g. 10"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-purple-400 font-bold text-sm focus:outline-none focus:border-purple-500"
              />
              <span className="text-xs text-slate-400 font-bold shrink-0">Ads/day</span>
            </div>
            <p className="text-[10px] text-slate-500">Daily limit for rewarded video ads per user.</p>

            <button
              type="button"
              onClick={() => {
                if (onResetDailyAdLimits) {
                  onResetDailyAdLimits();
                  setResetSuccess(true);
                  setTimeout(() => setResetSuccess(false), 3000);
                }
              }}
              className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs py-2 px-3 rounded-lg shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Per Day Limit (All Users)</span>
            </button>
            {resetSuccess && (
              <p className="text-[10px] font-bold text-emerald-400 text-center animate-in fade-in">
                ✅ Daily ad limits reset to 0 for all users!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

