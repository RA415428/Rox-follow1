import React from 'react';
import { ShieldCheck, FileText, X } from 'lucide-react';

interface PrivacyTermsModalProps {
  type: 'PRIVACY' | 'TERMS' | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyTermsModal: React.FC<PrivacyTermsModalProps> = ({ type, isOpen, onClose }) => {
  if (!isOpen || !type) return null;

  const isPrivacy = type === 'PRIVACY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative max-h-[80vh] overflow-y-auto text-slate-300">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          {isPrivacy ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          ) : (
            <FileText className="w-5 h-5 text-indigo-400" />
          )}
          <h3 className="text-base font-bold text-white">
            {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
          </h3>
        </div>

        <div className="text-xs space-y-3 leading-relaxed text-slate-400">
          <p className="text-[11px] text-slate-500 font-mono">Last updated: July 2026</p>

          {isPrivacy ? (
            <>
              <p>
                <strong>1. Data Collection:</strong> Roxyefollow (https://roxyefollow.web.app/) only collects non-identifiable user member IDs (e.g., #62458) and order target links provided by you. We do NOT ask for passwords, full names, or personal contact numbers.
              </p>
              <p>
                <strong>2. Usage of Information:</strong> The target links provided are exclusively used to trigger automated engagement (followers, likes, views) to your public Instagram content.
              </p>
              <p>
                <strong>3. Advertising & Rewards:</strong> Watching rewarded video ads earns in-app virtual coins. Ad identifiers are handled by standard ad provider SDKs compliant with privacy policies.
              </p>
              <p>
                <strong>4. Security:</strong> All data transmissions are encrypted using standard 256-bit SSL protocol.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>1. Service Agreement:</strong> By using Roxyefollow, you agree that you are ordering promotional social media engagement for public profiles only.
              </p>
              <p>
                <strong>2. Virtual Coins:</strong> Coins are in-app reward credits earned via video ads or purchased through top-up options. Coins cannot be converted into cash or transferred between accounts.
              </p>
              <p>
                <strong>3. Order Execution:</strong> While most orders begin immediately, delivery speed may vary depending on platform updates and network load.
              </p>
              <p>
                <strong>4. Account Rules:</strong> Any attempt to exploit or manipulate virtual coin systems via automated bots will result in member ID suspension.
              </p>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs mt-5 transition-all"
        >
          I Understand & Agree
        </button>
      </div>
    </div>
  );
};
