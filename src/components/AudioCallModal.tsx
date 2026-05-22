import { useState, useRef } from 'react';
import { Mic, MicOff, Send, Loader, X, Volume2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL as string;
const KEY = import.meta.env.VITE_ADMIN_KEY as string;

interface Props {
  phone: string;
  leadName?: string;
  clientId: string;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

export default function AudioCallModal({ phone, leadName, clientId, onClose, showToast }: Props) {
  const [recording, setRecording]   = useState(false);
  const [audioBlob, setAudioBlob]   = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl]     = useState('');
  const [status, setStatus]         = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [result, setResult]         = useState<any>(null);
  const [error, setError]           = useState('');
  const mrRef    = useRef<MediaRecorder | null>(null);
  const chunks   = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg' });
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
      setResult(null);
    } catch {
      setError('Não foi possível acessar o microfone.');
    }
  }

  function stopRecording() {
    mrRef.current?.stop();
    setRecording(false);
  }

  async function send() {
    if (!audioBlob) return;
    setStatus('processing');
    setError('');
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload  = () => res((fr.result as string).split(',')[1]);
        fr.onerror = rej;
        fr.readAsDataURL(audioBlob);
      });
      const r = await fetch(`${API}/api/admin/send-audio-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': KEY },
        body: JSON.stringify({ audioBase64: base64, audioMimetype: audioBlob.type, phone, clientId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setResult(data);
      setStatus('done');
      showToast?.('Ligação realizada com sucesso!');
    } catch (e: any) {
      setError(e.message || 'Erro ao processar áudio');
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Handle bar (mobile) */}
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
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-lg transition">
              <X size={16} />
            </button>
          </div>

          {/* Instructions */}
          {status === 'idle' && !audioBlob && (
            <p className="text-xs text-gray-500 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 leading-relaxed">
              Grave sua mensagem em <strong>português ou espanhol</strong>. O sistema vai transcrever, traduzir para inglês, gerar a voz e ligar para o lead automaticamente.
            </p>
          )}

          {/* Record button */}
          {!recording ? (
            <button
              onClick={startRecording}
              disabled={status === 'processing'}
              className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-sm font-black rounded-xl transition disabled:opacity-40 shadow-lg shadow-purple-500/25"
            >
              <Mic size={15} /> {audioBlob ? 'Regravar mensagem' : 'Gravar mensagem'}
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 active:bg-red-600 text-white text-sm font-black rounded-xl transition animate-pulse shadow-lg shadow-red-500/25"
            >
              <MicOff size={15} /> Parar gravação
            </button>
          )}

          {/* Audio preview */}
          {audioUrl && !recording && (
            <audio controls src={audioUrl} className="w-full h-9 rounded-xl" />
          )}

          {/* Send button */}
          {audioBlob && !recording && status !== 'done' && (
            <button
              onClick={send}
              disabled={status === 'processing'}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-black rounded-xl transition shadow-lg shadow-green-500/25 disabled:opacity-50"
            >
              {status === 'processing'
                ? <><Loader size={15} className="animate-spin" /> Processando…</>
                : <><Send size={15} /> Ligar com esta mensagem</>
              }
            </button>
          )}

          {/* Result */}
          {status === 'done' && result && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-black text-green-700 flex items-center gap-1.5">✅ Ligação realizada!</p>
              <div className="space-y-1">
                <p className="text-xs text-gray-600"><span className="font-semibold text-gray-700">Transcrito:</span> {result.transcription}</p>
                <p className="text-xs text-gray-600"><span className="font-semibold text-gray-700">Traduzido:</span> {result.translation}</p>
                <p className="text-[10px] text-gray-400 font-mono">SID: {result.callSid}</p>
              </div>
              <button onClick={onClose} className="w-full mt-1 py-2 text-sm font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-xl transition">
                Fechar
              </button>
            </div>
          )}

          {/* Error */}
          {status === 'error' && error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
