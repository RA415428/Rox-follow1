import React, { useState } from 'react';
import { UserWallet } from '../types';
import { 
  User, 
  HelpCircle, 
  ShieldCheck, 
  FileText, 
  ChevronRight, 
  Copy, 
  Sparkles, 
  MessageCircle, 
  Mail,
  CheckCircle2,
  LogOut,
  Lock,
  Crown,
  Shield
} from 'lucide-react';
import { logoutGoogleAccount } from '../utils/authService';
import { getClientAppVersion } from '../utils/versionCheck';

interface SettingsScreenProps {
  wallet: UserWallet;
  welcomeBonusCoins?: number;
  onOpenDialog: (type: 'SUPPORT' | 'PRIVACY' | 'TERMS') => void;
  onShowToast: (msg: string) => void;
  onOpenAdmin?: () => void;
  isAdminAllowed?: boolean;
  onUpdateWallet?: (updated: UserWallet) => void;
  onLogout?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  wallet,
  onOpenDialog,
  onShowToast,
  onOpenAdmin,
  isAdminAllowed,
  onLogout
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // STRICT OWNER RULE: Only nayakhardayal4@gmail.com is recognized as the Owner & Admin
  const isOwner = wallet.email?.toLowerCase().trim() === 'nayakhardayal4@gmail.com';

  const handleCopyId = () => {
    navigator.clipboard.writeText(wallet.memberId);
    onShowToast(`Member ID #${wallet.memberId} copied!`);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutGoogleAccount();
      onShowToast('👋 Signed out of account');
      if (onLogout) {
        onLogout();
      }
    } catch (e) {
      console.error('Logout error:', e);
      onShowToast('⚠️ Error signing out');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAdminPanelClick = () => {
    if (isOwner && onOpenAdmin) {
      onOpenAdmin();
    }
  };

  return (
    <div className="space-y-2.5 pb-20 pt-1 px-3 max-w-md mx-auto select-none">
      {/* Member Profile Card */}
      <div 
        className="bg-slate-900/90 backdrop-blur-md border border-pink-500/20 rounded-xl p-3 shadow-lg flex items-center justify-between select-none"
      >
        <div className="flex items-center gap-2.5">
          {wallet.photoURL ? (
            <div className="w-10 h-10 rounded-xl p-0.5 bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 shadow-md shadow-pink-500/20 shrink-0">
              <img
                src={wallet.photoURL}
                alt={wallet.displayName || 'User'}
                className="w-full h-full object-cover rounded-[10px]"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 p-0.5 shadow-md shadow-pink-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-pink-400">
                {isOwner ? <Crown className="w-5 h-5 text-amber-400" /> : <User className="w-5 h-5" />}
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] text-slate-300 font-bold leading-tight truncate max-w-[140px]">
                {wallet.displayName || 'ROX FOLLOW Member'}
              </p>
              {isOwner ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold">
                  <Crown className="w-2.5 h-2.5" /> OWNER
                </span>
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </div>
            <h3 className="text-xs sm:text-sm font-mono font-extrabold text-pink-300">#{wallet.memberId}</h3>
            {wallet.email && (
              <p className="text-[9.5px] text-slate-400 font-mono truncate max-w-[180px]">
                {wallet.email}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopyId();
          }}
          className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-xs border border-pink-500/20 cursor-pointer"
          title="Copy Member ID"
        >
          <Copy className="w-3.5 h-3.5 text-pink-400" />
        </button>
      </div>

      {/* Official Owner & Admin Panel Card (Visible ONLY for nayakhardayal4@gmail.com) */}
      {isOwner && (
        <div 
          onClick={handleAdminPanelClick}
          className="bg-gradient-to-r from-amber-500/20 via-pink-500/15 to-purple-500/20 border-2 border-amber-500/40 rounded-xl p-3 shadow-lg flex items-center justify-between cursor-pointer hover:border-amber-400/70 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/25 flex items-center justify-center text-amber-300 border border-amber-500/40 group-hover:scale-105 transition-transform">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <span>👑 Admin Control Panel</span>
                <Sparkles className="w-3 h-3 text-amber-400" />
              </p>
              <p className="text-[9.5px] text-slate-300 font-medium">Manage Orders, Users, Coins & SMM API (PIN Required)</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <Lock className="w-3.5 h-3.5 text-amber-400/80" />
            <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      )}

      {/* Support & Legal */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-pink-500/20 rounded-xl overflow-hidden shadow-lg">
        <div className="px-3 py-2 bg-slate-950/50 border-b border-pink-500/20">
          <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Help & Support</h4>
        </div>

        <div className="divide-y divide-slate-800/60">
          <a
            href="https://wa.me/919301484735?text=Hello%20Roxyefollow%20Support%2C%20I%20need%20help%20with%20my%20account."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1">
                  <span>24/7 WhatsApp Support</span>
                  <span className="text-[8.5px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-mono">Live</span>
                </p>
                <p className="text-[9.5px] text-slate-400">+91 9301484735 (Instant chat & channel)</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </a>

          <a
            href="mailto:roxfollowsupport@gmail.com"
            className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-pink-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Email Support</p>
                <p className="text-[9.5px] text-slate-400">roxfollowsupport@gmail.com</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </a>

          <button
            onClick={() => onOpenDialog('SUPPORT')}
            className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Help Desk & FAQs</p>
                <p className="text-[9.5px] text-slate-400">Order issues, coins guide & support options</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            onClick={() => onOpenDialog('PRIVACY')}
            className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Privacy Policy</p>
                <p className="text-[9.5px] text-slate-400">How your non-sensitive data is protected</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            onClick={() => onOpenDialog('TERMS')}
            className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Terms of Service</p>
                <p className="text-[9.5px] text-slate-400">Rules & fair usage terms</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Account / Login Status */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pink-500/15 flex items-center justify-center text-pink-400 border border-pink-500/30">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white leading-tight">Account Status</p>
              <p className="text-[9.5px] text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Logged In</span>
              </p>
            </div>
          </div>
          {wallet.email && (
            <span className="text-[9.5px] text-slate-400 font-mono truncate max-w-[140px]">
              {wallet.email}
            </span>
          )}
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 border border-rose-500/20 text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out Account'}</span>
        </button>
      </div>

      {/* App Version - Pure Display Only (No Hidden Admin Click) */}
      <div className="text-center pt-1 pb-2">
        <p className="text-[10px] text-slate-500 font-medium select-none">
          ROX FOLLOW v{getClientAppVersion()}
        </p>
      </div>
    </div>
  );
};

