import { useEffect, useState } from 'react';
import { Users, Phone, Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { fetchStats, fetchLeads, fetchAppointments } from '../lib/api';
import LeadCard from '../components/LeadCard';
import Pipeline from '../components/Pipeline';
import Agenda from '../components/Agenda';
import Followups from '../components/Followups';

const STAGES = [
  { key: 'new_lead',        label: 'New Lead',       color: 'bg-gray-100 text-gray-700' },
  { key: 'ai_responded',    label: 'Called',          color: 'bg-blue-100 text-blue-700' },
  { key: 'awaiting_address',label: 'Awaiting Address',color: 'bg-yellow-100 text-yellow-700' },
  { key: 'scheduled',       label: 'Scheduled',       color: 'bg-green-100 text-green-700' },
  { key: 'completed',       label: 'Completed',       color: 'bg-purple-100 text-purple-700' },
  { key: 'no_show',         label: 'No Show',         color: 'bg-red-100 text-red-700' },
];

interface Props { clientId: string; businessName: string; }

export default function Dashboard({ clientId, businessName }: Props) {
  const [view, setView]               = useState<'pipeline' | 'list' | 'agenda' | 'followups'>('pipeline');
  const [stats, setStats]             = useState<any>(null);
  const [leads, setLeads]             = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stageFilter, setStageFilter] = useState('');
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  async function load() {
    setLoading(true);
    const [s, l, a] = await Promise.all([
      fetchStats(clientId),
      fetchLeads({ clientId, page, search, stage: stageFilter, limit: 200 }),
      fetchAppointments(clientId),
    ]);
    setStats(s);
    setLeads(l.data || []);
    setTotal(l.count || 0);
    setAppointments(a);
    setLoading(false);
  }

  useEffect(() => { load(); }, [page, search, stageFilter]);

  const kpis = [
    { label: 'Leads Today',    value: stats?.leadsToday   ?? '–', icon: Users,       color: 'text-blue-600'   },
    { label: 'Calls Today',    value: stats?.callsToday   ?? '–', icon: Phone,       color: 'text-green-600'  },
    { label: 'Scheduled',      value: stats?.scheduled    ?? '–', icon: Calendar,    color: 'text-purple-600' },
    { label: 'Response Rate',  value: stats ? `${stats.responseRate}%` : '–', icon: TrendingUp, color: 'text-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
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
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
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
          {([
            { key: 'pipeline',  label: 'Pipeline' },
            { key: 'list',      label: 'All Leads' },
            { key: 'agenda',    label: 'Agenda' },
            { key: 'followups', label: 'Follow-ups' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                view === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {label}
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
            {total > 20 && (
              <div className="p-4 flex items-center justify-between border-t border-gray-100">
                <p className="text-sm text-gray-500">{total} total leads</p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">←</button>
                  <span className="px-3 py-1 text-sm text-gray-600">Page {page}</span>
                  <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">→</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Agenda view */}
        {view === 'agenda' && (
          <Agenda appointments={appointments} />
        )}

        {/* Follow-ups view */}
        {view === 'followups' && (
          <Followups leads={leads} />
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadModal lead={selectedLead} stages={STAGES} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}

function LeadModal({ lead, stages, onClose }: { lead: any; stages: any[]; onClose: () => void }) {
  const stage = stages.find(s => s.key === lead.stage);
  const phone = `+${lead.lead_phone}`;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{lead.lead_name || 'Customer'}</h2>
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${stage?.color}`}>
              {stage?.label || lead.stage}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-2 text-sm">
          <Row label="Phone">
            <a href={`tel:${phone}`} className="text-blue-600 font-medium hover:underline">{phone}</a>
            <span className="text-gray-400 mx-1">·</span>
            <a href={`sms:${phone}`} className="text-green-600 font-medium hover:underline">Send SMS</a>
          </Row>
          {lead.lead_address && <Row label="Address"><span>{lead.lead_address}</span></Row>}
          {lead.service_type  && <Row label="Service"><span className="capitalize">{lead.service_type.replace(/_/g, ' ')}</span></Row>}
          {lead.scheduled_at  && <Row label="Scheduled"><span>{new Date(lead.scheduled_at).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span></Row>}
          {lead.source        && <Row label="Source"><span className="capitalize">{lead.source}</span></Row>}
          <Row label="Received"><span>{new Date(lead.created_at).toLocaleString('en-US')}</span></Row>
          {lead.email_body    && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">First Message</p>
              <p className="bg-gray-50 rounded-lg px-3 py-2 text-gray-700 text-sm">{lead.email_body}</p>
            </div>
          )}
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
