import React from 'react';
import { HelpCircle, Mail, MessageCircle, ExternalLink, X, ChevronDown } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'How long does an order take to start?',
      a: 'Most Instagram orders start automatically within 2 to 15 minutes of placing. High volume orders may take up to 24 hours to complete naturally.'
    },
    {
      q: 'Are these engagement profiles real?',
      a: 'Yes, Roxyefollow uses real, active-looking accounts with profile pictures, posts, and bio descriptions to maintain healthy Instagram growth metrics.'
    },
    {
      q: 'How do I get free coins?',
      a: 'Go to the "Store" tab and click "Watch Video Ad (+10 Coins)". You can watch up to 12 rewarded video ads daily for free coins!'
    },
    {
      q: 'Will my account password be asked?',
      a: 'NEVER! Roxyefollow only requires your public Instagram post URL or username link. We will never ask for your account password or credentials.'
    }
  ];

  const whatsappNumber = '9301484735';
  const whatsappUrl = `https://api.whatsapp.com/send?phone=91${whatsappNumber}&text=Hello%20Roxyefollow%20Support%2C%20I%20need%20help%20with%20my%20account.`;
  const supportEmail = 'roxfollowsupport@gmail.com';

  const handleOpenWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    const a = document.createElement('a');
    a.href = whatsappUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">Help & Support Desk</h3>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Need help with your Roxyefollow coins or Instagram orders? Contact us on WhatsApp or Email below.
        </p>

        {/* FAQs */}
        <div className="space-y-2 mb-5">
          <p className="text-xs font-bold text-slate-300">Frequently Asked Questions</p>
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-3 text-xs font-semibold text-slate-200 flex items-center justify-between gap-2"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-pink-400' : ''}`} />
              </button>
              {openFaq === idx && (
                <div className="p-3 pt-0 text-[11px] text-slate-400 border-t border-slate-800/60 bg-slate-900/40">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact buttons */}
        <div className="space-y-2.5 pt-3 border-t border-slate-800">
          <button
            onClick={handleOpenWhatsApp}
            className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-black p-3.5 rounded-xl text-xs flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/40 transition-all active:scale-98"
          >
            <MessageCircle className="w-5 h-5 text-emerald-200" />
            <span>Chat with 24/7 WhatsApp Support</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>

          <a
            href={`mailto:${supportEmail}`}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold p-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all border border-slate-700/60"
          >
            <Mail className="w-4 h-4 text-pink-400" />
            <span>Email Support Desk</span>
          </a>
        </div>
      </div>
    </div>
  );
};
