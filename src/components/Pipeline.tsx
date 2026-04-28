interface Lead  { id: string; lead_name: string; lead_phone: string; service_type: string; stage: string; scheduled_at?: string; lead_address?: string; created_at: string; }
interface Stage { key: string; label: string; color: string; }

function minutesSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 60000);
}

export default function Pipeline({ leads, stages, onSelect }: { leads: Lead[]; stages: Stage[]; onSelect: (l: Lead) => void }) {
  const byStage = (key: string) => leads.filter(l => l.stage === key);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth px-0.5">
      {stages.map(stage => {
        const items = byStage(stage.key);
        return (
          <div key={stage.key} className="flex-shrink-0 w-60 snap-start">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage.color}`}>{stage.label}</span>
              <span className="text-xs text-gray-400 font-medium">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map(lead => {
                const isNew = minutesSince(lead.created_at) < 60;
                return (
                  <button
                    key={lead.id}
                    onClick={() => onSelect(lead)}
                    className="w-full text-left bg-white rounded-xl border border-gray-200 p-3 hover:border-blue-300 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.lead_name || 'Customer'}</p>
                      {isNew && (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500 text-white">NEW</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">+{lead.lead_phone}</p>
                    {lead.service_type && (
                      <p className="text-xs text-blue-600 mt-1 capitalize">{lead.service_type.replace(/_/g, ' ')}</p>
                    )}
                    {lead.scheduled_at && (
                      <p className="text-xs text-emerald-600 mt-1">
                        {new Date(lead.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {lead.lead_address && (
                      <p className="text-xs text-gray-500 mt-1 truncate">📍 {lead.lead_address}</p>
                    )}
                  </button>
                );
              })}
              {!items.length && (
                <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4 text-center">
                  <p className="text-xs text-gray-400">Empty</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
