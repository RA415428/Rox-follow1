import React, { useState } from 'react';
import { 
  Hash, Copy, Check, Search, ChevronRight, Sparkles,
  Video, Rocket, Shirt, Dumbbell, Utensils, Brush, Target, Zap, Camera, Plane
} from 'lucide-react';
import { hashtagCategories } from '../data/appData';
import { AdBanner } from '../components/AdBanner';
import { AdminConfig, UserWallet } from '../types';
import { copyToClipboard } from '../utils/clipboard';

interface HashtagsScreenProps {
  wallet?: UserWallet;
  adminConfig?: AdminConfig;
  onOpenAdModal?: () => void;
  onRewardClaim?: (coins: number, isVideoAd?: boolean) => void;
  onShowToast: (msg: string) => void;
}

const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'video': return <Video className="w-3.5 h-3.5" />;
    case 'rocket': return <Rocket className="w-3.5 h-3.5" />;
    case 'shirt': return <Shirt className="w-3.5 h-3.5" />;
    case 'dumbbell': return <Dumbbell className="w-3.5 h-3.5" />;
    case 'utensils': return <Utensils className="w-3.5 h-3.5" />;
    case 'brush': return <Brush className="w-3.5 h-3.5" />;
    case 'target': return <Target className="w-3.5 h-3.5" />;
    case 'zap': return <Zap className="w-3.5 h-3.5" />;
    case 'camera': return <Camera className="w-3.5 h-3.5" />;
    case 'plane': return <Plane className="w-3.5 h-3.5" />;
    default: return <Sparkles className="w-3.5 h-3.5" />;
  }
};

export const HashtagsScreen: React.FC<HashtagsScreenProps> = ({
  wallet,
  adminConfig,
  onOpenAdModal,
  onRewardClaim,
  onShowToast
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('reels_viral');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const activeCategory = hashtagCategories.find((c) => c.id === selectedCategoryId) || hashtagCategories[0];

  const filteredCategories = hashtagCategories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.hashtags.some((h) => h.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCopyAll = async (hashtags: string[], name: string) => {
    const text = hashtags.join(' ');
    await copyToClipboard(text);
    onShowToast(`All ${hashtags.length} hashtags for ${name} copied!`);
  };

  const handleCopySingle = async (tag: string) => {
    await copyToClipboard(tag);
    setCopiedTag(tag);
    onShowToast(`Copied ${tag}`);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  return (
    <div className="space-y-2.5 pb-20 pt-1 px-3 max-w-md mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 rounded-xl p-3 text-white shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Hash className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-[10px] font-extrabold tracking-wider uppercase text-indigo-200">
            Viral Tag Generator
          </span>
        </div>
        <h2 className="text-sm sm:text-base font-black">Trending Instagram Hashtags</h2>
        <p className="text-[11px] text-slate-300 mt-0.5">
          Boost organic reach on Reels & Posts with high-conversion tag sets.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search categories or tags (e.g. reels, fitness...)"
          className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 text-slate-100 text-[11px] rounded-lg pl-8 pr-3 py-2 focus:outline-none transition-colors"
        />
      </div>

      {/* Category Horizontal Pill list */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {filteredCategories.map((cat) => {
          const isActive = cat.id === selectedCategoryId;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {getCategoryIcon(cat.iconName)}
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Compact Sponsored Ad locked right below categories and above tags */}
      <div className="w-full max-w-[320px] mx-auto min-h-[50px] overflow-hidden my-1 relative shrink-0">
        <AdBanner
          id="hashtags_middle_banner"
          smartlinkUrl={adminConfig?.ads?.directSmartlinkUrl || "https://doubtfulimpatient.com/bhetpw4me?key=b10856b9df41e998764e3e76a118f915"}
          rewardCoins={adminConfig?.ads?.coinsPerBannerClick ?? 5}
          onRewardClaim={(c) => onRewardClaim && onRewardClaim(c, false)}
          width={320}
          height={50}
        />
      </div>

      {/* Selected Category Tags Panel */}
      {activeCategory && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>{activeCategory.name}</span>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 font-mono font-bold px-1.5 py-0.2 rounded-full">
                  {activeCategory.hashtags.length} Tags
                </span>
              </h3>
              <p className="text-[9.5px] text-slate-400">High engagement frequency set</p>
            </div>

            <button
              onClick={() => handleCopyAll(activeCategory.hashtags, activeCategory.name)}
              className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-md shadow-purple-500/20 transition-colors active:opacity-80"
            >
              <Copy className="w-3 h-3" />
              Copy All
            </button>
          </div>

          {/* Tags Grid */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {activeCategory.hashtags.map((tag) => {
              const isJustCopied = copiedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => handleCopySingle(tag)}
                  className={`text-[11px] font-mono font-medium px-2 py-1 rounded-md border transition-colors flex items-center gap-1 active:opacity-80 ${
                    isJustCopied
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-purple-500/60 hover:text-purple-300'
                  }`}
                >
                  <span>{tag}</span>
                  {isJustCopied ? (
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
