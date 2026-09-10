import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { initAdNetworkPreconnect, applyAppCreator24WebViewFixes } from './utils/adPreloadManager';

// Initialize WebView and Ad optimizations on boot
if (typeof window !== 'undefined') {
  initAdNetworkPreconnect();
  applyAppCreator24WebViewFixes();
}

// Safely handle transient database closing/hidden exceptions when WebView or background tab sleeps
if (typeof window !== 'undefined') {
  const isDbClosingError = (reasonOrMsg: any) => {
    if (!reasonOrMsg) return false;
    const str = (
      typeof reasonOrMsg === 'string'
        ? reasonOrMsg
        : (reasonOrMsg?.message || '') + ' ' + (reasonOrMsg?.stack || '') + ' ' + (reasonOrMsg?.name || '')
    ).toLowerCase();
    return (
      str.includes('database is closing') ||
      str.includes('closing/hidden') ||
      str.includes('connection is closing') ||
      str.includes('indexed database server lost') ||
      str.includes('failed to obtain exclusive client lock') ||
      str.includes('internal error encountered')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isDbClosingError(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('error', (event) => {
    if (isDbClosingError(event.error || event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('App Unhandled Exception:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center mb-4 text-3xl">
            ⚡
          </div>
          <h2 className="text-xl font-bold mb-2">Reloading Application</h2>
          <p className="text-sm text-slate-400 max-w-xs mb-6">
            Connecting to ROX FOLLOW server. Please tap below to refresh.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl font-bold shadow-lg shadow-pink-500/25 active:scale-95 transition-all"
          >
            Refresh App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);

