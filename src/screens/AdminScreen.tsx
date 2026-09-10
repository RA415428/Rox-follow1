import React, { useState } from 'react';
import { 
  Shield, 
  Zap, 
  Globe, 
  Tv, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Bell, 
  Settings, 
  Smartphone,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  CreditCard,
  CloudRain
} from 'lucide-react';
import { ActivityLog, AdminConfig, Order, UserAccount } from '../types';
import { isUserOnline } from '../utils/storage';
import { APP_LOGO_SRC } from '../assets/appLogoBase64';
import { AdminOverview } from '../components/Admin/AdminOverview';
import { AdminSmmApi } from '../components/Admin/AdminSmmApi';
import { AdminAdsConfig } from '../components/Admin/AdminAdsConfig';
import { AdminPricing } from '../components/Admin/AdminPricing';
import { AdminOrders } from '../components/Admin/AdminOrders';
import { AdminUsers } from '../components/Admin/AdminUsers';
import { AdminAnnouncements } from '../components/Admin/AdminAnnouncements';
import { AdminSettings } from '../components/Admin/AdminSettings';
import { AdminPayment } from '../components/Admin/AdminPayment';
import { AdminReferrals } from '../components/Admin/AdminReferrals';
import { AdminAppUpdate } from '../components/Admin/AdminAppUpdate';
import { RainBackground } from '../components/RainBackground';
import { Rocket } from 'lucide-react';

