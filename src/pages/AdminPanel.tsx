import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, Calendar, TrendingUp,
  Eye, Edit2, Plus, RefreshCw, LogOut, ToggleLeft,
  ToggleRight, CheckCircle, XCircle, Building2,
} from 'lucide-react';

interface Client {
  id: string;
  business_name: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string;
  twilio_number: string;
  twilio_account_sid: string | null;
  active: boolean;
  niche: string;
  timezone: string;
  manual_mode: boolean;
  voice_enabled: boolean;
  ai_system_prompt: string | null;
  alert_phone: string | null;
  google_review_link: string | null;
  call_start_hour: number;
  call_end_hour: number;
  created_at: string;
  conversations: { count: number }[];
}

const NICHES = ['general', 'flooring', 'tile', 'cleaning', 'landscaping', 'painting', 'roofing', 'hvac', 'plumbing', 'electrical'];
const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix'];
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || '';

export default function AdminPanel({ onViewClient }: { onViewClient: (c: any) => void }) {
  const [clients, setClients]       = useState<Client[]>([]);
  const [stats, setStats]           = useState<any>(null);
  const [errors, setErrors]         = useState<any[]>([]);
  const [tab, setTab]               = useState<'clients' | 'errors'>('clients');
  const [loading, setLoading]       = useState(true);
  const [editTarget, setEditTarget]       = useState<Client | null>(null);
  const [inviteOpen, setInviteOpen]       = useState(false);
  const [subCreating, setSubCreating]     = useState<string | null>(null);
  const [toast, setToast]                 = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    const today   = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

    const [clientsRes, totalRes, todayRes, weekRes, schedRes, errorsRes] = await Promise.all([
      supabase.from('clients').select('*, conversations(count)').order('created_at', { ascending: false }),
      supabase.from('conversations').select('id', { count: 'exact' }),
      supabase.from('conversations').select('id', { count: 'exact' }).gte('created_at', today.toISOString()),
      supabase.from('conversations').select('id', { count: 'exact' }).gte('created_at', weekAgo.toISOString()),
      supabase.from('conversations').select('id', { count: 'exact' }).eq('stage', 'scheduled'),
      supabase.from('system_errors').select('*').order('created_at', { ascending: false }).limit(30),
    ]);

    const all = clientsRes.data || [];
    setClients(all);
    setStats({
      totalLeads:    totalRes.count || 0,
      leadsToday:    todayRes.count || 0,
      leadsWeek:     weekRes.count  || 0,
      scheduled:     schedRes.count || 0,
      activeClients: all.filter((c: Client) => c.active).length,
    });
    setErrors(errorsRes.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createSubaccount(c: Client) {
    setSubCreating(c.id);
    try {
      const r = await fetch(`/api/admin/clients/${c.id}/create-subaccount`, {
        method: 'POST',
        headers: { 'x-admin-key': ADMIN_KEY },
      });
      const data = await r.json();
      if (!r.ok) { showToast(data.error || 'Erro ao criar subconta', false); return; }
      showToast(`Subconta criada: ${data.subaccountSid}`);
      load();
    } catch {
      showToast('Erro ao criar subconta', false);
    } finally {
      setSubCreating(null);
    }
  }

  async function saveEdit(fields: Partial<Client>) {
    if (!editTarget) return;
    const { error } = await supabase.from('clients').update(fields).eq('id', editTarget.id);
    if (error) { showToast(error.message, false); return; }
    showToast('Saved!');
    load();
    setEditTarget(null);
  }

  async function toggleActive(c: Client) {
    const { error } = await supabase.from('clients').update({ active: !c.active }).eq('id', c.id);
    if (error) { showToast(error.message, false); return; }
    showToast(`${c.business_name} ${!c.active ? 'activated' : 'deactivated'}`);
    load();
  }

  const kpis = stats ? [
    { label: 'Active Clients', value: stats.activeClients, icon: Building2, gradient: 'from-blue-500 to-blue-600',       glow: 'shadow-blue-500/25' },
    { label: 'Total Leads',    value: stats.totalLeads,    icon: Users,     gradient: 'from-emerald-500 to-green-600',   glow: 'shadow-emerald-500/25' },
    { label: 'This Week',      value: stats.leadsWeek,     icon: TrendingUp,gradient: 'from-violet-500 to-purple-600',  glow: 'shadow-violet-500/25' },
    { label: 'Scheduled',      value: stats.scheduled,     icon: Calendar,  gradient: 'from-orange-500 to-amber-500',   glow: 'shadow-orange-500/25' },
  ] : [];

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 sticky top-0 z-30 shadow-xl shadow-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/40 shrink-0">
              <span className="text-white text-base font-black">L</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold text-blue-300 uppercase tracking-widest leading-none">LeadPilot</p>
                <span className="text-[10px] font-black bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full">ADMIN</span>
              </div>
              <p className="text-base font-bold text-white leading-none mt-0.5">Bruno Souto</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <nav className="flex gap-0.5">
              {(['clients', 'errors'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition border-b-2 whitespace-nowrap capitalize ${
                    tab === t ? 'text-white border-blue-400' : 'text-slate-400 hover:text-slate-200 border-transparent'
                  }`}
                >
                  {t === 'errors' && errors.length > 0 && (
                    <span className="w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {errors.length > 9 ? '9+' : errors.length}
                    </span>
                  )}
                  {t === 'clients' ? 'Clients' : 'Errors'}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-fade-in-up">
          {kpis.map(k => (
            <div key={k.label} className={`bg-gradient-to-br ${k.gradient} rounded-2xl p-4 md:p-5 shadow-lg ${k.glow} text-white`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wide">{k.label}</span>
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <k.icon size={14} className="text-white" />
                </div>
              </div>
              <p className="text-3xl md:text-4xl font-black">{k.value ?? '–'}</p>
            </div>
          ))}
        </div>

        {/* ── CLIENTS TAB ── */}
        {tab === 'clients' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{clients.length} contractor{clients.length !== 1 ? 's' : ''}</h2>
              <button
                onClick={() => setInviteOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/25 transition touch-manipulation"
              >
                <Plus size={15} /> New Client
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {clients.map(c => {
                const leads = c.conversations?.[0]?.count ?? 0;
                return (
                  <div key={c.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-sm p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                          <span className="text-white font-bold">{(c.business_name || '?')[0].toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{c.business_name}</p>
                          <p className="text-xs text-gray-400 truncate">{c.owner_email || c.owner_phone}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleActive(c)}
                        className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          c.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-50 text-gray-400 border-gray-200'
                        }`}
                      >
                        {c.active ? '● Active' : '○ Inactive'}
                      </button>
                    </div>

                    <div className="flex gap-2 text-xs text-gray-500 flex-wrap">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full capitalize">{c.niche}</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full">{leads} lead{leads !== 1 ? 's' : ''}</span>
                      {c.manual_mode && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Manual</span>}
                      {!c.voice_enabled && <span className="bg-gray-100 px-2 py-0.5 rounded-full">Voice OFF</span>}
                      {c.twilio_account_sid
                        ? <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Subconta ✓</span>
                        : <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Conta principal</span>
                      }
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onViewClient({ id: c.id, business_name: c.business_name })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl transition touch-manipulation"
                      >
                        <Eye size={14} /> View
                      </button>
                      <button
                        onClick={() => setEditTarget(c)}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition touch-manipulation"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      {!c.twilio_account_sid && (
                        <button
                          onClick={() => createSubaccount(c)}
                          disabled={subCreating === c.id}
                          title="Criar subconta Twilio isolada"
                          className="flex items-center justify-center px-3 py-2.5 text-sm font-semibold text-violet-700 bg-violet-100 hover:bg-violet-200 rounded-xl transition touch-manipulation disabled:opacity-40"
                        >
                          {subCreating === c.id ? '…' : '⊕'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!clients.length && !loading && (
              <div className="text-center py-16 text-gray-400">
                <Building2 size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No clients yet. Click "New Client" to add one.</p>
              </div>
            )}
          </div>
        )}

        {/* ── ERRORS TAB ── */}
        {tab === 'errors' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-sm overflow-hidden animate-fade-in-up">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Recent System Errors</h2>
            </div>
            {errors.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <CheckCircle size={32} className="mx-auto mb-2 opacity-40 text-emerald-400" />
                <p className="text-sm">No errors logged.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {errors.map(e => (
                  <div key={e.id} className="p-4 hover:bg-gray-50/50">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        e.level === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                      }`}>{e.level}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-500 mb-0.5">{e.service}</p>
                        <p className="text-sm text-gray-800 break-words">{e.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(e.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editTarget && (
        <EditModal
          client={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={saveEdit}
        />
      )}

      {/* Invite Modal */}
      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onDone={() => { setInviteOpen(false); load(); showToast('Client created!'); }}
          adminKey={ADMIN_KEY}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white animate-fade-in-up ${
          toast.ok ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── EDIT MODAL ───────────────────────────────────────────────────────────────

function EditModal({ client, onClose, onSave }: {
  client: Client;
  onClose: () => void;
  onSave: (fields: any) => void;
}) {
  const [f, setF] = useState({
    business_name:     client.business_name,
    owner_name:        client.owner_name       || '',
    owner_email:       client.owner_email      || '',
    owner_phone:       client.owner_phone      || '',
    twilio_number:     client.twilio_number    || '',
    active:            client.active,
    manual_mode:       client.manual_mode,
    voice_enabled:     client.voice_enabled,
    niche:             client.niche            || 'general',
    timezone:          client.timezone         || 'America/New_York',
    alert_phone:       client.alert_phone      || '',
    google_review_link:client.google_review_link || '',
    call_start_hour:   client.call_start_hour  ?? 8,
    call_end_hour:     client.call_end_hour    ?? 20,
    ai_system_prompt:  client.ai_system_prompt || '',
  });
  const [saving, setSaving] = useState(false);

  const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(f);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">Edit Client</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition">×</button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Business Name</label>
                <input className={inp} value={f.business_name} onChange={e => setF(p => ({ ...p, business_name: e.target.value }))} required />
              </div>
              <div>
                <label className={lbl}>Owner Name</label>
                <input className={inp} value={f.owner_name} onChange={e => setF(p => ({ ...p, owner_name: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Owner Email</label>
                <input className={inp} type="email" value={f.owner_email} onChange={e => setF(p => ({ ...p, owner_email: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Owner Phone</label>
                <input className={inp} value={f.owner_phone} onChange={e => setF(p => ({ ...p, owner_phone: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Alert Phone</label>
                <input className={inp} value={f.alert_phone} onChange={e => setF(p => ({ ...p, alert_phone: e.target.value }))} placeholder="+1..." />
              </div>
              <div>
                <label className={lbl}>Twilio Number</label>
                <input className={inp} value={f.twilio_number} onChange={e => setF(p => ({ ...p, twilio_number: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Niche</label>
                <select className={inp} value={f.niche} onChange={e => setF(p => ({ ...p, niche: e.target.value }))}>
                  {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Timezone</label>
                <select className={inp} value={f.timezone} onChange={e => setF(p => ({ ...p, timezone: e.target.value }))}>
                  {TIMEZONES.map(t => <option key={t} value={t}>{t.replace('America/', '')}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Call Start Hour</label>
                <input className={inp} type="number" min={0} max={23} value={f.call_start_hour} onChange={e => setF(p => ({ ...p, call_start_hour: +e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Call End Hour</label>
                <input className={inp} type="number" min={0} max={23} value={f.call_end_hour} onChange={e => setF(p => ({ ...p, call_end_hour: +e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Google Review Link</label>
                <input className={inp} value={f.google_review_link} onChange={e => setF(p => ({ ...p, google_review_link: e.target.value }))} placeholder="https://..." />
              </div>
            </div>

            <div>
              <label className={lbl}>AI System Prompt</label>
              <textarea
                className={inp + ' resize-none'}
                rows={4}
                value={f.ai_system_prompt}
                onChange={e => setF(p => ({ ...p, ai_system_prompt: e.target.value }))}
                placeholder="Custom instructions for this client's AI..."
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'active',        label: 'Active' },
                { key: 'voice_enabled', label: 'Voice' },
                { key: 'manual_mode',   label: 'Manual Mode' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setF(p => ({ ...p, [key]: !p[key] }))}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition text-sm font-semibold ${
                    f[key] ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  {label}
                  {f[key] ? <ToggleRight size={18} className="text-blue-600 shrink-0" /> : <ToggleLeft size={18} className="text-gray-400 shrink-0" />}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/25 transition disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── INVITE MODAL ─────────────────────────────────────────────────────────────

function InviteModal({ onClose, onDone, adminKey }: {
  onClose: () => void;
  onDone: () => void;
  adminKey: string;
}) {
  const [f, setF]       = useState({ business_name: '', owner_email: '', owner_name: '', owner_phone: '', twilio_number: '', niche: 'general', timezone: 'America/New_York' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const r = await fetch('/api/invite-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(f),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Failed'); setSaving(false); return; }
      onDone();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">New Client</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition">×</button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className={lbl}>Business Name *</label>
              <input className={inp} value={f.business_name} onChange={e => setF(p => ({ ...p, business_name: e.target.value }))} required />
            </div>
            <div>
              <label className={lbl}>Owner Email * (invite will be sent)</label>
              <input className={inp} type="email" value={f.owner_email} onChange={e => setF(p => ({ ...p, owner_email: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Owner Name</label>
                <input className={inp} value={f.owner_name} onChange={e => setF(p => ({ ...p, owner_name: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Owner Phone</label>
                <input className={inp} value={f.owner_phone} onChange={e => setF(p => ({ ...p, owner_phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className={lbl}>Twilio Number *</label>
              <input className={inp} value={f.twilio_number} onChange={e => setF(p => ({ ...p, twilio_number: e.target.value }))} placeholder="+1..." required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Niche</label>
                <select className={inp} value={f.niche} onChange={e => setF(p => ({ ...p, niche: e.target.value }))}>
                  {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Timezone</label>
                <select className={inp} value={f.timezone} onChange={e => setF(p => ({ ...p, timezone: e.target.value }))}>
                  {TIMEZONES.map(t => <option key={t} value={t}>{t.replace('America/', '')}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/25 transition disabled:opacity-40"
            >
              {saving ? 'Creating…' : 'Create & Send Invite'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
