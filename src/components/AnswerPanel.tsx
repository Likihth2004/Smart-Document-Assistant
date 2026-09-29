import React, { useState } from 'react';
import { Bot, Copy, Check, RotateCw, Trash2, ChevronDown, ChevronUp, FileText, Hash, AlertCircle } from 'lucide-react';
import { QAResult } from '../types';

interface AnswerPanelProps {
  currentResult: QAResult | null;
  loading: boolean;
  error?: string | null;
  onRegenerate?: () => void;
  onClear?: () => void;
}

export const AnswerPanel: React.FC<AnswerPanelProps> = ({
  currentResult,
  loading,
  error,
  onRegenerate,
  onClear,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(true);

  if (loading) {
    return (
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-slate-800">Generating Answer</p>
            <p className="text-[11px] text-slate-500 font-mono">
              FAISS vector retrieval • IndicBERT representation • Grounded reasoning
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white border border-rose-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center space-x-2 text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <h3 className="text-xs font-semibold uppercase tracking-wider">Answer Generation Failed</h3>
        </div>
        <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-lg border border-rose-200">
          {error}
        </p>
        <p className="text-[11px] text-slate-500">
          Verify that a document is loaded and indexed before querying.
        </p>
      </section>
    );
  }

  if (!currentResult) {
    return (
      <section className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs text-center">
        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 mx-auto mb-2 shadow-xs">
          <Bot className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-slate-800">AI Answer Workspace</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
          Answers generated strictly from uploaded document context with source references and relevance scores.
        </p>
      </section>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(currentResult.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
            AI Answer
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium">
            {currentResult.targetLanguage}
          </span>
        </div>

        {/* Action Toolbar: Copy, Regenerate, Clear */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors flex items-center gap-1 text-[11px] shadow-2xs font-medium"
            title="Copy answer text"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-600" />
                <span>Copy</span>
              </>
            )}
          </button>

          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors flex items-center gap-1 text-[11px] shadow-2xs font-medium"
              title="Regenerate answer"
            >
              <RotateCw className="w-3 h-3 text-slate-600" />
              <span>Regenerate</span>
            </button>
          )}

          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors flex items-center gap-1 text-[11px] shadow-2xs font-medium"
              title="Clear current answer"
            >
              <Trash2 className="w-3 h-3 text-slate-600" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Question Understood Card */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Question Understood</span>
          <span>{new Date(currentResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="text-xs font-semibold text-slate-900">{currentResult.question}</p>
        {currentResult.questionLanguage && currentResult.questionLanguage !== 'English' && (
          <p className="text-[10px] text-blue-700 font-mono">
            Language detected: {currentResult.questionLanguage}
          </p>
        )}
      </div>

      {/* Answer Output */}
      <div className="p-4 rounded-xl bg-blue-50/20 border border-blue-100 shadow-xs space-y-2">
        <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
          {currentResult.answer}
        </div>
      </div>

      {/* Sources & Chunk References */}
      {currentResult.sources && currentResult.sources.length > 0 && (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowSources(!showSources)}
            className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Sources ({currentResult.sources.length} Retrieved Chunks)</span>
            </div>
            {showSources ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {showSources && (
            <div className="p-3 space-y-2 border-t border-slate-200 bg-slate-50/50">
              {currentResult.sources.map((src, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1 shadow-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-blue-700 font-semibold flex items-center gap-1">
                      <Hash className="w-2.5 h-2.5" />
                      Chunk #{src.index + 1}
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                      Relevance: {(src.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed font-sans bg-slate-50 p-2.5 rounded-md border border-slate-200/80">
                    {src.chunk}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
