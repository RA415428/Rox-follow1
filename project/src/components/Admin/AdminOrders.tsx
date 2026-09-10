import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RotateCcw, 
  Send, 
  FileText, 
  ExternalLink,
  Copy,
  Trash2,
  Sparkles,
  User
} from 'lucide-react';
import { AdminConfig, Order, OrderStatus } from '../../types';
import { submitOrderToSmmApi } from '../../utils/smmService';
import { fetchServerOrders, deleteOrderPermanently, updateOrderStatus } from '../../utils/storage';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface AdminOrdersProps {
  config: AdminConfig;
  orders: Order[];
  onUpdateOrders: (updatedOrders: Order[]) => void;
  onRefundUser: (coins: number) => void;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  config,
  orders,
  onUpdateOrders,
  onRefundUser
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<Order | null>(null);
  const [forwardingId, setForwardingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // AdminOrders receives orders via props from App.tsx (which is connected to real-time Firestore)
  // No duplicate polling or duplicate onSnapshot needed here to prevent update loops.

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const now = Date.now() + 10000; // Add timestamp buffer for instant UI priority
    // 1. Immediately update UI state
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status: newStatus, updatedAt: now } : o));
    onUpdateOrders(updated);
    showToast(`Order #${orderId} marked as ${newStatus}`);

    // 2. Persist to Firestore and Express Server
    await updateOrderStatus(orderId, newStatus);
  };

  const handleDeleteOrder = (orderId: string) => {
    deleteOrderPermanently(orderId);
    const updated = orders.filter((o) => o.id !== orderId);
    onUpdateOrders(updated);
    showToast(`Order ${orderId} deleted permanently.`);
  };

  const handleRefund = (order: Order) => {
    if (order.status === 'CANCELLED') {
      showToast('Order is already cancelled & refunded.');
      return;
    }
    const now = Date.now();
    onRefundUser(order.coinsSpent);
    updateOrderStatus(order.id, 'CANCELLED', 'Refunded by Admin');
    const updated = orders.map((o) => (o.id === order.id ? { ...o, status: 'CANCELLED' as OrderStatus, updatedAt: now } : o));
    onUpdateOrders(updated);
    showToast(`Refunded ${order.coinsSpent} coins to user and cancelled order #${order.id}`);
  };

  const handleForwardToSmm = async (order: Order) => {
    setForwardingId(order.id);
    const res = await submitOrderToSmmApi(order, config.smmApi);
    setForwardingId(null);

    if (res.success) {
      const updated = orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: 'IN_PROGRESS' as OrderStatus,
              smmOrderId: res.orderId,
              smmResponse: res.rawResponse
            }
          : o
      );
      onUpdateOrders(updated);
      showToast(`Order ${order.id} sent to SMM Panel! ID: ${res.orderId}`);
    } else {
      showToast(`SMM API Error: ${res.error}`);
    }
  };

  const handleForwardAllToSmm = async () => {
    const unForwarded = orders.filter((o) => !o.smmOrderId && o.status !== 'CANCELLED');
    if (unForwarded.length === 0) {
      showToast('No pending unforwarded orders found.');
      return;
    }
    showToast(`Forwarding ${unForwarded.length} orders to SMM Panel...`);
    let countSuccess = 0;
    let updatedList = [...orders];

    for (const ord of unForwarded) {
      setForwardingId(ord.id);
      const res = await submitOrderToSmmApi(ord, config.smmApi);
      if (res.success) {
        countSuccess++;
        updatedList = updatedList.map((o) =>
          o.id === ord.id
            ? {
                ...o,
                status: 'IN_PROGRESS' as OrderStatus,
                smmOrderId: res.orderId,
                smmResponse: res.rawResponse
              }
            : o
        );
      }
    }
    setForwardingId(null);
    onUpdateOrders(updatedList);
    showToast(`Successfully forwarded ${countSuccess}/${unForwarded.length} orders to SMM Panel!`);
  };

  const filteredOrders = orders.filter((ord) => {
    if (!ord) return false;
    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'PENDING'
        ? ord.status === 'PROCESSING' || ord.status === 'IN_PROGRESS' || (ord.status as string) === 'PENDING'
        : ord.status === filterStatus);
    const ordId = String(ord.id || '');
    const ordMemberId = String(ord.userMemberId || '');
    const ordTarget = String(ord.targetUrl || '');
    const ordService = String(ord.serviceType || '');
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      ordId.toLowerCase().includes(q) ||
      ordMemberId.toLowerCase().includes(q) ||
      ordTarget.toLowerCase().includes(q) ||
      ordService.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast */}
      {toastMsg && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-400" /> Real-time Orders Management
            </h2>
            <p className="text-xs text-slate-400">
              Manage all submitted user orders, view member IDs, update fulfillment status, refund coins, or forward to SMM Panel.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleForwardAllToSmm}
              disabled={!!forwardingId}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-90 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              title="Forward all pending orders to SMM Panel"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Forward All to SMM</span>
            </button>

            <span className="px-2.5 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold">
              Total: {orders.length}
            </span>
            <span className="px-2.5 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold">
              Pending: {orders.filter((o) => o.status === 'PROCESSING' || o.status === 'IN_PROGRESS' || (o.status as string) === 'PENDING').length}
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by Member ID (#100001), Order ID, Instagram link, or Service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending (Processing / In Progress)</option>
              <option value="PROCESSING">Processing</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No orders match the current search filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">User (Member ID)</th>
                  <th className="p-3.5">Order ID</th>
                  <th className="p-3.5">Service</th>
                  <th className="p-3.5">Target Link</th>
                  <th className="p-3.5">Qty</th>
                  <th className="p-3.5">Coins</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((ord, idx) => (
                  <tr key={`${ord.id}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    {/* User Member ID Column */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 bg-purple-500/15 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                          <User className="w-3.5 h-3.5 text-purple-400" />
                          #{ord.userMemberId || '100001'}
                        </span>
                      </div>
                    </td>

                    {/* Order ID Column */}
                    <td className="p-3.5 font-mono font-bold text-amber-400">
                      <div>{ord.id}</div>
                      {ord.smmOrderId && (
                        <div className="text-[10px] text-purple-400 font-normal mt-0.5">SMM: #{ord.smmOrderId}</div>
                      )}
                    </td>

                    {/* Service Type */}
                    <td className="p-3.5 font-semibold text-white">{ord.serviceType}</td>

                    {/* Target URL */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <a
                          href={ord.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-400 hover:underline flex items-center gap-1 max-w-[180px] truncate font-medium"
                        >
                          {ord.targetUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(ord.targetUrl);
                            showToast('Order Target Link Copied!');
                          }}
                          className="p-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 rounded-md transition-colors flex items-center gap-1 text-[10px] font-bold shrink-0"
                          title="Copy Link"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{ord.dateFormatted}</span>
                    </td>

                    {/* Quantity */}
                    <td className="p-3.5 font-bold text-white">{ord.quantity.toLocaleString()}</td>

                    {/* Coins */}
                    <td className="p-3.5 font-bold text-amber-400">{ord.coinsSpent}</td>

                    {/* Status */}
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          ord.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : ord.status === 'IN_PROGRESS'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : ord.status === 'CANCELLED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ord.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, 'COMPLETED')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded transition-colors"
                            title="Mark Completed"
                          >
                            Complete
                          </button>
                        )}

                        <button
                          onClick={() => handleForwardToSmm(ord)}
                          disabled={forwardingId === ord.id}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Forward to SMM API"
                        >
                          <Send className="w-3 h-3" />
                          {forwardingId === ord.id ? 'Sending...' : 'SMM API'}
                        </button>

                        {ord.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleRefund(ord)}
                            className="px-2 py-1 bg-slate-800 hover:bg-red-900/50 text-red-300 font-bold text-[10px] rounded transition-colors flex items-center gap-1"
                            title="Refund coins & cancel"
                          >
                            <RotateCcw className="w-3 h-3" /> Refund
                          </button>
                        )}

                        {ord.smmResponse && (
                          <button
                            onClick={() => setSelectedLog(ord)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] rounded transition-colors"
                            title="View Raw SMM API Log"
                          >
                            Log
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteOrder(ord.id)}
                          className="p-1 bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 font-bold text-[10px] rounded transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SMM API Response Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" /> SMM API Log - {selectedLog.id}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Member ID:</span>
              <span className="text-purple-400 font-bold">#{selectedLog.userMemberId || '100001'}</span>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60">
              {selectedLog.smmResponse}
            </pre>

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
