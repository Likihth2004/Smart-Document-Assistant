import React, { useState, useEffect } from 'react';
import { Header, NavTab } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { QuestionSection } from './components/QuestionSection';
import { AnswerPanel } from './components/AnswerPanel';
import { QuestionHistory } from './components/QuestionHistory';
import { ModulesInfo } from './components/ModulesInfo';
import { DocumentMetadata, QAResult, BackendStatus } from './types';
import { Cpu } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('workspace');
  const [documentMeta, setDocumentMeta] = useState<DocumentMetadata | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<QAResult | null>(null);
  const [history, setHistory] = useState<QAResult[]>(() => {
    try {
      const saved = localStorage.getItem('sda_qa_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sda_qa_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save history to localStorage', e);
    }
  }, [history]);

  // Check backend health & status on mount
  const checkBackendStatus = async () => {
    try {
      const res = await fetch('/api/backend-status');
      if (res.ok) {
        const data = await res.json();
        setBackendStatus(data);
      }
    } catch (e) {
      setBackendStatus({
        connected: false,
        url: 'http://127.0.0.1:7860',
        mode: 'integrated_ai'
      });
    }
  };

  useEffect(() => {
    checkBackendStatus();
    // Also check if a document is already loaded
    fetch('/api/document-status')
      .then((r) => r.json())
      .then((data) => {
        if (data.loaded) {
          setDocumentMeta({
            fileName: data.fileName,
            pageCount: data.pageCount,
            charCount: data.charCount,
            chunksCount: data.chunksCount,
            detectedLanguage: data.detectedLanguage,
            indicBertStatus: data.indicBertStatus,
            indicBertDim: data.indicBertDim,
            sampleChunks: data.sampleChunks
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdateBackendUrl = async (url: string) => {
    try {
      const res = await fetch('/api/backend-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (res.ok) {
        await checkBackendStatus();
      }
    } catch (e) {
      console.warn('Failed to update backend URL', e);
    }
  };

  const handleProcessPdf = async (file: File) => {
    setDocLoading(true);
    setDocError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/process-document', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to process document');
      }

      setDocumentMeta(data.details);
    } catch (err: any) {
      setDocError(err.message || 'Error uploading and processing PDF');
    } finally {
      setDocLoading(false);
    }
  };

  const handleLoadSample = async (type: 'multilingual' | 'kannada' | 'hindi') => {
    setDocLoading(true);
    setDocError(null);

    try {
      const res = await fetch('/api/load-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to load sample document');
      }

      setDocumentMeta(data.details);
    } catch (err: any) {
      setDocError(err.message || 'Error loading sample document');
    } finally {
      setDocLoading(false);
    }
  };

  const handleTranscribeAudio = async (audioData: string, mimeType: string): Promise<string> => {
    const res = await fetch('/api/transcribe-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioData, mimeType })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Speech transcription failed');
    }
    return data.text || '';
  };

  const handleAskQuestion = async (question: string, targetLanguage: string) => {
    setQaLoading(true);
    setQaError(null);

    try {
      const res = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typedQuestion: question,
          targetLanguage
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to get answer');
      }

      const result: QAResult = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        question: data.question || question,
        questionLanguage: data.questionLanguage,
        targetLanguage: data.targetLanguage || targetLanguage,
        answer: data.answer,
        sources: data.sources || [],
        documentName: data.documentName || documentMeta?.fileName,
        engine: data.engine
      };

      setCurrentResult(result);
      setHistory((prev) => [result, ...prev]);
    } catch (err: any) {
      setQaError(err.message || 'Error answering question. Please try again.');
    } finally {
      setQaLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (currentResult) {
      handleAskQuestion(currentResult.question, currentResult.targetLanguage);
    }
  };

  const handleClearAnswer = () => {
    setCurrentResult(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        backendStatus={backendStatus}
        onRefreshBackend={checkBackendStatus}
        onUpdateBackendUrl={handleUpdateBackendUrl}
        documentName={documentMeta?.fileName}
        hasDocument={!!documentMeta}
        historyCount={history.length}
      />

      {/* Main Document Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Workspace Summary Bar */}
        <div className="border border-slate-200 bg-white rounded-xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Workspace
            </span>
            <span className="text-slate-300">•</span>
            <p className="text-xs text-slate-700">
              Document RAG in <span className="text-slate-900 font-semibold">English</span>,{' '}
              <span className="text-blue-700 font-semibold">ಕನ್ನಡ</span>, and{' '}
              <span className="text-blue-700 font-semibold">हिन्दी</span>
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono text-slate-500">
            <span>FAISS IndexFlatIP</span>
            <span>•</span>
            <span>IndicBERT 768-dim</span>
          </div>
        </div>

        {/* View Switch: Workspace (Default Unified), Documents, Ask Assistant, History, or Settings */}
        {activeTab === 'workspace' && (
          <div className="space-y-5">
            {/* Document -> Question -> Answer Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: DOCUMENT & QUESTION */}
              <div className="lg:col-span-6 space-y-5">
                <UploadSection
                  onProcessPdf={handleProcessPdf}
                  onLoadSample={handleLoadSample}
                  documentMeta={documentMeta}
                  loading={docLoading}
                  error={docError}
                />

                <QuestionSection
                  onAskQuestion={handleAskQuestion}
                  onTranscribeAudio={handleTranscribeAudio}
                  loading={qaLoading}
                  documentLoaded={!!documentMeta}
                />
              </div>

              {/* Right Column: AI ANSWER & HISTORY */}
              <div className="lg:col-span-6 space-y-5">
                <AnswerPanel
                  currentResult={currentResult}
                  loading={qaLoading}
                  error={qaError}
                  onRegenerate={handleRegenerate}
                  onClear={handleClearAnswer}
                />

                <QuestionHistory
                  history={history}
                  onSelect={(item) => {
                    setCurrentResult(item);
                  }}
                  onClear={() => setHistory([])}
                />
              </div>
            </div>

            {/* Architecture Pipeline Strip */}
            <ModulesInfo />
          </div>
        )}

        {/* Specific Documents Tab View */}
        {activeTab === 'documents' && (
          <div className="space-y-5 max-w-4xl mx-auto">
            <UploadSection
              onProcessPdf={handleProcessPdf}
              onLoadSample={handleLoadSample}
              documentMeta={documentMeta}
              loading={docLoading}
              error={docError}
            />
            {documentMeta && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('ask')}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-xs"
                >
                  Proceed to Ask Assistant →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Specific Ask Assistant Tab View */}
        {activeTab === 'ask' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 space-y-5">
              <QuestionSection
                onAskQuestion={handleAskQuestion}
                onTranscribeAudio={handleTranscribeAudio}
                loading={qaLoading}
                documentLoaded={!!documentMeta}
              />
              {!documentMeta && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-center justify-between shadow-xs">
                  <span>No document loaded yet.</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('documents')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Upload Document
                  </button>
                </div>
              )}
            </div>
            <div className="lg:col-span-6 space-y-5">
              <AnswerPanel
                currentResult={currentResult}
                loading={qaLoading}
                error={qaError}
                onRegenerate={handleRegenerate}
                onClear={handleClearAnswer}
              />
            </div>
          </div>
        )}

        {/* Specific History Tab View */}
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 space-y-5">
              <QuestionHistory
                history={history}
                onSelect={(item) => setCurrentResult(item)}
                onClear={() => setHistory([])}
              />
            </div>
            <div className="lg:col-span-7 space-y-5">
              <AnswerPanel
                currentResult={currentResult}
                loading={qaLoading}
                error={qaError}
                onRegenerate={handleRegenerate}
                onClear={handleClearAnswer}
              />
            </div>
          </div>
        )}

        {/* Specific Settings Tab View */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Cpu className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Backend & Environment Settings
                </h2>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-mono text-[11px]">
                    Python AI Backend URL (Google Colab / Local Port):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue={backendStatus?.url || 'http://127.0.0.1:7860'}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateBackendUrl((e.target as HTMLInputElement).value);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        if (input) handleUpdateBackendUrl(input.value);
                      }}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Connection Status:</span>
                    <span className={`font-mono font-semibold ${backendStatus?.connected ? 'text-emerald-700' : 'text-blue-700'}`}>
                      {backendStatus?.connected ? 'Connected to Python Backend' : 'Integrated Neural Engine Active'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Mode:</span>
                    <span className="text-slate-700 font-mono">{backendStatus?.mode || 'integrated_ai'}</span>
                  </div>
                </div>

                <ModulesInfo />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3.5 text-center text-[11px] text-slate-500">
        Smart Document Assistant • Multilingual Indic NLP & Document Retrieval System
      </footer>
    </div>
  );
}
