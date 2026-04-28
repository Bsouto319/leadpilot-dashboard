interface Lead  { id: string; lead_name: string; lead_phone: string; service_type: string; stage: string; scheduled_at?: string; lead_address?: string; created_at: string; }
interface Stage { key: string; label: string; color: string; }

function minutesSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 60000);
}

export default function Pipeline({ leads, stages, onSelect }: { leads: Lead[]; stages: Stage[]; onSelect: (l: Lead) => void }) {
  const byStage = (key: string) => leads.filter(l => l.stage === key);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {stages.map(stage => {
        const items = byStage(stage.key);
        return (
          <div key={stage.key} className="flex-shrink-0 w-56">
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
                      <p className="text-xs text-green-600 mt-1">
                        {new Date(lead.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {lead.lead_address && (
                      <p className="text-xs text-gray-500 mt-1 truncate">📍 {lead.lead_address}</p>
                    )}
                    {/* Quick WhatsApp link */}
                    <a
                      href={`https://wa.me/${lead.lead_phone}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="mt-2 flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-medium"
                    >
                      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </a>
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
