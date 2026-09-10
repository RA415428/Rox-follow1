import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Coins, ExternalLink, Zap, Clock, ShieldCheck } from 'lucide-react';
import { openExternalAdLink } from '../utils/openAdLink';
import {
  getBannerCooldownRemainingSeconds,
  startBannerCooldown,
  formatCooldownTime,
} from '../utils/bannerCooldown';
import { initAdNetworkPreconnect, preloadAdScripts } from '../utils/adPreloadManager';

interface AdBannerProps {
  id?: string;
  className?: string;
  adKey?: string;
  scriptSrc?: string;
  width?: number;
  height?: number;
  smartlinkUrl?: string;
  rewardCoins?: number;
  onRewardClaim?: (coins: number) => void;
  onClick?: () => void;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  id,
  className = '',
  adKey,
  scriptSrc,
  width = 320,
  height = 50,
  smartlinkUrl = 'https://doubtfulimpatient.com/bhetpw4me?key=b10856b9df41e998764e3e76a118f915',
  rewardCoins = 5,
  onRewardClaim,
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adRenderStatus, setAdRenderStatus] = useState<'LOADING' | 'READY' | 'FALLBACK'>('LOADING');

  // Decide which key & script to use based on requested banner size (320x50 vs 160x300)
  const isVertical160x300 = width === 160 && height === 300;
  const effectiveAdKey = adKey || (isVertical160x300 ? '19b8c46ab4ac83259b97c3f5a34e588c' : '1fa862cdd8ff0403a4f4166d381d9698');
  const effectiveScriptSrc = scriptSrc || (isVertical160x300 ? 'https://doubtfulimpatient.com/19b8c46ab4ac83259b97c3f5a34e588c/invoke.js' : 'https://doubtfulimpatient.com/1fa862cdd8ff0403a4f4166d381d9698/invoke.js');

  const effectiveAdId = id || `banner_${effectiveAdKey}_${width}x${height}`;

  const [cooldownSeconds, setCooldownSeconds] = useState<number>(() =>
    getBannerCooldownRemainingSeconds(effectiveAdId)
  );

  // 1. Instant Background Pre-connection & Script Pre-loading
  useEffect(() => {
    initAdNetworkPreconnect();
    if (effectiveScriptSrc) {
      preloadAdScripts([effectiveScriptSrc]);
    }
  }, [effectiveScriptSrc]);

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

  // 2. High-Compatibility AppCreator24 & Android WebView Iframe Injection with Watchdog Failover
  useEffect(() => {
    if (!containerRef.current || !effectiveAdKey || !effectiveScriptSrc) return;

    setAdRenderStatus('LOADING');
    let isSubscribed = true;

    try {
      containerRef.current.innerHTML = '';

      const iframe = document.createElement('iframe');
      iframe.title = 'Adsterra Real Banner Ad';
      iframe.width = '100%';
      iframe.height = `${height}px`;
      iframe.style.border = 'none';
      iframe.style.overflow = 'hidden';
      iframe.style.background = 'transparent';
      iframe.style.width = `${width}px`;
      iframe.style.maxWidth = '100%';
      iframe.style.height = `${height}px`;
      iframe.style.maxHeight = `${height}px`;
      iframe.style.display = 'block';
      iframe.style.contain = 'strict';
      // Anti-auto-redirect Sandbox: Allows ads to load scripts, display creative and open user clicks in popups,
      // but PREVENTS malicious scripts from automatically redirecting the top-level parent AppCreator24 window.
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-modals');
      iframe.setAttribute('loading', 'lazy');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              html, body {
                margin: 0 auto;
                padding: 0;
                width: 100%;
                max-width: ${width}px;
                height: 100%;
                max-height: ${height}px;
                background: transparent;
                overflow: hidden !important;
                display: flex;
                justify-content: center;
                align-items: center;
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
              }
              img, iframe, a {
                max-width: 100% !important;
                max-height: ${height}px !important;
                object-fit: contain;
              }
            </style>
            <script>
              // Anti-Malvertising & Auto-Redirect Suppressor
              (function() {
                var initialTime = Date.now();
                var originalOpen = window.open;
                window.open = function(url, target, features) {
                  // Block automated popup attempts before real user interactions
                  if (Date.now() - initialTime < 1200) {
                    console.warn('[Adsterra Sandbox] Blocked automated popunder/redirect attempt.');
                    return null;
                  }
                  return originalOpen.apply(this, arguments);
                };
              })();
            </script>
          </head>
          <body>
            <script type="text/javascript">
              atOptions = {
                'key' : '${effectiveAdKey}',
                'format' : 'iframe',
                'height' : ${height},
                'width' : ${width},
                'params' : {}
              };
            </script>
            <script type="text/javascript" src="${effectiveScriptSrc}" async defer></script>
          </body>
        </html>
      `;

      iframe.srcdoc = html;
      iframe.onload = () => {
        if (isSubscribed) setAdRenderStatus('READY');
      };
      iframe.onerror = () => {
        if (isSubscribed) setAdRenderStatus('FALLBACK');
      };

      containerRef.current.appendChild(iframe);

      // Watchdog timeout: if iframe takes > 3.5s due to slow 2G/3G network, activate high-converting interactive banner
      const timeoutWatchdog = setTimeout(() => {
        if (isSubscribed && adRenderStatus === 'LOADING') {
          setAdRenderStatus('READY');
        }
      }, 3500);

      return () => {
        isSubscribed = false;
        clearTimeout(timeoutWatchdog);
      };
    } catch (e) {
      console.warn('AdBanner iframe load error:', e);
      setAdRenderStatus('FALLBACK');
    }
  }, [effectiveAdKey, effectiveScriptSrc, width, height]);

  const handleBannerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If this specific ad is on cooldown, just open link without giving duplicate reward
    const currentRemaining = getBannerCooldownRemainingSeconds(effectiveAdId);
    if (currentRemaining > 0) {
      if (smartlinkUrl) {
        openExternalAdLink(smartlinkUrl);
      }
      return;
    }

    // 1. Start 3-minute cooldown ONLY for this clicked ad!
    startBannerCooldown(effectiveAdId, 180);
    setCooldownSeconds(180);

    // 2. Open external ad link
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
      onClick={handleBannerClick}
      className={`ad-banner-container relative w-full max-w-md mx-auto my-1.5 overflow-hidden cursor-pointer rounded-xl bg-gradient-to-r from-slate-900/95 via-purple-950/40 to-slate-900/95 border ${
        isCooldownActive
          ? 'border-slate-800/80 opacity-85'
          : 'border-purple-500/40 hover:border-pink-500/60 shadow-lg shadow-purple-950/20 active:scale-[0.99]'
      } transition-all duration-200 group ${className}`}
      style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
    >
      {/* Compact Top Banner Bar with Ad Badge & Tap & Earn / Cooldown */}
      <div className="flex items-center justify-between px-2.5 py-1 w-full bg-slate-950/95 border-b border-slate-800/80">
        <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[8px] font-extrabold uppercase tracking-wide flex items-center gap-0.5 border border-pink-500/30">
          <Sparkles className="w-2 h-2 text-amber-300" /> Ad Partner
        </span>

        {/* Cooldown Countdown vs Active Tap & Earn Button */}
        {isCooldownActive ? (
          <div className="px-2 py-0.5 rounded-full bg-slate-850 border border-slate-700/80 text-slate-400 font-bold text-[9px] flex items-center gap-1 font-mono">
            <Clock className="w-2.5 h-2.5 text-amber-400" />
            <span>Ready in {formatCooldownTime(cooldownSeconds)}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleBannerClick}
            className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:opacity-95 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-sm shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <Coins className="w-3 h-3 text-slate-950 fill-current" />
            <span>Tap & Earn +{rewardCoins} Coins</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Picture Ad Banner Graphic & Iframe Area */}
      <div className="relative w-full overflow-hidden p-0.5 flex items-center justify-center min-h-[48px] max-h-[60px]">
        {/* Adsterra Iframe Container */}
        <div
          ref={containerRef}
          className="w-full flex justify-center items-center overflow-hidden z-10 scale-95 origin-center"
        />

        {/* Resilient Fallback & Native Sponsored Banner Overlay */}
        <div className="absolute inset-0 flex items-center justify-between px-2.5 bg-gradient-to-r from-purple-950/50 via-slate-900/70 to-pink-950/50 pointer-events-none z-0">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-pink-500 to-amber-500 p-0.5 shadow-sm shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[4px] flex items-center justify-center">
                <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-white leading-tight">
                {isCooldownActive ? `Sponsored Offer` : `Verified Instant Reward`}
              </span>
              <span className="text-[8px] text-pink-300/80 font-medium">
                {isCooldownActive ? 'Tap to view partner details' : 'Click to claim bonus coins'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span
              className={`text-[9px] font-black px-2 py-0.5 rounded border font-mono shadow-sm ${
                isCooldownActive
                  ? 'text-slate-400 bg-slate-800/80 border-slate-700'
                  : 'text-amber-300 bg-amber-500/25 border-amber-400/40 animate-pulse'
              }`}
            >
              {isCooldownActive ? `⏳ ${formatCooldownTime(cooldownSeconds)}` : `+${rewardCoins} Coins`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

