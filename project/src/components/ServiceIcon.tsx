import React from 'react';
import { Users, Heart, Eye, MessageSquare, Share2, Sparkles, Rocket, Repeat, Bookmark, TrendingUp } from 'lucide-react';

interface ServiceIconProps {
  serviceId?: string;
  serviceType?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBackground?: boolean;
}

export const ServiceIcon: React.FC<ServiceIconProps> = ({
  serviceId = '',
  serviceType = '',
  size = 'md',
  className = '',
  showBackground = true
}) => {
  const key = (serviceId || serviceType).toLowerCase();

  let IconComponent = Sparkles;
  let gradientClass = 'from-purple-500 to-pink-500';
  let iconColorClass = 'text-purple-300';
  let glowClass = 'shadow-purple-500/20';

  if (key.includes('follower') || key === 'followers') {
    IconComponent = Users;
    gradientClass = 'from-purple-600 via-pink-600 to-indigo-600';
    iconColorClass = 'text-purple-300';
    glowClass = 'shadow-purple-500/30';
  } else if (key.includes('like') || key === 'likes') {
    IconComponent = Heart;
    gradientClass = 'from-rose-500 via-pink-500 to-red-500';
    iconColorClass = 'text-pink-300';
    glowClass = 'shadow-pink-500/30';
  } else if (key.includes('view') || key === 'views') {
    IconComponent = Eye;
    gradientClass = 'from-cyan-500 via-sky-500 to-blue-600';
    iconColorClass = 'text-sky-300';
    glowClass = 'shadow-sky-500/30';
  } else if (key.includes('comment') || key === 'comments') {
    IconComponent = MessageSquare;
    gradientClass = 'from-amber-500 via-orange-500 to-yellow-500';
    iconColorClass = 'text-amber-300';
    glowClass = 'shadow-amber-500/30';
  } else if (key.includes('share') || key === 'shares' || key.includes('boost')) {
    IconComponent = Share2;
    gradientClass = 'from-emerald-500 via-teal-500 to-emerald-600';
    iconColorClass = 'text-emerald-300';
    glowClass = 'shadow-emerald-500/30';
  } else if (key.includes('repost') || key === 'reposts') {
    IconComponent = Repeat;
    gradientClass = 'from-violet-500 via-fuchsia-500 to-pink-600';
    iconColorClass = 'text-fuchsia-300';
    glowClass = 'shadow-fuchsia-500/30';
  } else if (key.includes('save') || key === 'saves') {
    IconComponent = Bookmark;
    gradientClass = 'from-blue-500 via-indigo-500 to-cyan-500';
    iconColorClass = 'text-indigo-300';
    glowClass = 'shadow-indigo-500/30';
  } else if (key.includes('reach') || key.includes('impression') || key.includes('visit')) {
    IconComponent = TrendingUp;
    gradientClass = 'from-amber-500 via-rose-500 to-purple-600';
    iconColorClass = 'text-rose-300';
    glowClass = 'shadow-rose-500/30';
  }

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  const containerSizes = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-11 h-11 rounded-2xl',
    xl: 'w-14 h-14 rounded-2xl'
  };

  if (!showBackground) {
    return <IconComponent className={`${iconSizes[size]} ${iconColorClass} ${className}`} />;
  }

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 bg-gradient-to-tr ${gradientClass} p-0.5 shadow-lg ${glowClass} ${containerSizes[size]} ${className}`}
    >
      <div className="w-full h-full bg-slate-950/90 rounded-[inherit] flex items-center justify-center backdrop-blur-sm">
        <IconComponent className={`${iconSizes[size]} ${iconColorClass}`} />
      </div>
    </div>
  );
};
