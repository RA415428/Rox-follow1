import React, { useState } from 'react';
import { APP_LOGO_SRC } from '../assets/appLogoBase64';

interface RoxLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSparkle?: boolean;
}

export const RoxLogo: React.FC<RoxLogoProps> = ({
  size = 'md',
  className = '',
  showSparkle = true
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-16 h-16 rounded-2xl',
    xl: 'w-24 h-24 rounded-3xl'
  };

  const innerRadiusClasses = {
    sm: 'rounded-[7px]',
    md: 'rounded-[9px]',
    lg: 'rounded-[14px]',
    xl: 'rounded-[22px]'
  };

  const textSizes = {
    sm: 'text-[11px]',
    md: 'text-xs',
    lg: 'text-xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`relative flex-shrink-0 select-none ${className}`}>
      {/* Gradient border container */}
      <div className={`${sizeClasses[size]} overflow-hidden shadow-md shadow-pink-500/25 border border-pink-500/30 bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 p-[1.5px] transition-transform duration-200`}>
        <div className={`w-full h-full bg-slate-950 ${innerRadiusClasses[size]} flex items-center justify-center overflow-hidden relative`}>
          {!imageError ? (
            <img
              src={APP_LOGO_SRC}
              alt="ROX FOLLOW"
              className="w-full h-full object-cover"
              loading="eager"
              decoding="sync"
              // @ts-ignore
              fetchpriority="high"
              onError={() => setImageError(true)}
            />
          ) : (
            // Guaranteed crisp vector fallback emblem
            <div className="w-full h-full bg-gradient-to-br from-purple-700 via-pink-600 to-amber-500 flex flex-col items-center justify-center text-white relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/25 via-transparent to-black/30" />
              <span className={`font-black tracking-tighter ${textSizes[size]} text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] leading-none z-10 font-sans`}>
                RF
              </span>
            </div>
          )}
        </div>
      </div>

      {showSparkle && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full border border-slate-900 flex items-center justify-center shadow-sm pointer-events-none" title="Verified Growth Engine">
          <svg className="w-2 h-2 text-slate-950 fill-current" viewBox="0 0 24 24">
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
          </svg>
        </div>
      )}
    </div>
  );
};
