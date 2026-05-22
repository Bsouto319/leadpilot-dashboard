import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader, X, Volume2, PhoneCall, RefreshCw } from 'lucide-react';

const API = import.meta.env.VITE_API_URL as string;
const KEY = import.meta.env.VITE_ADMIN_KEY as string;
const MAX_SECONDS = 30;

interface Props {
  phone: string;
  leadName?: string;
  clientId: string;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

type Status = 'idle' | 'processing' | 'preview' | 'calling' | 'done' | 'error';

interface PreviewData {
  msgId: string;
  transcription: string;
  translation: string;
}

export default function AudioCallModal({ phone, leadName, clientId, onClose, showToast }: Props) {
  const [recording, setRecording]     = useState(false);
  const [audioBlob, setAudioBlob]     = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl]       = useState('');
  const [status, setStatus]           = useState<Status>('idle');
  const [preview, setPreview]         = useState<PreviewData | null>(null);
  const [callSid, setCallSid]         = useState('');
  const [error, setError]             = useState('');
  const [countdown, setCountdown]     = useState(MAX_SECONDS);
  const mrRef      = useRef<MediaRecorder | null>(null);
  const chunks     = useRef<Blob[]>([]);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { clearInterval(timerRef.current!); }, []);

  function startCountdown() {
    setCountdown(MAX_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { stopRecording(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function stopRecording() {
    clearInterval(timerRef.current!);
    mrRef.current?.stop();
    setRecording(false);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const opts: MediaRecorderOptions = { audioBitsPerSecond: 24000 };
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) opts.mimeType = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/webm')) opts.mimeType = 'audio/webm';
      else if (MediaRecorder.isTypeSupported('audio/mp4')) opts.mimeType = 'audio/mp4'; // iOS Safari
      const mr = new MediaRecorder(stream, opts);
      chunks.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: mr.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mrRef.current = mr;
      setRecording(true);
      setAudioBlob(null);
      setAudioUrl('');
      setStatus('idle');
      setPreview(null);
      setError('');
      startCountdown();
    } catch {
      setError('Não foi possível acessar o microfone.');
    }
  }

  function reset() {
    setAudioBlob(null);
    setAudioUrl('');
    setStatus('idle');
    setPreview(null);
    setError('');
  }

  async function processAudio() {
    if (!audioBlob) return;
    setStatus('processing');
    setError('');
    try {
      // Strip codec params from content-type (e.g. "audio/webm; codecs=opus" → "audio/webm")
      const baseType = audioBlob.type.split(';')[0].trim() || 'audio/mp4';
      const r = await fetch(
        `${API}/api/admin/audio-call-preview?clientId=${encodeURIComponent(clientId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': baseType, 'x-admin-key': KEY },
          body: audioBlob,
        }
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setPreview(data);
      setStatus('preview');
    } catch (e: any) {
      setError(e.message || 'Erro ao processar áudio');
      setStatus('error');
    }
  }

  async function confirmCall() {
    if (!preview) return;
    setStatus('calling');
    setError('');
    try {
      const r = await fetch(`${API}/api/admin/audio-call-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': KEY },
        body: JSON.stringify({ msgId: preview.msgId, phone, clientId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setCallSid(data.callSid);
      setStatus('done');
      showToast?.('Ligação realizada com sucesso!');
    } catch (e: any) {
      setError(e.message || 'Erro ao realizar ligação');
      setStatus('error');
    }
  }

  const previewAudioUrl = preview ? `${API}/webhook/voice-msg/${preview.msgId}` : '';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Volume2 size={16} className="text-purple-500" /> Áudio PT/ES → Ligação EN
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Para: {leadName || 'Lead'} · {phone}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition">
              <X size={16} />
            </button>
          </div>

          {/* ── RECORD ── */}
          {status !== 'done' && status !== 'preview' && status !== 'calling' && (
            <>
              {!audioBlob && !recording && (
                <p className="text-xs text-gray-500 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 leading-relaxed">
                  Grave em <strong>português ou espanhol</strong> (máx. {MAX_SECONDS}s). O sistema transcreve, traduz e você ouve antes de ligar.
                </p>
              )}

              {!recording ? (
                <button
                  onClick={startRecording}
                  disabled={status === 'processing'}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-purple-600 active:bg-purple-800 text-white text-sm font-black rounded-2xl transition disabled:opacity-40 shadow-lg shadow-purple-500/25 min-h-[56px]"
                >
                  <Mic size={18} /> {audioBlob ? 'Regravar' : 'Gravar mensagem'}
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 active:bg-red-700 text-white text-sm font-black rounded-2xl animate-pulse shadow-lg shadow-red-500/25 min-h-[56px]"
                >
                  <MicOff size={18} /> Parar gravação
                  <span className="ml-auto text-base font-mono bg-red-600 px-3 py-1 rounded-xl">
                    {countdown}s
                  </span>
                </button>
              )}

              {audioUrl && !recording && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sua gravação</p>
                  <audio controls src={audioUrl} className="w-full h-9 rounded-xl" />
                </div>
              )}

              {audioBlob && !recording && status === 'idle' && (
                <button
                  onClick={processAudio}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 active:from-purple-700 active:to-indigo-800 text-white text-sm font-black rounded-2xl transition shadow-lg shadow-purple-500/25 min-h-[56px]"
                >
                  <Volume2 size={18} /> Processar e ouvir tradução
                </button>
              )}

              {status === 'processing' && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-purple-600 font-semibold">
                  <Loader size={16} className="animate-spin" /> Transcrevendo e traduzindo…
                </div>
              )}

              {status === 'error' && error && (
                <div className="space-y-2">
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">{error}</p>
                  <button onClick={reset} className="w-full py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                    Tentar novamente
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── PREVIEW ── */}
          {(status === 'preview' || status === 'calling') && preview && (
            <div className="space-y-3">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2 text-xs">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-0.5">Transcrito (PT/ES)</p>
                  <p className="text-gray-700 italic">"{preview.transcription}"</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-0.5">Voz que o lead vai ouvir (EN)</p>
                  <p className="text-gray-900 font-semibold">"{preview.translation}"</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide flex items-center gap-1">
                  <Volume2 size={10} /> Ouça antes de ligar
                </p>
                <audio controls src={previewAudioUrl} className="w-full h-9 rounded-xl" />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={reset}
                  disabled={status === 'calling'}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50 transition disabled:opacity-40"
                >
                  <RefreshCw size={13} /> Regravar
                </button>
                <button
                  onClick={confirmCall}
                  disabled={status === 'calling'}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 active:from-green-700 active:to-emerald-800 text-white text-sm font-black rounded-xl transition shadow-lg shadow-green-500/25 disabled:opacity-50 min-h-[52px]"
                >
                  {status === 'calling'
                    ? <><Loader size={15} className="animate-spin" /> Ligando…</>
                    : <><PhoneCall size={15} /> Confirmar e Ligar</>}
                </button>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {status === 'done' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-black text-green-700">✅ Ligação realizada!</p>
              {preview && (
                <div className="space-y-1 text-xs">
                  <p className="text-gray-600"><span className="font-semibold">PT:</span> {preview.transcription}</p>
                  <p className="text-gray-600"><span className="font-semibold">EN:</span> {preview.translation}</p>
                </div>
              )}
              {callSid && <p className="text-[10px] text-gray-400 font-mono">SID: {callSid}</p>}
              <button onClick={onClose} className="w-full mt-1 py-2 text-sm font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-xl transition">
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
