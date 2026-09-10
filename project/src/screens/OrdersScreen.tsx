import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Loader2, ExternalLink, Search, RefreshCw, ShoppingBag, CreditCard, XCircle, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';
import { Order, OrderStatus, PaymentRequest, UserWallet, AdminConfig } from '../types';
import { ServiceIcon } from '../components/ServiceIcon';
import { AdBanner } from '../components/AdBanner';
import { formatCoins } from '../utils/format';
import { fetchPaymentRequests, subscribeToPaymentRequests } from '../utils/storage';

interface OrdersScreenProps {
  orders: Order[];
  onShowToast: (msg: string) => void;
  onGoToOrderForm: () => void;
  wallet?: UserWallet;
  adminConfig?: AdminConfig;
  onOpenAdModal?: () => void;
  onRewardClaim?: (coins: number, isVideoAd?: boolean) => void;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  orders,
  onShowToast,
  onGoToOrderForm,
  wallet,
  adminConfig,
  onOpenAdModal,
  onRewardClaim,
}) => {
  const [activeMode, setActiveMode] = useState<'ORDERS' | 'PAYMENTS'>('ORDERS');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const currentMemberId = wallet?.memberId || '100001';

  // Load and Subscribe to Real-Time Payment Requests
  const loadPayments = async () => {
    setLoadingPayments(true);
    const data = await fetchPaymentRequests();
    const userReqs = data.filter((r) => r.userMemberId === currentMemberId);
    setPaymentRequests(userReqs);
    setLoadingPayments(false);
  };

  useEffect(() => {
    loadPayments();
    const unsub = subscribeToPaymentRequests((allReqs) => {
      const userReqs = allReqs.filter((r) => r.userMemberId === currentMemberId);
      setPaymentRequests(userReqs);
    });
    return () => unsub();
  }, [currentMemberId]);

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // Filtered Lists
  const filteredOrders = orders.filter((ord) => {
    // Only show orders belonging to this user (unless admin)
    const isMyOrder = 
      !wallet ||
      wallet.isAdmin ||
      wallet.isOwner ||
      ord.userMemberId === currentMemberId ||
      (wallet.authUid && (ord as any).authUid === wallet.authUid) ||
      (wallet.email && ord.userEmail && ord.userEmail.toLowerCase() === wallet.email.toLowerCase());
    if (!isMyOrder) return false;

    const matchesFilter = filterStatus === 'ALL' || ord.status === filterStatus;
    const matchesSearch =
      ord.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.targetUrl.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredPayments = paymentRequests.filter((pay) => {
    const matchesFilter = filterStatus === 'ALL' || pay.status === filterStatus;
    const matchesSearch =
      pay.utrNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pay.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pay.amountINR.toString().includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const pendingPaymentsCount = paymentRequests.filter((p) => p.status === 'PENDING').length;

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> COMPLETED
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> IN PROGRESS
          </span>
        );
      default:
        return (
          <span className="bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
            <Clock className="w-3 h-3" /> PROCESSING
          </span>
        );
    }
  };

  return (
    <div className="space-y-2.5 pb-20 pt-1 px-3 max-w-md mx-auto">
      {/* Top Title Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-pink-400" />
            History & Status Tracking
          </h2>
          <p className="text-[10.5px] text-slate-400">Track Boosts & Coin Payment Claims</p>
        </div>
        <button
          onClick={() => {
            loadPayments();
            onShowToast('Synced live status from server');
          }}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1"
          title="Refresh Statuses"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingPayments ? 'animate-spin text-purple-400' : ''}`} />
        </button>
      </div>

      {/* Main Mode Toggle: SMM Orders vs Coin Payment Top-Ups */}
      <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => {
            setActiveMode('ORDERS');
            setFilterStatus('ALL');
          }}
          className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1 ${
            activeMode === 'ORDERS'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-3 h-3" />
          <span>SMM Boost Orders</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMode('PAYMENTS');
            setFilterStatus('ALL');
          }}
          className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1 relative ${
            activeMode === 'PAYMENTS'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-3 h-3" />
          <span>Coin Top-Up Claims</span>
          {pendingPaymentsCount > 0 && (
            <span className="bg-red-500 text-white text-[8px] font-black px-1 rounded-full animate-bounce">
              {pendingPaymentsCount}
            </span>
          )}
        </button>
      </div>

      {/* Search & Filter Pills */}
      <div className="space-y-1.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeMode === 'ORDERS' ? "Search order ID or service..." : "Search UTR or payment app..."}
            className="w-full bg-slate-900 border border-slate-800 focus:border-pink-500 text-slate-100 text-[11px] rounded-lg pl-8 pr-3 py-1.5 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {activeMode === 'ORDERS' ? (
            ['ALL', 'IN_PROGRESS', 'COMPLETED', 'PROCESSING'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all shrink-0 font-mono ${
                  filterStatus === st
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))
          ) : (
            ['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all shrink-0 font-mono ${
                  filterStatus === st
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Clean Sponsored Horizontal Banner Ad with Click & Earn Coins */}
      <AdBanner
        id="history_horizontal_banner"
        smartlinkUrl={adminConfig?.ads?.directSmartlinkUrl || "https://doubtfulimpatient.com/bhetpw4me?key=b10856b9df41e998764e3e76a118f915"}
        rewardCoins={adminConfig?.ads?.coinsPerBannerClick ?? 5}
        onRewardClaim={(c) => onRewardClaim && onRewardClaim(c, false)}
      />

      {/* CONTENT VIEW 1: SMM Orders List */}
      {activeMode === 'ORDERS' && (
        filteredOrders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-2">
            <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-semibold">No boost orders found in this filter.</p>
            <button
              onClick={onGoToOrderForm}
              className="bg-pink-500 hover:bg-pink-400 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
            >
              Create Boost Order
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((ord, idx) => (
              <div
                key={`${ord.id}-${idx}`}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 shadow-md relative"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="font-mono text-xs font-extrabold text-amber-400">{ord.id}</span>
                  {getStatusBadge(ord.status)}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <ServiceIcon serviceType={ord.serviceType} serviceId={ord.serviceId} size="sm" />
                    <p className="text-xs font-bold text-white">{ord.serviceType}</p>
                  </div>
                  <a
                    href={ord.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-slate-400 hover:text-pink-400 flex items-center gap-1 truncate max-w-[280px] pl-6"
                  >
                    <span className="truncate">{ord.targetUrl}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono border-t border-slate-800/60">
                  <span>Qty: <strong className="text-white font-sans">{ord.quantity.toLocaleString()}</strong></span>
                  <span>Coins: <strong className="text-amber-300 font-sans">{formatCoins(ord.coinsSpent)}</strong></span>
                  <span>{ord.dateFormatted}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* CONTENT VIEW 2: Coin Top-Up Payment Claims List */}
      {activeMode === 'PAYMENTS' && (
        filteredPayments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-2">
            <CreditCard className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-semibold">Koi payment claim nahi mila.</p>
            <p className="text-[10.5px] text-slate-500">
              PhonePe, Paytm ya GPay dwara coin khareedne ke baad yahan aapki claim history dikhegi.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPayments.map((pay) => (
              <div
                key={pay.id}
                className={`bg-slate-900 border rounded-xl p-3 space-y-2 shadow-md transition-all ${
                  pay.status === 'APPROVED'
                    ? 'border-emerald-500/40 bg-slate-900'
                    : pay.status === 'REJECTED'
                    ? 'border-red-500/40 bg-slate-900'
                    : 'border-amber-500/40 bg-slate-900'
                }`}
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-white uppercase tracking-wider bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/30">
                      {pay.paymentMethod}
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-semibold">{pay.createdAt}</span>
                  </div>

                  {pay.status === 'APPROVED' && (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[9px] font-extrabold flex items-center gap-0.5 shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> APPROVED
                    </span>
                  )}

                  {pay.status === 'PENDING' && (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[9px] font-extrabold flex items-center gap-0.5 animate-pulse shadow-sm">
                      <Clock className="w-3 h-3 text-amber-400" /> PENDING
                    </span>
                  )}

                  {pay.status === 'REJECTED' && (
                    <span className="bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full text-[9px] font-extrabold flex items-center gap-0.5 shadow-sm">
                      <XCircle className="w-3 h-3 text-red-400" /> REJECTED
                    </span>
                  )}
                </div>

                {/* Body Details */}
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-semibold">Coins Package</span>
                    <span className="font-extrabold text-amber-400 text-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> +{pay.coins} Coins
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 block font-semibold">Amount Paid</span>
                    <span className="font-black text-white font-mono text-xs">{pay.amountINR}</span>
                  </div>
                </div>

                {/* UTR Reference Box */}
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[8.5px] text-slate-500 font-bold uppercase block">Submitted UTR Reference No:</span>
                    <span className="font-mono font-black text-[11px] text-slate-200">{pay.utrNumber}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyUtr(pay.utrNumber)}
                    className="text-slate-400 hover:text-white text-xs p-1 flex items-center gap-1"
                  >
                    {copiedUtr === pay.utrNumber ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Explanation Banner according to Status */}
                {pay.status === 'APPROVED' && (
                  <div className="p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-[10px] text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>🎉 Payment Approved! <strong>+{pay.coins} Coins</strong> credited to wallet!</span>
                  </div>
                )}

                {pay.status === 'PENDING' && (
                  <div className="p-2 bg-amber-950/40 border border-amber-500/30 rounded-lg text-[10px] text-amber-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>⏳ Admin verifying UTR. Coins will be credited shortly.</span>
                  </div>
                )}

                {pay.status === 'REJECTED' && (
                  <div className="p-2 bg-red-950/40 border border-red-500/30 rounded-lg text-[10px] text-red-200 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>❌ UTR invalid or payment not received. Contact Admin Support.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

