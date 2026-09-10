import React, { useState } from 'react';
import { 
  Key, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  ShieldCheck, 
  Lock,
  FileCode,
  Globe,
  ExternalLink
} from 'lucide-react';
import { AdminConfig } from '../../types';
import { DEFAULT_ADMIN_CONFIG } from '../../utils/defaultAdminConfig';

interface AdminSettingsProps {
  config: AdminConfig;
  onUpdateConfig: (newConfig: AdminConfig) => void;
  onResetDefaults: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  config,
  onUpdateConfig,
  onResetDefaults
}) => {
  const [newPassword, setNewPassword] = useState(config.adminPassword);
  const [jsonInput, setJsonInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [customBackendUrl, setCustomBackendUrl] = useState(() => {
    try {
      return localStorage.getItem('instaboost_custom_backend_url') || '';
    } catch {
      return '';
    }
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveBackendUrl = () => {
    try {
      if (customBackendUrl.trim()) {
        localStorage.setItem('instaboost_custom_backend_url', customBackendUrl.trim());
        showToast('Custom Server API URL saved successfully!');
      } else {
        localStorage.removeItem('instaboost_custom_backend_url');
        showToast('Reset to default Central Cloud Server URL.');
      }
    } catch {
      showToast('Failed to save server URL.');
    }
  };

  const handleChangePassword = () => {
    if (!newPassword.trim()) {
      showToast('Password cannot be empty.');
      return;
    }
    onUpdateConfig({
      ...config,
      adminPassword: newPassword.trim(),
      lastUpdated: Date.now()
    });
    showToast('Admin password updated successfully!');
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `instaboost_config_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup file downloaded.');
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (parsed && typeof parsed === 'object') {
        onUpdateConfig({
          ...DEFAULT_ADMIN_CONFIG,
          ...parsed,
          lastUpdated: Date.now()
        });
        setJsonInput('');
        showToast('JSON Configuration imported successfully!');
      }
    } catch (err) {
      showToast('Invalid JSON format. Please check syntax.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {toastMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Central Server API Endpoint Settings */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Central Real-Time Server API URL
        </h3>

        <p className="text-xs text-slate-300">
          In standalone APKs and Firebase Hosting, API requests automatically connect to the live central cloud backend server. You can specify a custom server URL below if needed.
        </p>

        <div className="max-w-xl space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custom Express Server API Base URL (Optional)
            </label>
            <input
              type="text"
              value={customBackendUrl}
              onChange={(e) => setCustomBackendUrl(e.target.value)}
              placeholder="https://ais-pre-qlkvwwy7os3f2svz2fwkrn-609197389972.asia-southeast1.run.app"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Leave empty to use the auto-configured production central server endpoint.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveBackendUrl}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors"
            >
              Save Server URL
            </button>
            {customBackendUrl && (
              <button
                onClick={() => {
                  setCustomBackendUrl('');
                  localStorage.removeItem('instaboost_custom_backend_url');
                  showToast('Reset to default Central Cloud Server.');
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
              >
                Reset Default
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Admin Password Change */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Key className="w-4 h-4 text-amber-400" /> Change Admin Lock Password
        </h3>

        <div className="max-w-md space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Admin Password</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={handleChangePassword}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors"
          >
            Update Admin Password
          </button>
        </div>
      </div>

      {/* Backup & Import JSON Config */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <FileCode className="w-4 h-4 text-purple-400" /> Export & Import System Backup (JSON)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-white block">Export Current Configuration</span>
            <p className="text-[11px] text-slate-400">
              Download your complete SMM API keys, AdMob IDs, and pricing settings as a JSON backup file.
            </p>
            <button
              onClick={handleExportJson}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download JSON Backup
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-white block">Import Configuration JSON</span>
            <textarea
              rows={3}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste JSON config code here..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-[11px] font-mono focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleImportJson}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2"
            >
              <Upload className="w-4 h-4 text-purple-400" /> Apply Imported JSON
            </button>
          </div>
        </div>
      </div>

      {/* Factory Reset */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-3">
        <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
          <RotateCcw className="w-4 h-4" /> Reset Factory Defaults
        </h3>
        <p className="text-xs text-slate-400">
          Resets all SMM API settings, pricing, and AdMob settings back to original defaults.
        </p>
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to reset all admin settings to defaults?')) {
              onResetDefaults();
              showToast('Admin settings reset to defaults.');
            }
          }}
          className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-bold text-xs rounded-xl transition-colors"
        >
          Reset All Settings
        </button>
      </div>
    </div>
  );
};