interface AdminScreenProps {
  config: AdminConfig;
  orders: Order[];
  users: UserAccount[];
  logs?: ActivityLog[];
  onUpdateConfig: (newConfig: AdminConfig) => void;
  onUpdateOrders: (updatedOrders: Order[]) => void;
  onUpdateUsers: (updatedUsers: UserAccount[]) => void;
  onRefundUser: (coins: number) => void;
  onResetDefaults: () => void;
  onBackToApp: () => void;
  onTriggerTestAd: () => void;
  onSimulateLiveActivity?: () => void;
  onResetDailyAdLimits?: () => void;
  isRainEnabled?: boolean;
  onToggleRain?: () => void;
  onShowToast?: (msg: string) => void;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({
  config,
  orders,
  users,
  logs = [],
  onUpdateConfig,
  onUpdateOrders,
  onUpdateUsers,
  onRefundUser,
  onResetDefaults,
  onBackToApp,
  onTriggerTestAd,
  onSimulateLiveActivity,
  onResetDailyAdLimits,
  isRainEnabled = true,
  onToggleRain,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [, setTick] = useState(0);

  // Live auto-refresh ticker every 3s to keep navigation live user counts 100% real-time
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const isPendingOrder = (o: Order) => o.status === 'PROCESSING' || o.status === 'IN_PROGRESS' || (o.status as string) === 'PENDING';
  const pendingOrdersCount = orders.filter(isPendingOrder).length;

  const onlineCount = users.filter(isUserOnline).length;

  const navTabs = [
    { id: 'overview', label: 'Overview', desc: 'Live stats & activity', icon: Zap },
    { id: 'smm_api', label: 'SMM API', desc: 'PerfectPanel provider', icon: Globe },
    { id: 'ads_admob', label: 'Ads Config', desc: 'Manage timer & rewards', icon: Tv },
    { id: 'pricing', label: 'Coin Rates', desc: 'Cost per follower/like', icon: DollarSign },
    { id: 'payment_gateway', label: 'Payment & QR', desc: 'UPI & Claims', icon: CreditCard },
    { id: 'referrals', label: 'Refer & Earn', desc: 'Ledger & Anti-Fraud', icon: Users },
    { id: 'orders', label: 'Orders', desc: 'Track & sync orders', icon: ShoppingBag, badge: pendingOrdersCount > 0 ? pendingOrdersCount.toString() : undefined },
    { id: 'users', label: 'User Accounts', desc: 'Coins & user status', icon: Users, badge: onlineCount > 0 ? `${onlineCount} Live` : undefined },
    { id: 'app_update', label: 'App Update', desc: 'APK & Force Update', icon: Rocket, badge: config.appUpdate?.enabled ? 'Active' : undefined },
    { id: 'announcements', label: 'Popup Banner', desc: 'In-app notices', icon: Bell },
    { id: 'settings', label: 'Security & Backup', desc: 'Reset & Passkey', icon: Settings }
  ];

  const currentTab = navTabs.find(t => t.id === activeTab) || navTabs[0];

  return (
    <div data-admin-panel="true" className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#09030a] text-slate-100 font-sans pb-28 select-none relative">
      {/* Live Animated Monsoon Rain Canvas in Admin Background */}
      <RainBackground enabled={isRainEnabled} intensity="monsoon" />

      {/* Top Header Switcher - Fixed Stable at Top */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-pink-500/20 px-4 py-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/25 border border-pink-400/40 overflow-hidden shrink-0">
              <img
                src={APP_LOGO_SRC}
                alt="ROX ADMIN Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/app_logo.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-white text-lg tracking-wide bg-gradient-to-r from-white via-pink-200 to-pink-400 bg-clip-text text-transparent flex items-center gap-1.5">
                  ROX ADMIN
                </h1>
                <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-black rounded-full flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                RoxyeFollow SMM forwarding engine, monetization & real-time analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Rain Toggle Button */}
            {onToggleRain && (
              <button
                type="button"
                onClick={onToggleRain}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                  isRainEnabled
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-sm shadow-pink-500/20'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700'
                }`}
                title={isRainEnabled ? 'Turn OFF Monsoon Rain' : 'Turn ON Monsoon Rain'}
              >
                <CloudRain className="w-3.5 h-3.5 text-pink-400" />
                <span className="hidden md:inline">{isRainEnabled ? 'Rain: ON' : 'Rain: OFF'}</span>
              </button>
            )}

            <button
              onClick={onBackToApp}
              className="px-4 py-2 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-90 text-white border border-pink-400/30 font-bold text-xs rounded-xl shadow-lg shadow-pink-500/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-pink-200" />
              <span className="hidden xs:inline">Exit to App</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto pt-20 md:pt-24 p-4 md:p-6 w-full max-w-full overflow-x-hidden space-y-6 relative z-10">
        {/* Tab Content Rendering */}
        {activeTab === 'overview' && (
          <AdminOverview
            config={config}
            orders={orders}
            users={users}
            logs={logs}
            onUpdateConfig={onUpdateConfig}
            onNavigateTab={setActiveTab}
            onSimulateLiveActivity={onSimulateLiveActivity}
          />
        )}

        {activeTab === 'smm_api' && (
          <AdminSmmApi
            config={config}
            orders={orders}
            onUpdateConfig={onUpdateConfig}
            onUpdateOrders={onUpdateOrders}
          />
        )}

        {activeTab === 'ads_admob' && (
          <AdminAdsConfig
            config={config}
            onUpdateConfig={onUpdateConfig}
            onTriggerTestAd={onTriggerTestAd}
            onResetDailyAdLimits={onResetDailyAdLimits}
          />
        )}

        {activeTab === 'pricing' && (
          <AdminPricing config={config} onUpdateConfig={onUpdateConfig} />
        )}

        {activeTab === 'payment_gateway' && (
          <AdminPayment config={config} onUpdateConfig={onUpdateConfig} />
        )}

        {activeTab === 'referrals' && (
          <AdminReferrals 
            config={config} 
            onUpdateConfig={onUpdateConfig} 
            onShowToast={onShowToast} 
          />
        )}

        {activeTab === 'orders' && (
          <AdminOrders
            config={config}
            orders={orders}
            onUpdateOrders={onUpdateOrders}
            onRefundUser={onRefundUser}
          />
        )}

        {activeTab === 'users' && (
          <AdminUsers users={users} orders={orders} onUpdateUsers={onUpdateUsers} />
        )}

        {activeTab === 'app_update' && (
          <AdminAppUpdate
            config={config}
            onUpdateConfig={onUpdateConfig}
            onShowToast={onShowToast}
          />
        )}

        {activeTab === 'announcements' && (
          <AdminAnnouncements config={config} onUpdateConfig={onUpdateConfig} />
        )}

        {activeTab === 'settings' && (
          <AdminSettings
            config={config}
            onUpdateConfig={onUpdateConfig}
            onResetDefaults={onResetDefaults}
          />
        )}
      </main>

      {/* Stable Bottom Navigation Bar for Admin Panel */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/98 backdrop-blur-xl border-t border-pink-500/20 px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] w-full max-w-full shadow-[0_-8px_24px_rgba(0,0,0,0.7)] select-none">
        <div className="max-w-5xl mx-auto flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 px-1">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`admin-tab-${tab.id}`}
                onClick={(e) => {
                  (e.currentTarget as HTMLElement).blur();
                  setActiveTab(tab.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 shrink-0 select-none touch-manipulation min-w-[64px] cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/30 via-indigo-600/30 to-pink-600/30 text-white border border-purple-400/50 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent font-medium'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isActive
                        ? 'text-pink-400 stroke-[2.5px] scale-110 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]'
                        : 'text-purple-400/80 stroke-2'
                    }`}
                  />
                  {tab.badge && (
                    <span className="absolute -top-1.5 -right-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[8px] font-black font-mono px-1 py-0.2 rounded-full ring-1 ring-slate-900 shadow-sm animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-1 tracking-tight truncate ${isActive ? 'text-white font-black' : 'text-slate-400'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-0.5 w-6 h-0.5 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};



