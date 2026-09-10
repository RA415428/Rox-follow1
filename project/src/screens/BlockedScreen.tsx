import React, { useState, useRef } from 'react';
import { UserX, ShieldAlert, RefreshCw, MessageSquare, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { checkUserBlockedStatus } from '../utils/storage';

interface BlockedScreenProps {
  memberId: string;
  onContactSupportClick: () => void;
  onAdminLoginClick: () => void;
  onUnlockSuccess?: () => void;
}

export const BlockedScreen: React.FC<BlockedScreenProps> = ({
  memberId,
  onContactSupportClick,
  onAdminLoginClick,
  onUnlockSuccess
}) => {
  const [tapCount, setTapCount] = useState<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'blocked' | 'unlocked';
    message: string;
    subMessage: string;
  } | null>(null);

  // Hidden 4-click trigger on "Account Suspended" to open admin login access
  const handleSuspendedPillClick = () => {
    const now = Date.now();
    let newCount = 1;
    if (now - lastTapTimeRef.current < 3000) {
      newCount = tapCount + 1;
    }
    lastTapTimeRef.current = now;
    setTapCount(newCount);

    if (newCount >= 4) {
      setTapCount(0);
      onAdminLoginClick();
    }
  };

  // Live status verification when clicking "Refresh Status"
  const handleRefreshStatus = async () => {
    if (isChecking) return;
    setIsChecking(true);
    setStatusFeedback(null);

    try {
      const res = await checkUserBlockedStatus(memberId);
      
      if (res.isBlocked || res.status === 'BLOCKED') {
        setStatusFeedback({
          type: 'blocked',
          message: 'Account is still BLOCKED by Admin',
          subMessage: 'जब तक एडमिन आपको अनलॉक नहीं करेगा, आप ऐप में प्रवेश नहीं कर सकते।'
        });
      } else {
        setStatusFeedback({
          type: 'unlocked',
          message: 'Account Unlocked Successfully!',
          subMessage: 'एडमिन द्वारा अकाउंट अनलॉक कर दिया गया है। ऐप खुल रहा है...'
        });
        setTimeout(() => {
          if (onUnlockSuccess) {
            onUnlockSuccess();
          } else {
            window.location.reload();
          }
        }, 1200);
      }
    } catch (err) {
      setStatusFeedback({
        type: 'blocked',
        message: 'Account is still BLOCKED',
        subMessage: 'कृपया प्रतीक्षा करें या सहायता के लिए सपोर्ट टीम से संपर्क करें।'
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-red-500/40 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Ambient red glow */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5 shadow-inner">
          <UserX className="w-10 h-10 text-red-500 animate-pulse" />
        </div>

        {/* Secret trigger: 4 taps on "Account Suspended" opens Admin Login Access */}
        <button
          type="button"
          onClick={handleSuspendedPillClick}
          className="inline-block px-3 py-1 bg-red-500/20 active:bg-red-500/30 text-red-400 border border-red-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-3 transition-colors cursor-pointer active:scale-95 focus:outline-none"
        >
          Account Suspended
        </button>

        <h1 className="text-xl font-black text-white mb-2">
          Account Blocked By Admin
        </h1>

        <p className="text-xs text-red-300 font-semibold mb-3">
          आपका अकाउंट एडमिन द्वारा ब्लॉक कर दिया गया है।
        </p>

        <div className="text-xs text-slate-300 leading-relaxed mb-4 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-left space-y-2">
          <p className="font-medium text-slate-300">
            You have been blocked by the Administrator. Access to application features has been restricted. Please try again later or contact support.
          </p>
          <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Member ID:</span>
            <span className="font-mono text-amber-400 font-bold">#{memberId}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Status:</span>
            <span className="text-red-400 font-bold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> BLOCKED
            </span>
          </div>
        </div>

        {/* Status Feedback Notification */}
        {statusFeedback && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs text-left animate-in fade-in slide-in-from-top duration-200 border ${
              statusFeedback.type === 'unlocked'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-red-500/15 border-red-500/40 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-0.5">
              {statusFeedback.type === 'unlocked' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{statusFeedback.message}</span>
            </div>
            <p className="text-[11px] opacity-90 pl-6 leading-tight">{statusFeedback.subMessage}</p>
          </div>
        )}

        <div className="space-y-2.5">
          <button
            onClick={onContactSupportClick}
            className="w-full py-3 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <MessageSquare className="w-4 h-4" /> Contact Support Team
          </button>

          <button
            onClick={handleRefreshStatus}
            disabled={isChecking}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Checking Status...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-slate-400" />
                <span>Refresh Status</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
