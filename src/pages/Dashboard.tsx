import { useEffect, useState, useCallback } from 'react';
import { Users, Phone, Calendar, TrendingUp, RefreshCw, Download, CheckCircle, XCircle, MessageSquare, PhoneCall } from 'lucide-react';
import { fetchStats, fetchLeads, fetchAppointments, updateLead, exportLeadsUrl } from '../lib/api';
import { supabase } from '../lib/supabase';
import LeadCard from '../components/LeadCard';
import Pipeline from '../components/Pipeline';
import Agenda from '../components/Agenda';
import Followups from '../components/Followups';
import Dialpad from '../components/Dialpad';

export const STAGES = [
  { key: 'new_lead',         label: 'New Lead',        color: 'bg-slate-100 text-slate-500' },
  { key: 'ai_responded',     label: 'Called',           color: 'bg-sky-50 text-sky-600' },
  { key: 'awaiting_address', label: 'Awaiting Address', color: 'bg-amber-50 text-amber-600' },
  { key: 'scheduled',        label: 'Scheduled',        color: 'bg-emerald-50 text-emerald-600' },
  { key: 'completed',        label: 'Completed',        color: 'bg-violet-50 text-violet-600' },
  { key: 'no_show',          label: 'No Show',          color: 'bg-rose-50 text-rose-500' },
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

  // Real-time: reload when any lead changes
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
    { label: 'Leads Today',   value: stats?.leadsToday  ?? '–', icon: Users,       color: 'text-blue-600'   },
    { label: 'Calls Today',   value: stats?.callsToday  ?? '–', icon: Phone,       color: 'text-green-600'  },
    { label: 'Scheduled',     value: stats?.scheduled   ?? '–', icon: Calendar,    color: 'text-purple-600' },
    { label: 'Conversion',    value: stats ? `${conversion}%` : '–', icon: TrendingUp, color: 'text-orange-500' },
  ];

  const navTabs: { key: 'pipeline' | 'list' | 'agenda' | 'followups' | 'dialpad'; label: string; badge?: number }[] = [
    { key: 'pipeline',  label: 'Pipeline' },
    { key: 'list',      label: 'All Leads' },
    { key: 'agenda',    label: 'Agenda' },
    { key: 'followups', label: 'Follow-ups', badge: urgentCount },
    { key: 'dialpad',   label: '📞 Ligar' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">L</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-none">LeadPilot</p>
            <p className="text-sm font-semibold text-gray-900">{businessName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={exportLeadsUrl(clientId)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition"
          >
            <Download size={14} /> Export
          </a>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{k.label}</span>
                <k.icon size={16} className={k.color} />
              </div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Nav tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
          {navTabs.map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`relative px-4 py-1.5 rounded-md text-sm font-medium transition ${
                view === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {label}
              {badge != null && badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pipeline view */}
        {view === 'pipeline' && (
          <Pipeline leads={leads} stages={STAGES} onSelect={setSelectedLead} />
        )}

        {/* List view */}
        {view === 'list' && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex gap-3 flex-wrap">
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name or phone…"
                className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={stageFilter}
                onChange={e => { setStageFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <p className="text-center text-gray-400 py-12 text-sm">No leads found.</p>
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

        {/* Agenda view */}
        {view === 'agenda' && <Agenda appointments={appointments} />}

        {/* Follow-ups view */}
        {view === 'followups' && <Followups leads={leads} />}

        {/* Dialpad view */}
        {view === 'dialpad' && <Dialpad />}
      </div>

      {/* Lead Detail Modal */}
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
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

interface ModalProps {
  lead: any;
  stages: any[];
  onClose: () => void;
  onStageChange: (id: string, stage: string) => void;
  onNotesSave: (id: string, notes: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

function LeadModal({ lead, stages, onClose, onStageChange, onNotesSave }: ModalProps) {
  const [notes, setNotes] = useState(lead.notes || '');
  const [saving, setSaving] = useState(false);
  const [currentStage, setCurrentStage] = useState(lead.stage);
  const stage = stages.find(s => s.key === currentStage);
  const phone = lead.lead_phone;

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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{lead.lead_name || 'Customer'}</h2>
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${stage?.color}`}>
              {stage?.label || currentStage}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <a href={`tel:+${phone}`} className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition">
            <PhoneCall size={13} /> Call
          </a>
          <a href={`sms:+${phone}`} className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 px-3 py-2 rounded-lg transition">
            <MessageSquare size={13} /> SMS
          </a>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm">
          <Row label="Phone"><span className="font-medium">+{phone}</span></Row>
          {lead.lead_address  && <Row label="Address"><span>{lead.lead_address}</span></Row>}
          {lead.service_type  && <Row label="Service"><span className="capitalize">{lead.service_type.replace(/_/g, ' ')}</span></Row>}
          {lead.scheduled_at  && <Row label="Scheduled"><span>{new Date(lead.scheduled_at).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span></Row>}
          {lead.source        && <Row label="Source"><span className="capitalize">{lead.source}</span></Row>}
          <Row label="Received"><span>{new Date(lead.created_at).toLocaleString('en-US')}</span></Row>
        </div>

        {/* First message */}
        {lead.email_body && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">First Message</p>
            <p className="bg-gray-50 rounded-lg px-3 py-2 text-gray-700 text-sm">{lead.email_body}</p>
          </div>
        )}

        {/* Change stage */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Move to Stage</p>
          <div className="flex flex-wrap gap-1.5">
            {stages.map(s => (
              <button
                key={s.key}
                disabled={saving || s.key === currentStage}
                onClick={() => changeStage(s.key)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition border ${
                  s.key === currentStage
                    ? `${s.color} border-transparent opacity-60 cursor-default`
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Add notes about this lead…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={saveNotes}
            disabled={saving}
            className="mt-1.5 text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-40"
          >
            Save notes
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      <span className="text-gray-900">{children}</span>
    </div>
  );
}

