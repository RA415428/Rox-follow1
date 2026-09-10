import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Coins, Flame, Zap, ArrowRight, Clock } from 'lucide-react';
import { openExternalAdLink } from '../utils/openAdLink';
import {
  getBannerCooldownRemainingSeconds,
  startBannerCooldown,
  formatCooldownTime,
} from '../utils/bannerCooldown';

interface NativeAdProps {
  id?: string;
  className?: string;
  containerId?: string;
  scriptSrc?: string;
  height?: number;
  smartlinkUrl?: string;
  rewardCoins?: number;
  onRewardClaim?: (coins: number) => void;
  onClick?: () => void;
}

export const NativeAd: React.FC<NativeAdProps> = ({
  id,
  className = '',
  containerId = 'container-67905e0523b612a6391ce253e028375f',
  scriptSrc = 'https://doubtfulimpatient.com/67905e0523b612a6391ce253e028375f/invoke.js',
  height = 160,
  smartlinkUrl = 'https://doubtfulimpatient.com/bhetpw4me?key=b10856b9df41e998764e3e76a118f915',
  rewardCoins = 5,
  onRewardClaim,
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectiveAdId = id || `native_${containerId}`;

  const [cooldownSeconds, setCooldownSeconds] = useState<number>(() =>
    getBannerCooldownRemainingSeconds(effectiveAdId)
  );

  // Sync and tick cooldown timer every second for this specific ad
  useEffect(() => {
    const checkCooldown = () => {
      const remaining = getBannerCooldownRemainingSeconds(effectiveAdId);
      setCooldownSeconds(remaining);
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);

    const handleCooldownStarted = (e: Event) => {
      const custom = e as CustomEvent<{ adId?: string; expiryTimestamp?: number }>;
      // Only update if this event corresponds to this specific ad
      if (!custom.detail?.adId || custom.detail.adId === effectiveAdId) {
        checkCooldown();
      }
    };

    window.addEventListener('roxyefollow_banner_cooldown_started', handleCooldownStarted);
    window.addEventListener('focus', checkCooldown);
    window.addEventListener('visibilitychange', checkCooldown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('roxyefollow_banner_cooldown_started', handleCooldownStarted);
      window.removeEventListener('focus', checkCooldown);
      window.removeEventListener('visibilitychange', checkCooldown);
    };
  }, [effectiveAdId]);

  useEffect(() => {
    if (!containerRef.current || !scriptSrc) return;

    try {
      containerRef.current.innerHTML = '';

      const iframe = document.createElement('iframe');
      iframe.title = 'Adsterra Real Native Ad';
      iframe.style.width = '100%';
      iframe.style.maxWidth = '100%';
      iframe.style.height = `${height}px`;
      iframe.style.maxHeight = `${height}px`;
      iframe.style.border = 'none';
      iframe.style.overflow = 'hidden';
      iframe.style.background = 'transparent';
      iframe.style.display = 'block';
      iframe.style.contain = 'strict';
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-modals');
      iframe.setAttribute('loading', 'lazy');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <base href="https://doubtfulimpatient.com/">
            <style>
              * {
                box-sizing: border-box !important;
                color: #f8fafc !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: ${height}px !important;
                max-height: ${height}px !important;
                background: transparent !important;
                overflow: hidden !important;
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
              }
              #${containerId} {
                width: 100% !important;
                max-width: 100% !important;
                height: ${height}px !important;
                max-height: ${height}px !important;
                display: block !important;
                overflow: hidden !important;
              }
              a {
                color: #38bdf8 !important;
                text-decoration: none !important;
                display: block !important;
                width: 100% !important;
                margin-bottom: 4px !important;
              }
              img {
                max-height: 100px !important;
                width: 100% !important;
                max-width: 100% !important;
                display: block !important;
                margin: 0 auto 4px auto !important;
                border-radius: 10px !important;
                object-fit: cover !important;
              }
              p, span, div, h1, h2, h3, h4 {
                color: #f8fafc !important;
                text-align: center !important;
                font-size: 11px !important;
                line-height: 1.2 !important;
                margin: 2px 0 !important;
                word-break: break-word !important;
              }
            </style>
            <script>
              (function() {
                var initTime = Date.now();
                var origOpen = window.open;
                window.open = function() {
                  if (Date.now() - initTime < 1500) {
                    return null;
                  }
                  return origOpen.apply(this, arguments);
                };
              })();
            </script>
          </head>
          <body>
            <div id="${containerId}"></div>
            <script async="async" data-cfasync="false" src="${scriptSrc}"></script>
          </body>
        </html>
      `;

      iframe.srcdoc = html;
      containerRef.current.appendChild(iframe);
    } catch (e) {
      console.warn('NativeAd iframe load error:', e);
    }
  }, [containerId, scriptSrc, height]);

  const handleNativeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentRemaining = getBannerCooldownRemainingSeconds(effectiveAdId);
    if (currentRemaining > 0) {
      if (smartlinkUrl) {
        openExternalAdLink(smartlinkUrl);
      }
      return;
    }

    // 1. Start 3-minute cooldown ONLY for this native ad!
    startBannerCooldown(effectiveAdId, 180);
    setCooldownSeconds(180);

    // 2. Open external link
    if (smartlinkUrl) {
      openExternalAdLink(smartlinkUrl);
    }
    if (onClick) {
      onClick();
    }

    // 3. Credit coins immediately to user's wallet
    if (onRewardClaim) {
      onRewardClaim(rewardCoins);
    } else {
      window.dispatchEvent(
        new CustomEvent('roxyefollow_banner_clicked', {
          detail: { coins: rewardCoins, adId: effectiveAdId },
        })
      );
    }
  };

  const isCooldownActive = cooldownSeconds > 0;

  return (
    <div
      onClick={handleNativeClick}
      className={`relative w-full max-w-md mx-auto my-2 overflow-hidden cursor-pointer rounded-2xl bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-900 border ${
        isCooldownActive
          ? 'border-slate-800 opacity-90'
          : 'border-purple-500/30 hover:border-pink-500/60 shadow-xl active:scale-[0.99]'
      } transition-all duration-200 group ${className}`}
    >
      {/* Top Native Header with Ad Badge & Click & Earn Option / Cooldown */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 border-b border-slate-800">
        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-extrabold uppercase tracking-wide flex items-center gap-1 border border-purple-500/30">
          <Flame className="w-3 h-3 text-amber-400 fill-amber-400" /> Ad
        </span>

        {/* Cooldown Timer vs Tap & Earn Button */}
        {isCooldownActive ? (
          <div className="px-2.5 py-0.5 rounded-full bg-slate-800/90 border border-amber-500/30 text-amber-300 font-black text-[10px] flex items-center gap-1 shadow-sm font-mono">
            <Clock className="w-3 h-3 text-amber-400 animate-spin" />
            <span>Active in {formatCooldownTime(cooldownSeconds)}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleNativeClick}
            className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:opacity-90 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 animate-pulse active:scale-95 cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 text-slate-950 fill-current" />
            <span>Tap & Earn +{rewardCoins} Coins</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Visual Picture Graphic Card */}
      <div className="relative p-2">
        {/* Adsterra Native Iframe */}
        <div ref={containerRef} className="w-full flex justify-center items-center overflow-hidden min-h-[80px]" />

        {/* Fallback Graphic Picture Banner */}
        <div className="rounded-xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-pink-950/40 border border-purple-500/20 p-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 p-0.5 shadow-lg shrink-0 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=200&q=80"
                alt="Ad"
                className="w-full h-full object-cover rounded-[9px]"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-xs font-bold text-slate-200">
              {isCooldownActive ? 'Cooldown Active' : 'Click & Earn Coins'}
            </span>
          </div>

          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              isCooldownActive
                ? 'text-slate-400 bg-slate-800/60 border-slate-700'
                : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
            }`}
          >
            {isCooldownActive ? `⏳ ${formatCooldownTime(cooldownSeconds)}` : `+${rewardCoins} Coins`}
          </span>
        </div>
      </div>
    </div>
  );
};
