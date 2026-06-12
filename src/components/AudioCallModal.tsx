import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader, X, Volume2, PhoneCall, RefreshCw, ChevronDown } from 'lucide-react';

const API = import.meta.env.VITE_API_URL as string;
const KEY = import.meta.env.VITE_ADMIN_KEY as string;
const MAX_SECONDS = 30;

interface LangOption { code: string; label: string; }

const SOURCE_LANGS: LangOption[] = [
  { code: '',   label: '🌐 Auto-detectar' },
  { code: 'pt', label: '🇧🇷 Português' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'zh', label: '🇨🇳 中文' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'it', label: '🇮🇹 Italiano' },
  { code: 'ja', label: '🇯🇵 日本語' },
  { code: 'ko', label: '🇰🇷 한국어' },
  { code: 'ar', label: '🇸🇦 العربية' },
  { code: 'hi', label: '🇮🇳 हिन्दी' },
  { code: 'ru', label: '🇷🇺 Русский' },
];

const TARGET_LANGS: LangOption[] = [
  { code: 'en', label: '🇺🇸 English' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'pt', label: '🇧🇷 Português' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'it', label: '🇮🇹 Italiano' },
  { code: 'zh', label: '🇨🇳 中文' },
  { code: 'ja', label: '🇯🇵 日本語' },
  { code: 'ko', label: '🇰🇷 한국어' },
];

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

const PROCESS_STEPS = ['Transcrevendo áudio…', 'Traduzindo mensagem…', 'Gerando voz…'];

