import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Mic, MicOff, Send, Loader2, AlertCircle, Upload, FileAudio, RotateCcw } from 'lucide-react';

interface QuestionSectionProps {
  onAskQuestion: (question: string, targetLanguage: string) => Promise<void>;
  onTranscribeAudio: (audioData: string, mimeType: string) => Promise<string>;
  loading: boolean;
  documentLoaded: boolean;
}

export const QuestionSection: React.FC<QuestionSectionProps> = ({
  onAskQuestion,
  onTranscribeAudio,
  loading,
  documentLoaded,
}) => {
  const [question, setQuestion] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<'English' | 'Kannada' | 'Hindi'>('English');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const exampleQuestions = [
    { label: 'English: Primary objectives', text: 'What are the primary objectives of the project?' },
    { label: 'ಕನ್ನಡ: ಮುಖ್ಯ ಗುರಿಗಳು', text: 'ಕರ್ನಾಟಕದ ಪ್ರಮುಖ ನದಿಗಳು ಯಾವುವು ಮತ್ತು ಯೋಜನೆ ಮುಖ್ಯ ಗುರಿಗಳು ಯಾವುವು?' },
    { label: 'हिन्दी: मुख्य विशेषताएं', text: 'इस परियोजना की मुख्य विशेषताएं क्या हैं?' },
  ];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return 'audio/webm';
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return 'audio/webm';
  };

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setMicError('Microphone recording requires a secure connection (HTTPS or localhost).');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError('Microphone recording is not supported or is restricted in this browser frame. You can upload an audio file below.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (firstErr: any) {
        if (firstErr.name === 'OverconstrainedError' || firstErr.name === 'TypeError') {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw firstErr;
        }
      }

      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm'
        });

        if (audioBlob.size < 100) {
          setMicError('No audio captured. Please speak into your microphone or try again.');
          setIsRecording(false);
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          setTranscribing(true);
          try {
            const transcribedText = await onTranscribeAudio(base64Data, mimeType || 'audio/webm');
            if (transcribedText) {
              setQuestion(transcribedText);
            } else {
              setMicError('Could not detect clear speech in the audio. Please try speaking again.');
            }
          } catch (err: any) {
            setMicError('Speech recognition notice: ' + (err.message || 'Unable to process audio'));
          } finally {
            setTranscribing(false);
          }
        };
      };

      mediaRecorder.start(500);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 15) {
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setIsRecording(false);
      console.warn('Microphone permission check:', err?.name, err?.message);

      const errName = err?.name || '';
      const errMsg = err?.message || '';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errMsg.toLowerCase().includes('denied') || errMsg.toLowerCase().includes('permission')) {
        setMicError('Microphone permission is currently denied or blocked. Click the lock/settings icon in your browser address bar to allow Microphone, or upload a recorded audio file below.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setMicError('No microphone hardware detected on this device. You can upload an audio file or select a sample query below.');
      } else {
        setMicError(`Microphone unavailable (${errName || 'access restriction'}). Please allow mic access or upload an audio recording.`);
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping mediaRecorder', e);
      }
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTranscribing(true);
    setMicError(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        const mime = file.type || 'audio/webm';
        const transcribedText = await onTranscribeAudio(base64Data, mime);
        if (transcribedText) {
          setQuestion(transcribedText);
        } else {
          setMicError('Could not detect speech in the uploaded audio file.');
        }
      } catch (err: any) {
        setMicError('Audio transcription failed: ' + (err.message || 'unknown error'));
      } finally {
        setTranscribing(false);
        if (audioFileInputRef.current) audioFileInputRef.current.value = '';
      }
    };
  };

  const handleVoiceSimulate = (text: string) => {
    setTranscribing(true);
    setMicError(null);
    setTimeout(() => {
      setQuestion(text);
      setTranscribing(false);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !loading) {
      onAskQuestion(question.trim(), targetLanguage);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      {/* Hidden file input for audio file transcription */}
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg"
        onChange={handleAudioFileUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
            Ask Your Document
          </h2>
        </div>

        {/* Answer in: Language selector */}
        <div className="flex items-center space-x-1.5 text-xs">
          <span className="text-[11px] text-slate-500 hidden sm:inline">Answer in:</span>
          <div className="inline-flex rounded-lg bg-slate-100 border border-slate-200 p-0.5">
            {(
              [
                { id: 'English', label: 'English' },
                { id: 'Kannada', label: 'ಕನ್ನಡ' },
                { id: 'Hindi', label: 'हिन्दी' },
              ] as const
            ).map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setTargetLanguage(lang.id)}
                className={`px-2.5 py-1 rounded-md text-xs transition-all font-medium ${
                  targetLanguage === lang.id
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Examples Bar */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[11px] text-slate-500">Examples:</span>
        {exampleQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setQuestion(q.text)}
            className="text-[11px] px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors shadow-2xs"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Input Area & Controls */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question here or use the microphone to speak..."
            rows={3}
            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors resize-none shadow-xs"
          />

          {/* Inline Microphone and Audio Upload Controls */}
          <div className="absolute right-2.5 bottom-2.5 flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => audioFileInputRef.current?.click()}
              disabled={transcribing || isRecording}
              className="p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs"
              title="Upload audio file (.wav, .mp3, .m4a, .webm) for speech-to-text"
            >
              <FileAudio className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[10px] font-medium hidden sm:inline">Audio File</span>
            </button>

            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={transcribing}
              className={`p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs ${
                isRecording
                  ? 'bg-rose-600 text-white shadow-xs'
                  : transcribing
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
              }`}
              title={isRecording ? 'Stop recording' : 'Speak question with microphone (Whisper STT)'}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono">{recordingSeconds}s</span>
                </>
              ) : transcribing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span className="text-[10px] hidden sm:inline">Transcribing...</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[10px] font-medium hidden sm:inline">Voice Mic</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Recording Indicator */}
        {isRecording && (
          <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-800">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="font-mono text-[11px]">
                Recording audio for Whisper STT ({recordingSeconds}s / 15s)
              </span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-medium shadow-xs"
            >
              Done
            </button>
          </div>
        )}

        {/* Transcribing Indicator */}
        {transcribing && (
          <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 flex-shrink-0" />
            <span className="text-[11px] font-mono">Transcribing audio with Whisper Speech-to-Text...</span>
          </div>
        )}

        {/* Mic Error Notification & Recovery Actions */}
        {micError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
              <div className="space-y-1">
                <span className="font-medium text-rose-800">{micError}</span>
                <p className="text-[11px] text-slate-600">
                  If using Chrome/Firefox/Safari: click the camera/microphone icon in the browser address bar to grant access.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-200/80">
              <button
                type="button"
                onClick={startRecording}
                className="px-2.5 py-1 rounded bg-white hover:bg-rose-50 text-rose-900 border border-rose-300 flex items-center gap-1.5 text-[11px] font-medium shadow-2xs"
              >
                <RotateCcw className="w-3 h-3 text-blue-600" />
                <span>Retry Microphone</span>
              </button>

              <button
                type="button"
                onClick={() => audioFileInputRef.current?.click()}
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 flex items-center gap-1.5 text-[11px] shadow-2xs"
              >
                <Upload className="w-3 h-3 text-blue-600" />
                <span>Upload Audio File</span>
              </button>

              <div className="flex items-center gap-1 text-[11px] text-slate-600 ml-auto">
                <span>Or sample query:</span>
                <button
                  type="button"
                  onClick={() => handleVoiceSimulate('What are the primary objectives of the project?')}
                  className="px-1.5 py-0.5 rounded bg-white text-blue-700 border border-blue-200 font-medium"
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => handleVoiceSimulate('ಕರ್ನಾಟಕದ ಪ್ರಮುಖ ನದಿಗಳು ಯಾವುವು?')}
                  className="px-1.5 py-0.5 rounded bg-white text-amber-800 border border-amber-200 font-medium"
                >
                  ಕನ್ನಡ
                </button>
                <button
                  type="button"
                  onClick={() => handleVoiceSimulate('इस परियोजना की मुख्य विशेषताएं क्या हैं?')}
                  className="px-1.5 py-0.5 rounded bg-white text-emerald-800 border border-emerald-200 font-medium"
                >
                  हिन्दी
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Row */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500 font-mono">
            {!documentLoaded ? (
              <span className="text-amber-700 font-medium">Notice: Upload document first</span>
            ) : (
              <span>Grounded neural retrieval</span>
            )}
          </span>

          <button
            type="submit"
            disabled={!question.trim() || loading || !documentLoaded}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching & Reasoning...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Ask AI</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};
