import { useEffect, useState, useCallback } from 'react';
import { Users, Phone, Calendar, TrendingUp, RefreshCw, Download, CheckCircle, XCircle, MessageSquare, PhoneCall, LayoutGrid, List, Clock, Zap } from 'lucide-react';
import { fetchStats, fetchLeads, fetchAppointments, updateLead, exportLeadsUrl } from '../lib/api';
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

interface Props { clientId: string; businessName: string; }

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

export default function Dashboard({ clientId, businessName }: Props) {
  const [view, setView]               = useState<'pipeline' | 'list' | 'agenda' | 'followups' | 'dialpad'>('pipeline');
  const [stats, setStats]             = useState<any>(null);
  const [leads, setLeads]             = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stageFilter, setStageFilter] = useState('');
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [toast, setToast]             = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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
    { key: 'agenda'    as const, label: 'Agenda',      icon: Clock },
    { key: 'followups' as const, label: 'Follow-ups',  icon: Zap,   badge: urgentCount },
    { key: 'dialpad'   as const, label: '📞 Ligar',    icon: Phone },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 sticky top-0 z-30 shadow-xl shadow-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/40 shrink-0">
              <span className="text-white text-base font-black tracking-tight">L</span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-blue-300 uppercase tracking-widest leading-none mb-0.5">LeadPilot</p>
              <p className="text-base md:text-lg font-bold text-white leading-none truncate">{businessName}</p>
            </div>
          </div>

          {/* Actions */}
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

        {/* Nav tabs — scrollable on mobile */}
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

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-fade-in-up">
          {kpis.map(k => (
            <div
              key={k.label}
              className={`bg-gradient-to-br ${k.gradient} rounded-2xl p-4 md:p-5 shadow-lg ${k.glow} text-white`}
            >
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
                  <LeadCard key={lead.id} lead={lead} stages={STAGES} onClick={() => setSelectedLead(lead)} />
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

          {view === 'agenda'    && <Agenda appointments={appointments} />}
          {view === 'followups' && <Followups leads={leads} />}
          {view === 'dialpad'   && <Dialpad />}
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

// ── MODAL ──────────────────────────────────────────────────────────────────────

interface ModalProps {
  lead: any; stages: any[];
  onClose: () => void;
  onStageChange: (id: string, stage: string) => void;
  onNotesSave: (id: string, notes: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

function LeadModal({ lead, stages, onClose, onStageChange, onNotesSave }: ModalProps) {
  const [notes, setNotes]       = useState(lead.notes || '');
  const [saving, setSaving]     = useState(false);
  const [currentStage, setCurrentStage] = useState(lead.stage);
  const stage = stages.find(s => s.key === currentStage);
  const phone = lead.lead_phone;
  const initials = (lead.lead_name || 'C')[0].toUpperCase();

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                <span className="text-white text-lg font-bold">{initials}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{lead.lead_name || 'Customer'}</h2>
                <span className={`inline-block mt-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${stage?.color}`}>
                  {stage?.label || currentStage}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-lg leading-none transition shrink-0">×</button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:+${phone}`}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-4 py-3 rounded-xl transition shadow-sm shadow-blue-500/25"
            >
              <PhoneCall size={15} /> Call
            </a>
            <a
              href={`sms:+${phone}`}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-3 rounded-xl transition border border-emerald-200"
            >
              <MessageSquare size={15} /> SMS
            </a>
          </div>

          {/* Info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
            <Row label="Phone"><span className="font-semibold text-gray-900">+{phone}</span></Row>
            {lead.lead_address  && <Row label="Address"><span>{lead.lead_address}</span></Row>}
            {lead.service_type  && <Row label="Service"><span className="capitalize">{lead.service_type.replace(/_/g, ' ')}</span></Row>}
            {lead.scheduled_at  && <Row label="Scheduled"><span className="text-emerald-700 font-medium">{new Date(lead.scheduled_at).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span></Row>}
            {lead.source        && <Row label="Source"><span className="capitalize">{lead.source}</span></Row>}
            <Row label="Received"><span>{new Date(lead.created_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span></Row>
          </div>

          {lead.email_body && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">First Message</p>
              <p className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-gray-700 text-sm">{lead.email_body}</p>
            </div>
          )}

          {/* Change stage */}
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

          {/* Notes */}
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
