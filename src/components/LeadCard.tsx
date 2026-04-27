interface Props { lead: any; stages: any[]; onClick: () => void; }

export default function LeadCard({ lead, stages, onClick }: Props) {
  const stage = stages.find(s => s.key === lead.stage);
  return (
    <button onClick={onClick} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <span className="text-blue-600 text-sm font-semibold">
          {(lead.lead_name || 'C')[0].toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">{lead.lead_name || 'Customer'}</p>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${stage?.color}`}>{stage?.label}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-xs text-gray-500">+{lead.lead_phone}</p>
          {lead.service_type && <p className="text-xs text-blue-600 capitalize">{lead.service_type.replace(/_/g, ' ')}</p>}
          {lead.lead_address && <p className="text-xs text-gray-400 truncate">📍 {lead.lead_address}</p>}
        </div>
      </div>
      <p className="text-xs text-gray-400 shrink-0 hidden sm:block">
        {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </p>
    </button>
  );
}
