import React, { useState, useEffect } from 'react';
import { CreditCard, X, Sparkles, ShieldCheck, Copy, Check, ArrowRight, QrCode, CheckCircle2, AlertCircle, Smartphone, ExternalLink, RefreshCw, Clock } from 'lucide-react';
import { AdminConfig, CoinPackage, UserWallet } from '../types';
import { submitPaymentRequest } from '../utils/storage';
import { copyToClipboard } from '../utils/clipboard';

interface PaymentModalProps {
  pkg: CoinPackage | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (coins: number) => void;
  config?: AdminConfig;
  userWallet?: UserWallet;
}

const playStoreAppDetails = {
  PHONEPE: { name: 'PhonePe', pkg: 'com.phonepe.app', marketUrl: 'market://details?id=com.phonepe.app', url: 'https://play.google.com/store/apps/details?id=com.phonepe.app' },
  PAYTM: { name: 'Paytm', pkg: 'com.one97.paytm', marketUrl: 'market://details?id=com.one97.paytm', url: 'https://play.google.com/store/apps/details?id=com.one97.paytm' },
  GPAY: { name: 'Google Pay', pkg: 'com.google.android.apps.nbu.paisa.user', marketUrl: 'market://details?id=com.google.android.apps.nbu.paisa.user', url: 'https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user' }
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  pkg,
  isOpen,
  onClose,
  onPaymentSuccess,
  config,
  userWallet
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'PHONEPE' | 'PAYTM' | 'GPAY' | 'UPI_QR'>('UPI_QR');
  const [utrNumber, setUtrNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 5-Minute QR Code Timer (300 seconds)
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number>(300);

  useEffect(() => {
    if (isOpen) {
      setUtrNumber('');
      setStatusMsg(null);
      setIsSubmitting(false);
      setQrSecondsLeft(300); // Reset timer on modal open
    }
  }, [isOpen, pkg]);

  // QR Timer Countdown Effect
  useEffect(() => {
    if (!isOpen || selectedMethod !== 'UPI_QR') return;

    if (qrSecondsLeft <= 0) return;

    const timer = setInterval(() => {
      setQrSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, selectedMethod, qrSecondsLeft]);

  if (!isOpen || !pkg) return null;

  const paymentSettings = config?.paymentSettings || {
    enabled: true,
    merchantUpiId: 'roxyefollow@upi',
    merchantName: 'Roxyefollow SMM',
    qrCodeUrl: '',
    autoApproveUtr: false,
    instructionText: 'PhonePe, Paytm, Google Pay ya QR Code dwara payment karein. Uske baad 12-Digit UTR Number daalkar Submit karein.'
  };

  const merchantUpiId = paymentSettings.merchantUpiId || 'roxyefollow@upi';
  const merchantName = paymentSettings.merchantName || 'Roxyefollow SMM';
  const amountNum = pkg.priceNum || parseInt(pkg.priceINR.replace(/[^0-9]/g, '')) || 49;
  const userMemberId = userWallet?.memberId || '100001';

  // Build standard UPI Pay URI string with timestamp to make QR unique per session
  const upiPayString = `upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=${encodeURIComponent(merchantName)}&am=${amountNum}&cu=INR&tn=${encodeURIComponent(`Buy_${pkg.coins}_Coins_Member_${userMemberId}`)}`;

  // QR Code Image URL (Auto-generated or custom from admin)
  const qrImageUrl = paymentSettings.qrCodeUrl && paymentSettings.qrCodeUrl.trim() !== ''
    ? paymentSettings.qrCodeUrl
    : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiPayString)}`;

  const handleCopyUpi = async () => {
    await copyToClipboard(merchantUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleLaunchUpiApp = (method: 'PHONEPE' | 'PAYTM' | 'GPAY' | 'ALL') => {
    setSelectedMethod(method === 'ALL' ? 'PHONEPE' : method);
    
    const note = encodeURIComponent(`Buy_${pkg.coins}_Coins_User_${userMemberId}`);
    const encodedUpiId = encodeURIComponent(merchantUpiId);
    const encodedName = encodeURIComponent(merchantName);

    // Auto copy UPI ID to clipboard so user can paste in PhonePe/Paytm safely
    copyToClipboard(merchantUpiId).then(() => {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 4000);
    }).catch(() => {});

    // Standard NPCI UPI URI
    const upiUri = `upi://pay?pa=${encodedUpiId}&pn=${encodedName}&am=${amountNum}&cu=INR&tn=${note}`;

    let targetUri = upiUri;
    if (method === 'PHONEPE') {
      targetUri = `phonepe://pay?pa=${encodedUpiId}&pn=${encodedName}&am=${amountNum}&cu=INR&tn=${note}`;
    } else if (method === 'PAYTM') {
      targetUri = `paytmmp://pay?pa=${encodedUpiId}&pn=${encodedName}&am=${amountNum}&cu=INR&tn=${note}`;
    } else if (method === 'GPAY') {
      targetUri = `gpay://upi/pay?pa=${encodedUpiId}&pn=${encodedName}&am=${amountNum}&cu=INR&tn=${note}`;
    }

    // Inform user that UPI ID is copied in case WebView blocks scheme
    setStatusMsg({
      type: 'success',
      text: `📋 UPI ID (${merchantUpiId}) Copied! If PhonePe/Paytm doesn't open automatically, paste this UPI ID in your app or scan the QR Code below.`
    });

    // Try opening via anchor element to let Android OS / AppCreator24 handle scheme
    try {
      const link = document.createElement('a');
      link.href = targetUri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      // WebView blocked scheme
    }
  };

  const handleRegenerateQr = () => {
    setQrSecondsLeft(300);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length < 8) {
      setStatusMsg({ type: 'error', text: 'Kripya sahi 12-Digit UTR / Transaction Ref Number daalein.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    const res = await submitPaymentRequest({
      userMemberId,
      userName: `User #${userMemberId}`,
      packageId: pkg.id,
      coins: pkg.coins,
      amountINR: pkg.priceINR,
      utrNumber: cleanUtr,
      paymentMethod: selectedMethod
    });

    setIsSubmitting(false);

    if (res.success) {
      if (res.autoApproved) {
        setStatusMsg({ type: 'success', text: `🎉 Payment Successful! +${pkg.coins} Coins credited!` });
        setTimeout(() => {
          onPaymentSuccess(pkg.coins);
          onClose();
        }, 1500);
      } else {
        setStatusMsg({ 
          type: 'success', 
          text: `✅ UTR Claim Submitted! Admin will verify UTR #${cleanUtr} & credit +${pkg.coins} Coins within 5 minutes.` 
        });
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } else {
      setStatusMsg({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-md select-none overflow-y-auto overscroll-contain">
      <div 
        className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-[350px] mx-auto p-4 shadow-2xl relative my-auto space-y-2.5 overflow-hidden"
        style={{
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)'
        }}
      >
        {/* Glow accent */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Selected Package Header - Compact */}
        <div className="bg-gradient-to-r from-purple-950/80 via-slate-950 to-indigo-950 border border-purple-500/30 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md font-black shrink-0">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="text-[9px] text-amber-400 font-extrabold uppercase tracking-wider block leading-tight">
                {pkg.isSubscription ? 'Monthly Subscription' : 'Package'}
              </span>
              <h3 className="text-xs font-black text-white">
                {pkg.coins} Coins {pkg.isSubscription ? '/ Month' : ''}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-slate-400 block font-semibold leading-tight">Amount</span>
            <span className="text-sm font-black text-amber-400 font-mono">{pkg.priceINR}</span>
          </div>
        </div>

        {/* QR Code Payment Method - Compact & Centered */}
        <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-3 text-center space-y-2 relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span>Scan QR to Pay ₹{amountNum}</span>
            </span>
            
            {/* 5-Minute Timer Badge */}
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-black border ${
              qrSecondsLeft > 60 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                : 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
            }`}>
              <Clock className="w-2.5 h-2.5" />
              <span>{qrSecondsLeft > 0 ? formatTimer(qrSecondsLeft) : 'EXPIRED'}</span>
            </div>
          </div>

          {/* QR Code Container with 5-Min Expiry Mask - Resized to compact 128px */}
          <div className="relative inline-block my-0.5">
            <div className={`bg-white p-2 rounded-xl shadow-lg border-2 border-amber-400/50 transition-all ${
              qrSecondsLeft <= 0 ? 'blur-md opacity-25 pointer-events-none' : ''
            }`}>
              <img 
                src={qrImageUrl} 
                alt="UPI QR Code" 
                className="w-32 h-32 max-w-[128px] max-h-[128px] mx-auto object-contain block" 
              />
            </div>

            {/* Expired Overlay */}
            {qrSecondsLeft <= 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 rounded-xl p-2 space-y-1 text-center border border-red-500/40">
                <AlertCircle className="w-5 h-5 text-red-400 mx-auto" />
                <p className="text-[10px] font-extrabold text-red-300 leading-tight">
                  QR Expired
                </p>
                <button
                  type="button"
                  onClick={handleRegenerateQr}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-[9px] font-black px-2.5 py-1 rounded-md shadow flex items-center gap-1 mx-auto active:scale-95 transition-all"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Regenerate</span>
                </button>
              </div>
            )}
          </div>

          {/* Compact UPI ID Row */}
          <div className="flex items-center justify-between text-[10px] bg-slate-900/90 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 font-medium">UPI:</span>
            <span className="font-mono font-bold text-amber-300 text-[11px] truncate max-w-[140px]">{merchantUpiId}</span>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="text-purple-400 hover:text-purple-300 font-bold text-[10px] flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 rounded border border-purple-500/20 shrink-0"
            >
              {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedUpi ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Small Hindi Guide on How to Pay via QR Code - Ultra Compact */}
        <div className="bg-gradient-to-r from-purple-950/40 via-slate-950 to-indigo-950/40 border border-purple-500/20 rounded-xl p-2 text-left space-y-1">
          <div className="flex items-center gap-1 text-amber-400 font-extrabold text-[10px] uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>पेमेंट गाइड (QR Guide):</span>
          </div>
          <p className="text-[10px] text-slate-300 font-medium leading-tight">
            1. QR Code का <strong className="text-white">Screenshot</strong> लें व <strong className="text-purple-300">PhonePe/Paytm/GPay</strong> से Scan करके ₹{amountNum} पे करें।
          </p>
          <p className="text-[10px] text-slate-300 font-medium leading-tight">
            2. पेमेंट के बाद मिला <strong className="text-amber-300">12-Digit UTR Number</strong> नीचे भरें।
          </p>
        </div>

        {/* Step 2: Submit UTR Number Form */}
        <form onSubmit={handleSubmitUtr} className="space-y-2 pt-0.5">
          <div>
            <label className="text-[11px] font-black text-white flex items-center gap-1 mb-1">
              <span>Enter 12-Digit UTR Number</span>
              <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
              placeholder="e.g. 423819028371"
              required
              maxLength={16}
              className="w-full bg-slate-950 border border-purple-500/40 rounded-lg px-3 py-2 text-xs text-amber-300 font-mono font-bold placeholder:text-slate-600 focus:outline-none focus:border-purple-400 shadow-inner"
            />
          </div>

          {statusMsg && (
            <div className={`p-2 rounded-lg border text-[11px] flex items-start gap-1.5 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/70 border-red-500/40 text-red-200'
            }`}>
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              )}
              <span className="font-semibold leading-tight">{statusMsg.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !utrNumber.trim()}
            className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black py-2.5 rounded-xl shadow-md active:scale-[0.99] transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Submitting Claim...</span>
            ) : (
              <>
                <span>Submit UTR & Claim +{pkg.coins} Coins</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-1 text-[9px] text-slate-400 font-semibold pt-0.5">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>100% Secure Instant UPI Payment</span>
        </div>
      </div>
    </div>
  );
};

