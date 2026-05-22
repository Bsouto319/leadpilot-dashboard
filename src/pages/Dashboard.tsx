import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Users, Phone, Calendar, TrendingUp, RefreshCw, Download,
  CheckCircle, XCircle, MessageSquare, PhoneCall,
  LogOut, ArrowLeft,
  KeyRound, HeadphonesIcon, Mail, Image,
} from 'lucide-react';
import { fetchStats, fetchLeads, fetchAppointments, updateLead, deleteLead, exportLeadsUrl, fetchMessages, sendLeadEmail } from '../lib/api';
import { supabase } from '../lib/supabase';
import LeadCard from '../components/LeadCard';
import Pipeline from '../components/Pipeline';
import Agenda from '../components/Agenda';
import Followups from '../components/Followups';
import Dialpad from '../components/Dialpad';

export const STAGES = [
  { key: 'new_lead',         label: 'New Lead',         color: 'bg-green-400/15 text-green-300',     headerBg: '#16a34a', cardBorder: '#22c55e' },
  { key: 'ai_responded',     label: 'Called',           color: 'bg-sky-400/15 text-sky-300',         headerBg: '#0284c7', cardBorder: '#38bdf8' },
  { key: 'awaiting_address', label: 'Awaiting Address', color: 'bg-amber-400/15 text-amber-300',     headerBg: '#d97706', cardBorder: '#fbbf24' },
  { key: 'scheduled',        label: 'Scheduled',        color: 'bg-emerald-400/15 text-emerald-300', headerBg: '#059669', cardBorder: '#34d399' },
  { key: 'completed',        label: 'Completed',        color: 'bg-teal-400/15 text-teal-300',       headerBg: '#0d9488', cardBorder: '#2dd4bf' },
  { key: 'no_show',          label: 'No Show',          color: 'bg-rose-400/15 text-rose-300',       headerBg: '#dc2626', cardBorder: '#f87171' },
];

interface Props {
  clientId: string;
  businessName: string;
  userEmail?: string;
  onBack?: () => void;
}

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

type ViewType = 'pipeline' | 'list' | 'agenda' | 'followups' | 'dialpad' | 'settings';

