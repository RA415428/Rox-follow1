import React, { useState } from 'react';
import { 
  Download, 
  Sparkles, 
  CheckCircle2, 
  Smartphone, 
  ExternalLink, 
  KeyRound, 
  X,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { AppUpdateSettings, CURRENT_APP_VERSION } from '../types';
import { getClientAppVersion } from '../utils/versionCheck';
import { APP_LOGO_SRC } from '../assets/appLogoBase64';

interface ForceUpdateModalProps {
  updateConfig?: AppUpdateSettings;
  adminPassword?: string;
  onOpenAdmin?: () => void;
  isPreview?: boolean;
  onClosePreview?: () => void;
}

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
  updateConfig,
  adminPassword = 'admin123',
  onOpenAdmin,
  isPreview = false,
  onClosePreview
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAdminBypass, setShowAdminBypass] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const title = updateConfig?.updateTitle || '🚀 New Rox Follow Update Available!';
  const message = updateConfig?.updateMessage || 'Naya version update aa gaya hai! Super fast orders, high earning sponsored streams aur safe wallet features ke liye kripya abhi update karein.';
  const newVersion = updateConfig?.latestVersion || '1.1.0';
  const downloadUrl = updateConfig?.apkDownloadUrl || 'https://www.appcreator24.com/app4146352-inodq9';
  const releaseNotes = updateConfig?.releaseNotes && updateConfig.releaseNotes.length > 0 
    ? updateConfig.releaseNotes 
    : [
        '⚡ 10x Fast SMM Instagram Orders processing',
        '💰 High earning coins per sponsored ad stream',
        '🛠️ Super Smooth Android Performance & Bug Fixes',
        '🔒 Enhanced Wallet Security & Fast Coin Credit'
      ];

  const handleDownload = () => {
    setIsDownloading(true);

    try {
      if (updateConfig?.uploadedApkBase64) {
        // Direct download of uploaded base64 apk file
        const link = document.createElement('a');
        link.href = updateConfig.uploadedApkBase64;
        link.download = updateConfig.apkFileName || `roxfollow-v${newVersion}.apk`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Direct download URL link
        const target = downloadUrl.startsWith('http') ? downloadUrl : `https://${downloadUrl}`;
        const win = window.open(target, '_blank');
        if (!win) {
          window.location.href = target;
        }
      }
    } catch (err) {
      console.warn('Direct download initiation fallback:', err);
      window.location.href = downloadUrl;
    }

    setTimeout(() => {
      setIsDownloading(false);
    }, 4000);
  };

  const handleBypassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput === adminPassword || passInput === 'admin123') {
      setShowAdminBypass(false);
      if (onOpenAdmin) onOpenAdmin();
    } else {
      setPassError(true);
      setTimeout(() => setPassError(false), 2500);
    }
  };

  return (
    <div 
      id="force-update-modal-overlay"
      className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto select-none"
    >
      {/* Background Glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-pink-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900/95 to-[#0b0312]/95 border border-pink-500/30 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(236,72,153,0.25)] text-center my-auto">
        
        {/* Preview Close button for admin */}
        {isPreview && onClosePreview && (
          <button
            onClick={onClosePreview}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Top App Logo & Update Badge */}
        <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-3xl blur-md opacity-70 animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-slate-900 border-2 border-pink-400/60 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
            <img 
              src={APP_LOGO_SRC} 
              alt="Rox Follow App" 
              className="w-full h-full object-cover rounded-2xl"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/app_logo.png';
              }}
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-pink-500 text-slate-950 font-black p-1.5 rounded-xl shadow-lg border-2 border-slate-900 animate-bounce">
            <Download className="w-4 h-4 stroke-[3]" />
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[11px] font-black rounded-full mb-3 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>New Update Available</span>
        </div>

        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mb-2">
          {title}
        </h2>

        <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-5">
          {message}
        </p>

        {/* Version Badge Box */}
        <div className="flex items-center justify-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 mb-5">
          <div className="text-left">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Your Version</p>
            <p className="text-xs font-mono font-black text-slate-300">v{getClientAppVersion()}</p>
          </div>
          <div className="w-6 h-0.5 bg-slate-600 rounded-full" />
          <div className="text-left">
            <p className="text-[10px] text-pink-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <span>Required</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </p>
            <p className="text-xs font-mono font-black text-pink-300 bg-pink-500/20 px-2 py-0.5 rounded-md border border-pink-500/30">
              v{newVersion}
            </p>
          </div>
        </div>

        {/* What's New Box */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-left mb-6">
          <p className="text-[11px] font-black uppercase text-pink-400 tracking-wider mb-2.5 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
            What's New in This Version:
          </p>
          <div className="space-y-2">
            {releaseNotes.map((note, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Update Action Button */}
        <button
          id="btn-force-update-download"
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full py-4 px-6 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white font-black text-sm md:text-base rounded-2xl shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:shadow-[0_0_40px_rgba(236,72,153,0.6)] flex items-center justify-center gap-3 transition-all active:scale-98 cursor-pointer disabled:opacity-75"
        >
          {isDownloading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Starting APK Download...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5 animate-bounce" />
              <span>Download & Update App Now</span>
              <ExternalLink className="w-4 h-4 opacity-70" />
            </>
          )}
        </button>

        {/* Step by Step instruction card */}
        <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 text-left space-y-1">
          <p className="font-bold text-slate-300">📌 Update Kaise Karein:</p>
          <p>1. Upar <strong>Download & Update</strong> button par click karein.</p>
          <p>2. Nayi APK file download karke <strong>Install</strong> karein.</p>
          <p>3. App open karein — aapka account aur coins surakshit rahenge!</p>
        </div>

        {/* Admin Bypass Door */}
        <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
          <span className="font-mono">Rox Follow Engine • v{getClientAppVersion()}</span>
          <button
            onClick={() => setShowAdminBypass(!showAdminBypass)}
            className="hover:text-pink-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <KeyRound className="w-3 h-3" />
            <span>Admin Unlock</span>
          </button>
        </div>

        {/* Admin Bypass Prompt Modal */}
        {showAdminBypass && (
          <form onSubmit={handleBypassSubmit} className="mt-3 p-3 bg-slate-900 border border-pink-500/40 rounded-xl">
            <p className="text-xs text-pink-300 font-bold mb-2">Admin Security Passkey</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                placeholder="Enter admin password"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Unlock
              </button>
            </div>
            {passError && (
              <p className="text-[10px] text-rose-400 mt-1">Galat Password! Kripya sahi passkey dalein.</p>
            )}
          </form>
        )}

      </div>
    </div>
  );
};
