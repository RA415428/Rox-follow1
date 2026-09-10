import React, { useState, useEffect, useRef } from 'react';
import { 
  DollarSign, 
  Coins, 
  CheckCircle2, 
  Zap, 
  Layers, 
  Package,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';
import { AdminConfig, CoinPackage, PricingSettings } from '../../types';
import { coinPackages as defaultPackages, subscriptionPackage as defaultSubPackage } from '../../data/appData';
import { ServiceIcon } from '../ServiceIcon';

interface AdminPricingProps {
  config: AdminConfig;
  onUpdateConfig: (newConfig: AdminConfig) => void;
}

export const AdminPricing: React.FC<AdminPricingProps> = ({ config, onUpdateConfig }) => {
  const [pricingState, setPricingState] = useState<PricingSettings>(config.pricing);
  const [packagesState, setPackagesState] = useState<CoinPackage[]>(() => {
    return (config.coinPackages && config.coinPackages.length > 0)
      ? config.coinPackages
      : defaultPackages;
  });
  const [subscriptionState, setSubscriptionState] = useState<CoinPackage>(() => {
    return config.subscriptionPackage || defaultSubPackage;
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const formatRateStr = (val?: number, fallback: number = 200) => {
    const num = val ?? fallback;
    return (num < 5 ? Math.round(num * 1000) : num).toString();
  };

  // Raw string state for fluid typing, clearing (cutting), and decimal input
  const [inputStrings, setInputStrings] = useState({
    coinsPerFollower: formatRateStr(config.pricing.coinsPerFollower, 200),
    minFollowers: (config.pricing.minFollowers ?? 50).toString(),
    maxFollowers: (config.pricing.maxFollowers ?? 10000).toString(),

    coinsPerLike: formatRateStr(config.pricing.coinsPerLike, 100),
    minLikes: (config.pricing.minLikes ?? 100).toString(),
    maxLikes: (config.pricing.maxLikes ?? 50000).toString(),

    coinsPerView: formatRateStr(config.pricing.coinsPerView, 20),
    minViews: (config.pricing.minViews ?? 500).toString(),
    maxViews: (config.pricing.maxViews ?? 100000).toString(),

    coinsPerComment: formatRateStr(config.pricing.coinsPerComment, 200),
    minComments: (config.pricing.minComments ?? 10).toString(),
    maxComments: (config.pricing.maxComments ?? 500).toString(),

    coinsPerShare: formatRateStr(config.pricing.coinsPerShare, 150),
    minShares: (config.pricing.minShares ?? 20).toString(),
    maxShares: (config.pricing.maxShares ?? 5000).toString(),

    coinsPerRepost: formatRateStr(config.pricing.coinsPerRepost, 250),
    minReposts: (config.pricing.minReposts ?? 10).toString(),
    maxReposts: (config.pricing.maxReposts ?? 2000).toString(),

    coinsPerSave: formatRateStr(config.pricing.coinsPerSave, 100),
    minSaves: (config.pricing.minSaves ?? 20).toString(),
    maxSaves: (config.pricing.maxSaves ?? 10000).toString(),

    coinsPerReach: formatRateStr(config.pricing.coinsPerReach, 180),
    minReach: (config.pricing.minReach ?? 100).toString(),
    maxReach: (config.pricing.maxReach ?? 50000).toString(),

    dailyCheckinReward: config.pricing.dailyCheckinReward?.toString() ?? '20',
    referralRewardCoins: config.pricing.referralRewardCoins?.toString() ?? '10',
    googleWelcomeBonusCoins: config.pricing.googleWelcomeBonusCoins?.toString() ?? '10',
    referralAppDownloadUrl: config.pricing.referralAppDownloadUrl ?? 'https://www.appcreator24.com/app4146352-inodq9',
  });

  const prevPricingRef = useRef<string>(JSON.stringify(config.pricing));
  const prevPackagesRef = useRef<string>(JSON.stringify(config.coinPackages || []));

  useEffect(() => {
    const currentPricingKey = JSON.stringify(config.pricing);
    if (currentPricingKey !== prevPricingRef.current) {
      prevPricingRef.current = currentPricingKey;
      setPricingState(config.pricing);
      setInputStrings({
        coinsPerFollower: formatRateStr(config.pricing.coinsPerFollower, 200),
        minFollowers: (config.pricing.minFollowers ?? 50).toString(),
        maxFollowers: (config.pricing.maxFollowers ?? 10000).toString(),

        coinsPerLike: formatRateStr(config.pricing.coinsPerLike, 100),
        minLikes: (config.pricing.minLikes ?? 100).toString(),
        maxLikes: (config.pricing.maxLikes ?? 50000).toString(),

        coinsPerView: formatRateStr(config.pricing.coinsPerView, 20),
        minViews: (config.pricing.minViews ?? 500).toString(),
        maxViews: (config.pricing.maxViews ?? 100000).toString(),

        coinsPerComment: formatRateStr(config.pricing.coinsPerComment, 200),
        minComments: (config.pricing.minComments ?? 10).toString(),
        maxComments: (config.pricing.maxComments ?? 500).toString(),

        coinsPerShare: formatRateStr(config.pricing.coinsPerShare, 150),
        minShares: (config.pricing.minShares ?? 20).toString(),
        maxShares: (config.pricing.maxShares ?? 5000).toString(),

        coinsPerRepost: formatRateStr(config.pricing.coinsPerRepost, 250),
        minReposts: (config.pricing.minReposts ?? 10).toString(),
        maxReposts: (config.pricing.maxReposts ?? 2000).toString(),

        coinsPerSave: formatRateStr(config.pricing.coinsPerSave, 100),
        minSaves: (config.pricing.minSaves ?? 20).toString(),
        maxSaves: (config.pricing.maxSaves ?? 10000).toString(),

        coinsPerReach: formatRateStr(config.pricing.coinsPerReach, 180),
        minReach: (config.pricing.minReach ?? 100).toString(),
        maxReach: (config.pricing.maxReach ?? 50000).toString(),

        dailyCheckinReward: config.pricing.dailyCheckinReward?.toString() ?? '20',
        referralRewardCoins: config.pricing.referralRewardCoins?.toString() ?? '50',
        googleWelcomeBonusCoins: config.pricing.googleWelcomeBonusCoins?.toString() ?? '50',
        referralAppDownloadUrl: config.pricing.referralAppDownloadUrl ?? 'https://www.appcreator24.com/app4146352-inodq9',
      });
    }

    if (config.coinPackages && config.coinPackages.length > 0) {
      const currentPackagesKey = JSON.stringify(config.coinPackages);
      if (currentPackagesKey !== prevPackagesRef.current) {
        prevPackagesRef.current = currentPackagesKey;
        setPackagesState(config.coinPackages);
      }
    }

    if (config.subscriptionPackage) {
      setSubscriptionState(config.subscriptionPackage);
    }
  }, [config.pricing, config.coinPackages, config.subscriptionPackage]);

  const handleSave = () => {
    const parseVal = (str: string, fallback: number) => {
      const num = parseFloat(str);
      return !isNaN(num) && num >= 0 ? num : fallback;
    };

    const finalPricing: PricingSettings = {
      coinsPerFollower: parseVal(inputStrings.coinsPerFollower, 200),
      minFollowers: Math.max(1, Math.floor(parseVal(inputStrings.minFollowers, 50))),
      maxFollowers: Math.max(1, Math.floor(parseVal(inputStrings.maxFollowers, 10000))),

      coinsPerLike: parseVal(inputStrings.coinsPerLike, 100),
      minLikes: Math.max(1, Math.floor(parseVal(inputStrings.minLikes, 100))),
      maxLikes: Math.max(1, Math.floor(parseVal(inputStrings.maxLikes, 50000))),

      coinsPerView: parseVal(inputStrings.coinsPerView, 20),
      minViews: Math.max(1, Math.floor(parseVal(inputStrings.minViews, 500))),
      maxViews: Math.max(1, Math.floor(parseVal(inputStrings.maxViews, 100000))),

      coinsPerComment: parseVal(inputStrings.coinsPerComment, 200),
      minComments: Math.max(1, Math.floor(parseVal(inputStrings.minComments, 10))),
      maxComments: Math.max(1, Math.floor(parseVal(inputStrings.maxComments, 500))),

      coinsPerShare: parseVal(inputStrings.coinsPerShare, 150),
      minShares: Math.max(1, Math.floor(parseVal(inputStrings.minShares, 20))),
      maxShares: Math.max(1, Math.floor(parseVal(inputStrings.maxShares, 5000))),

      coinsPerRepost: parseVal(inputStrings.coinsPerRepost, 250),
      minReposts: Math.max(1, Math.floor(parseVal(inputStrings.minReposts, 10))),
      maxReposts: Math.max(1, Math.floor(parseVal(inputStrings.maxReposts, 2000))),

      coinsPerSave: parseVal(inputStrings.coinsPerSave, 100),
      minSaves: Math.max(1, Math.floor(parseVal(inputStrings.minSaves, 20))),
      maxSaves: Math.max(1, Math.floor(parseVal(inputStrings.maxSaves, 10000))),

      coinsPerReach: parseVal(inputStrings.coinsPerReach, 180),
      minReach: Math.max(1, Math.floor(parseVal(inputStrings.minReach, 100))),
      maxReach: Math.max(1, Math.floor(parseVal(inputStrings.maxReach, 50000))),

      dailyCheckinReward: parseVal(inputStrings.dailyCheckinReward, 20),
      referralRewardCoins: parseVal(inputStrings.referralRewardCoins, 10),
      googleWelcomeBonusCoins: Math.max(0, Math.floor(parseVal(inputStrings.googleWelcomeBonusCoins, 10))),
      referralAppDownloadUrl: inputStrings.referralAppDownloadUrl?.trim() || 'https://www.appcreator24.com/app4146352-inodq9',
    };

    const newConfig: AdminConfig = {
      ...config,
      pricing: finalPricing,
      coinPackages: packagesState,
      subscriptionPackage: subscriptionState,
      lastUpdated: Date.now()
    };

    prevPricingRef.current = JSON.stringify(finalPricing);
    prevPackagesRef.current = JSON.stringify(packagesState);
    onUpdateConfig(newConfig);
    setPricingState(finalPricing);
    setInputStrings({
      coinsPerFollower: finalPricing.coinsPerFollower.toString(),
      minFollowers: (finalPricing.minFollowers ?? 50).toString(),
      maxFollowers: (finalPricing.maxFollowers ?? 10000).toString(),

      coinsPerLike: finalPricing.coinsPerLike.toString(),
      minLikes: (finalPricing.minLikes ?? 100).toString(),
      maxLikes: (finalPricing.maxLikes ?? 50000).toString(),

      coinsPerView: finalPricing.coinsPerView.toString(),
      minViews: (finalPricing.minViews ?? 500).toString(),
      maxViews: (finalPricing.maxViews ?? 100000).toString(),

      coinsPerComment: finalPricing.coinsPerComment.toString(),
      minComments: (finalPricing.minComments ?? 10).toString(),
      maxComments: (finalPricing.maxComments ?? 500).toString(),

      coinsPerShare: finalPricing.coinsPerShare.toString(),
      minShares: (finalPricing.minShares ?? 20).toString(),
      maxShares: (finalPricing.maxShares ?? 5000).toString(),

      coinsPerRepost: (finalPricing.coinsPerRepost ?? 250).toString(),
      minReposts: (finalPricing.minReposts ?? 10).toString(),
      maxReposts: (finalPricing.maxReposts ?? 2000).toString(),

      coinsPerSave: (finalPricing.coinsPerSave ?? 100).toString(),
      minSaves: (finalPricing.minSaves ?? 20).toString(),
      maxSaves: (finalPricing.maxSaves ?? 10000).toString(),

      coinsPerReach: (finalPricing.coinsPerReach ?? 180).toString(),
      minReach: (finalPricing.minReach ?? 100).toString(),
      maxReach: (finalPricing.maxReach ?? 50000).toString(),

      dailyCheckinReward: finalPricing.dailyCheckinReward.toString(),
      referralRewardCoins: finalPricing.referralRewardCoins.toString(),
      googleWelcomeBonusCoins: (finalPricing.googleWelcomeBonusCoins ?? 10).toString(),
      referralAppDownloadUrl: finalPricing.referralAppDownloadUrl,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const updatePackage = (id: string, updates: Partial<CoinPackage>) => {
    setPackagesState(
      packagesState.map((pkg) => {
        if (pkg.id === id) {
          const updatedPkg = { ...pkg, ...updates };
          if (updates.priceNum !== undefined) {
            updatedPkg.priceINR = `₹${updates.priceNum.toFixed(2)}`;
          }
          return updatedPkg;
        }
        return pkg;
      })
    );
  };

  const handleAddPackage = () => {
    const newId = `pkg_${Date.now()}`;
    const newPkg: CoinPackage = {
      id: newId,
      coins: 250,
      priceNum: 75.0,
      priceINR: '₹75.00',
      badge: ''
    };
    setPackagesState([...packagesState, newPkg]);
  };

  const handleDeletePackage = (id: string) => {
    if (packagesState.length <= 1) {
      alert('At least one package is required.');
      return;
    }
    setPackagesState(packagesState.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900/40 via-slate-900 to-yellow-900/40 border border-amber-500/20 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded uppercase tracking-wide">
              App Pricing & Service Rates
            </span>
            <span className="text-amber-400 text-xs font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Live Pricing & Top-Up Adjuster
            </span>
          </div>
          <h2 className="text-lg font-bold text-white">Services Coin Rates & Instant Coin Top-Up Packages</h2>
          <p className="text-xs text-slate-300">
            Adjust coin cost per follower/like/view and edit Instant Coin Top-Up package rates & pricing.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-pink-500 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Save Pricing & Top-Up Rates
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Rates updated live across Firebase and all connected app devices!</span>
        </div>
      )}

      {/* Service Coin Rates Grid */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Coins className="w-4 h-4 text-amber-400" /> Instagram Service Rates & Min/Max Limits
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Follower */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
              <ServiceIcon serviceId="followers" size="sm" />
              <span>Instagram Followers</span>
            </span>
            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Coins per 1,000 Followers</label>
              <input
                type="text"
                inputMode="decimal"
                value={inputStrings.coinsPerFollower}
                onChange={(e) => setInputStrings({ ...inputStrings, coinsPerFollower: e.target.value })}
                placeholder="e.g. 200, 100"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Min Quantity</label>
                <input
                  type="number"
                  value={inputStrings.minFollowers}
                  onChange={(e) => setInputStrings({ ...inputStrings, minFollowers: e.target.value })}
                  placeholder="50"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Max Quantity</label>
                <input
                  type="number"
                  value={inputStrings.maxFollowers}
                  onChange={(e) => setInputStrings({ ...inputStrings, maxFollowers: e.target.value })}
                  placeholder="10000"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Rate: 1,000 Followers = {parseFloat(inputStrings.coinsPerFollower) || 0} Coins</p>
          </div>

          {/* Like */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-pink-400 flex items-center gap-2">
              <ServiceIcon serviceId="likes" size="sm" />
              <span>Instagram Likes</span>
            </span>
            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Coins per 1,000 Likes</label>
              <input
                type="text"
                inputMode="decimal"
                value={inputStrings.coinsPerLike}
                onChange={(e) => setInputStrings({ ...inputStrings, coinsPerLike: e.target.value })}
                placeholder="e.g. 100, 50"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-bold text-pink-400 focus:outline-none focus:border-pink-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Min Quantity</label>
                <input
                  type="number"
                  value={inputStrings.minLikes}
                  onChange={(e) => setInputStrings({ ...inputStrings, minLikes: e.target.value })}
                  placeholder="100"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Max Quantity</label>
                <input
                  type="number"
                  value={inputStrings.maxLikes}
                  onChange={(e) => setInputStrings({ ...inputStrings, maxLikes: e.target.value })}
                  placeholder="50000"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Rate: 1,000 Likes = {parseFloat(inputStrings.coinsPerLike) || 0} Coins</p>
          </div>

          {/* Views */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-purple-400 flex items-center gap-2">
              <ServiceIcon serviceId="views" size="sm" />
              <span>Reels Views</span>
            </span>
            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Coins per 1,000 Views</label>
              <input
                type="text"
                inputMode="decimal"
                value={inputStrings.coinsPerView}
                onChange={(e) => setInputStrings({ ...inputStrings, coinsPerView: e.target.value })}
                placeholder="e.g. 20, 10"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-bold text-purple-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Min Quantity</label>
                <input
                  type="number"
                  value={inputStrings.minViews}
                  onChange={(e) => setInputStrings({ ...inputStrings, minViews: e.target.value })}
                  placeholder="500"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Max Quantity</label>
                <input
                  type="number"
                  value={inputStrings.maxViews}
                  onChange={(e) => setInputStrings({ ...inputStrings, maxViews: e.target.value })}
                  placeholder="100000"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Rate: 1,000 Views = {parseFloat(inputStrings.coinsPerView) || 0} Coins</p>
          </div>

          {/* Comments */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-blue-400 flex items-center gap-2">
              <ServiceIcon serviceId="comments" size="sm" />
              <span>Custom Comments</span>
            </span>
            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Coins per 1,000 Comments</label>
              <input
                type="text"
                inputMode="decimal"
                value={inputStrings.coinsPerComment}
                onChange={(e) => setInputStrings({ ...inputStrings, coinsPerComment: e.target.value })}
                placeholder="e.g. 200, 100"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-bold text-blue-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Min Quantity</label>
                <input
                  type="number"
                  value={inputStrings.minComments}
                  onChange={(e) => setInputStrings({ ...inputStrings, minComments: e.target.value })}
                  placeholder="10"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Max Quantity</label>
                <input
                  type="number"
                  value={inputStrings.maxComments}
                  onChange={(e) => setInputStrings({ ...inputStrings, maxComments: e.target.value })}
                  placeholder="500"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Rate: 1,000 Comments = {parseFloat(inputStrings.coinsPerComment) || 0} Coins</p>
          </div>

          {/* Shares */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
              <ServiceIcon serviceId="shares" size="sm" />
              <span>Reels Shares</span>
            </span>
            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Coins per 1,000 Shares</label>
              <input
                type="text"
                inputMode="decimal"
                value={inputStrings.coinsPerShare}
                onChange={(e) => setInputStrings({ ...inputStrings, coinsPerShare: e.target.value })}
                placeholder="e.g. 150, 100"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Min Quantity</label>
                <input
                  type="number"
                  value={inputStrings.minShares}
                  onChange={(e) => setInputStrings({ ...inputStrings, minShares: e.target.value })}
                  placeholder="20"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Max Quantity</label>
                <input
                  type="number"
                  value={inputStrings.maxShares}
                  onChange={(e) => setInputStrings({ ...inputStrings, maxShares: e.target.value })}
                  placeholder="5000"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Rate: 1,000 Shares = {parseFloat(inputStrings.coinsPerShare) || 0} Coins</p>
          </div>

          {/* Reposts */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-fuchsia-400 flex items-center gap-2">
              <ServiceIcon serviceId="reposts" size="sm" />
              <span>Instagram Repost</span>
            </span>
            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Coins per 1,000 Reposts</label>
              <input
                type="text"
                inputMode="decimal"
                value={inputStrings.coinsPerRepost}
                onChange={(e) => setInputStrings({ ...inputStrings, coinsPerRepost: e.target.value })}
                placeholder="e.g. 250, 200"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-bold text-fuchsia-400 focus:outline-none focus:border-fuchsia-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Min Quantity</label>
                <input
                  type="number"
                  value={inputStrings.minReposts}
                  onChange={(e) => setInputStrings({ ...inputStrings, minReposts: e.target.value })}
                  placeholder="10"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-fuchsia-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Max Quantity</label>
                <input
                  type="number"
                  value={inputStrings.maxReposts}
                  onChange={(e) => setInputStrings({ ...inputStrings, maxReposts: e.target.value })}
                  placeholder="2000"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-fuchsia-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Rate: 1,000 Reposts = {parseFloat(inputStrings.coinsPerRepost) || 0} Coins</p>
          </div>

          {/* Saves */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-2">
              <ServiceIcon serviceId="saves" size="sm" />
              <span>Instagram Saves</span>
            </span>
            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Coins per 1,000 Saves</label>
              <input
                type="text"
                inputMode="decimal"
                value={inputStrings.coinsPerSave}
                onChange={(e) => setInputStrings({ ...inputStrings, coinsPerSave: e.target.value })}
                placeholder="e.g. 100, 80"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Min Quantity</label>
                <input
                  type="number"
                  value={inputStrings.minSaves}
                  onChange={(e) => setInputStrings({ ...inputStrings, minSaves: e.target.value })}
                  placeholder="20"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Max Quantity</label>
                <input
                  type="number"
                  value={inputStrings.maxSaves}
                  onChange={(e) => setInputStrings({ ...inputStrings, maxSaves: e.target.value })}
                  placeholder="10000"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Rate: 1,000 Saves = {parseFloat(inputStrings.coinsPerSave) || 0} Coins</p>
          </div>

          {/* Reach + Impressions + Profile Visits */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-2">
              <ServiceIcon serviceId="reach" size="sm" />
              <span>Instagram Reach + Impressions + Visits</span>
            </span>
            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Coins per 1,000 Units</label>
              <input
                type="text"
                inputMode="decimal"
                value={inputStrings.coinsPerReach}
                onChange={(e) => setInputStrings({ ...inputStrings, coinsPerReach: e.target.value })}
                placeholder="e.g. 180, 200"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-bold text-rose-400 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Min Quantity</label>
                <input
                  type="number"
                  value={inputStrings.minReach}
                  onChange={(e) => setInputStrings({ ...inputStrings, minReach: e.target.value })}
                  placeholder="100"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Max Quantity</label>
                <input
                  type="number"
                  value={inputStrings.maxReach}
                  onChange={(e) => setInputStrings({ ...inputStrings, maxReach: e.target.value })}
                  placeholder="50000"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Rate: 1,000 Units = {parseFloat(inputStrings.coinsPerReach) || 0} Coins</p>
          </div>

          {/* New User Welcome Bonus */}
          <div className="bg-gradient-to-br from-pink-950/40 via-slate-950 to-purple-950/40 p-4 rounded-xl border border-pink-500/40 space-y-2 col-span-1 md:col-span-2 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-pink-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
                <span>🌟 New User Welcome Bonus (Initial Reward)</span>
              </span>
              <span className="px-2 py-0.5 bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-black rounded-full font-mono">
                ACTIVE
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-1">
                <label className="block text-[11px] text-slate-300 font-bold mb-1">Welcome Bonus Coins</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputStrings.googleWelcomeBonusCoins}
                    onChange={(e) => setInputStrings({ ...inputStrings, googleWelcomeBonusCoins: e.target.value })}
                    placeholder="e.g. 10"
                    className="w-full px-3 py-2 bg-slate-900 border border-pink-500/50 rounded-lg text-white text-xs font-black text-pink-300 font-mono focus:outline-none focus:border-pink-400"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-amber-400 font-bold">Coins</span>
                </div>
              </div>
              <div className="sm:col-span-2 flex flex-col justify-center bg-slate-900/80 p-3 rounded-lg border border-pink-500/20 text-[11px] text-slate-300 space-y-1">
                <p>
                  ✨ Naye user ko app install karne par turant <strong className="text-pink-300 font-mono font-bold">+{inputStrings.googleWelcomeBonusCoins || 0} Welcome Coins</strong> milenge.
                </p>
                <p className="text-[10px] text-slate-400">
                  Ye bonus amount app banners aur wallet par automatically credit hoga.
                </p>
              </div>
            </div>
          </div>

          {/* Daily Checkin Bonus */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">🎁 Daily Checkin Reward</span>
            <label className="block text-[11px] text-slate-400">Free Coins Given Daily</label>
            <input
              type="text"
              inputMode="decimal"
              value={inputStrings.dailyCheckinReward}
              onChange={(e) => setInputStrings({ ...inputStrings, dailyCheckinReward: e.target.value })}
              placeholder="e.g. 20"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-bold text-yellow-400 focus:outline-none focus:border-yellow-500"
            />
            <p className="text-[10px] text-slate-500">Rewarding active daily app users</p>
          </div>

          {/* Referral Download & Open Reward Coins */}
          <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-2 col-span-1 md:col-span-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">🤝 Share App & Earn Coins (Referral Reward)</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Referral Bonus Coins (Given to Referrer)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={inputStrings.referralRewardCoins}
                  onChange={(e) => setInputStrings({ ...inputStrings, referralRewardCoins: e.target.value })}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">App Creator 24 / Uptodown APK Download Link</label>
                <input
                  type="text"
                  value={inputStrings.referralAppDownloadUrl}
                  onChange={(e) => setInputStrings({ ...inputStrings, referralAppDownloadUrl: e.target.value })}
                  placeholder="e.g. https://www.appcreator24.com/app4146352-inodq9"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-bold text-purple-300 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Users will share this APK link. When a friend downloads and opens the app, the referrer will automatically receive <strong className="text-amber-400 font-mono">+{inputStrings.referralRewardCoins} Coins</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Refill Monthly Subscription Plan Config */}
      <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/40 p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-extrabold rounded uppercase tracking-wide border border-purple-500/30">
                  AUTO-REFILL MONTHLY PLAN
                </span>
                <span className="text-emerald-400 text-[11px] font-bold">✨ Top-Pinned in User App</span>
              </div>
              <h3 className="text-sm font-black text-white">Monthly Subscription Coin & Payment Rate</h3>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono font-black text-amber-400">
              {subscriptionState.coins} Coins = ₹{subscriptionState.priceNum || 30}/mo
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Ye monthly plan user app me <strong className="text-purple-300">sabse upar</strong> dikhega. Jab user ise purchase karega, to unhe instantly monthly coins milenge. Aap yahan se coins ki sankhya aur payment price (INR ₹) customize kar sakte hain.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 p-4 rounded-xl border border-purple-500/20">
          <div>
            <label className="block text-[11px] text-slate-300 mb-1 font-bold">Monthly Coins Given</label>
            <div className="relative">
              <input
                type="number"
                value={subscriptionState.coins || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setSubscriptionState({ ...subscriptionState, coins: val });
                }}
                placeholder="e.g. 100, 500, 1000"
                className="w-full px-3 py-2 bg-slate-900 border border-purple-500/40 rounded-lg text-white text-xs font-bold font-mono focus:outline-none focus:border-purple-400"
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-amber-400 font-bold">Coins</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Kitne coins user ko milenge</p>
          </div>

          <div>
            <label className="block text-[11px] text-slate-300 mb-1 font-bold">Monthly Price (INR ₹)</label>
            <div className="relative">
              <input
                type="number"
                step="1"
                value={subscriptionState.priceNum || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setSubscriptionState({ 
                    ...subscriptionState, 
                    priceNum: val, 
                    priceINR: `₹${val.toFixed(2)} / Month` 
                  });
                }}
                placeholder="e.g. 30, 99, 199"
                className="w-full px-3 py-2 bg-slate-900 border border-purple-500/40 rounded-lg text-amber-400 text-xs font-bold font-mono focus:outline-none focus:border-purple-400"
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-bold">/ month</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Kitna payment lena hai (₹)</p>
          </div>

          <div>
            <label className="block text-[11px] text-slate-300 mb-1 font-bold">Plan Badge / Slogan</label>
            <input
              type="text"
              value={subscriptionState.badge || ''}
              onChange={(e) => setSubscriptionState({ ...subscriptionState, badge: e.target.value })}
              placeholder="e.g. BEST VALUE, VIP BOOSTER"
              className="w-full px-3 py-2 bg-slate-900 border border-purple-500/40 rounded-lg text-purple-300 text-xs font-semibold focus:outline-none focus:border-purple-400"
            />
            <p className="text-[10px] text-slate-500 mt-1">Highlighted badge card par</p>
          </div>
        </div>
      </div>

      {/* Instant Coin Top-Up Store Packages */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-400" /> Instant Coin Top-Up Packages (Store Rates)
          </h3>
          <button
            onClick={handleAddPackage}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Package
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Jab aap yahan coin amount ya price change karke <strong>Save Pricing & Top-Up Rates</strong> button dabayenge, to Firebase document <code>/config/global</code> update hoga aur ye naye rates sabhi users ki app me turant live ho jayenge!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {packagesState.map((pkg) => (
            <div key={pkg.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 relative group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 font-mono">{pkg.coins} Coins</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-400">{pkg.priceINR}</span>
                  <button
                    onClick={() => handleDeletePackage(pkg.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete Package"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Coins Amount</label>
                  <input
                    type="number"
                    value={pkg.coins || ''}
                    onChange={(e) => updatePackage(pkg.id, { coins: parseInt(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-bold font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Price (INR ₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={pkg.priceNum || ''}
                    onChange={(e) => updatePackage(pkg.id, { priceNum: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-amber-400 text-xs font-bold font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Badge Tag (Optional)</label>
                <input
                  type="text"
                  value={pkg.badge || ''}
                  onChange={(e) => updatePackage(pkg.id, { badge: e.target.value })}
                  placeholder="e.g. Popular, Best Value, 20% OFF"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-purple-300 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
