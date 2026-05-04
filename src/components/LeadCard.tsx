interface Props { lead: any; stages: any[]; onClick: () => void; }

function minutesSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 60000);
}

export default function LeadCard({ lead, stages, onClick }: Props) {
  const stage = stages.find(s => s.key === lead.stage);
  const isNew = minutesSince(lead.created_at) < 60;

  return (
    <div className="px-4 py-3.5 hover:bg-blue-50/40 active:bg-blue-50/60 transition flex items-center gap-3">
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm relative">
          <span className="text-white text-sm font-bold">
            {(lead.lead_name || 'C')[0].toUpperCase()}
          </span>
          {isNew && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 truncate">{lead.lead_name || 'Customer'}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage?.color}`}>{stage?.label}</span>
            {isNew && <span className="text-[10px] font-black text-green-600 tracking-wide">NEW</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <p className="text-xs text-gray-400 font-medium">+{lead.lead_phone}</p>
            {lead.service_type && <p className="text-xs text-blue-600 font-medium capitalize">{lead.service_type.replace(/_/g, ' ')}</p>}
          </div>
        </div>

        <p className="text-xs text-gray-400 shrink-0 hidden sm:block font-medium">
          {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </button>

      {/* Call button — sempre visível (não depende de hover) */}
      <a
        href={`tel:+${lead.lead_phone}`}
        className="p-2.5 rounded-xl bg-blue-600 text-white active:bg-blue-700 transition shrink-0 touch-manipulation"
        title="Call"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.22 1.22 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
        </svg>
      </a>
    </div>
  );
}
