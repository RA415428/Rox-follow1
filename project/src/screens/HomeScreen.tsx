import React, { useState, useMemo } from 'react';
import { ShoppingBag, Link as LinkIcon, Coins, ArrowRight, Sparkles, CheckCircle2, Info, Plus } from 'lucide-react';
import { ServiceOption, UserWallet, Order, PricingSettings, AdminConfig } from '../types';
import { ServiceIcon } from '../components/ServiceIcon';
import { formatCoins } from '../utils/format';

interface HomeScreenProps {
  wallet: UserWallet;
  pricing?: PricingSettings;
  adminConfig?: AdminConfig;
  onOpenAdModal?: () => void;
  onRewardClaim?: (coins: number, isVideoAd?: boolean) => void;
  onPlaceOrder: (order: Order) => void;
  onOpenCoins: () => void;
  onShowToast: (msg: string) => void;
}

const getDynamicServices = (pricing?: PricingSettings): ServiceOption[] => {
  const p = pricing || {
    coinsPerFollower: 200,
    minFollowers: 50,
    maxFollowers: 10000,
    coinsPerLike: 100,
    minLikes: 100,
    maxLikes: 50000,
    coinsPerView: 20,
    minViews: 500,
    maxViews: 100000,
    coinsPerComment: 200,
    minComments: 10,
    maxComments: 500,
    coinsPerShare: 150,
    minShares: 20,
    maxShares: 5000,
    coinsPerRepost: 250,
    minReposts: 10,
    maxReposts: 2000,
    coinsPerSave: 100,
    minSaves: 20,
    maxSaves: 10000,
    coinsPerReach: 180,
    minReach: 100,
    maxReach: 50000,
    dailyCheckinReward: 20
  };

  const parseRate = (val: number | undefined, default1k: number) => {
    const num = val ?? default1k;
    // If val is legacy fractional per-unit rate (< 5, e.g. 0.1), convert to 1k rate (0.1 * 1000 = 100)
    const coinsPer1k = num < 5 ? Math.round(num * 1000) : num;
    const coinsPerUnit = coinsPer1k / 1000;
    return { coinsPer1k, coinsPerUnit };
  };

  const followersRate = parseRate(p.coinsPerFollower, 200);
  const likesRate = parseRate(p.coinsPerLike, 100);
  const viewsRate = parseRate(p.coinsPerView, 20);
  const commentsRate = parseRate(p.coinsPerComment, 200);
  const sharesRate = parseRate(p.coinsPerShare, 150);
  const repostsRate = parseRate(p.coinsPerRepost, 250);
  const savesRate = parseRate(p.coinsPerSave, 100);
  const reachRate = parseRate(p.coinsPerReach, 180);

  return [
    {
      id: 'followers',
      name: 'Instagram Followers',
      icon: 'followers',
      coinsPerUnit: followersRate.coinsPerUnit,
      coinsPer1k: followersRate.coinsPer1k,
      minQuantity: p.minFollowers ?? 50,
      maxQuantity: p.maxFollowers ?? 10000,
      description: 'High quality real-looking Instagram profiles.'
    },
    {
      id: 'likes',
      name: 'Instagram Likes',
      icon: 'likes',
      coinsPerUnit: likesRate.coinsPerUnit,
      coinsPer1k: likesRate.coinsPer1k,
      minQuantity: p.minLikes ?? 100,
      maxQuantity: p.maxLikes ?? 50000,
      description: 'Instant engagement boost for posts & reels.'
    },
    {
      id: 'views',
      name: 'Reels Views',
      icon: 'views',
      coinsPerUnit: viewsRate.coinsPerUnit,
      coinsPer1k: viewsRate.coinsPer1k,
      minQuantity: p.minViews ?? 500,
      maxQuantity: p.maxViews ?? 100000,
      description: 'Help your Reels hit the Explore Page.'
    },
    {
      id: 'comments',
      name: 'Custom Comments',
      icon: 'comments',
      coinsPerUnit: commentsRate.coinsPerUnit,
      coinsPer1k: commentsRate.coinsPer1k,
      minQuantity: p.minComments ?? 10,
      maxQuantity: p.maxComments ?? 500,
      description: 'Custom relevant comments on your posts.'
    },
    {
      id: 'shares',
      name: 'Reels Shares',
      icon: 'shares',
      coinsPerUnit: sharesRate.coinsPerUnit,
      coinsPer1k: sharesRate.coinsPer1k,
      minQuantity: p.minShares ?? 20,
      maxQuantity: p.maxShares ?? 5000,
      description: 'Virality trigger shares & direct saves.'
    },
    {
      id: 'reposts',
      name: 'Instagram Repost',
      icon: 'reposts',
      coinsPerUnit: repostsRate.coinsPerUnit,
      coinsPer1k: repostsRate.coinsPer1k,
      minQuantity: p.minReposts ?? 10,
      maxQuantity: p.maxReposts ?? 2000,
      description: 'High-reach account reposts to boost virality.'
    },
    {
      id: 'saves',
      name: 'Instagram Saves',
      icon: 'saves',
      coinsPerUnit: savesRate.coinsPerUnit,
      coinsPer1k: savesRate.coinsPer1k,
      minQuantity: p.minSaves ?? 20,
      maxQuantity: p.maxSaves ?? 10000,
      description: 'Direct bookmark saves to trigger explore.'
    },
    {
      id: 'reach',
      name: 'Instagram Reach + Impressions + Profile visits (≈10%)',
      icon: 'reach',
      coinsPerUnit: reachRate.coinsPerUnit,
      coinsPer1k: reachRate.coinsPer1k,
      minQuantity: p.minReach ?? 100,
      maxQuantity: p.maxReach ?? 50000,
      description: 'Reach, impressions & profile visits boost.'
    }
  ];
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  wallet,
  pricing,
  adminConfig,
  onOpenAdModal,
  onRewardClaim,
  onPlaceOrder,
  onOpenCoins,
  onShowToast
}) => {
  const services = useMemo(() => getDynamicServices(pricing), [pricing]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('followers');
  const [targetUrl, setTargetUrl] = useState('');
  
  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0];

  const [quantityInput, setQuantityInput] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);

  // Keep quantity state in sync when service changes - default to empty input
  const handleSelectService = (svcId: string) => {
    setSelectedServiceId(svcId);
    setQuantityInput('');
    setQuantity(0);
  };

  const handleQuantityInputChange = (val: string) => {
    setQuantityInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setQuantity(num);
    } else {
      setQuantity(0);
    }
  };

  const handlePresetQuantity = (preset: number) => {
    const clamped = Math.max(selectedService.minQuantity, Math.min(selectedService.maxQuantity, preset));
    setQuantity(clamped);
    setQuantityInput(clamped.toString());
  };

  // Validation derived states
  const parsedVal = parseInt(quantityInput.trim(), 10);
  const isQuantityEntered = quantityInput.trim() !== '' && !isNaN(parsedVal);
  const isTooLow = isQuantityEntered && parsedVal < selectedService.minQuantity;
  const isTooHigh = isQuantityEntered && parsedVal > selectedService.maxQuantity;
  const isValidQuantity = isQuantityEntered && parsedVal >= selectedService.minQuantity && parsedVal <= selectedService.maxQuantity;

  // Calculate required coins dynamically with exact decimal precision
  const requiredCoins = isValidQuantity ? Math.round(parsedVal * selectedService.coinsPerUnit * 100) / 100 : 0;
  const hasEnoughCoins = wallet.coins >= requiredCoins;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTargetUrl(text);
        onShowToast('Link pasted from clipboard!');
      }
    } catch (err) {
      onShowToast('Enter your Instagram post or profile link manually');
    }
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedUrl = targetUrl.trim();
    if (!cleanedUrl) {
      onShowToast('Please enter valid URL');
      return;
    }

    if (!isValidQuantity) {
      if (isTooLow) {
        onShowToast(`Minimum order quantity for ${selectedService.name} is ${selectedService.minQuantity}`);
      } else if (isTooHigh) {
        onShowToast(`Maximum order limit for ${selectedService.name} is ${selectedService.maxQuantity.toLocaleString()}`);
      } else {
        onShowToast(`Please enter order quantity (Min: ${selectedService.minQuantity})`);
      }
      return;
    }

    const orderQty = parsedVal;

    // Check if valid Instagram URL (Posts, Reels, Stories, IGTV, Profile) or Username
    const lowerUrl = cleanedUrl.toLowerCase();
    const isValidInstagram =
      cleanedUrl.startsWith('@') ||
      lowerUrl.includes('instagram.com') ||
      lowerUrl.includes('instagr.am') ||
      /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/(p|reel|reels|tv|stories|[a-zA-Z0-9_.-]+)/i.test(cleanedUrl);

    if (!isValidInstagram) {
      onShowToast('Please enter valid URL');
      return;
    }

    if (!hasEnoughCoins) {
      onShowToast(`You need ${formatCoins(requiredCoins)} coins. You have ${formatCoins(wallet.coins)} coins.`);
      onOpenCoins();
      return;
    }

    let finalUrl = cleanedUrl;
    if (cleanedUrl.startsWith('@')) {
      finalUrl = `https://instagram.com/${cleanedUrl.slice(1)}`;
    } else if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
      finalUrl = `https://${cleanedUrl}`;
    }

    const memberId = String(wallet.memberId || '100001').trim();
    const newOrder: Order = {
      id: `ORD-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 899)}`,
      userMemberId: memberId,
      serviceType: selectedService.name,
      targetUrl: finalUrl,
      quantity: orderQty,
      coinsSpent: requiredCoins,
      status: 'IN_PROGRESS',
      dateFormatted: new Date().toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    onPlaceOrder(newOrder);
    setTargetUrl('');
    setQuantityInput('');
    setQuantity(0);
  };

  return (
    <div className="space-y-2.5 pb-20 pt-1 px-3 max-w-md mx-auto">
      {/* Sleek Compact Banner */}
      <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-purple-700 rounded-xl p-3 text-white shadow-lg shadow-pink-500/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center gap-1.5 mb-0.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
          <span className="text-[10px] font-extrabold tracking-wider uppercase text-amber-200">Instant Engagement Engine</span>
        </div>
        <h2 className="text-sm sm:text-base font-black leading-tight">
          Boost Instagram Reach & Virality
        </h2>
        <p className="text-[11px] text-white/80 mt-0.5 font-medium">
          Select service, enter link & convert coins to instant real interactions!
        </p>
      </div>

      {/* Service Option Selection */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10.5px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-pink-400" />
            1. Select Engagement Service
          </label>
          <span className="text-[9px] text-pink-400/90 font-mono font-bold bg-pink-500/10 px-1.5 py-0.2 rounded-full border border-pink-500/20">
            {services.length} Services
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {services.map((svc) => {
            const isSelected = selectedService.id === svc.id;
            return (
              <button
                key={svc.id}
                type="button"
                onClick={() => handleSelectService(svc.id)}
                className={`p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all duration-150 relative overflow-hidden ${
                  isSelected
                    ? 'border-pink-500 bg-gradient-to-b from-pink-500/25 to-purple-900/30 text-white shadow-md shadow-pink-500/15 ring-1 ring-pink-500'
                    : 'border-slate-800/80 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse shadow-sm shadow-pink-400" />
                )}
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <ServiceIcon serviceId={svc.id} size="sm" />
                  <span className={`text-[8px] font-mono font-extrabold px-1 py-0.2 rounded border whitespace-nowrap ${
                    isSelected 
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black' 
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  }`}>
                    {svc.coinsPer1k ?? Math.round(svc.coinsPerUnit * 1000)}/1k
                  </span>
                </div>
                <div>
                  <p className={`text-[10px] font-bold leading-tight line-clamp-1 ${
                    isSelected ? 'text-white' : 'text-slate-200'
                  }`}>
                    {svc.name}
                  </p>
                  <p className="text-[7.5px] text-slate-400 line-clamp-1 leading-none mt-0.5">
                    {svc.id === 'reach' ? 'Reach, Imp. & Visits (~10%)' : svc.id === 'saves' ? 'Direct Bookmark Saves' : svc.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Card (Streamlined Compact) */}
      <form onSubmit={handleSubmitOrder} className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg space-y-2.5">
        {/* URL Input */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <LinkIcon className="w-3 h-3 text-indigo-400" />
              {selectedService.id === 'followers'
                ? '2. Target Instagram Username / Profile Link'
                : selectedService.id === 'reach'
                ? '2. Target Instagram Post URL'
                : selectedService.id === 'saves'
                ? '2. Target Instagram Post URL'
                : '2. Target Instagram Post / Reel URL'}
            </label>
            <button
              type="button"
              onClick={handlePaste}
              className="text-[9.5px] font-bold text-pink-400 hover:text-pink-300 underline"
            >
              Paste Link
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder={
                selectedService.id === 'followers'
                  ? '@username or https://instagram.com/username'
                  : selectedService.id === 'reach' || selectedService.id === 'saves'
                  ? 'https://instagram.com/p/... or /reel/...'
                  : 'https://instagram.com/p/... or /reel/...'
              }
              className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 text-slate-100 text-[11px] rounded-lg px-2.5 py-2 pr-8 focus:outline-none transition-colors font-mono"
            />
            {targetUrl && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 absolute right-2.5 top-2.5" />
            )}
          </div>
          <p className="text-[9px] text-slate-400">
            {selectedService.id === 'followers' ? (
              <span>👤 Instagram public profile link / @username.</span>
            ) : selectedService.id === 'reach' ? (
              <span className="text-amber-400 font-semibold">🎯 Post/Reel URL required for Reach, Imp. & Profile Visits (~10%).</span>
            ) : selectedService.id === 'saves' ? (
              <span className="text-indigo-400 font-semibold">🔖 Post/Reel URL required for bookmark saves.</span>
            ) : (
              <span>🔗 Paste Post or Reels URL. Password is NEVER required.</span>
            )}
          </p>
        </div>

        {/* Quantity Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-300">
              3. Enter Quantity
            </label>
            <span className="text-[9.5px] text-pink-400 font-mono font-bold">
              Min: {selectedService.minQuantity} | Max: {selectedService.maxQuantity.toLocaleString()}
            </span>
          </div>

          {/* Direct Type Input Field */}
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={quantityInput}
              onChange={(e) => handleQuantityInputChange(e.target.value)}
              placeholder={`Type quantity (${selectedService.minQuantity} - ${selectedService.maxQuantity.toLocaleString()})`}
              className={`w-full font-mono font-extrabold text-sm rounded-lg px-2.5 py-1.5 focus:outline-none transition-all ${
                isTooLow || isTooHigh
                  ? 'bg-rose-950/20 border-2 border-rose-500 text-rose-300 placeholder-rose-400/50'
                  : isValidQuantity
                  ? 'bg-slate-950 border-2 border-emerald-500/80 text-amber-300'
                  : 'bg-slate-950 border border-slate-800 focus:border-pink-500 text-slate-100 placeholder-slate-600'
              }`}
            />
            <span className="absolute right-2.5 top-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Units
            </span>
          </div>

          {/* Validation Feedback Messages */}
          {isTooLow && (
            <p className="text-[10px] font-bold text-rose-400 flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded">
              <span>⚠️ Min is {selectedService.minQuantity}. You entered {parsedVal}.</span>
            </p>
          )}

          {isTooHigh && (
            <p className="text-[10px] font-bold text-rose-400 flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded">
              <span>⚠️ Max limit is {selectedService.maxQuantity.toLocaleString()}.</span>
            </p>
          )}

          {isValidQuantity && (
            <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{parsedVal.toLocaleString()} units = {formatCoins(requiredCoins)} Coins</span>
            </p>
          )}

          {/* Quick Presets */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {[
              selectedService.minQuantity,
              100,
              250,
              500,
              1000,
              2500,
              5000,
              selectedService.maxQuantity
            ]
              .filter((val, idx, arr) => arr.indexOf(val) === idx && val >= selectedService.minQuantity && val <= selectedService.maxQuantity)
              .map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetQuantity(preset)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all shrink-0 font-mono ${
                    parsedVal === preset
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {preset.toLocaleString()}
                </button>
              ))}
          </div>

          {/* Slider */}
          <input
            type="range"
            min={selectedService.minQuantity}
            max={selectedService.maxQuantity}
            step={selectedService.minQuantity >= 100 ? 50 : 5}
            value={isValidQuantity ? parsedVal : selectedService.minQuantity}
            onChange={(e) => {
              const num = Number(e.target.value);
              setQuantity(num);
              setQuantityInput(num.toString());
            }}
            className="w-full accent-pink-500 cursor-pointer h-1.5"
          />
        </div>

        {/* Cost Summary Box */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Coins Required:</span>
            <span className="font-mono font-extrabold text-amber-300 text-xs flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              {formatCoins(requiredCoins)} Coins
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Wallet Balance:</span>
            <span className={`font-mono font-bold text-[11px] ${hasEnoughCoins ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCoins(wallet.coins)} Coins
            </span>
          </div>

          {isValidQuantity && !hasEnoughCoins && (
            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                <Info className="w-3 h-3 shrink-0" />
                <span>Need {formatCoins(Math.round((requiredCoins - wallet.coins) * 100) / 100)} more</span>
              </div>
              <button
                type="button"
                onClick={onOpenCoins}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-all"
              >
                <Plus className="w-2.5 h-2.5" /> Get Coins Free
              </button>
            </div>
          )}
        </div>

        {/* Submit Order Button */}
        <button
          type="submit"
          id="place-order-submit-btn"
          disabled={!isValidQuantity || !targetUrl.trim() || !hasEnoughCoins}
          className={`w-full py-2.5 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all duration-200 ${
            isValidQuantity && targetUrl.trim() && hasEnoughCoins
              ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:opacity-90 text-white shadow-pink-500/20 active:scale-98 cursor-pointer'
              : 'bg-slate-800 text-slate-400 border border-slate-700/50 cursor-not-allowed opacity-80'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>
            {!isQuantityEntered
              ? 'Enter Quantity to Continue'
              : isTooLow
              ? `Min Qty is ${selectedService.minQuantity}`
              : isTooHigh
              ? `Max Limit is ${selectedService.maxQuantity.toLocaleString()}`
              : !targetUrl.trim()
              ? 'Enter Instagram Link'
              : !hasEnoughCoins
              ? 'Insufficient Coins'
              : `Confirm Order (${formatCoins(requiredCoins)} Coins)`}
          </span>
          {isValidQuantity && targetUrl.trim() && hasEnoughCoins && (
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          )}
        </button>
      </form>
    </div>
  );
};
