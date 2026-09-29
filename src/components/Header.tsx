import React, { useState } from 'react';
import { FileText, Cpu, Settings2, RefreshCw } from 'lucide-react';
import { BackendStatus } from '../types';

export type NavTab = 'workspace' | 'documents' | 'ask' | 'history' | 'settings';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  backendStatus: BackendStatus | null;
  onRefreshBackend: () => void;
  onUpdateBackendUrl: (url: string) => Promise<void>;
  documentName?: string;
  hasDocument: boolean;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  backendStatus,
  onRefreshBackend,
  onUpdateBackendUrl,
  documentName,
  hasDocument,
  historyCount
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [urlInput, setUrlInput] = useState(backendStatus?.url || 'http://127.0.0.1:7860');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onUpdateBackendUrl(urlInput);
    setSaving(false);
    setShowConfig(false);
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-6">
            <div 
              onClick={() => onTabChange('workspace')}
              className="flex items-center space-x-2.5 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-sm font-semibold tracking-wide text-slate-900 uppercase">
                  Smart Document Assistant
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  RAG v1.0
                </span>
              </div>
            </div>

            {/* Main Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                type="button"
                onClick={() => onTabChange('workspace')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'workspace'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Workspace
              </button>
              <button
                type="button"
                onClick={() => onTabChange('documents')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'documents'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Documents</span>
                {hasDocument && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onTabChange('ask')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'ask'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Ask Assistant
              </button>
              <button
                type="button"
                onClick={() => onTabChange('history')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>History</span>
                {historyCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                    {historyCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  onTabChange('settings');
                  setShowConfig(!showConfig);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'settings' || showConfig
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            </nav>
          </div>

          {/* Right Status Actions */}
          <div className="flex items-center space-x-2">
            {/* Active Document Tag */}
            {hasDocument && documentName && (
              <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-700 max-w-[220px]">
                <FileText className="w-3 h-3 text-blue-600 flex-shrink-0" />
                <span className="truncate font-mono">{documentName}</span>
              </div>
            )}

            {/* Python Backend Connected Pill (only shown when connected) */}
            {backendStatus?.connected && (
              <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1 text-xs">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-emerald-800 text-[11px] font-medium hidden sm:inline">
                  Python Colab: Connected
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onRefreshBackend}
              className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
              title="Refresh connection status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile Subnavigation */}
        <div className="flex md:hidden items-center space-x-1 py-2 border-t border-slate-100 overflow-x-auto">
          <button
            type="button"
            onClick={() => onTabChange('workspace')}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
              activeTab === 'workspace' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
            }`}
          >
            Workspace
          </button>
          <button
            type="button"
            onClick={() => onTabChange('documents')}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
              activeTab === 'documents' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
            }`}
          >
            Documents
          </button>
          <button
            type="button"
            onClick={() => onTabChange('ask')}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
              activeTab === 'ask' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
            }`}
          >
            Ask Assistant
          </button>
          <button
            type="button"
            onClick={() => onTabChange('history')}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
              activeTab === 'history' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
            }`}
          >
            History ({historyCount})
          </button>
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap text-slate-600"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Backend URL Settings Dropdown Modal */}
      {showConfig && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  Python AI Backend Link
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Connect to your running Google Colab / local Python runner preserving PyMuPDF, FAISS, IndicBERT, Whisper STT, Qwen, and NLLB.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-3 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="e.g. http://127.0.0.1:7860 or https://xxxx.gradio.live"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono shadow-xs"
              />
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 shadow-xs"
              >
                {saving ? 'Testing connection...' : 'Save & Link'}
              </button>
            </form>

            <div className="mt-3 p-3 rounded-md bg-white border border-slate-200 text-[11px] text-slate-600 space-y-1 font-mono shadow-xs">
              <div className="text-slate-800 font-sans font-medium">How to connect:</div>
              <div>• <b>Google Colab:</b> Run the existing <span className="text-blue-700 font-medium">Smart_Document_Assistant.ipynb</span> or <span className="text-blue-700 font-medium">backend.py</span></div>
              <div>• <b>Local Terminal:</b> Run <span className="text-blue-700 font-medium">python backend.py</span> (starts on port 7860)</div>
              <div>• When offline, the integrated server pipeline handles text, embeddings, and Q&A automatically.</div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
