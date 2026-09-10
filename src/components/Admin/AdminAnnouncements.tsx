import React, { useState } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  ShieldAlert, 
  Image as ImageIcon, 
  Sparkles,
  Send,
  Smartphone
} from 'lucide-react';
import { AdminConfig, AnnouncementSettings } from '../../types';
import { broadcastAdminNotification } from '../../utils/notifications';

interface AdminAnnouncementsProps {
  config: AdminConfig;
  onUpdateConfig: (newConfig: AdminConfig) => void;
}

export const AdminAnnouncements: React.FC<AdminAnnouncementsProps> = ({ config, onUpdateConfig }) => {
  const [announcementState, setAnnouncementState] = useState<AnnouncementSettings>(config.announcement);
  const [maintenanceState, setMaintenanceState] = useState<boolean>(config.maintenanceMode);
  const [bonusCoinsStr, setBonusCoinsStr] = useState<string>(
    config.announcement?.bonusCoins !== undefined ? String(config.announcement.bonusCoins) : '10'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pushSentSuccess, setPushSentSuccess] = useState(false);

  const prevAnnouncementRef = React.useRef<string>(JSON.stringify(config.announcement));

  React.useEffect(() => {
    const currentKey = JSON.stringify(config.announcement);
    if (currentKey !== prevAnnouncementRef.current) {
      prevAnnouncementRef.current = currentKey;
      setAnnouncementState(config.announcement);
      setBonusCoinsStr(
        config.announcement?.bonusCoins !== undefined ? String(config.announcement.bonusCoins) : '10'
      );
      setMaintenanceState(config.maintenanceMode);
    }
  }, [config.announcement, config.maintenanceMode]);

  const handleSave = () => {
    const parsedBonus = bonusCoinsStr.trim() === '' ? 0 : (parseInt(bonusCoinsStr, 10) || 0);
    const finalAnnouncement: AnnouncementSettings = {
      ...announcementState,
      bonusCoins: parsedBonus
    };

    onUpdateConfig({
      ...config,
      maintenanceMode: maintenanceState,
      announcement: finalAnnouncement,
      lastUpdated: Date.now()
    });

    prevAnnouncementRef.current = JSON.stringify(finalAnnouncement);
    setAnnouncementState(finalAnnouncement);
    setBonusCoinsStr(String(parsedBonus));

    if (finalAnnouncement.enabled && finalAnnouncement.title) {
      broadcastAdminNotification(
        finalAnnouncement.title,
        finalAnnouncement.message || 'Check out new announcement on Roxyefollow!',
        finalAnnouncement.bannerUrl
      );
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSendDirectPush = () => {
    if (!announcementState.title) return;
    broadcastAdminNotification(
      announcementState.title,
      announcementState.message || 'Notification from Admin',
      announcementState.bannerUrl
    );
    setPushSentSuccess(true);
    setTimeout(() => setPushSentSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-900/40 border border-blue-500/20 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" /> In-App Announcements & Maintenance Mode
          </h2>
          <p className="text-xs text-slate-300">
            Publish live banner popups and send device notifications to all app users.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-pink-500 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Save Announcement Settings
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Announcements & maintenance settings updated live!</span>
        </div>
      )}

      {/* Maintenance Mode Lock */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <ShieldAlert className="w-4 h-4 text-amber-400" /> Emergency Maintenance Mode
        </h3>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white">Enable Maintenance Lock</p>
            <p className="text-[11px] text-slate-400">
              When enabled, regular users see a maintenance screen. Admin panel stays accessible.
            </p>
          </div>

          <button
            onClick={() => setMaintenanceState(!maintenanceState)}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${
              maintenanceState ? 'bg-amber-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                maintenanceState ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* In-App Announcement Popup Settings */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" /> In-App Popup Banner Announcement
          </h3>

          <button
            onClick={() => setAnnouncementState({ ...announcementState, enabled: !announcementState.enabled })}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${
              announcementState.enabled ? 'bg-pink-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                announcementState.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Announcement Title</label>
            <input
              type="text"
              value={announcementState.title}
              onChange={(e) => setAnnouncementState({ ...announcementState, title: e.target.value })}
              placeholder="e.g. 🚀 Special Weekend Offer!"
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Message Description</label>
            <textarea
              rows={2}
              value={announcementState.message}
              onChange={(e) => setAnnouncementState({ ...announcementState, message: e.target.value })}
              placeholder="Enter message for app users..."
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-purple-400" /> Banner Image URL (Optional)
              </label>
              <input
                type="text"
                value={announcementState.bannerUrl}
                onChange={(e) => setAnnouncementState({ ...announcementState, bannerUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Button Text</label>
              <input
                type="text"
                value={announcementState.buttonText}
                onChange={(e) => setAnnouncementState({ ...announcementState, buttonText: e.target.value })}
                placeholder="Claim Offer / Read More"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1">
                🎁 Popup Banner Bonus Coins
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={bonusCoinsStr}
                onChange={(e) => {
                  const val = e.target.value;
                  // Allow empty or only digits
                  if (val === '' || /^\d+$/.test(val)) {
                    setBonusCoinsStr(val);
                    const parsed = val === '' ? 0 : (parseInt(val, 10) || 0);
                    setAnnouncementState(prev => ({ ...prev, bonusCoins: parsed }));
                  }
                }}
                placeholder="e.g. 10"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 text-xs font-bold focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Broadcasts notification directly to all users' devices</span>
            </div>

            <button
              onClick={handleSendDirectPush}
              disabled={!announcementState.title}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              <Send className="w-3.5 h-3.5" /> Send Device Notification
            </button>
          </div>

          {pushSentSuccess && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-300 text-xs font-bold flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <span>Device push notification broadcasted to all active app users!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
