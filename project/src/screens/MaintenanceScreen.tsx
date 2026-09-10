import React, { useState, useRef } from 'react';
import { ShieldAlert, RefreshCw, Wrench } from 'lucide-react';

interface MaintenanceScreenProps {
  onAdminLoginClick: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onAdminLoginClick }) => {
  const [tapCount, setTapCount] = useState<number>(0);
  const lastTapTimeRef = useRef<number>(0);

  // Hidden 3-tap trigger on the top Maintenance Icon to open Admin Login Access
  const handleIconClick = () => {
    const now = Date.now();
    let newCount = 1;
    if (now - lastTapTimeRef.current < 3000) {
      newCount = tapCount + 1;
    }
    lastTapTimeRef.current = now;
    setTapCount(newCount);

    if (newCount >= 3) {
      setTapCount(0);
      onAdminLoginClick();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Ambient Amber Glow */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Secret 3-click trigger on Top Icon */}
        <button
          type="button"
          onClick={handleIconClick}
          className="w-20 h-20 rounded-3xl bg-amber-500/10 active:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 transition-transform active:scale-95 cursor-pointer focus:outline-none shadow-inner"
          title="Server Maintenance"
        >
          <ShieldAlert className="w-10 h-10 text-amber-400 animate-pulse" />
        </button>

        <div className="inline-block px-3 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-3">
          Maintenance In Progress
        </div>

        <h1 className="text-xl font-bold text-white mb-2">App Under Maintenance</h1>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          Roxyefollow Rewards is currently undergoing scheduled server upgrades & SMM speed optimization. We will be back online shortly!
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 hover:from-amber-400 hover:to-pink-400 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
};
