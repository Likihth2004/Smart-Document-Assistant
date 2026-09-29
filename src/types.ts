export interface DocumentMetadata {
  fileName: string;
  pageCount: number;
  charCount: number;
  chunksCount: number;
  detectedLanguage: string;
  indicBertStatus: string;
  indicBertDim: number;
  sampleChunks?: Array<{ id: number; text: string; tokens: number }>;
}

export interface SourceReference {
  index: number;
  score: number;
  chunk: string;
  tokens?: number;
}

export interface QAResult {
  id: string;
  timestamp: string;
  question: string;
  questionLanguage?: string;
  targetLanguage: string;
  answer: string;
  sources: SourceReference[];
  documentName?: string;
  engine?: string;
}

export interface BackendStatus {
  connected: boolean;
  url: string;
  mode: string;
  message?: string;
  details?: {
    device?: string;
    models?: Record<string, boolean>;
    document_loaded?: boolean;
  };
}
