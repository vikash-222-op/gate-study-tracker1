import React, { useState } from 'react';
import { Smartphone, Download, X, CheckCircle2, Share2, Sparkles, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { hasNativePrompt, isInstalled, isIOS, installApp } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk'>('pwa');

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      const ok = await installApp();
      if (ok) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-800 dark:text-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Use on Phone like Native App</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Operate GATE 2027 GPMS on your Android or iPhone with Google Sign-in.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'pwa'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            1. Install as Phone App (Recommended)
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'apk'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            2. Build Direct .APK File
          </button>
        </div>

        {/* Tab 1 Content: Instant PWA Install */}
        {activeTab === 'pwa' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl space-y-2">
              <span className="font-bold text-indigo-950 dark:text-indigo-200 block">
                Bina kisi download ke phone me Native App banega:
              </span>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc list-inside">
                <li>Home screen par <strong>GATE 2027</strong> ka official app icon aayega.</li>
                <li>Bina kisi browser URL bar ke full-screen Native App ki tarah chalega.</li>
                <li>Same Google Login aur live cloud auto-sync rahega.</li>
              </ul>
            </div>

            {hasNativePrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Install App on this Device</span>
              </button>
            ) : isIOS ? (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-1.5">
                <span className="font-bold text-slate-900 dark:text-white block">
                  For iPhone / iPad (Safari):
                </span>
                <p className="text-slate-600 dark:text-slate-300">
                  Safari me neeche <strong>Share icon</strong> (box with arrow) par tap karein, fir <strong>"Add to Home Screen"</strong> par click karein.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Android Phone me Install Karne ke Steps:
                </span>
                <ol className="space-y-1.5 text-slate-600 dark:text-slate-300 list-decimal list-inside">
                  <li>Apne phone ke <strong>Google Chrome</strong> me yeh website kholein.</li>
                  <li>Upar right corner me <strong>3 dots (menu)</strong> par tap karein.</li>
                  <li><strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong> par tap karein.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Tab 2 Content: Direct APK File via PWABuilder */}
        {activeTab === 'apk' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-xl space-y-2">
              <span className="font-bold text-emerald-950 dark:text-emerald-200 block">
                Official .APK File Generate Karne ka 1-Minute Tarika:
              </span>
              <p className="text-slate-600 dark:text-slate-300">
                Microsoft ka official free tool <strong>PWABuilder</strong> aapki is deployed website ko direct downloadable Android <strong>.apk</strong> file me convert kar deta hai.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Step 1: PWABuilder Open Karein
                </span>
                <a
                  href="https://www.pwabuilder.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 font-semibold underline flex items-center gap-1"
                >
                  <span>Open www.pwabuilder.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Step 2: Apni Live Website ka URL Daalein
                </span>
                <p className="text-slate-500 font-mono text-[11px] truncate">
                  {typeof window !== 'undefined' ? window.location.origin : 'https://gate-tracker-2027.vercel.app'}
                </p>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Step 3: Download APK
                </span>
                <p className="text-slate-600 dark:text-slate-300">
                  <strong>"Package For Stores"</strong> → <strong>Android</strong> select karke <strong>Generate APK</strong> dabayein. Bas direct APK download ho jayegi!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
