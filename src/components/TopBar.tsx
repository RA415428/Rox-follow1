import React from 'react';
import { Coins, WifiOff } from 'lucide-react';
import { UserWallet } from '../types';
import { formatCoins } from '../utils/format';
import { RoxLogo } from './RoxLogo';

interface TopBarProps {
  wallet: UserWallet;
  onOpenCoins: () => void;
  onOpenAdmin: () => void;
  isOnline: boolean;
  onOpenAuthModal?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  wallet,
  onOpenCoins,
  onOpenAdmin,
  isOnline,
  onOpenAuthModal
}) => {
  return (
    <>
      <header 
        id="app-top-bar"
        className="fixed top-0 left-0 right-0 z-50 max-w-md mx-auto w-full bg-slate-900/98 backdrop-blur-xl border-b border-pink-500/20 px-3.5 py-2.5 shadow-md select-none transition-colors"
        style={{
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      >
        {!isOnline && (
          <div className="mb-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 animate-pulse">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>No Internet Connection. Offline Mode active.</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {/* Brand & User Identity */}
          <div className="flex items-center gap-2">
            <RoxLogo size="md" />
            <div>
              <h1 className="text-sm sm:text-base font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent leading-none tracking-tight">
                ROX FOLLOW
              </h1>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                ID: <span className="font-mono text-amber-400 font-bold">#{wallet.memberId}</span>
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            {/* Wallet Balance Badge */}
            <button
              onClick={onOpenCoins}
              id="wallet-badge-btn"
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 hover:border-amber-400 px-2.5 py-1.5 rounded-full transition-colors active:opacity-80 shadow-sm shadow-amber-500/10 cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs font-black text-amber-300 font-mono">
                {formatCoins(wallet.coins)} <span className="text-[10px] font-normal text-amber-400/80">Coins</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Fixed Header Layout Spacer so content begins right below the header without being hidden */}
      <div 
        className={`w-full shrink-0 ${!isOnline ? 'h-[98px]' : 'h-[62px]'}`}
        aria-hidden="true" 
      />
    </>
  );
};

