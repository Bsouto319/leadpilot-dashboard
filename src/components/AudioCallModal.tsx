import { useState, useRef } from 'react';
import { Mic, MicOff, Send, Loader, X, Volume2, PhoneCall, RefreshCw } from 'lucide-react';

const API = import.meta.env.VITE_API_URL as string;
const KEY = import.meta.env.VITE_ADMIN_KEY as string;

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
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl]   = useState('');
  const [status, setStatus]       = useState<Status>('idle');
  const [preview, setPreview]     = useState<PreviewData | null>(null);
  const [callSid, setCallSid]     = useState('');
  const [error, setError]         = useState('');
  const mrRef   = useRef<MediaRecorder | null>(null);
  const chunks  = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
      });
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
    } catch {
      setError('Não foi possível acessar o microfone.');
    }
  }

  function stopRecording() {
    mrRef.current?.stop();
    setRecording(false);
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
      const r = await fetch(`${API}/api/admin/audio-call-preview?clientId=${encodeURIComponent(clientId)}`, {
        method: 'POST',
        headers: { 'Content-Type': audioBlob.type, 'x-admin-key': KEY },
        body: audioBlob,
      });
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
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Volume2 size={16} className="text-purple-500" /> Áudio PT/ES → Ligação EN
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Para: {leadName || 'Lead'} · {phone}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition">
              <X size={16} />
            </button>
          </div>

          {/* ── STEP 1: RECORD ── */}
          {status !== 'done' && (
            <>
              {status === 'idle' && !audioBlob && (
                <p className="text-xs text-gray-500 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 leading-relaxed">
                  Grave sua mensagem em <strong>português ou espanhol</strong>. O sistema vai transcrever, traduzir para inglês, gerar a voz e você ouve antes de ligar.
                </p>
              )}

              {!recording ? (
                <button
                  onClick={startRecording}
                  disabled={status === 'processing' || status === 'calling'}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-sm font-black rounded-xl transition disabled:opacity-40 shadow-lg shadow-purple-500/25"
                >
                  <Mic size={15} /> {audioBlob ? 'Regravar' : 'Gravar mensagem'}
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 active:bg-red-600 text-white text-sm font-black rounded-xl transition animate-pulse shadow-lg shadow-red-500/25"
                >
                  <MicOff size={15} /> Parar gravação
                </button>
              )}

              {/* Original audio preview */}
              {audioUrl && !recording && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sua gravação</p>
                  <audio controls src={audioUrl} className="w-full h-9 rounded-xl" />
                </div>
              )}

              {/* Process button */}
              {audioBlob && !recording && status === 'idle' && (
                <button
                  onClick={processAudio}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-sm font-black rounded-xl transition shadow-lg shadow-purple-500/25"
                >
                  <Send size={15} /> Processar e ouvir tradução
                </button>
              )}

              {/* Processing spinner */}
              {status === 'processing' && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-purple-600 font-semibold">
                  <Loader size={16} className="animate-spin" /> Transcrevendo e traduzindo…
                </div>
              )}
            </>
          )}

          {/* ── STEP 2: PREVIEW ── */}
          {(status === 'preview' || status === 'calling') && preview && (
            <div className="space-y-3">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2 text-xs">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-0.5">Transcrito (PT/ES)</p>
                  <p className="text-gray-700 italic">"{preview.transcription}"</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-0.5">Traduzido (EN) — voz que o lead vai ouvir</p>
                  <p className="text-gray-900 font-semibold">"{preview.translation}"</p>
                </div>
              </div>

              {/* English TTS audio preview */}
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide flex items-center gap-1">
                  <Volume2 size={10} /> Ouça a voz em inglês antes de ligar
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
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-black rounded-xl transition shadow-lg shadow-green-500/25 disabled:opacity-50"
                >
                  {status === 'calling'
                    ? <><Loader size={15} className="animate-spin" /> Ligando…</>
                    : <><PhoneCall size={15} /> Confirmar e Ligar</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: DONE ── */}
          {status === 'done' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-black text-green-700 flex items-center gap-1.5">✅ Ligação realizada!</p>
              {preview && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-600"><span className="font-semibold">Transcrito:</span> {preview.transcription}</p>
                  <p className="text-xs text-gray-600"><span className="font-semibold">Traduzido:</span> {preview.translation}</p>
                </div>
              )}
              {callSid && <p className="text-[10px] text-gray-400 font-mono">SID: {callSid}</p>}
              <button onClick={onClose} className="w-full mt-1 py-2 text-sm font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-xl transition">
                Fechar
              </button>
            </div>
          )}

          {/* Error */}
          {status === 'error' && error && (
            <div className="space-y-2">
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">{error}</p>
              <button onClick={reset} className="w-full py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
