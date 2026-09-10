import React from 'react';
import { Sparkles, X, Gift } from 'lucide-react';
import { AnnouncementSettings } from '../types';

interface AnnouncementModalProps {
  announcement: AnnouncementSettings;
  isOpen: boolean;
  onClose: () => void;
  onClaimBonus?: (bonusCoins: number) => void;
  directSmartlinkUrl?: string;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  announcement,
  isOpen,
  onClose,
  onClaimBonus
}) => {
  if (!isOpen || !announcement.enabled) return null;

  const handleClose = () => {
    onClose();
  };

  const rawBonus = announcement.bonusCoins;
  const bonusCoins = rawBonus !== undefined && rawBonus !== null
    ? (typeof rawBonus === 'number' ? rawBonus : (parseInt(String(rawBonus), 10) || 0))
    : 10;

  const handleAction = () => {
    // 1. Immediately credit bonus coins directly to user wallet without triggering external ad popups
    if (onClaimBonus) {
      onClaimBonus(bonusCoins);
    } else {
      handleClose();
    }

    // 2. Only if admin explicitly provided a custom non-ad link (e.g., Telegram channel or Instagram page)
    if (announcement.actionUrl && !announcement.actionUrl.includes('doubtfulimpatient') && !announcement.actionUrl.includes('bhetpw4me')) {
      try {
        window.open(announcement.actionUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {}
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-pointer"
      onClick={handleClose}
    >
      <div 
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {announcement.bannerUrl && (
          <img
            src={announcement.bannerUrl}
            alt="Announcement"
            className="w-full h-36 object-cover rounded-2xl mb-4 border border-slate-800"
          />
        )}

        <div className="flex items-center gap-2 mb-2">
          <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold text-white">{announcement.title}</h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-5">{announcement.message}</p>

        <div className="space-y-2">
          <button
            onClick={handleAction}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 text-white font-black text-xs rounded-xl shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Gift className="w-4 h-4 text-amber-200" />
            <span>{announcement.buttonText || 'Claim Bonus'}</span>
            {bonusCoins > 0 && (
              <span className="px-2.5 py-0.5 bg-black/40 text-amber-300 rounded-full text-[11px] font-mono font-bold">
                +{bonusCoins} Coins
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

