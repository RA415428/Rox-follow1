import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Eye, 
  Save, 
  ShieldAlert, 
  Smartphone,
  RefreshCw,
  FileCode2,
  Check
} from 'lucide-react';
import { AdminConfig, AppUpdateSettings, CURRENT_APP_VERSION } from '../../types';
import { ForceUpdateModal } from '../ForceUpdateModal';
import { getClientAppVersion } from '../../utils/versionCheck';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface AdminAppUpdateProps {
  config: AdminConfig;
  onUpdateConfig: (newConfig: AdminConfig) => void;
  onShowToast?: (msg: string) => void;
}

export const AdminAppUpdate: React.FC<AdminAppUpdateProps> = ({
  config,
  onUpdateConfig,
  onShowToast
}) => {
  const initialSettings: AppUpdateSettings = config.appUpdate || {
    enabled: false,
    latestVersion: '1.1.0',
    minRequiredVersion: '1.1.0',
    apkDownloadUrl: 'https://www.appcreator24.com/app4146352-inodq9',
    apkFileName: 'roxfollow-v1.1.0.apk',
    updateTitle: '🚀 Important App Update Available!',
    updateMessage: 'Naya version update aa gaya hai! Super fast orders, zero drop SMM servers aur naye earning features ke liye kripya abhi update karein.',
    releaseNotes: [
      '⚡ 10x Fast SMM Instagram Orders processing',
      '💰 High earning coins per sponsored ad stream',
      '🛠️ Super Smooth Android WebView & Performance',
      '🔒 Enhanced Wallet Security & Fast Coin Credit'
    ],
    forceUpdate: true,
    lastPublishedAt: 0
  };

  const [settings, setSettings] = useState<AppUpdateSettings>(initialSettings);
  const [newNoteInput, setNewNoteInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'saving'>('idle');

  // Keep settings synchronized with incoming remote Firestore config
  useEffect(() => {
    if (config?.appUpdate) {
      setSettings(prev => ({
        ...prev,
        ...config.appUpdate
      }));
    }
  }, [config?.appUpdate]);

  // Handle Input Changes
  const handleChange = (field: keyof AppUpdateSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Add Release Note item
  const handleAddNote = () => {
    if (!newNoteInput.trim()) return;
    setSettings(prev => ({
      ...prev,
      releaseNotes: [...(prev.releaseNotes || []), newNoteInput.trim()]
    }));
    setNewNoteInput('');
  };

  // Remove Release Note item
  const handleRemoveNote = (index: number) => {
    setSettings(prev => ({
      ...prev,
      releaseNotes: prev.releaseNotes.filter((_, i) => i !== index)
    }));
  };

  // Handle APK File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.apk')) {
      alert('Kripya sirf .apk file select karein!');
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;

        // Try uploading to backend server first
        let finalDownloadUrl = settings.apkDownloadUrl;
        try {
          const res = await fetch('/api/upload-apk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileBase64: base64Data,
              version: settings.latestVersion
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.downloadUrl) {
              finalDownloadUrl = data.downloadUrl;
            }
          }
        } catch (serverErr) {
          console.warn('Server APK storage fallback to base64 data:', serverErr);
        }

        setSettings(prev => ({
          ...prev,
          apkFileName: file.name,
          apkDownloadUrl: finalDownloadUrl,
          uploadedApkBase64: base64Data
        }));

        setIsUploading(false);
        setUploadSuccess(true);
        if (onShowToast) onShowToast(`✅ APK File "${file.name}" successfully uploaded!`);
      } catch (err) {
        console.error('File read error:', err);
        setIsUploading(false);
        alert('File upload me error aaya. Kripya dobara try karein.');
      }
    };

    reader.readAsDataURL(file);
  };

  // Direct Firestore Sync Helper
  const syncToFirestore = async (newConfig: AdminConfig) => {
    try {
      await setDoc(doc(db, 'config', 'global'), newConfig, { merge: true });
    } catch (err) {
      console.warn('Firestore direct write failed, backend fallback active:', err);
    }
    // Also update server backend
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
    } catch {}
  };

  // Toggle Master Update Switch
  const handleToggleEnabled = async (enabledVal: boolean) => {
    const updatedSettings: AppUpdateSettings = {
      ...settings,
      enabled: enabledVal,
      lastPublishedAt: enabledVal ? (settings.lastPublishedAt || Date.now()) : settings.lastPublishedAt
    };

    const newConfig: AdminConfig = {
      ...config,
      appUpdate: updatedSettings,
      lastUpdated: Date.now()
    };

    setSettings(updatedSettings);
    onUpdateConfig(newConfig);
    setSaveStatus('saving');

    await syncToFirestore(newConfig);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);

    const msg = enabledVal 
      ? `🚀 App Update Activated! Version v${updatedSettings.latestVersion} update screen users ke phone par show hogi.` 
      : '⏸️ App Update Deactivated. Sabhi users normal tarike se app use kar sakte hain.';

    if (onShowToast) onShowToast(msg);
    else alert(msg);
  };

  // Save Settings & Publish Update
  const handlePublishUpdateNow = async (forceEnable: boolean = true) => {
    const updatedSettings: AppUpdateSettings = {
      ...settings,
      enabled: forceEnable,
      forceUpdate: true,
      lastPublishedAt: Date.now()
    };

    const newConfig: AdminConfig = {
      ...config,
      appUpdate: updatedSettings,
      lastUpdated: Date.now()
    };

    setSettings(updatedSettings);
    onUpdateConfig(newConfig);
    setSaveStatus('saving');

    await syncToFirestore(newConfig);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);

    const msg = forceEnable 
      ? `🚀 Update Live Ho Gaya! Sabhi users ko Version v${updatedSettings.latestVersion} update screen dikhegi.`
      : `⏸️ Update Check Disable Kar Diya Gaya Hai.`;

    if (onShowToast) onShowToast(msg);
    else alert(msg);
  };

  // Save changes without triggering force update immediately
  const handleSaveDraft = async () => {
    const newConfig: AdminConfig = {
      ...config,
      appUpdate: settings,
      lastUpdated: Date.now()
    };

    onUpdateConfig(newConfig);
    setSaveStatus('saving');

    await syncToFirestore(newConfig);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);

    if (onShowToast) onShowToast('💾 Update settings saved successfully!');
    else alert('Settings saved!');
  };

  return (
    <div className="space-y-6">
      
      {/* Live Status Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-[#16061e] border border-pink-500/30 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/25 border border-pink-400/40 shrink-0">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-xl font-black text-white tracking-wide">
                  App Version & Force Update Control
                </h2>
                {settings.enabled ? (
                  <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black rounded-full flex items-center gap-1 shadow-sm animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> FORCE UPDATE ACTIVE
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-black rounded-full">
                    UPDATE INACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Yahan se naye APK version ka URL ya file set karke sabhi users ke liye <strong>'Please Update App'</strong> screen open kar sakte hain.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={() => setShowPreview(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Preview User Screen"
            >
              <Eye className="w-4 h-4 text-pink-400" />
              <span>Preview Screen</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Base APK Installed</p>
            <p className="text-sm font-black font-mono text-slate-200 mt-0.5">v{getClientAppVersion()}</p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">New Target APK</p>
            <p className="text-sm font-black font-mono text-pink-300 mt-0.5">v{settings.latestVersion}</p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Update Screen</p>
            <p className={`text-sm font-black mt-0.5 ${settings.enabled ? 'text-pink-400' : 'text-slate-400'}`}>
              {settings.enabled ? '🟢 Active on Phones' : '⚪ Disabled / Off'}
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Published</p>
            <p className="text-xs font-mono text-slate-300 mt-0.5 truncate">
              {settings.lastPublishedAt ? new Date(settings.lastPublishedAt).toLocaleDateString() : 'Not published yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column: Version & APK Source */}
        <div className="space-y-6">
          
          {/* Card 1: Version Numbers & Master Toggle */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-pink-400" />
                1. App Update Screen Control
              </h3>
              {saveStatus === 'saving' && (
                <span className="text-[10px] text-pink-400 font-bold animate-pulse">Syncing to Live App...</span>
              )}
            </div>

            {/* Master Toggle: Enable / Disable Update Notice */}
            <div className={`p-4 rounded-2xl border transition-all ${settings.enabled ? 'bg-pink-950/20 border-pink-500/50 shadow-lg shadow-pink-500/10' : 'bg-slate-950/80 border-slate-800'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-white">App Update Screen (User Ke Phone Par Dikhayein)</p>
                    {settings.enabled ? (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black rounded-full animate-pulse">
                        LIVE ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-black rounded-full">
                        DISABLED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {settings.enabled 
                      ? 'ON: Users ke phone par new update dialog open rahega aur unhe update karne ke liye kahega.'
                      : 'OFF: Update check band hai. Users direct bina kisi update notice ke app chala sakte hain.'}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => handleToggleEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-600"></div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  New Version Code / Number:
                </label>
                <input
                  type="text"
                  value={settings.latestVersion}
                  onChange={(e) => handleChange('latestVersion', e.target.value)}
                  placeholder="e.g. 1.1.0 or 2.0.0"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Users ko ye version show hoga.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Min Required Version:
                </label>
                <input
                  type="text"
                  value={settings.minRequiredVersion}
                  onChange={(e) => handleChange('minRequiredVersion', e.target.value)}
                  placeholder="e.g. 1.1.0"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Isse kam version wale users update screen dekhenge.</p>
              </div>
            </div>

            {/* Force Update Toggle */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Block Entry without Update (Force Update)</p>
                <p className="text-[10.5px] text-slate-400">User bina update kare app me enter nahi kar sakega.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.forceUpdate}
                  onChange={(e) => handleChange('forceUpdate', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>
          </div>

          {/* Card 2: APK Download URL & File Upload */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-400" />
              2. New APK File / Download URL
            </h3>

            {/* Method A: Direct Download URL */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Direct APK Download Link (AppCreator24 / Drive / Website):
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={settings.apkDownloadUrl}
                  onChange={(e) => handleChange('apkDownloadUrl', e.target.value)}
                  placeholder="https://www.appcreator24.com/app... or direct .apk link"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
                <a
                  href={settings.apkDownloadUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 shrink-0 border border-slate-700 transition-colors"
                  title="Test Download Link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test</span>
                </a>
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1">
                Aap yahan AppCreator24 ka download link, Google Drive direct link, Mediafire ya apna APK URL paste kar sakte hain.
              </p>
            </div>

            {/* Method B: Or Upload APK File directly */}
            <div className="pt-3 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                <span>Ya Apne Phone/PC se Direct APK Upload Karein:</span>
                {settings.apkFileName && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 truncate max-w-[150px]">
                    {settings.apkFileName}
                  </span>
                )}
              </label>

              <label className="border-2 border-dashed border-slate-700 hover:border-pink-500/60 bg-slate-950/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                <input
                  type="file"
                  accept=".apk,application/vnd.android.package-archive"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
                
                {isUploading ? (
                  <div className="py-3 flex flex-col items-center gap-2">
                    <div className="w-7 h-7 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold text-pink-400">Uploading APK File...</p>
                  </div>
                ) : uploadSuccess ? (
                  <div className="py-2 flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <Check className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-emerald-300">APK File Uploaded & Linked!</p>
                    <p className="text-[10.5px] text-slate-400">Nayi file select karne ke liye dobara click karein</p>
                  </div>
                ) : (
                  <div className="py-2 flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-200">Click to Select .apk File</p>
                    <p className="text-[10.5px] text-slate-400">Android Application Package (.apk)</p>
                  </div>
                )}
              </label>
            </div>

          </div>

        </div>

        {/* Right Column: Update Screen Messages & What's New */}
        <div className="space-y-6">
          
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400" />
              3. Update Title & What's New (Release Notes)
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Update Dialog Title:
              </label>
              <input
                type="text"
                value={settings.updateTitle}
                onChange={(e) => handleChange('updateTitle', e.target.value)}
                placeholder="e.g. 🚀 Important App Update Available!"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Update Message / Description:
              </label>
              <textarea
                rows={2}
                value={settings.updateMessage}
                onChange={(e) => handleChange('updateMessage', e.target.value)}
                placeholder="Description message to display..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 resize-none"
              />
            </div>

            {/* What's new bullet points */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                What's New Points (Features / Improvements):
              </label>
              
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
                {(settings.releaseNotes || []).map((note, index) => (
                  <div key={index} className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => {
                        const updated = [...settings.releaseNotes];
                        updated[index] = e.target.value;
                        handleChange('releaseNotes', updated);
                      }}
                      className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none"
                    />
                    <button
                      onClick={() => handleRemoveNote(index)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete point"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Point Field */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                  placeholder="Naya point likhein (e.g. ⚡ Fast Orders)"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-pink-400 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

          </div>

          {/* Quick Notice Info */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-left flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <p className="font-bold text-amber-300">Kaise kaam karta hai?</p>
              <p className="mt-1">
                Jaise hi aap <strong>"PUBLISH UPDATE NOW"</strong> button dabayenge, Firebase database me update flag live ho jayega aur purane version (v{CURRENT_APP_VERSION}) wale sabhi users ki screen par turant <strong>"Please Update App"</strong> dialog lock ho jayega.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Main Publishing Action Card - Bottom Fixed Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#190623] to-slate-900 border-2 border-pink-500/50 rounded-3xl p-5 md:p-6 shadow-[0_0_40px_rgba(236,72,153,0.3)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Rocket className="w-5 h-5 text-pink-400 animate-pulse" />
            Publish App Update To Live Users
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Ek click me sabhi users ke phones par new version notice activate karein.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {settings.enabled ? (
            <button
              onClick={() => handlePublishUpdateNow(false)}
              className="flex-1 sm:flex-none px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl border border-slate-700 transition-colors cursor-pointer"
            >
              Disable Update Check
            </button>
          ) : (
            <button
              onClick={handleSaveDraft}
              className="flex-1 sm:flex-none px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl border border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Draft</span>
            </button>
          )}

          <button
            id="btn-admin-publish-update"
            onClick={() => handlePublishUpdateNow(true)}
            className="flex-1 sm:flex-none px-6 py-3.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white font-black text-xs md:text-sm rounded-2xl shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Rocket className="w-4 h-4" />
            <span>{settings.enabled ? 'RE-PUBLISH / UPDATE NOW' : '🚀 UPDATE NOW (PUBLISH TO ALL)'}</span>
          </button>
        </div>
      </div>

      {/* Interactive In-App Live Preview Modal */}
      {showPreview && (
        <ForceUpdateModal
          updateConfig={settings}
          adminPassword={config.adminPassword}
          isPreview={true}
          onClosePreview={() => setShowPreview(false)}
        />
      )}

    </div>
  );
};
