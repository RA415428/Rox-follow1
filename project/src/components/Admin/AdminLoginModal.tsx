import React, { useState } from 'react';
import { Shield, Key, ArrowRight, X, AlertCircle } from 'lucide-react';
import { APP_LOGO_SRC } from '../../assets/appLogoBase64';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPassword: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  correctPassword
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === correctPassword) {
      setErrorMsg('');
      setPasswordInput('');
      onSuccess();
    } else {
      setErrorMsg('Invalid password! Please enter correct admin password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25 mb-3 border border-purple-400/30 overflow-hidden p-0.5">
            <img
              src={APP_LOGO_SRC}
              alt="ROX ADMIN Logo"
              className="w-full h-full object-cover rounded-[14px]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/app_logo.png';
              }}
            />
          </div>
          <h2 className="text-xl font-black text-white mb-1 tracking-wide bg-gradient-to-r from-white via-pink-200 to-purple-300 bg-clip-text text-transparent">
            ROX ADMIN
          </h2>
          <p className="text-xs text-slate-400">
            Enter admin password to access the app control center & SMM settings
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" /> Password
            </label>
            <input
              type="password"
              placeholder="Enter admin password..."
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setErrorMsg('');
              }}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
              autoFocus
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:opacity-95 text-white font-bold text-sm rounded-xl shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <span>Unlock Admin Panel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
