import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, PhoneCall, RefreshCw } from 'lucide-react';
import { Device, Call } from '@twilio/voice-sdk';

type Status = 'loading' | 'idle' | 'ringing' | 'active' | 'error';

export default function Dialpad() {
  const [status, setStatus]     = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [fromNumber, setFromNumber] = useState('+19418456110');
  const deviceRef = useRef<Device | null>(null);
  const callRef   = useRef<Call | null>(null);

  useEffect(() => {
    initDevice();
    return () => { deviceRef.current?.destroy(); };
  }, []);

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
      device.on('error', (err: Error) => {
        setStatus('error');
        setErrorMsg(err.message);
      });
      deviceRef.current = device;
      setStatus('idle');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Falha ao conectar com Twilio');
    }
  }

  function normalizePhone(raw: string): string | null {
    const s = raw.replace(/[\s\-\(\)\+\.]/g, '');
    if (/^\d{10}$/.test(s)) return `+1${s}`;                // US sem código
    if (/^\d{11}$/.test(s) && s[0] === '1') return `+${s}`; // US com 1
    if (/^\d{7,15}$/.test(s)) return `+${s}`;               // qualquer internacional (BR, etc.)
    return null;
  }

  async function dial() {
    if (!deviceRef.current || status !== 'idle') return;
    const to = normalizePhone(phoneInput);
    if (!to) {
      setStatus('error');
      setErrorMsg('Número inválido. Use: +15551234567 ou +5561999990000');
      return;
    }
    setStatus('ringing');
    try {
      const call = await deviceRef.current.connect({ params: { To: to } });
      callRef.current = call;
      call.on('accept', () => setStatus('active'));
      call.on('disconnect', () => { callRef.current = null; setStatus('idle'); });
      call.on('error', (err: Error) => {
        callRef.current = null;
        setStatus('error');
        setErrorMsg(err.message);
      });
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

  const statusConfig: Record<Status, { label: string; cls: string }> = {
    loading: { label: 'Conectando ao Twilio...', cls: 'bg-blue-50 text-blue-500' },
    idle:    { label: 'Pronto para ligar',       cls: 'bg-gray-50 text-gray-400' },
    ringing: { label: 'Ligando...',              cls: 'bg-amber-50 text-amber-600' },
    active:  { label: 'Em ligação',              cls: 'bg-green-50 text-green-600' },
    error:   { label: errorMsg || 'Erro',        cls: 'bg-red-50 text-red-500' },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 max-w-sm p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Ligar para Lead</h3>
        <p className="text-xs text-gray-400 mt-0.5">Saindo de: {fromNumber}</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Número do Lead</label>
        <input
          type="tel"
          value={phoneInput}
          onChange={e => setPhoneInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !busy && dial()}
          placeholder="+15557891234 ou +5561999990000"
          disabled={busy}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        />
      </div>

      <div className="flex gap-2">
        {!busy ? (
          <button
            onClick={dial}
            disabled={status === 'loading' || status === 'error'}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-40"
          >
            <Phone size={15} /> Ligar
          </button>
        ) : (
          <button
            onClick={hangup}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
          >
            <PhoneOff size={15} /> {status === 'ringing' ? 'Cancelar' : 'Desligar'}
          </button>
        )}
        {status === 'error' && (
          <button
            onClick={initDevice}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition"
            title="Reconectar"
          >
            <RefreshCw size={15} />
          </button>
        )}
      </div>

      <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${statusConfig[status].cls}`}>
        <PhoneCall size={14} className={status === 'active' ? 'animate-pulse' : ''} />
        <span className="truncate">{statusConfig[status].label}</span>
      </div>
    </div>
  );
}
