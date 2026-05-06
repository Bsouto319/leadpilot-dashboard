import { useEffect, useState, useCallback } from 'react';
import {
  Users, Phone, Calendar, TrendingUp, RefreshCw, Download,
  CheckCircle, XCircle, MessageSquare, PhoneCall,
  LayoutGrid, List, Clock, Zap, Settings, LogOut, ArrowLeft,
  KeyRound, HeadphonesIcon,
} from 'lucide-react';
import { fetchStats, fetchLeads, fetchAppointments, updateLead, deleteLead, exportLeadsUrl } from '../lib/api';
import Contacts from '../components/Contacts';
import { supabase } from '../lib/supabase';
import LeadCard from '../components/LeadCard';
import Pipeline from '../components/Pipeline';
import Agenda from '../components/Agenda';
import Followups from '../components/Followups';
import Dialpad from '../components/Dialpad';

export const STAGES = [
  { key: 'new_lead',         label: 'New Lead',        color: 'bg-slate-100 text-slate-600' },
  { key: 'ai_responded',     label: 'Called',           color: 'bg-sky-100 text-sky-700' },
  { key: 'awaiting_address', label: 'Awaiting Address', color: 'bg-amber-100 text-amber-700' },
  { key: 'scheduled',        label: 'Scheduled',        color: 'bg-emerald-100 text-emerald-700' },
  { key: 'completed',        label: 'Completed',        color: 'bg-violet-100 text-violet-700' },
  { key: 'no_show',          label: 'No Show',          color: 'bg-rose-100 text-rose-600' },
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

export default function Dashboard({ clientId, businessName, userEmail, onBack }: Props) {
  const [view, setView]                 = useState<'pipeline' | 'list' | 'contacts' | 'agenda' | 'followups' | 'dialpad' | 'settings'>('pipeline');
  const [stats, setStats]               = useState<any>(null);
  const [leads, setLeads]               = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stageFilter, setStageFilter]   = useState('');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [toast, setToast]               = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [dialpadPhone, setDialpadPhone] = useState('');
  const [smsModal, setSmsModal]         = useState<{ leadId: string; phone: string; leadName: string } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
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
  }, [clientId, page, search, stageFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-leads')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversations',
        filter: `client_id=eq.${clientId}`,
      }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  const urgentCount = leads.filter(l =>
    ['new_lead', 'ai_responded'].includes(l.stage) &&
    daysSince(l.created_at) >= 2 && !l.followup_d3_sent_at
  ).length;

  const conversion = stats?.leadsWeek > 0
    ? Math.round((stats.scheduled / stats.leadsWeek) * 100)
    : 0;

  const kpis = [
    { label: 'Leads Today',  value: stats?.leadsToday ?? '–',      icon: Users,      gradient: 'from-blue-500 to-blue-600',      glow: 'shadow-blue-500/25' },
    { label: 'Calls Today',  value: stats?.callsToday ?? '–',      icon: Phone,      gradient: 'from-emerald-500 to-green-600',  glow: 'shadow-emerald-500/25' },
    { label: 'Scheduled',    value: stats?.scheduled  ?? '–',      icon: Calendar,   gradient: 'from-violet-500 to-purple-600',  glow: 'shadow-violet-500/25' },
    { label: 'Conversion',   value: stats ? `${conversion}%` : '–', icon: TrendingUp, gradient: 'from-orange-500 to-amber-500',   glow: 'shadow-orange-500/25' },
  ];

  const navTabs = [
    { key: 'pipeline'  as const, label: 'Pipeline',    icon: LayoutGrid },
    { key: 'list'      as const, label: 'Leads',       icon: List },
    { key: 'contacts'  as const, label: 'Contacts',    icon: Users },
    { key: 'agenda'    as const, label: 'Agenda',      icon: Clock },
    { key: 'followups' as const, label: 'Follow-ups',  icon: Zap,      badge: urgentCount },
    { key: 'dialpad'   as const, label: '📞 Ligar',    icon: Phone },
    { key: 'settings'  as const, label: 'Settings',    icon: Settings },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── HEADER ── */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 sticky top-0 z-30 shadow-xl shadow-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition shrink-0"
              >
                <ArrowLeft size={14} /> Admin
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/40 shrink-0">
              <span className="text-white text-base font-black tracking-tight">L</span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-blue-300 uppercase tracking-widest leading-none mb-0.5">LeadPilot</p>
              <p className="text-base md:text-lg font-bold text-white leading-none truncate">{businessName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <a
              href={exportLeadsUrl(clientId)}
              target="_blank" rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition"
            >
              <Download size={14} /> Export
            </a>
            <button
              onClick={load}
              className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <nav className="flex gap-0.5 nav-scroll overflow-x-auto">
              {navTabs.map(({ key, label, badge }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={`relative shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition border-b-2 whitespace-nowrap ${
                    view === key
                      ? 'text-white border-blue-400'
                      : 'text-slate-400 hover:text-slate-200 border-transparent hover:border-slate-600'
                  }`}
                >
                  {label}
                  {badge != null && badge > 0 && (
                    <span className="w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* KPI Cards */}
        {view !== 'settings' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-fade-in-up">
            {kpis.map(k => (
              <div key={k.label} className={`bg-gradient-to-br ${k.gradient} rounded-2xl p-4 md:p-5 shadow-lg ${k.glow} text-white`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wide">{k.label}</span>
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                    <k.icon size={14} className="text-white" />
                  </div>
                </div>
                <p className="text-3xl md:text-4xl font-black text-white">{k.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Views */}
        <div className="animate-fade-in-up">
          {view === 'pipeline' && (
            <Pipeline leads={leads} stages={STAGES} onSelect={setSelectedLead} />
          )}

          {view === 'list' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-sm">
              <div className="p-4 border-b border-gray-100 flex gap-3 flex-wrap">
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by name or phone…"
                  className="flex-1 min-w-48 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={stageFilter}
                  onChange={e => { setStageFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Stages</option>
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div className="divide-y divide-gray-50">
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
                    <Users size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400 text-sm">No leads found.</p>
                  </div>
                )}
              </div>
              {total > 200 && (
                <div className="p-4 flex items-center justify-between border-t border-gray-100">
                  <p className="text-sm text-gray-500">{total} total leads</p>
                  <div className="flex gap-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">←</button>
                    <span className="px-3 py-1 text-sm text-gray-600">Page {page}</span>
                    <button disabled={page * 200 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">→</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'contacts' && (
            <Contacts leads={leads} stages={STAGES} />
          )}

          {view === 'agenda' && (
            <Agenda
              appointments={appointments}
              onCall={handleCall}
              onSms={(id, phone, name) => handleSms(id, phone, name)}
            />
          )}
          {view === 'followups' && <Followups leads={leads} />}
          {view === 'dialpad'   && <Dialpad initialPhone={dialpadPhone} />}
          {view === 'settings'  && <SettingsView userEmail={userEmail} />}
        </div>
      </main>

      {/* Lead Modal */}
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
          onDelete={handleDelete}
        />
      )}

      {/* SMS Modal */}
      {smsModal && (
        <SmsModal
          leadId={smsModal.leadId}
          phone={smsModal.phone}
          leadName={smsModal.leadName}
          onClose={() => setSmsModal(null)}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white animate-fade-in-up ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── SETTINGS VIEW ─────────────────────────────────────────────────────────────

function SettingsView({ userEmail }: { userEmail?: string }) {
  const [pwd, setPwd]               = useState('');
  const [pwd2, setPwd2]             = useState('');
  const [pwdSaving, setPwdSaving]   = useState(false);
  const [pwdMsg, setPwdMsg]         = useState('');
  const [msg, setMsg]               = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent]       = useState(false);

  const inp = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

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
    <div className="max-w-md space-y-5 animate-fade-in-up">

      {/* Account info */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Account</h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-sm font-bold">{(userEmail || 'U')[0].toUpperCase()}</span>
          </div>
          <p className="text-sm text-gray-700 font-medium">{userEmail || '—'}</p>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={16} className="text-blue-500" />
          <h3 className="text-base font-bold text-gray-900">Change Password</h3>
        </div>
        <form onSubmit={changePassword} className="space-y-3">
          <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="New password" className={inp} required />
          <input type="password" value={pwd2} onChange={e => setPwd2(e.target.value)} placeholder="Confirm new password" className={inp} required />
          {pwdMsg && (
            <p className={`text-sm px-3 py-2 rounded-xl border ${
              pwdMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
            }`}>{pwdMsg}</p>
          )}
          <button type="submit" disabled={pwdSaving} className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-bold rounded-xl transition shadow-md shadow-blue-500/25 disabled:opacity-40">
            {pwdSaving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Contact Support */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <HeadphonesIcon size={16} className="text-blue-500" />
          <h3 className="text-base font-bold text-gray-900">Contact Support</h3>
        </div>
        {msgSent ? (
          <div className="text-center py-4 space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle size={22} className="text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Message sent!</p>
            <p className="text-xs text-gray-400">Bruno will contact you shortly.</p>
            <button onClick={() => setMsgSent(false)} className="text-xs text-blue-500 hover:underline">Send another</button>
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
            <button type="submit" disabled={msgSending} className="w-full py-3 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white text-sm font-bold rounded-xl transition disabled:opacity-40">
              {msgSending ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}
      </div>

      {/* Sign Out */}
      <button
        onClick={() => supabase.auth.signOut()}
        className="w-full flex items-center justify-center gap-2 py-3 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold rounded-xl transition"
      >
        <LogOut size={15} /> Sign Out
      </button>
    </div>
  );
}

// ── MODAL ──────────────────────────────────────────────────────────────────────

interface ModalProps {
  lead: any; stages: any[];
  onClose: () => void;
  onStageChange: (id: string, stage: string) => void;
  onNotesSave: (id: string, notes: string) => void;
  onContactSave: (id: string, data: { lead_name?: string; lead_address?: string; service_type?: string }) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onCall?: (phone: string) => void;
  onSms?: (leadId: string, phone: string) => void;
  onDelete?: (leadId: string) => void;
}

function LeadModal({ lead, stages, onClose, onStageChange, onNotesSave, onContactSave, onCall, onSms, onDelete }: ModalProps) {
  const [notes, setNotes]               = useState(lead.notes || '');
  const [saving, setSaving]             = useState(false);
  const [currentStage, setCurrentStage] = useState(lead.stage);
  const [editName, setEditName]         = useState(lead.lead_name || '');
  const [editAddress, setEditAddress]   = useState(lead.lead_address || '');
  const [editService, setEditService]   = useState(lead.service_type || '');
  const [editMode, setEditMode]         = useState(false);
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                <span className="text-white text-lg font-bold">{initials}</span>
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

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onCall?.(`+${phone}`)}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-4 py-3 rounded-xl transition shadow-sm shadow-blue-500/25"
            >
              <PhoneCall size={15} /> Call
            </button>
            <button
              onClick={() => onSms?.(lead.id, phone)}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-3 rounded-xl transition border border-emerald-200"
            >
              <MessageSquare size={15} /> SMS
            </button>
          </div>

          {/* Contact info — view or edit */}
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
                <div>
                  <label className="text-xs text-gray-400 font-medium">Name</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Customer name"
                    className="mt-0.5 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium">Address</label>
                  <input
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    placeholder="Street, city, state"
                    className="mt-0.5 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium">Service</label>
                  <input
                    value={editService}
                    onChange={e => setEditService(e.target.value)}
                    placeholder="e.g. tile installation"
                    className="mt-0.5 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={saveContactInfo}
                  disabled={saving}
                  className="w-full text-sm font-semibold px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-40"
                >
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
                {lead.source       && <Row label="Source"><span className="capitalize">{lead.source}</span></Row>}
                <Row label="Received"><span>{new Date(lead.created_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span></Row>
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
              className="mt-2 w-full text-sm font-semibold px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save Notes'}
            </button>
          </div>

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
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Send SMS</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              To: {leadName || 'Lead'} · +{phone}
            </p>
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
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold rounded-xl transition shadow-md shadow-emerald-500/25 disabled:opacity-40"
          >
            <MessageSquare size={14} /> {sending ? 'Sending…' : 'Send SMS'}
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
