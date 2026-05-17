interface Lead {
  id: string;
  lead_name: string;
  lead_phone: string;
  service_type: string;
  stage: string;
  source?: string;
  scheduled_at?: string;
  lead_address?: string;
  created_at: string;
  score?: number | null;
  summary?: string | null;
}

interface Stage {
  key: string;
  label: string;
  color: string;
  headerBg: string;
  cardBorder: string;
}

function minutesSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 60000);
}

function formatEntryTime(d: string) {
  const date = new Date(d);
  const now  = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYest = date.toDateString() === yesterday.toDateString();
  if (isToday) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (isYest)  return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Pipeline({ leads, stages, onSelect }: { leads: Lead[]; stages: Stage[]; onSelect: (l: Lead) => void }) {
  const byStage = (key: string) => leads.filter(l => l.stage === key);

  return (
    <div className="flex gap-2.5 h-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
      {stages.map(stage => {
        const items = byStage(stage.key);
        return (
          <div key={stage.key} className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden w-52 md:w-56 lg:w-60">

            {/* Column header */}
            <div className="px-3 py-3 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: stage.headerBg }}>
              <span className="text-sm font-black text-white tracking-wider uppercase leading-none drop-shadow-md">
                {stage.label}
              </span>
              <span className="text-sm font-black bg-black/30 text-white px-2.5 py-0.5 rounded-full min-w-[26px] text-center">
                {items.length}
              </span>
            </div>

            {/* Cards area */}
            <div
              className="flex-1 overflow-y-auto space-y-2 p-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
              style={{ background: 'rgba(10,20,55,0.5)' }}
            >
              {items.map(lead => {
                const isNew     = minutesSince(lead.created_at) < 60;
                const idleHours = minutesSince(lead.created_at) / 60;
                const noReply   = !['scheduled', 'completed', 'no_show'].includes(lead.stage) && idleHours >= 3;

                return (
                  <button
                    key={lead.id}
                    onClick={() => onSelect(lead)}
                    className="w-full text-left rounded-lg transition-all duration-150 p-3 group border hover:border-white/25"
                    style={{
                      background:      noReply ? 'rgba(220,30,30,0.08)' : 'rgba(15,28,60,0.85)',
                      borderColor:     noReply ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)',
                      borderLeftWidth: 3,
                      borderLeftColor: noReply ? '#ef4444' : stage.cardBorder,
                    }}
                  >
                    {/* Name row */}
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <p className="text-sm font-black text-white truncate leading-tight flex-1">
                        {lead.lead_name || 'Customer'}
                      </p>
                      <div className="flex gap-1 shrink-0">
                        {lead.source === 'inbound_call' && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            📞
                          </span>
                        )}
                        {isNew && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white tracking-wide" style={{ backgroundColor: stage.headerBg }}>
                            NEW
                          </span>
                        )}
                        {noReply && !isNew && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 tracking-wide border border-red-500/30">
                            IDLE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Phone */}
                    <p className="text-xs text-white/40 font-semibold mb-1.5">+{lead.lead_phone}</p>

                    {/* Service type */}
                    {lead.service_type && lead.service_type !== 'general' && (
                      <p className="text-xs font-semibold mb-1.5 capitalize" style={{ color: stage.cardBorder + 'aa' }}>
                        {lead.service_type.replace(/_/g, ' ')}
                      </p>
                    )}

                    {/* AI summary */}
                    {lead.summary ? (
                      <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: stage.cardBorder + 'cc' }}>
                        🤖 {lead.summary}
                      </p>
                    ) : <div className="mb-2" />}

                    {/* Scheduled date */}
                    {lead.scheduled_at && (
                      <p className="text-xs text-emerald-400 font-semibold mb-1.5">
                        📅 {new Date(lead.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}

                    {/* Bottom row: time + score */}
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-bold ${noReply ? 'text-red-400' : 'text-white/25'}`}>
                        🕐 {formatEntryTime(lead.created_at)}
                      </span>
                      {lead.score != null && (
                        <span
                          className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: lead.score >= 70 ? '#22c55e22' : lead.score >= 40 ? '#f59e0b22' : '#ef444422',
                            color:           lead.score >= 70 ? '#4ade80'   : lead.score >= 40 ? '#fbbf24'   : '#f87171',
                          }}
                        >
                          {lead.score}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {!items.length && (
                <div className="rounded-lg border border-dashed p-5 text-center mt-1" style={{ borderColor: stage.cardBorder + '30' }}>
                  <p className="text-xs font-medium" style={{ color: stage.cardBorder + '60' }}>Empty</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
