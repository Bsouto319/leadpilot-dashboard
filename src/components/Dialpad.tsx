import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, PhoneCall, PhoneIncoming, RefreshCw, ToggleLeft, ToggleRight, Wifi } from 'lucide-react';
import { Device, Call } from '@twilio/voice-sdk';

type Status = 'disconnected' | 'loading' | 'idle' | 'ringing' | 'active' | 'error';

const RESTRICTED_CODES = new Set([21216, 13225, 31005, 31009]);

function friendlyError(err: any): string {
  const code = err?.code ?? err?.twilioError?.code;
  const msg  = (err?.message || '').toLowerCase();
  if (RESTRICTED_CODES.has(code) || msg.includes('not allowed') || msg.includes('blacklisted')) {
    return `⚠️ Conta restrita pelo provedor — Twilio bloqueou ligações +1 nesta conta (Ticket #26755104). Aguardar liberação do suporte.`;
  }
  return err?.message || 'Erro desconhecido';
}

export default function Dialpad() {
  const [status, setStatus]             = useState<Status>('disconnected');
  const [errorMsg, setErrorMsg]         = useState('');
  const [callSid, setCallSid]           = useState('');
  const [phoneInput, setPhoneInput]     = useState('');
  const [fromNumber, setFromNumber]     = useState('+19418456110');
  const [manualMode, setManualMode]     = useState(false);
  const [clientId, setClientId]         = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [callerNumber, setCallerNumber] = useState('');
  const deviceRef = useRef<Device | null>(null);
  const callRef   = useRef<Call | null>(null);

  useEffect(() => {
    loadClient();
    return () => { deviceRef.current?.destroy(); };
  }, []);

  async function loadClient() {
    try {
      const resp = await fetch('/api/clients', {
        headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_KEY || '' },
      });
      if (!resp.ok) return;
      const clients = await resp.json();
      if (Array.isArray(clients) && clients.length > 0) {
        setClientId(clients[0].id);
        setManualMode(!!clients[0].manual_mode);
      }
    } catch {}
  }

  // Precisa de interação do usuário antes de inicializar (iOS Safari exige isso para microfone)
  async function initDevice() {
    setStatus('loading');
    setErrorMsg('');
    try {
      const resp = await fetch('/api/voice-token', {
        method: 'POST',
        headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_KEY || '' },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);

      if (data.fromNumber) setFromNumber(data.fromNumber);

      deviceRef.current?.destroy();
      const device = new Device(data.token, { logLevel: 1 });

      device.on('error', (err: any) => {
        setStatus('error');
        setErrorMsg(friendlyError(err));
      });

      device.on('incoming', (call: Call) => {
        const caller = call.parameters.From || 'Número desconhecido';
        setCallerNumber(caller);
        setIncomingCall(call);
        call.on('disconnect', () => { setIncomingCall(null); setCallerNumber(''); setStatus('idle'); });
        call.on('cancel',     () => { setIncomingCall(null); setCallerNumber(''); });
      });

      deviceRef.current = device;
      await device.register();
      setStatus('idle');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Falha ao conectar com Twilio');
    }
  }

  function acceptCall() {
    if (!incomingCall) return;
    incomingCall.accept();
    callRef.current = incomingCall;
    setIncomingCall(null);
    setStatus('active');
    incomingCall.on('disconnect', () => { callRef.current = null; setStatus('idle'); });
    incomingCall.on('error', (err: Error) => { callRef.current = null; setStatus('error'); setErrorMsg(err.message); });
  }

  function rejectCall() {
    if (!incomingCall) return;
    incomingCall.reject();
    setIncomingCall(null);
    setCallerNumber('');
  }

  async function toggleManualMode() {
    if (!clientId) return;
    const newMode = !manualMode;
    setManualMode(newMode);
    try {
      const r = await fetch('/api/clients', {
        method: 'PATCH',
        headers: {
          'x-admin-key': import.meta.env.VITE_ADMIN_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: clientId, manual_mode: newMode }),
      });
      if (!r.ok) setManualMode(!newMode);
    } catch {
      setManualMode(!newMode);
    }
  }

  function normalizePhone(raw: string): string | null {
    const s = raw.replace(/[\s\-\(\)\+\.]/g, '');
    if (/^\d{10}$/.test(s)) return `+1${s}`;
    if (/^\d{11}$/.test(s) && s[0] === '1') return `+${s}`;
    if (/^\d{7,15}$/.test(s)) return `+${s}`;
    return null;
  }

  async function dial() {
    if (!deviceRef.current || status !== 'idle') return;
    const to = normalizePhone(phoneInput);
    if (!to) {
      setStatus('error');
      setErrorMsg('Número inválido. Ex: (555) 789-1234 ou +5561999990000');
      return;
    }
    setStatus('ringing');
    try {
      const call = await deviceRef.current.connect({ params: { To: to } });
      callRef.current = call;
      const sid = (call as any).parameters?.CallSid || '';
      if (sid) setCallSid(sid);
      call.on('accept',     () => setStatus('active'));
      call.on('disconnect', () => { callRef.current = null; setStatus('idle'); setCallSid(''); });
      call.on('error',      (err: any) => { callRef.current = null; setStatus('error'); setCallSid(''); setErrorMsg(friendlyError(err)); });
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  }

  function hangup() {
    callRef.current?.disconnect();
    deviceRef.current?.disconnectAll();
    callRef.current = null;
    setStatus('idle');
  }

  const busy = status === 'ringing' || status === 'active';

  // ── TELA: não conectado ainda ──
  if (status === 'disconnected') {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-sm max-w-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Softphone</h3>
          <p className="text-sm text-gray-400 mt-0.5">Saindo de: {fromNumber}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
            <Wifi size={22} className="text-blue-500" />
          </div>
          <p className="text-sm text-gray-600">Toque para ativar o softphone.<br/>O browser vai pedir acesso ao microfone.</p>
          <button
            onClick={initDevice}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-blue-500/25 touch-manipulation"
          >
            <Phone size={16} /> Conectar
          </button>
        </div>
      </div>
    );
  }

  const statusConfig: Record<Status, { label: string; cls: string }> = {
    disconnected: { label: '', cls: '' },
    loading:  { label: 'Conectando…',      cls: 'bg-blue-50 text-blue-500' },
    idle:     { label: 'Pronto para ligar', cls: 'bg-gray-50 text-gray-400' },
    ringing:  { label: 'Ligando…',         cls: 'bg-amber-50 text-amber-600' },
    active:   { label: 'Em ligação',       cls: 'bg-green-50 text-green-600' },
    error:    { label: errorMsg || 'Erro', cls: 'bg-red-50 text-red-500' },
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-sm max-w-sm p-5 space-y-4">

      {/* Banner de ligação recebida */}
      {incomingCall && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-700 font-bold">
            <PhoneIncoming size={16} className="animate-bounce" />
            <span>Lead Ligando</span>
          </div>
          <p className="text-sm text-green-700 font-mono font-semibold">{callerNumber}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={acceptCall}
              className="flex items-center justify-center gap-2 py-3 bg-green-600 active:bg-green-700 text-white text-sm font-bold rounded-xl transition touch-manipulation"
            >
              <Phone size={15} /> Atender
            </button>
            <button
              onClick={rejectCall}
              className="flex items-center justify-center gap-2 py-3 bg-red-600 active:bg-red-700 text-white text-sm font-bold rounded-xl transition touch-manipulation"
            >
              <PhoneOff size={15} /> Rejeitar
            </button>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-base font-bold text-gray-900">Softphone</h3>
        <p className="text-xs text-gray-400 mt-0.5">Saindo de: {fromNumber}</p>
      </div>

      {/* Toggle modo manual */}
      <button
        onClick={toggleManualMode}
        disabled={!clientId}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition touch-manipulation ${
          manualMode
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : 'border-gray-200 bg-gray-50 text-gray-500'
        } disabled:opacity-40`}
      >
        <div className="text-left">
          <p className="text-sm font-semibold">
            {manualMode ? '📞 Atender manualmente: ON' : '🤖 IA atende: ON'}
          </p>
          <p className="text-xs opacity-60 mt-0.5">
            {manualMode ? 'Ligações tocam aqui · IA assume em 20s' : 'Ative para atender pessoalmente'}
          </p>
        </div>
        {manualMode
          ? <ToggleRight size={24} className="text-blue-600 shrink-0 ml-2" />
          : <ToggleLeft  size={24} className="text-gray-400 shrink-0 ml-2" />
        }
      </button>

      {/* Input de número */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Número do Lead</label>
        <input
          type="tel"
          value={phoneInput}
          onChange={e => setPhoneInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !busy && dial()}
          placeholder="+1 (555) 789-1234"
          disabled={busy}
          inputMode="tel"
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 touch-manipulation"
        />
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2">
        {!busy ? (
          <button
            onClick={dial}
            disabled={status === 'loading' || status === 'error'}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-green-500 to-green-600 active:from-green-600 active:to-green-700 text-white text-sm font-bold rounded-xl transition shadow-md shadow-green-500/25 disabled:opacity-40 touch-manipulation"
          >
            <Phone size={16} /> Ligar
          </button>
        ) : (
          <button
            onClick={hangup}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-red-600 active:bg-red-700 text-white text-sm font-bold rounded-xl transition touch-manipulation"
          >
            <PhoneOff size={16} /> {status === 'ringing' ? 'Cancelar' : 'Desligar'}
          </button>
        )}
        {(status === 'error' || status === 'idle') && (
          <button
            onClick={initDevice}
            className="px-4 py-3.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition touch-manipulation"
            title="Reconectar"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {/* Status bar */}
      <div className={`text-sm px-3 py-2.5 rounded-xl ${statusConfig[status].cls}`}>
        <div className="flex items-center gap-2">
          <PhoneCall size={14} className={status === 'active' ? 'animate-pulse' : ''} />
          <span className="truncate font-medium">{statusConfig[status].label}</span>
        </div>
        {callSid && (
          <p className="text-xs opacity-50 mt-1 font-mono truncate">SID: {callSid}</p>
        )}
      </div>
    </div>
  );
}
