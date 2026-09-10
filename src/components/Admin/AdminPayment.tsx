import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, XCircle, Clock, ShieldCheck, RefreshCw, AlertCircle, Sparkles, Copy, Check, Search, Filter, QrCode, Upload, Image as ImageIcon, Trash2, Eye } from 'lucide-react';
import { AdminConfig, PaymentRequest, PaymentSettings } from '../../types';
import { actionPaymentRequest, fetchPaymentRequests, subscribeToPaymentRequests } from '../../utils/storage';

interface AdminPaymentProps {
  config: AdminConfig;
  onUpdateConfig: (newConfig: AdminConfig) => void;
  onRefreshUsers?: () => void;
}

export const AdminPayment: React.FC<AdminPaymentProps> = ({
  config,
  onUpdateConfig,
  onRefreshUsers
}) => {
  const currentPaymentSettings: PaymentSettings = config.paymentSettings || {
    enabled: true,
    merchantUpiId: 'roxyefollow@upi',
    merchantName: 'Roxyefollow SMM',
    qrCodeUrl: '',
    autoApproveUtr: false,
    instructionText: 'PhonePe, Paytm, Google Pay ya QR Code dwara payment karein. Uske baad 12-Digit UTR Number daalkar Submit karein.'
  };

  const [paymentConfig, setPaymentConfig] = useState<PaymentSettings>(currentPaymentSettings);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    const data = await fetchPaymentRequests();
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
    const unsub = subscribeToPaymentRequests((data) => {
      setRequests(data);
    });
    return () => unsub();
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...config,
      paymentSettings: paymentConfig,
      lastUpdated: Date.now()
    };
    onUpdateConfig(updated);
    setSavedMsg('Payment settings saved successfully!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoadingId(requestId);
    const res = await actionPaymentRequest(requestId, action);
    setActionLoadingId(null);
    if (res.success) {
      loadRequests();
      if (onRefreshUsers) onRefreshUsers();
    } else {
      alert(res.message);
    }
  };

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('File size too large. Please select an image under 3MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        if (base64Url) {
          setPaymentConfig({ ...paymentConfig, qrCodeUrl: base64Url });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesFilter = filterStatus === 'ALL' || r.status === filterStatus;
    const matchesQuery = !searchQuery || 
      r.userMemberId.includes(searchQuery) || 
      r.utrNumber.includes(searchQuery) ||
      (r.userName && r.userName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesQuery;
  });

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/90 via-slate-900 to-indigo-950 border border-purple-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <span className="bg-purple-500/20 text-purple-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-purple-500/30 uppercase tracking-wider">
                PAYMENT GATEWAY MANAGER
              </span>
              <h2 className="text-xl font-black text-white mt-1">UPI & QR Payment Integration</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Manage PhonePe, Paytm, Google Pay, BHIM UPI ID & Review UTR Payment Claims
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadRequests}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
              <span>Refresh Claims</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin UPI Gateway Settings Card */}
      <form onSubmit={handleSaveConfig} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Merchant UPI Gateway Configuration</span>
          </h3>
          {savedMsg && (
            <span className="text-xs font-bold text-emerald-400 animate-pulse">{savedMsg}</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Merchant UPI ID (Where money will be received):
            </label>
            <input
              type="text"
              value={paymentConfig.merchantUpiId}
              onChange={(e) => setPaymentConfig({ ...paymentConfig, merchantUpiId: e.target.value })}
              placeholder="e.g. roxyefollow@upi or 9876543210@ybl"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">PhonePe, Paytm, Google Pay or Bank UPI ID.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Payee / Business Name (Shown in Payment Apps):
            </label>
            <input
              type="text"
              value={paymentConfig.merchantName}
              onChange={(e) => setPaymentConfig({ ...paymentConfig, merchantName: e.target.value })}
              placeholder="e.g. Roxyefollow SMM"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-purple-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">Display name shown when user pays.</p>
          </div>

          <div className="md:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>QR Code Management (Upload or Change QR)</span>
              </label>
              {paymentConfig.qrCodeUrl ? (
                <button
                  type="button"
                  onClick={() => setPaymentConfig({ ...paymentConfig, qrCodeUrl: '' })}
                  className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset to Auto-Generated QR</span>
                </button>
              ) : (
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  ⚡ Using Dynamic Auto UPI QR
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {/* QR Image File Upload */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Upload QR Code Image (Phone / Gallery / PC):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="cursor-pointer bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl inline-flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 shrink-0">
                    <Upload className="w-4 h-4" />
                    <span>Upload QR Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrFileUpload}
                      className="hidden"
                    />
                  </label>

                  <input
                    type="text"
                    value={paymentConfig.qrCodeUrl || ''}
                    onChange={(e) => setPaymentConfig({ ...paymentConfig, qrCodeUrl: e.target.value })}
                    placeholder="Or paste QR Image URL (e.g. https://i.imgur.com/...)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Aap PhonePe/Paytm se download kiya hua QR code photo upload kar sakte hain ya link daal sakte hain.
                </p>
              </div>

              {/* QR Code Live Preview */}
              <div className="text-center sm:border-l sm:border-slate-800 sm:pl-4">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">
                  Live QR Preview (Users view)
                </span>
                <div className="bg-white p-2 rounded-xl inline-block border-2 border-amber-400 shadow-md">
                  <img
                    src={
                      paymentConfig.qrCodeUrl && paymentConfig.qrCodeUrl.trim() !== ''
                        ? paymentConfig.qrCodeUrl
                        : `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${paymentConfig.merchantUpiId}&pn=${paymentConfig.merchantName}&am=49`)}`
                    }
                    alt="Admin QR Preview"
                    className="w-24 h-24 object-contain mx-auto"
                    onError={(e) => {
                      // Fallback preview if image link breaks
                      (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${paymentConfig.merchantUpiId}`)}`;
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Auto-Approve UTR Submissions:
            </label>
            <div className="flex items-center gap-3 pt-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox"
                  checked={paymentConfig.autoApproveUtr || false}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, autoApproveUtr: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
              <span className="text-xs font-semibold text-slate-300">
                {paymentConfig.autoApproveUtr ? '⚡ Auto Instant Coin Credit' : '🛡️ Manual Admin Verification'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">ON karne par UTR submit hote hi user ko coins mil jayenge.</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
          >
            Save Gateway Settings
          </button>
        </div>
      </form>

      {/* UTR Payment Claims Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-white">Submitted Payment UTR Claims</h3>
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
                {pendingCount} PENDING
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Member ID / UTR..."
                className="bg-slate-950 border border-slate-800 text-white text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-500 w-44"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${
                    filterStatus === st 
                      ? 'bg-purple-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests Table */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8 text-slate-500 space-y-2">
            <CreditCard className="w-8 h-8 mx-auto text-slate-700" />
            <p className="text-xs font-semibold">Koi payment UTR claim nahi mila.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Date & App</th>
                  <th className="py-2.5 px-3">User Member ID</th>
                  <th className="py-2.5 px-3">UTR / Ref Number</th>
                  <th className="py-2.5 px-3">Package & Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white text-xs">{req.createdAt}</div>
                      <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-wider">
                        {req.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-extrabold text-amber-300 font-mono text-xs">
                        #{req.userMemberId}
                      </div>
                      <span className="text-[10px] text-slate-400">{req.userName}</span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-black text-xs text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {req.utrNumber}
                        </span>
                        <button
                          onClick={() => handleCopyUtr(req.utrNumber)}
                          className="text-slate-500 hover:text-slate-300 p-1"
                          title="Copy UTR"
                        >
                          {copiedUtr === req.utrNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-white text-xs">{req.amountINR}</div>
                      <div className="text-[10px] text-amber-400 font-bold">+{req.coins} Coins</div>
                    </td>

                    <td className="py-3 px-3">
                      {req.status === 'APPROVED' && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> APPROVED
                        </span>
                      )}
                      {req.status === 'PENDING' && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-400" /> PENDING
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-400" /> REJECTED
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right space-x-1.5">
                      {req.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => handleAction(req.id, 'APPROVE')}
                            disabled={actionLoadingId === req.id}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-extrabold shadow transition-colors active:scale-95 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(req.id, 'REJECT')}
                            disabled={actionLoadingId === req.id}
                            className="bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-extrabold shadow transition-colors active:scale-95 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Action Complete</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
