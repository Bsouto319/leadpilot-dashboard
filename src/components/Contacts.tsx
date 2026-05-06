import { useState, useMemo } from 'react';
import { Download, Search, Users } from 'lucide-react';

interface Lead {
  id: string;
  lead_name: string;
  lead_phone: string;
  lead_address?: string;
  service_type?: string;
  stage: string;
  scheduled_at?: string;
  created_at: string;
  source?: string;
  notes?: string;
}

interface Props {
  leads: Lead[];
  stages: { key: string; label: string; color: string }[];
}

function exportToCsv(leads: Lead[]) {
  const headers = ['Name', 'Phone', 'Address', 'Service', 'Stage', 'Scheduled', 'Source', 'Created', 'Notes'];
  const rows = leads.map(l => [
    l.lead_name || 'Customer',
    `+${l.lead_phone}`,
    l.lead_address || '',
    (l.service_type || '').replace(/_/g, ' '),
    l.stage,
    l.scheduled_at ? new Date(l.scheduled_at).toLocaleDateString('en-US') : '',
    l.source || '',
    new Date(l.created_at).toLocaleDateString('en-US'),
    (l.notes || '').replace(/"/g, '""'),
  ].map(v => `"${v}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: 'New Lead', ai_responded: 'Called', awaiting_address: 'Awaiting Address',
  scheduled: 'Scheduled', completed: 'Completed', no_show: 'No Show',
  handoff: 'Handoff', closed: 'Closed',
};

export default function Contacts({ leads, stages }: Props) {
  const [search, setSearch]   = useState('');
  const [stageFilter, setStageFilter] = useState('');

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (l.lead_name || '').toLowerCase().includes(q) ||
        l.lead_phone.includes(q) ||
        (l.lead_address || '').toLowerCase().includes(q);
      const matchStage = !stageFilter || l.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [leads, search, stageFilter]);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-sm overflow-hidden">

      {/* Toolbar */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, address…"
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Stages</option>
            {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        <button
          onClick={() => exportToCsv(filtered)}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shrink-0"
        >
          <Download size={14} /> Export CSV ({filtered.length})
        </button>
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-4 py-3">Phone</th>
              <th className="text-left px-4 py-3">Address</th>
              <th className="text-left px-4 py-3">Service</th>
              <th className="text-left px-4 py-3">Stage</th>
              <th className="text-left px-4 py-3">Scheduled</th>
              <th className="text-left px-4 py-3">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(lead => {
              const stage = stages.find(s => s.key === lead.stage);
              return (
                <tr key={lead.id} className="hover:bg-blue-50/30 transition">
                  <td className="px-5 py-3.5 font-semibold text-gray-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">{(lead.lead_name || 'C')[0].toUpperCase()}</span>
                      </div>
                      {lead.lead_name || 'Customer'}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 font-medium">+{lead.lead_phone}</td>
                  <td className="px-4 py-3.5 text-gray-500 max-w-[200px] truncate">{lead.lead_address || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-blue-600 capitalize">{(lead.service_type || '').replace(/_/g, ' ') || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stage?.color || 'bg-gray-100 text-gray-500'}`}>
                      {stage?.label || STAGE_LABELS[lead.stage] || lead.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-emerald-700 font-medium">
                    {lead.scheduled_at
                      ? new Date(lead.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-gray-400">
                    {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="py-16 text-center text-gray-400">
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No contacts found</p>
          </div>
        )}
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden divide-y divide-gray-50">
        {filtered.map(lead => {
          const stage = stages.find(s => s.key === lead.stage);
          return (
            <div key={lead.id} className="p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-gray-900">{lead.lead_name || 'Customer'}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage?.color || 'bg-gray-100 text-gray-500'}`}>
                  {stage?.label || lead.stage}
                </span>
              </div>
              <p className="text-sm text-gray-500">+{lead.lead_phone}</p>
              {lead.lead_address && <p className="text-sm text-gray-400">📍 {lead.lead_address}</p>}
              {lead.service_type  && <p className="text-sm text-blue-600 capitalize">{lead.service_type.replace(/_/g, ' ')}</p>}
              {lead.scheduled_at  && <p className="text-sm text-emerald-700">📅 {new Date(lead.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>}
            </div>
          );
        })}
        {!filtered.length && (
          <div className="py-12 text-center text-gray-400">
            <p className="text-sm font-medium">No contacts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
