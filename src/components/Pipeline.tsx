interface Lead {
  id: string;
  lead_name: string;
  lead_phone: string;
  service_type: string;
  stage: string;
  call_status?: string | null;
  source?: string;
  scheduled_at?: string;
  lead_address?: string;
  created_at: string;
  last_response_at?: string | null;
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

const SOURCE_CONFIG: Record<string, { label: string; icon: string; bg: string; color: string; border: string }> = {
  website:       { label: 'Website',    icon: '🌐', bg: 'rgba(14,165,233,0.15)',  color: '#38bdf8', border: 'rgba(56,189,248,0.3)'  },
  thumbtack:     { label: 'Thumbtack',  icon: '🔨', bg: 'rgba(34,197,94,0.15)',   color: '#4ade80', border: 'rgba(74,222,128,0.3)'  },
  inbound_call:  { label: 'Inbound',    icon: '📞', bg: 'rgba(167,139,250,0.15)', color: '#c4b5fd', border: 'rgba(196,181,253,0.3)' },
  referral:      { label: 'Referral',   icon: '👥', bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', border: 'rgba(251,191,36,0.3)'  },
  instagram:     { label: 'Instagram',  icon: '📸', bg: 'rgba(244,63,94,0.15)',   color: '#fb7185', border: 'rgba(244,63,94,0.3)'   },
  facebook:      { label: 'Facebook',   icon: '👍', bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
};

function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_CONFIG[source];
  if (!cfg) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-1.5 capitalize border border-white/10 bg-white/5 text-white/40">
        {source.replace(/_/g, ' ')}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-1.5"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function minutesSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 60000);
}

function formatEntryTime(d: string) {
  const date = new Date(d);
  const now  = new Date();
  const hm   = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYest = date.toDateString() === yesterday.toDateString();
  if (isToday) return `Today ${hm}`;
  if (isYest)  return `Yesterday ${hm}`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CALL_ATTEMPTED = ['queued', 'initiated', 'ringing', 'in-progress', 'completed', 'no-answer', 'busy', 'failed'];

export default function Pipeline({ leads, stages, onSelect }: { leads: Lead[]; stages: Stage[]; onSelect: (l: Lead) => void }) {
  const byStage = (key: string) => {
    if (key === 'ai_responded') {
      return leads.filter(l => l.stage === 'ai_responded' || (l.stage === 'new_lead' && l.call_status && CALL_ATTEMPTED.includes(l.call_status)));
    }
    if (key === 'new_lead') {
      return leads.filter(l => l.stage === 'new_lead' && (!l.call_status || !CALL_ATTEMPTED.includes(l.call_status)));
    }
    return leads.filter(l => l.stage === key);
  };

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
                const lastActivity = lead.last_response_at || lead.created_at;
                const isNew     = minutesSince(lead.created_at) < 60;
                const idleHours = minutesSince(lastActivity) / 60;
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
                      <div className="flex gap-1 shrink-0flex-wrap">
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

                    {/* Source badge */}
                    {lead.source && <SourceBadge source={lead.source} />}

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
                        📅 {new Date(lead.scheduled_at).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} ET
                      </p>
                    )}

                    {/* Bottom row: time + score */}
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-bold ${noReply ? 'text-red-400' : 'text-white/25'}`}>
                        🕐 {formatEntryTime(lead.last_response_at || lead.created_at)}
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
