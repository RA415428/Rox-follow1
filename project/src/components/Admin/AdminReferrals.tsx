import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Coins, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  TrendingUp, 
  Copy, 
  Filter, 
  Check, 
  Ban, 
  Eye, 
  Sparkles,
  Link as LinkIcon,
  ToggleLeft,
  ToggleRight,
  AlertTriangle
} from 'lucide-react';
import { AdminConfig, ReferralRecord, CoinTransaction } from '../../types';
import { copyToClipboard } from '../../utils/clipboard';

interface AdminReferralsProps {
  config: AdminConfig;
  onUpdateConfig: (newConfig: AdminConfig) => void;
  onShowToast?: (msg: string) => void;
}

export const AdminReferrals: React.FC<AdminReferralsProps> = ({
  config,
  onUpdateConfig,
  onShowToast
}) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    rewardedCount: 0,
    pendingCount: 0,
    reviewCount: 0,
    rejectedCount: 0,
    totalCoinsDistributed: 0
  });
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [topReferrers, setTopReferrers] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<CoinTransaction[]>([]);
  const [referralCodes, setReferralCodes] = useState<Record<string, any>>({});
  
  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REWARDED' | 'REVIEW' | 'REJECTED'>('ALL');
  
  // Action Modal / Note
  const [reviewingItem, setReviewingItem] = useState<ReferralRecord | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Smooth string state for coin inputs to allow deleting/cutting 0 cleanly
  const [referrerCoinsStr, setReferrerCoinsStr] = useState<string>(
    String(config.pricing?.referralRewardCoins ?? 10)
  );
  const [welcomeCoinsStr, setWelcomeCoinsStr] = useState<string>(
    String(config.pricing?.googleWelcomeBonusCoins ?? 10)
  );

  useEffect(() => {
    if (config.pricing?.referralRewardCoins !== undefined) {
      setReferrerCoinsStr(String(config.pricing.referralRewardCoins));
    }
  }, [config.pricing?.referralRewardCoins]);

  useEffect(() => {
    if (config.pricing?.googleWelcomeBonusCoins !== undefined) {
      setWelcomeCoinsStr(String(config.pricing.googleWelcomeBonusCoins));
    }
  }, [config.pricing?.googleWelcomeBonusCoins]);

  const fetchReferralData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/referral/admin/list', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats || stats);
          setReferrals(data.referrals || []);
          setTopReferrers(data.topReferrers || []);
          setRecentTransactions(data.recentTransactions || []);
          setReferralCodes(data.referralCodes || {});
        }
      }
    } catch (err) {
      console.warn('Failed to load admin referrals list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, []);

  const handleReviewSubmit = async () => {
    if (!reviewingItem || !reviewAction) return;
    setProcessingAction(true);
    try {
      const res = await fetch('/api/referral/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralId: reviewingItem.id,
          action: reviewAction,
          adminNote: adminNote || (reviewAction === 'APPROVE' ? 'Approved by admin' : 'Rejected by admin')
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast?.(`Referral ${reviewAction === 'APPROVE' ? 'Approved & Rewarded' : 'Rejected'}`);
        setReviewingItem(null);
        setReviewAction(null);
        setAdminNote('');
        fetchReferralData();
      } else {
        alert(data.error || 'Failed to update referral review');
      }
    } catch (e: any) {
      alert('Error updating referral: ' + e.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleToggleCode = async (code: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/referral/admin/toggle-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: code, active: !currentActive })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast?.(`Code ${code} is now ${!currentActive ? 'Active' : 'Disabled'}`);
        fetchReferralData();
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Pricing config handlers
  const handleRewardChange = (key: 'referralRewardCoins' | 'referralAppDownloadUrl' | 'googleWelcomeBonusCoins', val: any) => {
    const updated = {
      ...config,
      pricing: {
        ...config.pricing,
        [key]: val
      }
    };
    onUpdateConfig(updated);
  };

  const filteredReferrals = referrals.filter(r => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesSearch = !searchQuery || 
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referrerUid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referredUid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.referralCode && r.referralCode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 border border-purple-500/20 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>Refer & Earn Security Ledger</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                100% FRAUD RESISTANT
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Server-authoritative ledger, atomic transaction tracking, and anti-abuse verification.
            </p>
          </div>
        </div>

        <button
          onClick={fetchReferralData}
          disabled={loading}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-pink-400' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Referrals</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-white font-mono">{stats.totalReferrals}</span>
            <span className="text-xs text-purple-400 font-bold">Records</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Deterministic ID tracking</span>
        </div>

        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-lg">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Rewarded / Verified</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-400 font-mono">{stats.rewardedCount}</span>
            <span className="text-xs text-emerald-300 font-bold">Active</span>
          </div>
          <span className="text-[10px] text-emerald-500/80 mt-1 block">Instant bonus delivered</span>
        </div>

        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-lg">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Coins Distributed</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-400 font-mono">+{stats.totalCoinsDistributed}</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-[10px] text-amber-300/70 mt-1 block">Total Coins Rewarded</span>
        </div>

        <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-4 shadow-lg">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Under Review / Flagged</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-400 font-mono">{stats.reviewCount}</span>
            <span className="text-xs text-rose-300 font-bold">Risk Alerts</span>
          </div>
          <span className="text-[10px] text-rose-400/80 mt-1 block">Pending admin review</span>
        </div>
      </div>

      {/* Referral Program Rules & Reward Settings */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Coins className="w-4 h-4 text-pink-400" />
          <span>Referral Reward Configuration</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Referrer Reward (Coins to Sender)</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={referrerCoinsStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setReferrerCoinsStr(val);
                  if (val !== '') {
                    handleRewardChange('referralRewardCoins', parseInt(val, 10));
                  }
                }}
                onBlur={() => {
                  const num = parseInt(referrerCoinsStr, 10);
                  const valid = isNaN(num) ? 10 : num;
                  setReferrerCoinsStr(String(valid));
                  handleRewardChange('referralRewardCoins', valid);
                }}
                placeholder="10"
                className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl px-3 py-2 text-sm text-amber-400 font-mono font-bold focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-500">Coins / friend</span>
            </div>
            <p className="text-[10px] text-slate-500">Default: 10 Coins. Bhejne wale dost ko milenge.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">New User Welcome Bonus (Receiver)</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={welcomeCoinsStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setWelcomeCoinsStr(val);
                  if (val !== '') {
                    handleRewardChange('googleWelcomeBonusCoins', parseInt(val, 10));
                  }
                }}
                onBlur={() => {
                  const num = parseInt(welcomeCoinsStr, 10);
                  const valid = isNaN(num) ? 0 : num;
                  setWelcomeCoinsStr(String(valid));
                  handleRewardChange('googleWelcomeBonusCoins', valid);
                }}
                placeholder="10"
                className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl px-3 py-2 text-sm text-pink-400 font-mono font-bold focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-500">Coins</span>
            </div>
            <p className="text-[10px] text-slate-500">New user welcome bonus on first app open.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">App Download Link for Sharing</label>
            <div className="relative">
              <input
                type="url"
                value={config.pricing?.referralAppDownloadUrl || 'https://www.appcreator24.com/app4146352-inodq9'}
                onChange={(e) => handleRewardChange('referralAppDownloadUrl', e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none truncate pr-8"
              />
              <LinkIcon className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-3" />
            </div>
            <p className="text-[10px] text-slate-500">Append karega: ?ref=[MemberId]</p>
          </div>
        </div>
      </div>

      {/* Top Referrers Leaderboard */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Top Active Referrers Leaderboard</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{topReferrers.length} Active Promoters</span>
        </div>

        {topReferrers.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
            No referral activity recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-2 pl-2">Rank</th>
                  <th className="pb-2">User / Member ID</th>
                  <th className="pb-2">Referral Code</th>
                  <th className="pb-2 text-center">Successful Referrals</th>
                  <th className="pb-2 text-right">Coins Earned</th>
                  <th className="pb-2 text-right pr-2">Code Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {topReferrers.map((ref, idx) => (
                  <tr key={ref.memberId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 pl-2 font-mono font-bold text-slate-400">#{idx + 1}</td>
                    <td className="py-2.5">
                      <span className="font-bold text-white block">{ref.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">#{ref.memberId}</span>
                    </td>
                    <td className="py-2.5 font-mono font-bold text-amber-300">{ref.referralCode}</td>
                    <td className="py-2.5 text-center font-mono font-black text-white">{ref.referralsCount} users</td>
                    <td className="py-2.5 text-right font-mono font-black text-amber-400">+{ref.coinsEarned}</td>
                    <td className="py-2.5 text-right pr-2">
                      <button
                        onClick={() => handleToggleCode(ref.referralCode, ref.isActive)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                          ref.isActive 
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-500/40' 
                            : 'bg-rose-950/60 text-rose-300 border-rose-500/40 hover:bg-emerald-950/60 hover:text-emerald-300'
                        }`}
                      >
                        {ref.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Referral Records & Anti-Fraud Log */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Referral Transactions & Anti-Fraud Ledger</span>
            </h3>
            <p className="text-xs text-slate-400">Live immutable logs with device fingerprint & velocity checks.</p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by ID / Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none font-bold"
            >
              <option value="ALL">All Status</option>
              <option value="REWARDED">Rewarded (Verified)</option>
              <option value="REVIEW">In Review (Flagged)</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {filteredReferrals.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
            No referral records found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-2 pl-2">Record ID</th>
                  <th className="pb-2">Referrer</th>
                  <th className="pb-2">New User</th>
                  <th className="pb-2">Code</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Fraud Check</th>
                  <th className="pb-2">Rewards</th>
                  <th className="pb-2 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredReferrals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 pl-2 font-mono text-[10px] text-slate-400">
                      {item.id}
                      <span className="block text-[9px] text-slate-600">
                        {new Date(item.createdAt || Date.now()).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="font-mono font-bold text-amber-300">#{item.referrerUid}</span>
                    </td>
                    <td className="py-2.5">
                      <span className="font-mono font-bold text-pink-300">#{item.referredUid}</span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-300">{item.referralCode}</td>
                    <td className="py-2.5">
                      {item.status === 'REWARDED' ? (
                        <span className="bg-emerald-950/80 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/40">
                          Rewarded
                        </span>
                      ) : item.status === 'REVIEW' ? (
                        <span className="bg-amber-950/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/40 animate-pulse">
                          Under Review
                        </span>
                      ) : (
                        <span className="bg-rose-950/80 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/40">
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {item.fraudStatus === 'CLEAN' ? (
                        <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Clean
                        </span>
                      ) : item.fraudStatus === 'SUSPICIOUS' ? (
                        <span className="text-amber-400 text-[10px] flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3 h-3" /> Rapid rate
                        </span>
                      ) : (
                        <span className="text-rose-400 text-[10px] flex items-center gap-1 font-bold">
                          <XCircle className="w-3 h-3" /> {item.fraudStatus}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 font-mono text-[11px]">
                      <span className="text-amber-400 font-bold">+{item.rewardCoinsReferrer || 10}</span>
                      <span className="text-slate-500"> / </span>
                      <span className="text-pink-400 font-bold">+{item.rewardCoinsReferred || 50}</span>
                    </td>
                    <td className="py-2.5 text-right pr-2">
                      {item.status === 'REVIEW' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setReviewingItem(item);
                              setReviewAction('APPROVE');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2 py-1 rounded transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setReviewingItem(item);
                              setReviewAction('REJECT');
                            }}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] px-2 py-1 rounded transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Action Modal */}
      {reviewingItem && reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              {reviewAction === 'APPROVE' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Ban className="w-5 h-5 text-rose-400" />
              )}
              <span>{reviewAction === 'APPROVE' ? 'Approve & Disburse Coins' : 'Reject Suspicious Referral'}</span>
            </h3>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Referral ID:</span>
                <span className="font-mono text-white">{reviewingItem.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Referrer:</span>
                <span className="font-mono text-amber-400">Member #{reviewingItem.referrerUid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Referred:</span>
                <span className="font-mono text-pink-400">Member #{reviewingItem.referredUid}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Admin Note (Optional)</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Reason for approval or rejection..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setReviewingItem(null);
                  setReviewAction(null);
                  setAdminNote('');
                }}
                disabled={processingAction}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewSubmit}
                disabled={processingAction}
                className={`text-xs font-black px-4 py-2 rounded-xl text-white transition-all shadow-md ${
                  reviewAction === 'APPROVE' 
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40' 
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                }`}
              >
                {processingAction ? 'Processing...' : reviewAction === 'APPROVE' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
