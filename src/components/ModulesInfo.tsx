import React from 'react';
import { Layers } from 'lucide-react';

export const ModulesInfo: React.FC = () => {
  const modules = [
    { label: 'PyMuPDF', desc: 'PDF text extraction' },
    { label: 'LangDetect', desc: 'Language detection' },
    { label: 'Text Chunking', desc: '1000 char / 200 overlap' },
    { label: 'FAISS Index', desc: 'IndexFlatIP cosine search' },
    { label: 'IndicBERT', desc: '768-dim Indian NLP' },
    { label: 'Whisper STT', desc: 'Speech-to-text recognition' },
    { label: 'Qwen / Grounded', desc: 'RAG context reasoning' },
    { label: 'NLLB-200', desc: 'Multilingual neural translation' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex items-center space-x-2 mb-2.5">
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          Architecture Pipeline & Models
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {modules.map((m, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] shadow-2xs"
          >
            <span className="font-mono font-semibold text-slate-900 block truncate">{m.label}</span>
            <span className="text-slate-500 block truncate">{m.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
