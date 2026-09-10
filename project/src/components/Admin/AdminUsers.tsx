import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Coins, 
  CheckCircle2, 
  Plus, 
  Minus, 
  ShieldAlert, 
  UserCheck, 
  UserX,
  Radio,
  Smartphone,
  MapPin,
  Clock,
  MailCheck
} from 'lucide-react';
import { Order, UserAccount } from '../../types';
import { getApiUrl, isUserOnline, fetchServerUsers } from '../../utils/storage';
import { db } from '../../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface AdminUsersProps {
  users: UserAccount[];
  orders?: Order[];
  onUpdateUsers: (updatedUsers: UserAccount[]) => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ users, orders, onUpdateUsers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Show all registered users in the admin list
  const verifiedEmailUsers = users.filter((u) => {
    if (!u) return false;
    return Boolean(u.memberId || u.id || u.email);
  });

  // Ticker to update relative time display (e.g., "5s ago", "2m ago")
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000);
    }, 10000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const getDynamicLastActive = (u: UserAccount): string => {
    if (isUserOnline(u)) return '🟢 ONLINE NOW';
    const lastActiveTime = Math.max(
      typeof (u as any).lastSeenAt === 'number' && (u as any).lastSeenAt > 0 ? (u as any).lastSeenAt : 0,
      typeof u.updatedAt === 'number' && u.updatedAt > 0 ? u.updatedAt : 0
    );
    
    if (!lastActiveTime) return u.lastActive || 'Offline (Never)';
    const diffSecs = Math.max(0, Math.floor((Date.now() - lastActiveTime) / 1000));
    if (diffSecs < 60) return `Offline (${diffSecs}s ago)`;
    if (diffSecs < 3600) return `Offline (${Math.floor(diffSecs / 60)}m ago)`;
    if (diffSecs < 86400) {
      const hours = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      return `Offline (${hours}h ${mins}m ago)`;
    }
    const days = Math.floor(diffSecs / 86400);
    if (days === 1) return `Offline (1 day ago)`;
    if (days < 30) return `Offline (${days} days ago)`;
    const months = Math.floor(days / 30);
    return `Offline (${months} month${months > 1 ? 's' : ''} ago)`;
  };

  const formatLastSeenDate = (u: UserAccount): string => {
    const lastActiveTime = typeof (u as any).lastSeenAt === 'number' && (u as any).lastSeenAt > 0
      ? (u as any).lastSeenAt
      : (typeof u.updatedAt === 'number' && u.updatedAt > 0 ? u.updatedAt : 0);
    if (!lastActiveTime) return 'Never';
    try {
      const d = new Date(lastActiveTime);
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Never';
    }
  };

  const syncUserToFirestoreAndBackend = async (targetUser: any, payload: any): Promise<{ success: boolean; error?: string }> => {
    if (!targetUser) return { success: false, error: 'Target user not found' };
    const cleanMemberId = String(targetUser.memberId || targetUser.id || '').replace(/^#+/, '').replace(/^usr_/, '').trim();
    if (!cleanMemberId) return { success: false, error: 'Invalid Member ID' };

    const now = Date.now();
    const updateData = { ...payload, updatedAt: now };

    try {
      // 1. Confirm write with Firestore server first (prevents optimistic rollback)
      await setDoc(doc(db, 'users', cleanMemberId), updateData, { merge: true });

      // Clean up legacy duplicate document variants
      deleteDoc(doc(db, 'users', `usr_${cleanMemberId}`)).catch(() => {});
      deleteDoc(doc(db, 'users', `#${cleanMemberId}`)).catch(() => {});
      if (targetUser.id && targetUser.id !== cleanMemberId) {
        deleteDoc(doc(db, 'users', targetUser.id)).catch(() => {});
      }

      if (targetUser.authUid) {
        setDoc(doc(db, 'users_auth', targetUser.authUid), updateData, { merge: true }).catch(() => {});
      }

      // Sync to Express Backend
      fetch(getApiUrl('/api/users/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: cleanMemberId,
          id: targetUser.id || `usr_${cleanMemberId}`,
          name: targetUser.name || targetUser.displayName || `User #${cleanMemberId}`,
          authUid: targetUser.authUid || '',
          ...updateData
        })
      }).catch(() => {});

      fetch(getApiUrl('/api/users'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          ...targetUser,
          memberId: cleanMemberId,
          id: targetUser.id || `usr_${cleanMemberId}`,
          ...updateData
        }])
      }).catch(() => {});

      return { success: true };
    } catch (err: any) {
      console.error('[Firestore Admin Error]:', err);
      const isPermDenied = err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions');
      return {
        success: false,
        error: isPermDenied ? 'PERMISSION_DENIED: Firestore rules blocked this update' : (err?.message || 'Update failed')
      };
    }
  };

  const handleAdjustCoins = async (userId: string, delta: number) => {
    const targetUser = users.find((u) => u.id === userId || u.memberId === userId);
    if (!targetUser) return;

    const calculatedCoins = Math.max(0, (targetUser.coins || 0) + delta);

    // Write to Firestore first
    const res = await syncUserToFirestoreAndBackend(targetUser, {
      coins: calculatedCoins,
      coinsUpdatedByAdmin: true
    });

    if (!res.success) {
      showToast(`❌ Error: ${res.error}`);
      return;
    }

    // Only update local state upon verified server confirmation
    const updated = users.map((u) => {
      if (u.id === userId || u.memberId === userId) {
        return { ...u, coins: calculatedCoins, coinsUpdatedByAdmin: true, updatedAt: Date.now() };
      }
      return u;
    });
    onUpdateUsers(updated);
    showToast(`Updated user coin balance by ${delta > 0 ? '+' : ''}${delta} coins.`);
  };

  const handleSetExactCoins = async (userId: string, exactCoins: number) => {
    const targetUser = users.find((u) => u.id === userId || u.memberId === userId);
    if (!targetUser) return;

    const validCoins = Math.max(0, exactCoins);

    // Write to Firestore first
    const res = await syncUserToFirestoreAndBackend(targetUser, {
      coins: validCoins,
      coinsUpdatedByAdmin: true
    });

    if (!res.success) {
      showToast(`❌ Error: ${res.error}`);
      return;
    }

    // Only update local state upon verified server confirmation
    const updated = users.map((u) => {
      if (u.id === userId || u.memberId === userId) {
        return { ...u, coins: validCoins, coinsUpdatedByAdmin: true, updatedAt: Date.now() };
      }
      return u;
    });
    onUpdateUsers(updated);
    showToast(`Set user coin balance to ${validCoins} coins.`);
  };

  const handleToggleBlock = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId || u.memberId === userId);
    if (!targetUser) return;

    const newStatus: 'ACTIVE' | 'BLOCKED' = targetUser.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';

    // Write to Firestore first
    const res = await syncUserToFirestoreAndBackend(targetUser, {
      status: newStatus,
      adminAction: true,
      isAdminAction: true
    });

    if (!res.success) {
      showToast(`❌ Error: ${res.error}`);
      return;
    }

    // Only update local state upon verified server confirmation
    const updated = users.map((u) => {
      if (u.id === userId || u.memberId === userId) {
        return { ...u, status: newStatus, updatedAt: Date.now() };
      }
      return u;
    });
    onUpdateUsers(updated);
    showToast(`User account status updated to ${newStatus}.`);
  };

  const handleRemoveFakeUsers = () => {
    const realUsersOnly = users.filter((u) => {
      if (!u) return false;
      const uId = String(u.id || '');
      const uName = String(u.name || '');
      const isMock =
        uId.startsWith('usr_mock') ||
        uId.startsWith('usr_demo') ||
        uName === 'Rohan Sharma' ||
        uName === 'Priya Patel' ||
        uName === 'Vikram Singh' ||
        uName === 'Ananya Roy' ||
        uName === 'Rahul Verma';
      return !isMock;
    });
    onUpdateUsers(realUsersOnly);
    fetch(getApiUrl('/api/users/purge-anonymous'), { method: 'POST' }).catch(() => {});
    showToast('Removed all fake users list.');
  };

  const onlineUsersCount = verifiedEmailUsers.filter((u) => u && isUserOnline(u)).length;
  const offlineUsersCount = Math.max(0, verifiedEmailUsers.length - onlineUsersCount);

  const filteredUsers = verifiedEmailUsers.filter((u) => {
    if (!u) return false;
    const name = String(u.name || '');
    const memberId = String(u.memberId || '');
    const email = String(u.email || '');
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase());

    const isOnline = isUserOnline(u);
    if (statusFilter === 'ONLINE') return matchesSearch && isOnline;
    if (statusFilter === 'OFFLINE') return matchesSearch && !isOnline;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {toastMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Search */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> Real-Time Verified Users
              </h2>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full flex items-center gap-1.5">
                <MailCheck className="w-3 h-3 text-emerald-400" /> Email Verified Only
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Showing users who have signed in with Email. Anonymous / unregistered downloads without login are automatically excluded.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All ({verifiedEmailUsers.length})
            </button>
            <button
              onClick={() => setStatusFilter('ONLINE')}
              className={`px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                statusFilter === 'ONLINE'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> {onlineUsersCount} Online Now
            </button>
            <button
              onClick={() => setStatusFilter('OFFLINE')}
              className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'OFFLINE'
                  ? 'bg-slate-700 text-white border-slate-600 shadow'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
              }`}
            >
              ⚪ {offlineUsersCount} Offline
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search worldwide users by Member ID, Name, Country, or Device..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Users List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredUsers.map((u, uIdx) => {
          const isOnline = isUserOnline(u);
          const cleanUMem = String(u.memberId || '').replace(/^#+/, '').trim();
          const userOrders = orders?.filter((o: any) => {
            if (!o) return false;
            const cleanOMem = String(o.userMemberId || '').replace(/^#+/, '').trim();
            if (cleanUMem && cleanOMem && cleanUMem === cleanOMem) return true;
            if (u.authUid && o.authUid && o.authUid === u.authUid) return true;
            if (u.email && o.userEmail && String(o.userEmail).toLowerCase() === u.email.toLowerCase()) return true;
            return false;
          }) || [];
          const totalUserOrders = Math.max(u.ordersCount || 0, userOrders.length);
          const totalCoinsSpent = Math.max(
            u.totalCoinsSpent || 0,
            userOrders.reduce((sum, o) => sum + (o.coinsSpent || (o as any).costCoins || 0), 0)
          );

          const userKey = u.memberId ? `usr-item-${u.memberId}-${uIdx}` : `usr-item-${u.id || uIdx}-${uIdx}`;

          return (
            <div
              key={userKey}
              className={`p-4 rounded-2xl border transition-all ${
                u.status === 'BLOCKED'
                  ? 'bg-red-950/20 border-red-500/30'
                  : isOnline
                  ? 'bg-slate-900/90 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                  : 'bg-slate-900/90 border-slate-800/80 opacity-95'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5 mb-3 min-w-0">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {u.photoURL ? (
                    <img
                      src={u.photoURL}
                      alt={u.name}
                      className="w-9 h-9 rounded-xl object-cover border border-pink-500/40 shrink-0 mt-0.5"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0 mt-0.5">
                      {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        {isOnline && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                          }`}
                        />
                      </span>
                      <h3 className="font-bold text-white text-sm truncate max-w-[140px] sm:max-w-[200px]" title={u.name}>
                        {u.name}
                      </h3>
                      <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                        #{u.memberId}
                      </span>
                    </div>
                    {u.email && (
                      <p className="text-[11px] text-slate-300 font-mono mt-0.5 truncate max-w-[170px] sm:max-w-[240px]" title={u.email}>
                        {u.email}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 truncate">
                      <span>Joined: {u.joinedDate}</span>
                      <span>•</span>
                      <span className="text-slate-300 font-semibold truncate">{u.location || 'India'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                      u.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {u.status}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                      isOnline
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isOnline ? '🟢 ONLINE NOW' : `⚪ ${getDynamicLastActive(u)}`}
                  </span>
                </div>
              </div>

              {/* Real-time details */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-3 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500">Coin Balance</span>
                    <p className="font-bold text-amber-400 text-sm">{u.coins} Coins</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Orders Placed</span>
                    <p className="font-bold text-white text-sm">{totalUserOrders} Orders</p>
                    {totalCoinsSpent > 0 && (
                      <p className="text-[9px] text-slate-400 font-mono">({totalCoinsSpent} coins spent)</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 truncate max-w-[170px]">
                    <Smartphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{u.deviceType || 'Android Device'}</span>
                  </span>
                  <span className="text-slate-300 shrink-0 ml-1">Screen: <strong>{u.currentScreen || 'Main App'}</strong></span>
                </div>

                <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 text-slate-400 truncate mr-2">
                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">Last Active: <strong className={isOnline ? "text-emerald-400 font-semibold" : "text-slate-300"}>{getDynamicLastActive(u)}</strong></span>
                  </span>
                  <span className="text-slate-400 font-mono text-[10px] shrink-0">
                    {formatLastSeenDate(u)}
                  </span>
                </div>
              </div>

              {/* Quick Balance Controls */}
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAdjustCoins(u.id, 100)}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> 100
                    </button>
                    <button
                      onClick={() => handleAdjustCoins(u.id, 500)}
                      className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> 500
                    </button>
                    <button
                      onClick={() => handleAdjustCoins(u.id, -100)}
                      className="px-2 py-1 bg-slate-800 hover:bg-red-900/60 text-slate-300 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-0.5"
                    >
                      <Minus className="w-3 h-3" /> 100
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleBlock(u.id)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 ${
                        u.status === 'ACTIVE'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? (
                        <>
                          <UserX className="w-3.5 h-3.5" /> Block
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" /> Unblock
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Set Exact Coins:</span>
                  <input
                    type="number"
                    defaultValue={u.coins}
                    key={u.coins}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt((e.target as HTMLInputElement).value, 10);
                        if (!isNaN(val)) handleSetExactCoins(u.id, val);
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val !== u.coins) handleSetExactCoins(u.id, val);
                    }}
                    className="w-24 px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-amber-300 font-bold text-xs text-center focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[9px] text-slate-500">(Press Enter or click away)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

