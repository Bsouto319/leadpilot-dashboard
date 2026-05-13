interface Lead  { id: string; lead_name: string; lead_phone: string; service_type: string; stage: string; scheduled_at?: string; lead_address?: string; created_at: string; }
interface Stage { key: string; label: string; color: string; }

function minutesSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 60000);
}

function formatEntryTime(d: string) {
  const date = new Date(d);
  const now  = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
  if (isToday)     return `Today ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  if (isYesterday) return `Yesterday ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Pipeline({ leads, stages, onSelect }: { leads: Lead[]; stages: Stage[]; onSelect: (l: Lead) => void }) {
  const byStage = (key: string) => leads.filter(l => l.stage === key);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 pipeline-scroll snap-x snap-mandatory scroll-smooth px-0.5">
      {stages.map(stage => {
        const items = byStage(stage.key);
        return (
          <div key={stage.key} className="flex-shrink-0 w-56 md:w-60 snap-start">
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stage.color}`}>{stage.label}</span>
              <span className="text-xs text-slate-400 font-semibold bg-white/60 px-2 py-0.5 rounded-full border border-slate-200">{items.length}</span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {items.map(lead => {
                const isNew = minutesSince(lead.created_at) < 60;
                return (
                  <button
                    key={lead.id}
                    onClick={() => onSelect(lead)}
                    className="w-full text-left bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-sm active:shadow-md active:border-blue-200 hover:shadow-md hover:border-blue-200 transition-all duration-150 p-3.5 group"
                  >
                    {/* Name row */}
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
                          <span className="text-white text-xs font-bold">{(lead.lead_name || 'C')[0].toUpperCase()}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 truncate">{lead.lead_name || 'Customer'}</p>
                      </div>
                      {isNew && (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500 text-white">NEW</span>
                      )}
                    </div>

                    {/* Details */}
                    <p className="text-xs text-slate-400 font-medium">+{lead.lead_phone}</p>
                    {lead.service_type && (
                      <p className="text-xs text-blue-600 mt-1.5 font-medium capitalize">{lead.service_type.replace(/_/g, ' ')}</p>
                    )}
                    {lead.scheduled_at && (
                      <p className="text-xs text-emerald-600 mt-1 font-medium">
                        📅 {new Date(lead.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {lead.lead_address && (
                      <p className="text-xs text-slate-400 mt-1 truncate">📍 {lead.lead_address}</p>
                    )}
                    <p className={`text-xs mt-2 font-semibold ${isNew ? 'text-green-600' : 'text-slate-400'}`}>
                      🕐 {formatEntryTime(lead.created_at)}
                    </p>
                  </button>
                );
              })}

              {!items.length && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center bg-white/30">
                  <p className="text-xs text-slate-400 font-medium">Empty</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