export default function AudioCallModal({ phone, leadName, clientId, onClose, showToast }: Props) {
  const [recording, setRecording]         = useState(false);
  const [audioBlob, setAudioBlob]         = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl]           = useState('');
  const [status, setStatus]               = useState<Status>('idle');
  const [preview, setPreview]             = useState<PreviewData | null>(null);
  const [callSid, setCallSid]             = useState('');
  const [error, setError]                 = useState('');
  const [countdown, setCountdown]         = useState(MAX_SECONDS);
  const [sourceLang, setSourceLang]       = useState<LangOption>(SOURCE_LANGS[0]);
  const [targetLang, setTargetLang]       = useState<LangOption>(TARGET_LANGS[0]);
  const [voice, setVoice]                 = useState<'female' | 'male'>('female');
  const [showLangModal, setShowLangModal] = useState(false);
  const [processStep, setProcessStep]     = useState(0);

  const mrRef    = useRef<MediaRecorder | null>(null);
  const chunks   = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    clearInterval(timerRef.current!);
    clearInterval(stepRef.current!);
  }, []);

  function startCountdown() {
    setCountdown(MAX_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { stopRecording(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function startProcessingSteps() {
    setProcessStep(0);
    stepRef.current = setInterval(() => {
      setProcessStep(prev => (prev < PROCESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 2500);
  }

  function stopProcessingSteps() {
    clearInterval(stepRef.current!);
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
      else if (MediaRecorder.isTypeSupported('audio/webm'))        opts.mimeType = 'audio/webm';
      else if (MediaRecorder.isTypeSupported('audio/mp4'))         opts.mimeType = 'audio/mp4';
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
      setError('Não foi possível acessar o microfone. Verifique as permissões do browser.');
    }
  }

  function reset() {
    setAudioBlob(null);
    setAudioUrl('');
    setStatus('idle');
    setPreview(null);
    setError('');
    setProcessStep(0);
  }

  async function processAudio() {
    if (!audioBlob) return;
    setStatus('processing');
    setError('');
    setProcessStep(0);
    startProcessingSteps();
    try {
      const baseType = audioBlob.type.split(';')[0].trim() || 'audio/mp4';
      const params = new URLSearchParams({ clientId });
      if (sourceLang.code) params.set('sourceLang', sourceLang.code);
      params.set('targetLang', targetLang.code);
      params.set('voice', voice);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);

      let r: Response;
      try {
        r = await fetch(
          `${API}/api/admin/audio-call-preview?${params}`,
          { method: 'POST', headers: { 'Content-Type': baseType, 'x-admin-key': KEY }, body: audioBlob, signal: controller.signal }
        );
      } finally {
        clearTimeout(timeout);
      }

      stopProcessingSteps();
      const data = await r.json();
      if (!r.ok) {
        const msg = data.error || `Erro ${r.status}`;
        if (r.status === 422) throw new Error('Gravação muito curta ou silenciosa. Tente novamente.');
        if (r.status === 401) throw new Error('Sem autorização — verifique a chave admin.');
        if (r.status === 404) throw new Error('Cliente não encontrado.');
        throw new Error(msg);
      }
      setPreview(data);
      setStatus('preview');
    } catch (e: any) {
      stopProcessingSteps();
      if (e.name === 'AbortError') {
        setError('Tempo limite excedido (45s). Tente com uma gravação mais curta.');
      } else {
        setError(e.message || 'Erro ao processar áudio. Tente novamente.');
      }
      setStatus('error');
    }
  }

  async function confirmCall() {
    if (!preview) return;
    setStatus('calling');
    setError('');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      let r: Response;
      try {
        r = await fetch(`${API}/api/admin/audio-call-send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': KEY },
          body: JSON.stringify({ msgId: preview.msgId, phone, clientId }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      const data = await r.json();
      if (!r.ok) {
        if (data.error?.includes('não encontrado')) throw new Error('Preview expirado — gere um novo preview e tente novamente.');
        throw new Error(data.error || `Erro ${r.status}`);
      }
      setCallSid(data.callSid);
      setStatus('done');
      showToast?.('Ligação realizada com sucesso!', 'success');
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setError('Sem resposta do servidor. Verifique se a ligação foi feita no Twilio.');
      } else {
        setError(e.message || 'Erro ao realizar ligação.');
      }
      setStatus('error');
    }
  }

  const previewAudioUrl = preview ? `${API}/webhook/voice-msg/${preview.msgId}` : '';
  const srcLabel = sourceLang.label;
  const tgtLabel = targetLang.label;
  const isProcessingOrCalling = status === 'processing' || status === 'calling';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-[#0e1035] border border-white/10 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-white/10 rounded-full" />
        </div>

        <div className="p-5 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Volume2 size={15} className="text-purple-400" /> iVox — Tradução de Voz
              </h3>
              <p className="text-xs text-white/30 mt-0.5">Para: {leadName || 'Lead'} · {phone}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 transition">
              <X size={15} />
            </button>
          </div>

          {/* ── Language Selector ── */}
          {status !== 'preview' && status !== 'calling' && status !== 'done' && (
            <button
              onClick={() => !isProcessingOrCalling && setShowLangModal(true)}
              disabled={isProcessingOrCalling}
              className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 hover:bg-white/8 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex-1 text-left">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">VOCÊ FALA</p>
                <p className="text-sm font-bold text-purple-300">{srcLabel}</p>
              </div>
              <span className="text-purple-500 font-black text-lg">→</span>
              <div className="flex-1 text-left">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">TRADUZIDO PARA</p>
                <p className="text-sm font-bold text-white">{tgtLabel}</p>
              </div>
              <ChevronDown size={14} className="text-white/30" />
            </button>
          )}

          {/* ── Voice selector — before processing ── */}
          {(status === 'idle' || status === 'error') && (
            <div>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">VOZ DA LIGAÇÃO</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setVoice('female')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition ${
                    voice === 'female'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                      : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                  }`}
                >
                  👩 Lexy
                </button>
                <button
                  onClick={() => setVoice('male')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition ${
                    voice === 'male'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                      : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                  }`}
                >
                  👨 Alex
                </button>
              </div>
            </div>
          )}

          {/* ── RECORD ── */}
          {status !== 'done' && status !== 'preview' && status !== 'calling' && (
            <>
              {!recording ? (
                <button
                  onClick={startRecording}
                  disabled={status === 'processing'}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-black rounded-2xl transition disabled:opacity-40 shadow-lg shadow-purple-500/25 min-h-[56px]"
                >
                  <Mic size={18} /> {audioBlob ? 'Regravar' : 'Gravar mensagem'}
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 hover:bg-red-600 text-white text-sm font-black rounded-2xl animate-pulse shadow-lg shadow-red-500/25 min-h-[56px]"
                >
                  <MicOff size={18} /> Parar gravação
                  <span className="ml-auto font-mono bg-red-600 px-3 py-1 rounded-xl text-sm">{countdown}s</span>
                </button>
              )}

              {audioUrl && !recording && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wide">Sua gravação</p>
                  <audio controls src={audioUrl} className="w-full h-9 rounded-xl" />
                </div>
              )}

              {audioBlob && !recording && status === 'idle' && (
                <button
                  onClick={processAudio}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-sm font-black rounded-2xl transition shadow-lg shadow-purple-500/25 min-h-[56px]"
                >
                  <Volume2 size={18} /> Processar e ouvir tradução
                </button>
              )}

              {status === 'processing' && (
                <div className="flex flex-col items-center justify-center gap-2 py-4">
                  <div className="flex items-center gap-2 text-sm text-purple-400 font-semibold">
                    <Loader size={16} className="animate-spin" />
                    {PROCESS_STEPS[processStep]}
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    {PROCESS_STEPS.map((_, i) => (
                      <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= processStep ? 'w-6 bg-purple-500' : 'w-2 bg-white/10'}`} />
                    ))}
                  </div>
                </div>
              )}

              {status === 'error' && error && (
                <div className="space-y-2">
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">{error}</p>
                  <button onClick={reset} className="w-full py-2.5 text-sm font-bold text-white/50 bg-white/5 hover:bg-white/10 rounded-xl transition">
                    Tentar novamente
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── PREVIEW ── */}
          {(status === 'preview' || status === 'calling') && preview && (
            <div className="space-y-3">
              {/* Language bar (read-only in preview) */}
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                <p className="text-xs text-purple-300 font-bold flex-1 text-center">{srcLabel}</p>
                <span className="text-purple-500 font-black">→</span>
                <p className="text-xs text-white font-bold flex-1 text-center">{tgtLabel}</p>
                <span className="text-white/30 text-xs">{voice === 'female' ? '👩 Lexy' : '👨 Alex'}</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2.5 text-xs">
                <div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-wide mb-0.5">Você disse</p>
                  <p className="text-purple-300 italic">"{preview.transcription}"</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-wide mb-0.5">O lead vai ouvir</p>
                  <p className="text-white font-semibold">"{preview.translation}"</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide flex items-center gap-1">
                  <Volume2 size={10} /> Ouça antes de ligar
                </p>
                <audio controls src={previewAudioUrl} className="w-full h-9 rounded-xl" />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={reset}
                  disabled={status === 'calling'}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 border border-white/10 text-white/40 text-sm font-semibold rounded-xl hover:bg-white/5 transition disabled:opacity-40"
                >
                  <RefreshCw size={13} /> Regravar
                </button>
                <button
                  onClick={confirmCall}
                  disabled={status === 'calling'}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-black rounded-xl transition shadow-lg shadow-green-500/25 disabled:opacity-50 min-h-[52px]"
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
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 space-y-2">
              <p className="text-xs font-black text-green-400">✅ Ligação realizada!</p>
              {preview && (
                <div className="space-y-1 text-xs">
                  <p className="text-white/50"><span className="font-semibold text-white/70">Original:</span> {preview.transcription}</p>
                  <p className="text-white/50"><span className="font-semibold text-white/70">{tgtLabel}:</span> {preview.translation}</p>
                </div>
              )}
              {callSid && <p className="text-[10px] text-white/20 font-mono">SID: {callSid}</p>}
              <button onClick={onClose} className="w-full mt-1 py-2 text-sm font-bold text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition">
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Language Modal ── */}
      {showLangModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-[60]" onClick={() => setShowLangModal(false)}>
          <div
            className="bg-[#12124a] border border-white/10 w-full sm:max-w-sm rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="text-white font-black text-base mb-4">Configurar idiomas</h4>

            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">VOCÊ FALA</p>
            <div className="space-y-1 mb-5">
              {SOURCE_LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => setSourceLang(l)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition ${
                    l.code === sourceLang.code
                      ? 'bg-purple-600/20 text-purple-300 font-bold'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  {l.label}
                  {l.code === sourceLang.code && <span className="text-purple-400 font-black">✓</span>}
                </button>
              ))}
            </div>

            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">TRADUZIDO PARA</p>
            <div className="space-y-1 mb-5">
              {TARGET_LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => setTargetLang(l)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition ${
                    l.code === targetLang.code
                      ? 'bg-purple-600/20 text-purple-300 font-bold'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  {l.label}
                  {l.code === targetLang.code && <span className="text-purple-400 font-black">✓</span>}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowLangModal(false)}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl text-sm transition"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
