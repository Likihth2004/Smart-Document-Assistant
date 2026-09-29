import React, { useState } from 'react';
import { History, ChevronRight, ChevronDown, Trash2, Clock } from 'lucide-react';
import { QAResult } from '../types';

interface QuestionHistoryProps {
  history: QAResult[];
  onSelect: (item: QAResult) => void;
  onClear: () => void;
}

export const QuestionHistory: React.FC<QuestionHistoryProps> = ({
  history,
  onSelect,
  onClear,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (history.length === 0) {
    return null;
  }

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
            <History className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
            History ({history.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1 font-medium"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {history.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer text-xs space-y-1.5 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                      {item.targetLanguage}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 truncate text-xs">{item.question}</p>
                </div>

                <button
                  type="button"
                  onClick={(e) => toggleExpand(item.id, e)}
                  className="text-slate-500 hover:text-slate-800 p-1 flex-shrink-0"
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              </div>

              {isExpanded ? (
                <div className="pt-2 border-t border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed text-[11px] bg-white p-2 rounded-md">
                  {item.answer}
                </div>
              ) : (
                <p className="text-slate-600 truncate text-[11px] font-sans">{item.answer}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
