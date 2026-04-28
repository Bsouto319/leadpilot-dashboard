interface Props { lead: any; stages: any[]; onClick: () => void; }

function minutesSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 60000);
}

export default function LeadCard({ lead, stages, onClick }: Props) {
  const stage = stages.find(s => s.key === lead.stage);
  const isNew = minutesSince(lead.created_at) < 60;

  return (
    <div className="w-full px-4 py-3 hover:bg-gray-50 transition flex items-center gap-4">
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 relative">
          <span className="text-blue-600 text-sm font-semibold">
            {(lead.lead_name || 'C')[0].toUpperCase()}
          </span>
          {isNew && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{lead.lead_name || 'Customer'}</p>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${stage?.color}`}>{stage?.label}</span>
            {isNew && <span className="text-[10px] font-bold text-green-600">NEW</span>}
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
      <div className="flex items-center gap-1.5 shrink-0">
        <a href={`tel:+${lead.lead_phone}`} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition" title="Call">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.22 1.22 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
        </a>
        <a href={`sms:+${lead.lead_phone}`} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition" title="SMS">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </a>
      </div>
    </div>
  );
}
