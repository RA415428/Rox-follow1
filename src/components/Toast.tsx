import React, { useEffect } from 'react';
import { Info, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'info' | 'success' | 'warning';
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onDismiss }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  if (!message) return null;

  const icons = {
    info: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-slate-900/95 border border-slate-800 text-slate-100 text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-slide-down">
      <div className="flex items-center gap-2">
        {icons[type]}
        <span>{message}</span>
      </div>
      <button onClick={onDismiss} className="text-slate-400 hover:text-white p-0.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
