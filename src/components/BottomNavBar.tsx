import React from 'react';
import { ShoppingBag, Hash, Coins, Clock, Settings } from 'lucide-react';
import { MainTab } from '../types';

interface BottomNavBarProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  pendingOrdersCount?: number;
  smartlinkUrl?: string;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  pendingOrdersCount = 0
}) => {
  const tabs = [
    { id: 'HOME' as MainTab, label: 'Order', icon: ShoppingBag },
    { id: 'TAGS' as MainTab, label: 'Hashtags', icon: Hash },
    { id: 'COINS' as MainTab, label: 'Store', icon: Coins },
    { id: 'ORDERS' as MainTab, label: 'History', icon: Clock, badge: pendingOrdersCount },
    { id: 'SETTINGS' as MainTab, label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (tabId: MainTab) => {
    onSelectTab(tabId);
    window.scrollTo(0, 0);
  };


  return (
    <nav 
      id="bottom-navigation-bar" 
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/98 backdrop-blur-xl border-t border-pink-500/20 px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] max-w-md mx-auto w-full shadow-[0_-8px_24px_rgba(0,0,0,0.6)] select-none"
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-${tab.id.toLowerCase()}`}
              onClick={(e) => {
                (e.currentTarget as HTMLElement).blur();
                handleTabClick(tab.id);
              }}
              className={`relative flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-200 select-none touch-manipulation cursor-pointer ${
                isActive
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300 font-extrabold scale-105'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'text-pink-400 stroke-[2.5px] drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]' : 'stroke-2'
                  }`}
                />
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-slate-900 shadow-md animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>

              {isActive && (
                <div className="absolute -bottom-1 w-6 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full shadow-lg shadow-pink-500/50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
