import React from 'react';
import { 
  Zap, 
  ShoppingBag, 
  Users, 
  Tv, 
  ShieldAlert, 
  TrendingUp, 
  Clock, 
  ExternalLink,
  Activity,
  Smartphone,
  Radio,
  Sparkles,
  RefreshCw,
  Circle,
  User
} from 'lucide-react';
import { ActivityLog, AdminConfig, Order, UserAccount } from '../../types';
import { isUserOnline } from '../../utils/storage';

interface AdminOverviewProps {
  config: AdminConfig;
  orders: Order[];
  users: UserAccount[];
  logs?: ActivityLog[];
  onUpdateConfig: (newConfig: AdminConfig) => void;
  onNavigateTab: (tab: string) => void;
  onSimulateLiveActivity?: () => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  config,
  orders,
  users,
  logs = [],
  onUpdateConfig,
  onNavigateTab,
  onSimulateLiveActivity
}) => {
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === 'PROCESSING' || o.status === 'IN_PROGRESS' || (o.status as string) === 'PENDING').length;
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED').length;
  const totalCoinsSpent = orders.reduce((acc, curr) => acc + curr.coinsSpent, 0);

  const activeOnlineUsers = users.filter((u) => u && isUserOnline(u));
  const offlineUsers = users.filter((u) => u && !isUserOnline(u));

  const toggleMaintenance = () => {
    onUpdateConfig({
      ...config,
      maintenanceMode: !config.maintenanceMode
    });
  };

  const toggleSmmApi = () => {
    onUpdateConfig({
      ...config,
      smmApi: {
        ...config.smmApi,
        enabled: !config.smmApi.enabled
      }
    });
  };

  const toggleAds = () => {
    onUpdateConfig({
      ...config,
      ads: {
        ...config.ads,
        enabled: !config.ads.enabled
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Maintenance Mode Alert Banner if active */}
      {config.maintenanceMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between text-amber-300">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0 text-amber-400 animate-pulse" />
            <div>
              <p className="font-bold text-sm">App is currently in Maintenance Mode!</p>
              <p className="text-xs text-amber-300/80">Users see a friendly maintenance screen. Admin panel remains fully operational.</p>
            </div>
          </div>
          <button
            onClick={toggleMaintenance}
            className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition-colors"
          >
            Turn Off Maintenance
          </button>
        </div>
      )}

      {/* Real-time System Metrics Header Banner */}
      <div className="bg-gradient-to-r from-purple-900/60 via-slate-900 to-pink-900/60 border border-purple-500/30 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Radio className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Real-Time Live App Sync Engine</h2>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Live Connected
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Instantly tracking active app sessions, live order placements, and ad reward triggers.
            </p>
          </div>
        </div>

        {onSimulateLiveActivity && (
          <button
            onClick={onSimulateLiveActivity}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-pink-500 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 shrink-0 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" /> Simulate Live User Activity
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Online Users Card */}
        <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Real-time Active Users
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400">{activeOnlineUsers.length} <span className="text-xs text-slate-400 font-normal">Online Now</span></p>
          <p className="text-[11px] text-slate-400 mt-2">Total App Users: <strong className="text-white">{users.length}</strong></p>
        </div>

        {/* Real-time Orders Card */}
        <div className="bg-slate-900/90 border border-purple-500/30 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Real-Time Orders</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{totalOrders}</p>
          <div className="flex items-center gap-2 mt-2 text-[11px]">
            <span className="text-emerald-400 font-bold">{completedOrders} Done</span>
            <span>•</span>
            <span className="text-amber-400 font-bold">{pendingOrders} Live Pending</span>
          </div>
        </div>

        {/* Total Coins Spent */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Coins Processed</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400">{totalCoinsSpent.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-2">Active in SMM & rewards</p>
        </div>

        {/* Ads Auto Timer */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Ads Active Timer</span>
            <div className="p-2 bg-pink-500/10 text-pink-400 rounded-xl">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{config.ads.autoAdIntervalMinutes} Min</p>
          <p className="text-[11px] text-pink-400 font-semibold mt-2">Auto active session trigger</p>
        </div>
      </div>

      {/* Real-time Active Online Users Live Monitor Panel */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Active App Sessions ({activeOnlineUsers.length} Online)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status, device type, location, and current screen of active InstaBoost users
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('users')}
            className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
          >
            Manage All ({users.length}) <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {users.map((u, uIdx) => {
            const isUserOnlineStatus = isUserOnline(u);
            const userKey = u.memberId ? `ov-usr-${u.memberId}-${uIdx}` : `ov-usr-${u.id || uIdx}-${uIdx}`;
            return (
              <div
                key={userKey}
                className={`p-3.5 rounded-xl border transition-all ${
                  isUserOnlineStatus
                    ? 'bg-slate-950 border-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      {isUserOnlineStatus && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          isUserOnlineStatus ? 'bg-emerald-500' : 'bg-slate-600'
                        }`}
                      />
                    </span>
                    <span className="font-bold text-xs text-white">{u.name}</span>
                    <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                      {u.memberId}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isUserOnlineStatus
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isUserOnlineStatus ? 'ONLINE NOW' : u.lastActive || 'Offline'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-slate-500" />
                    {u.deviceType || 'Android App'}
                  </span>
                  <span className="text-slate-300 font-medium">{u.currentScreen || 'Main App'}</span>
                  <span className="text-amber-400 font-bold">{u.coins} Coins</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Activity Stream Feed */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-pink-400 animate-pulse" /> Real-time Live Activity Stream
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Live Sync active</span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">No recent activities logged yet.</p>
          ) : (
            logs.map((log, logIdx) => (
              <div
                key={log.id ? `ov-log-${log.id}-${logIdx}` : `ov-log-idx-${logIdx}`}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      log.type === 'ORDER_PLACED'
                        ? 'bg-amber-400'
                        : log.type === 'AD_WATCHED'
                        ? 'bg-pink-400'
                        : 'bg-blue-400'
                    }`}
                  />
                  <div>
                    <p className="font-bold text-white text-xs">{log.title}</p>
                    <p className="text-[11px] text-slate-400">{log.detail}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{log.timestamp}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Real-time System Control Switches */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Real-time System Controls (Live App Impact)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Maintenance Toggle */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Maintenance Mode</p>
              <p className="text-[11px] text-slate-400">Lock app for updates</p>
            </div>
            <button
              onClick={toggleMaintenance}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                config.maintenanceMode ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  config.maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* SMM API Toggle */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">SMM API Forwarding</p>
              <p className="text-[11px] text-slate-400">
                {config.smmApi.enabled ? 'Auto orders active' : 'Manual queue only'}
              </p>
            </div>
            <button
              onClick={toggleSmmApi}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                config.smmApi.enabled ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  config.smmApi.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Ads Toggle */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">In-App Ads Engine</p>
              <p className="text-[11px] text-slate-400">
                {config.ads.enabled ? `${config.ads.autoAdIntervalMinutes}m interval active` : 'Disabled'}
              </p>
            </div>
            <button
              onClick={toggleAds}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                config.ads.enabled ? 'bg-pink-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  config.ads.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Orders Preview */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" /> Recent User Orders
          </h3>
          <button
            onClick={() => onNavigateTab('orders')}
            className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1"
          >
            Manage All ({orders.length}) <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {orders.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No orders submitted yet.</p>
        ) : (
          <div className="space-y-2.5">
            {orders.slice(0, 4).map((ord, idx) => (
              <div
                key={`${ord.id}-${idx}`}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px] flex items-center gap-1 border border-purple-500/30">
                      <User className="w-3 h-3 text-purple-400" />
                      #{ord.userMemberId || '100001'}
                    </span>
                    <span className="font-mono font-bold text-amber-400">{ord.id}</span>
                    <span className="text-slate-300 font-medium">{ord.serviceType}</span>
                    <span className="text-slate-500">({ord.quantity})</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">{ord.targetUrl}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-semibold">{ord.coinsSpent} Coins</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ord.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {ord.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