export default function Dashboard({ clientId, businessName, userEmail, onBack }: Props) {
  const [view, setView]                 = useState<ViewType>('pipeline');
  const [stats, setStats]               = useState<any>(null);
  const [leads, setLeads]               = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stageFilter, setStageFilter]   = useState('');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [toast, setToast]               = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [dialpadPhone, setDialpadPhone] = useState('');
  const [smsModal, setSmsModal]         = useState<{ leadId: string; phone: string; leadName: string } | null>(null);
  const [emailModal, setEmailModal]     = useState<{ leadId: string; leadName: string } | null>(null);
  const [newLeadAlert, setNewLeadAlert] = useState(false);

  const viewRef = useRef(view);
  viewRef.current = view;

  function playNewLeadSound() {
    try {
      const ctx = new AudioContext();
      ([[ 880, 0,    0.15 ], [ 1100, 0.18, 0.15 ]] as [number,number,number][]).forEach(([freq, start, dur]) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur);
      });
      setTimeout(() => ctx.close(), 1000);
    } catch { /* AudioContext not available */ }
  }

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    const [s, l, a] = await Promise.all([
      fetchStats(clientId),
      fetchLeads({ clientId, page, search, stage: stageFilter }),
      fetchAppointments(clientId),
    ]);
    setStats(s);
    setLeads(l.data || []);
    setTotal(l.count || 0);
    setAppointments(a);
    setLoading(false);
    setRefreshing(false);
  }, [clientId, page, search, stageFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-leads')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'conversations',
        filter: `client_id=eq.${clientId}`,
      }, () => {
        playNewLeadSound();
        if (viewRef.current !== 'pipeline') setNewLeadAlert(true);
        load();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'conversations',
        filter: `client_id=eq.${clientId}`,
      }, () => load())
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'conversations',
        filter: `client_id=eq.${clientId}`,
      }, () => load())
      .subscribe();
    const interval = setInterval(() => load(), 15000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [clientId, load]);

  async function handleStageChange(leadId: string, newStage: string) {
    await updateLead(leadId, { stage: newStage });
    showToast('Stage updated');
    load();
    if (selectedLead?.id === leadId) setSelectedLead((l: any) => ({ ...l, stage: newStage }));
  }

  async function handleNotesSave(leadId: string, notes: string) {
    await updateLead(leadId, { notes });
    showToast('Notes saved');
  }

  async function handleContactSave(leadId: string, data: { lead_name?: string; lead_address?: string; service_type?: string }) {
    const { ok } = await updateLead(leadId, data);
    if (ok) {
      showToast('Contact info saved');
      setSelectedLead((l: any) => ({ ...l, ...data }));
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...data } : l));
    } else {
      showToast('Failed to save', 'error');
    }
  }

  async function handleDelete(leadId: string) {
    const { ok } = await deleteLead(leadId);
    if (ok) {
      showToast('Lead deleted');
      if (selectedLead?.id === leadId) setSelectedLead(null);
      load();
    } else {
      showToast('Failed to delete lead', 'error');
    }
  }

  function handleCall(phone: string) {
    setSelectedLead(null);
    setDialpadPhone(phone);
    setView('dialpad');
  }

  function handleSms(leadId: string, phone: string, leadName: string) {
    setSelectedLead(null);
    setSmsModal({ leadId, phone, leadName });
  }

  function handleEmail(leadId: string, leadName: string) {
    setSelectedLead(null);
    setEmailModal({ leadId, leadName });
  }

  const urgentCount = leads.filter(l =>
    ['new_lead', 'ai_responded'].includes(l.stage) &&
    daysSince(l.created_at) >= 2 && !l.followup_d3_sent_at
  ).length;

  const conversion = stats?.leadsWeek > 0
    ? Math.round((stats.scheduled / stats.leadsWeek) * 100)
    : 0;

  const kpis = [
    { label: 'Leads Today', value: stats?.leadsToday ?? '–',       icon: Users,      gradient: 'from-sky-500 to-blue-600',       glow: 'shadow-sky-500/30'     },
    { label: 'Calls Today', value: stats?.callsToday ?? '–',       icon: Phone,      gradient: 'from-violet-500 to-purple-600',  glow: 'shadow-violet-500/30'  },
    { label: 'Scheduled',   value: stats?.scheduled  ?? '–',       icon: Calendar,   gradient: 'from-emerald-500 to-teal-600',   glow: 'shadow-emerald-500/30' },
    { label: 'Conversion',  value: stats ? `${conversion}%` : '–', icon: TrendingUp, gradient: 'from-amber-500 to-orange-500',   glow: 'shadow-amber-500/30'   },
  ];

  const navTabs: { key: ViewType; label: string; badge?: number; alert?: boolean }[] = [
    { key: 'pipeline',  label: 'Pipeline', alert: newLeadAlert },
    { key: 'list',      label: 'Leads'      },
    { key: 'agenda',    label: 'Agenda'     },
    { key: 'followups', label: 'Follow-ups', badge: urgentCount },
    { key: 'dialpad',   label: '📞 Call'    },
    { key: 'settings',  label: 'Settings'   },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(160deg, #0e1f4a 0%, #162d6b 40%, #0f2057 100%)' }}>

      {/* ── HEADER ── */}
      <header className="flex-shrink-0 border-b border-white/10" style={{ background: 'rgba(10,20,60,0.7)', backdropFilter: 'blur(12px)' }}>
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3">

          {/* Back button */}
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white/80 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition shrink-0"
            >
              <ArrowLeft size={13} /> Admin
            </button>
          )}

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
              <span className="text-white font-black text-sm">L</span>
            </div>
            <div>
              <p className="text-white font-black text-lg leading-none tracking-tight truncate max-w-[160px]">{businessName}</p>
              <p className="text-blue-200/50 text-[10px] font-bold tracking-wide">LEADPILOT</p>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="flex items-center gap-0.5 ml-2 overflow-x-auto">
            {navTabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setView(t.key); if (t.key === 'pipeline') setNewLeadAlert(false); }}
                className={`relative shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  view === t.key ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {t.label}
                {t.badge != null && t.badge > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full">
                    {t.badge > 9 ? '9+' : t.badge}
                  </span>
                )}
                {t.alert && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <a
              href={exportLeadsUrl(clientId)}
              target="_blank" rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white/80 hover:bg-white/10 px-3 py-2 rounded-xl border border-white/10 transition"
            >
              <Download size={13} /> Export
            </a>
            <button
              onClick={() => { setRefreshing(true); load(); }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
              title="Refresh"
            >
              <RefreshCw size={14} className={`text-white/60 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* ── STAT CARDS ── */}
      {view === 'pipeline' && (
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="border border-white/10 rounded-xl p-3 flex items-center gap-3 hover:bg-white/[0.06] transition" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${k.gradient} flex items-center justify-center shadow-lg ${k.glow} flex-shrink-0`}>
                <k.icon size={20} className="text-white" />
              </div>
              <div>
                <p className="text-4xl font-black text-white leading-none">{loading ? '–' : k.value}</p>
                <p className="text-blue-200/60 text-[10px] font-black tracking-widest uppercase mt-0.5">{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-hidden min-h-0">

        {view === 'pipeline' && (
          <div className="h-full px-4 sm:px-6 pb-6">
            <Pipeline leads={leads} stages={STAGES} onSelect={setSelectedLead} />
          </div>
        )}

        {view === 'list' && (
          <div className="h-full px-4 sm:px-6 pb-6 pt-3 overflow-y-auto">
            <div className="border border-white/10 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="p-4 border-b border-white/10 flex gap-3 flex-wrap">
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by name or phone…"
                  className="flex-1 min-w-48 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                />
                <select
                  value={stageFilter}
                  onChange={e => { setStageFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">All Stages</option>
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div className="divide-y divide-white/5">
                {leads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    stages={STAGES}
                    onClick={() => setSelectedLead(lead)}
                    onCall={phone => handleCall(phone)}
                    onSms={(id, phone) => handleSms(id, phone, lead.lead_name || '')}
                    onDelete={handleDelete}
                  />
                ))}
                {!leads.length && !loading && (
                  <div className="text-center py-16">
                    <Users size={32} className="mx-auto text-white/20 mb-2" />
                    <p className="text-white/30 text-sm">No leads found.</p>
                  </div>
                )}
              </div>
              {total > 200 && (
                <div className="p-4 flex items-center justify-between border-t border-white/10">
                  <p className="text-sm text-white/40">{total} total leads</p>
                  <div className="flex gap-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border border-white/10 text-white/50 rounded-lg disabled:opacity-40 hover:bg-white/5">←</button>
                    <span className="px-3 py-1 text-sm text-white/40">Page {page}</span>
                    <button disabled={page * 200 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border border-white/10 text-white/50 rounded-lg disabled:opacity-40 hover:bg-white/5">→</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'agenda' && (
          <div className="h-full px-4 sm:px-6 pb-6 pt-3 overflow-y-auto">
            <Agenda
              appointments={appointments}
              onCall={handleCall}
              onSms={(id, phone, name) => handleSms(id, phone, name)}
            />
          </div>
        )}

        {view === 'followups' && (
          <div className="h-full px-4 sm:px-6 pb-6 pt-3 overflow-y-auto">
            <Followups leads={leads} />
          </div>
        )}

        {view === 'dialpad' && (
          <div className="h-full px-4 sm:px-6 pb-6 pt-3 overflow-y-auto">
            <Dialpad initialPhone={dialpadPhone} />
          </div>
        )}

        {view === 'settings' && (
          <div className="h-full px-4 sm:px-6 pb-6 pt-3 overflow-y-auto">
            <SettingsView userEmail={userEmail} />
          </div>
        )}
      </main>

      {/* ── LEAD MODAL ── */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          stages={STAGES}
          onClose={() => setSelectedLead(null)}
          onStageChange={handleStageChange}
          onNotesSave={handleNotesSave}
          onContactSave={handleContactSave}
          showToast={showToast}
          onCall={handleCall}
          onSms={(id, phone) => handleSms(id, phone, selectedLead?.lead_name || '')}
          onEmail={(id) => handleEmail(id, selectedLead?.lead_name || '')}
          onDelete={handleDelete}
        />
      )}

      {/* ── SMS MODAL ── */}
      {smsModal && (
        <SmsModal
          leadId={smsModal.leadId}
          phone={smsModal.phone}
          leadName={smsModal.leadName}
          onClose={() => setSmsModal(null)}
          showToast={showToast}
        />
      )}

      {/* ── EMAIL MODAL ── */}
      {emailModal && (
        <EmailModal
          leadId={emailModal.leadId}
          leadName={emailModal.leadName}
          onClose={() => setEmailModal(null)}
          showToast={showToast}
        />
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg text-sm font-semibold text-white transition-all ${
          toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── SETTINGS VIEW ──────────────────────────────────────────────────────────────

function SettingsView({ userEmail }: { userEmail?: string }) {
  const [pwd, setPwd]               = useState('');
  const [pwd2, setPwd2]             = useState('');
  const [pwdSaving, setPwdSaving]   = useState(false);
  const [pwdMsg, setPwdMsg]         = useState('');
  const [msg, setMsg]               = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent]       = useState(false);

  const inp = 'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition';

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg('');
    if (pwd !== pwd2) { setPwdMsg('Passwords do not match.'); return; }
    if (pwd.length < 8) { setPwdMsg('Minimum 8 characters.'); return; }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) setPwdMsg(error.message);
    else { setPwdMsg('✓ Password updated successfully!'); setPwd(''); setPwd2(''); }
    setPwdSaving(false);
  }

  async function sendSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim()) return;
    setMsgSending(true);
    try {
      await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, email: userEmail || '' }),
      });
      setMsgSent(true);
      setMsg('');
    } catch {}
    setMsgSending(false);
  }

  return (
    <div className="max-w-md space-y-4">

      {/* Account info */}
      <div className="border border-white/10 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Account</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
            <span className="text-white text-sm font-black">{(userEmail || 'U')[0].toUpperCase()}</span>
          </div>
          <p className="text-sm text-white/70 font-medium">{userEmail || '—'}</p>
        </div>
      </div>

      {/* Change Password */}
      <div className="border border-white/10 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={16} className="text-blue-400" />
          <h3 className="text-sm font-black text-white">Change Password</h3>
        </div>
        <form onSubmit={changePassword} className="space-y-3">
          <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="New password" className={inp} required />
          <input type="password" value={pwd2} onChange={e => setPwd2(e.target.value)} placeholder="Confirm new password" className={inp} required />
          {pwdMsg && (
            <p className={`text-sm px-3 py-2 rounded-xl border ${
              pwdMsg.startsWith('✓')
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : 'bg-red-500/10 text-red-300 border-red-500/20'
            }`}>{pwdMsg}</p>
          )}
          <button type="submit" disabled={pwdSaving} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl transition shadow-lg shadow-blue-500/25 disabled:opacity-40">
            {pwdSaving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Contact Support */}
      <div className="border border-white/10 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2 mb-4">
          <HeadphonesIcon size={16} className="text-violet-400" />
          <h3 className="text-sm font-black text-white">Contact Support</h3>
        </div>
        {msgSent ? (
          <div className="text-center py-4 space-y-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle size={22} className="text-emerald-400" />
            </div>
            <p className="text-sm font-black text-white">Message sent!</p>
            <p className="text-xs text-white/40">Bruno will contact you shortly.</p>
            <button onClick={() => setMsgSent(false)} className="text-xs text-blue-400 hover:text-blue-300">Send another</button>
          </div>
        ) : (
          <form onSubmit={sendSupport} className="space-y-3">
            <textarea
              value={msg}
              onChange={e => setMsg(e.target.value)}
              rows={4}
              placeholder="Describe your issue or question…"
              className={inp + ' resize-none'}
              required
            />
            <button type="submit" disabled={msgSending} className="w-full py-3 bg-white/10 hover:bg-white/15 text-white text-sm font-black rounded-xl border border-white/10 transition disabled:opacity-40">
              {msgSending ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}
      </div>

      {/* Sign Out */}
      <button
        onClick={() => supabase.auth.signOut()}
        className="w-full flex items-center justify-center gap-2 py-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-black rounded-xl transition"
      >
        <LogOut size={15} /> Sign Out
      </button>
    </div>
  );
}

// ── LEAD MODAL ─────────────────────────────────────────────────────────────────

interface ModalProps {
  lead: any; stages: any[];
  onClose: () => void;
  onStageChange: (id: string, stage: string) => void;
  onNotesSave: (id: string, notes: string) => void;
  onContactSave: (id: string, data: { lead_name?: string; lead_address?: string; service_type?: string }) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onCall?: (phone: string) => void;
  onSms?: (leadId: string, phone: string) => void;
  onEmail?: (leadId: string) => void;
  onDelete?: (leadId: string) => void;
}

function LeadModal({ lead, stages, onClose, onStageChange, onNotesSave, onContactSave, onCall, onSms, onEmail, onDelete }: ModalProps) {
  const [notes, setNotes]               = useState(lead.notes || '');
  const [saving, setSaving]             = useState(false);
  const [currentStage, setCurrentStage] = useState(lead.stage);
  const [editName, setEditName]         = useState(lead.lead_name || '');
  const [editAddress, setEditAddress]   = useState(lead.lead_address || '');
  const [editService, setEditService]   = useState(lead.service_type || '');
  const [editMode, setEditMode]         = useState(false);
  const [photos, setPhotos]             = useState<string[]>([]);
  const [lightbox, setLightbox]         = useState<string | null>(null);

  useEffect(() => {
    fetchMessages(lead.id).then(msgs => {
      const urls = msgs.filter(m => m.media_url).map(m => m.media_url as string);
      setPhotos(urls);
    });
  }, [lead.id]);
  const stage   = stages.find(s => s.key === currentStage);
  const phone   = lead.lead_phone;
  const initials = (editName || 'C')[0].toUpperCase();

  async function changeStage(newStage: string) {
    setSaving(true);
    setCurrentStage(newStage);
    await onStageChange(lead.id, newStage);
    setSaving(false);
  }

  async function saveNotes() {
    setSaving(true);
    await onNotesSave(lead.id, notes);
    setSaving(false);
  }

  async function saveContactInfo() {
    setSaving(true);
    await onContactSave(lead.id, {
      lead_name:    editName.trim()    || undefined,
      lead_address: editAddress.trim() || undefined,
      service_type: editService.trim() || undefined,
    });
    setEditMode(false);
    setSaving(false);
  }

  const inp = 'mt-0.5 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                <span className="text-white text-lg font-black">{initials}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{editName || 'Customer'}</h2>
                <span className={`inline-block mt-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${stage?.color}`}>
                  {stage?.label || currentStage}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-lg leading-none transition shrink-0">×</button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onCall?.(`+${phone}`)}
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-3 rounded-xl transition shadow-sm shadow-blue-500/25"
            >
              <PhoneCall size={14} /> Call
            </button>
            <button
              onClick={() => onSms?.(lead.id, phone)}
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-3 rounded-xl transition border border-emerald-200"
            >
              <MessageSquare size={14} /> SMS
            </button>
            <button
              onClick={() => onEmail?.(lead.id)}
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-3 rounded-xl transition border border-violet-200"
            >
              <Mail size={14} /> Email
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact Info</span>
              <button
                onClick={() => setEditMode(m => !m)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-0.5 rounded-lg hover:bg-blue-50 transition"
              >
                {editMode ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editMode ? (
              <div className="space-y-2">
                <div><label className="text-xs text-gray-400 font-medium">Name</label><input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Customer name" className={inp} /></div>
                <div><label className="text-xs text-gray-400 font-medium">Address</label><input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Street, city, state" className={inp} /></div>
                <div><label className="text-xs text-gray-400 font-medium">Service</label><input value={editService} onChange={e => setEditService(e.target.value)} placeholder="e.g. tile installation" className={inp} /></div>
                <button onClick={saveContactInfo} disabled={saving} className="w-full text-sm font-semibold px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-40">
                  {saving ? 'Saving…' : 'Save Contact Info'}
                </button>
              </div>
            ) : (
              <>
                <Row label="Phone"><span className="font-semibold text-gray-900">+{phone}</span></Row>
                <Row label="Name"><span className="font-medium text-gray-700">{editName || <span className="text-gray-300 italic">not set</span>}</span></Row>
                <Row label="Address"><span>{editAddress || <span className="text-gray-300 italic">not set</span>}</span></Row>
                <Row label="Service"><span className="capitalize">{editService?.replace(/_/g, ' ') || <span className="text-gray-300 italic">not set</span>}</span></Row>
                {lead.scheduled_at && <Row label="Scheduled"><span className="text-emerald-700 font-medium">{new Date(lead.scheduled_at).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span></Row>}
                {lead.source       && <Row label="Source"><span className="capitalize">{lead.source.replace(/_/g, ' ')}</span></Row>}
                {lead.last_response_at && <Row label="Last activity"><span className="text-blue-600 font-semibold">{new Date(lead.last_response_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span></Row>}
                <Row label="Received"><span className="text-gray-400">{new Date(lead.created_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span></Row>
              </>
            )}
          </div>

          {lead.email_body && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">First Message</p>
              <p className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-gray-700 text-sm">{lead.email_body}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Move to Stage</p>
            <div className="flex flex-wrap gap-1.5">
              {stages.map(s => (
                <button
                  key={s.key}
                  disabled={saving || s.key === currentStage}
                  onClick={() => changeStage(s.key)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold transition ${
                    s.key === currentStage
                      ? `${s.color} opacity-70 cursor-default ring-2 ring-offset-1 ring-current/30`
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this lead…"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={saveNotes}
              disabled={saving}
              className="mt-2 w-full text-sm font-bold px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save Notes'}
            </button>
          </div>

          {photos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Image size={11} /> Photos from lead ({photos.length})
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {photos.map((url, i) => (
                  <button key={i} onClick={() => setLightbox(url)} className="aspect-square rounded-xl overflow-hidden border border-gray-200 hover:border-blue-400 transition">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {onDelete && (
            <button
              onClick={() => { if (window.confirm('Delete this lead? This cannot be undone.')) { onDelete(lead.id); onClose(); } }}
              className="w-full text-sm font-semibold px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition"
            >
              Delete Lead
            </button>
          )}
        </div>
      </div>
    </div>

    {lightbox && (
      <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
        <img src={lightbox} alt="" className="max-w-full max-h-full rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
        <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white text-xl flex items-center justify-center" onClick={() => setLightbox(null)}>×</button>
      </div>
    )}
    </>
  );
}

// ── SMS MODAL ──────────────────────────────────────────────────────────────────

interface SmsModalProps {
  leadId: string; phone: string; leadName: string;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

function SmsModal({ leadId, phone, leadName, onClose, showToast }: SmsModalProps) {
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/leads/${leadId}/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': import.meta.env.VITE_ADMIN_KEY || '',
        },
        body: JSON.stringify({ message: text.trim() }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      showToast('SMS sent!');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to send SMS', 'error');
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Send SMS</h3>
            <p className="text-xs text-gray-400 mt-0.5">To: {leadName || 'Lead'} · +{phone}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-lg transition">×</button>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) send(); }}
          rows={4}
          placeholder="Type your message…"
          autoFocus
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">Cancel</button>
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition shadow-md shadow-emerald-500/25 disabled:opacity-40"
          >
            <MessageSquare size={14} /> {sending ? 'Sending…' : 'Send SMS'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EMAIL MODAL ────────────────────────────────────────────────────────────────

interface EmailModalProps {
  leadId: string; leadName: string;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

function EmailModal({ leadId, leadName, onClose, showToast }: EmailModalProps) {
  const [subject, setSubject] = useState('');
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    const { ok, error } = await sendLeadEmail(leadId, subject.trim(), text.trim());
    if (ok) {
      showToast('Email sent!');
      onClose();
    } else {
      showToast(error || 'Failed to send email', 'error');
      setSending(false);
    }
  }

  const inp = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2"><Mail size={16} className="text-violet-500" /> Send Email</h3>
            <p className="text-xs text-gray-400 mt-0.5">To: {leadName || 'Lead'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-lg transition">×</button>
        </div>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject (optional)"
          className={inp.replace('resize-none', '')}
        />
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) send(); }}
          rows={5}
          placeholder="Write your message…"
          autoFocus
          className={inp}
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">Cancel</button>
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition shadow-md shadow-violet-500/25 disabled:opacity-40"
          >
            <Mail size={14} /> {sending ? 'Sending…' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start">
      <span className="text-gray-400 w-20 shrink-0 text-xs mt-0.5">{label}</span>
      <span className="text-gray-800 flex-1">{children}</span>
    </div>
  );
}
