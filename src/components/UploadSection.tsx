import React, { useRef, useState } from 'react';
import { FileText, Upload, AlertCircle, Loader2, ChevronDown, ChevronUp, Layers, Hash } from 'lucide-react';
import { DocumentMetadata } from '../types';

interface UploadSectionProps {
  onProcessPdf: (file: File) => Promise<void>;
  onLoadSample: (type: 'multilingual' | 'kannada' | 'hindi') => Promise<void>;
  documentMeta: DocumentMetadata | null;
  loading: boolean;
  error: string | null;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onProcessPdf,
  onLoadSample,
  documentMeta,
  loading,
  error
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showExtractedContent, setShowExtractedContent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleProcess = () => {
    if (selectedFile) {
      onProcessPdf(selectedFile);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Document
            </h2>
          </div>
        </div>

        {/* Sample Document Selectors */}
        <div className="flex items-center space-x-1.5 text-xs">
          <span className="text-[11px] text-slate-500 hidden sm:inline">Sample:</span>
          <button
            type="button"
            onClick={() => onLoadSample('multilingual')}
            disabled={loading}
            className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors text-[11px] disabled:opacity-50"
          >
            English Spec
          </button>
          <button
            type="button"
            onClick={() => onLoadSample('kannada')}
            disabled={loading}
            className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors text-[11px] disabled:opacity-50"
          >
            ಕನ್ನಡ
          </button>
          <button
            type="button"
            onClick={() => onLoadSample('hindi')}
            disabled={loading}
            className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors text-[11px] disabled:opacity-50"
          >
            हिन्दी
          </button>
        </div>
      </div>

      {/* PDF Upload Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-50/50'
            : selectedFile
            ? 'border-blue-300 bg-blue-50/20'
            : 'border-slate-200 hover:border-blue-300 bg-slate-50/60 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600">
            {selectedFile ? (
              <FileText className="w-5 h-5 text-blue-600" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800">
              {selectedFile ? selectedFile.name : 'Select PDF or drop file here'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {selectedFile
                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to process`
                : 'PyMuPDF text extraction & FAISS vector indexing'}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Actions & Process Trigger */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={handleProcess}
          disabled={!selectedFile || loading}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Processing Document (PyMuPDF & FAISS)...</span>
            </>
          ) : (
            <>
              <FileText className="w-3.5 h-3.5" />
              <span>Process Document</span>
            </>
          )}
        </button>

        {selectedFile && !documentMeta && (
          <span className="text-[11px] text-slate-500 font-mono text-center sm:text-right">
            Click "Process Document" to extract text and build FAISS index
          </span>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Document Metadata Overview */}
      {documentMeta && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 font-mono">
                Document Processed
              </span>
            </div>
            <span className="text-[11px] text-slate-600 font-mono truncate max-w-[260px]">
              {documentMeta.fileName}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block mb-0.5">Pages</span>
              <span className="text-sm font-semibold text-slate-900 font-mono">
                {documentMeta.pageCount}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block mb-0.5">Characters</span>
              <span className="text-sm font-semibold text-slate-900 font-mono">
                {documentMeta.charCount.toLocaleString()}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block mb-0.5">Chunks</span>
              <span className="text-sm font-semibold text-slate-900 font-mono">
                {documentMeta.chunksCount}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block mb-0.5">Language</span>
              <span className="text-sm font-semibold text-blue-600 font-mono">
                {documentMeta.detectedLanguage}
              </span>
            </div>
          </div>

          {/* IndicBERT Status */}
          <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-slate-700 flex items-start space-x-2">
            <span className="text-blue-700 font-mono font-semibold">IndicBERT:</span>
            <span className="text-slate-800">{documentMeta.indicBertStatus}</span>
          </div>

          {/* Document Content Extracted Chunks Inspector */}
          {documentMeta.sampleChunks && documentMeta.sampleChunks.length > 0 && (
            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setShowExtractedContent(!showExtractedContent)}
                className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Document Content ({documentMeta.sampleChunks.length} Extracted Chunks)</span>
                </div>
                {showExtractedContent ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {showExtractedContent && (
                <div className="p-3 space-y-2 border-t border-slate-200 max-h-56 overflow-y-auto bg-slate-50/50">
                  {documentMeta.sampleChunks.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] space-y-1 shadow-xs"
                    >
                      <div className="flex items-center justify-between text-slate-500 font-mono text-[10px]">
                        <span className="flex items-center gap-1 text-blue-700 font-semibold">
                          <Hash className="w-2.5 h-2.5" />
                          Chunk #{c.id + 1}
                        </span>
                        <span>{c.tokens} tokens</span>
                      </div>
                      <p className="text-slate-700 font-sans leading-relaxed text-[11px] whitespace-pre-wrap">
                        {c.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
