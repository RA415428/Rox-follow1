import React from 'react';
import { CheckCircle2, Sparkles, Clock, ArrowRight, X, ExternalLink } from 'lucide-react';
import { Order } from '../types';
import { openExternalAdLink } from '../utils/openAdLink';

interface OrderSuccessModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onGoToOrders: () => void;
  smartlinkUrl?: string;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  isOpen,
  onClose,
  onGoToOrders,
  smartlinkUrl
}) => {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h3 className="text-xl font-extrabold text-white mb-1">
          Order Placed Successfully!
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Your order has been queued and is now being processed by our automated server.
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-left text-xs space-y-2 mb-5">
          <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-slate-400">Order ID:</span>
            <span className="font-mono font-bold text-amber-400">{order.id}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-slate-400">Service:</span>
            <span className="font-semibold text-white">{order.serviceType}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-slate-400">Quantity:</span>
            <span className="font-extrabold text-pink-400">{order.quantity.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-slate-400">Coins Deducted:</span>
            <span className="font-mono font-bold text-amber-300">{order.coinsSpent} Coins</span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-slate-400">Initial Status:</span>
            <span className="bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              IN PROGRESS
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {smartlinkUrl && (
            <button
              onClick={() => {
                openExternalAdLink(smartlinkUrl);
              }}
              className="w-full bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 hover:opacity-95 text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 active:opacity-80 transition-opacity"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>🎁 Claim Special Sponsor Deal</span>
              <ExternalLink className="w-3 h-3 text-white/80" />
            </button>
          )}
          <button
            onClick={onGoToOrders}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 active:opacity-80 transition-opacity"
          >
            Track Order Status <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-all"
          >
            Create Another Order
          </button>
        </div>
      </div>
    </div>
  );
};
