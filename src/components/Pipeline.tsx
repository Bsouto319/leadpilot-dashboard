import { useState } from 'react';

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

// Paleta clara "da casa": a cor que antes pintava a coluna inteira virou etiqueta
// por origem do lead -- continua dando pra identificar de onde veio num relance.
const SOURCE_CONFIG: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  website:       { label: 'Website',    icon: '🌐', bg: '#e8eefd', color: '#2563eb' },
  thumbtack:     { label: 'Thumbtack',  icon: '🔨', bg: '#e3f6ee', color: '#059669' },
  inbound_call:  { label: 'Inbound',    icon: '📞', bg: '#efe8fd', color: '#7c3aed' },
  referral:      { label: 'Referral',   icon: '👥', bg: '#fcefdd', color: '#b45309' },
  instagram:     { label: 'Instagram',  icon: '📸', bg: '#fce7f1', color: '#db2777' },
  facebook:      { label: 'Facebook',   icon: '👍', bg: '#e4f4fd', color: '#0ea5e9' },
};

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const byStage = (key: string) => {
    if (key === 'ai_responded') {
      return leads.filter(l => l.stage === 'ai_responded' || (l.stage === 'new_lead' && l.call_status && CALL_ATTEMPTED.includes(l.call_status)));
    }
    if (key === 'new_lead') {
      return leads.filter(l => l.stage === 'new_lead' && (!l.call_status || !CALL_ATTEMPTED.includes(l.call_status)));
    }
    return leads.filter(l => l.stage === key);
  };

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="flex gap-2 h-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-black/5 [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-thumb]:rounded-full">
      {stages.map(stage => {
        const items = byStage(stage.key);
        return (
          <div key={stage.key} className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden w-44 md:w-48 border border-[#dbe0ea]">

            {/* Column header */}
            <div className="px-2.5 py-2 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: stage.headerBg }}>
              <span className="text-[11px] font-black text-white tracking-wider uppercase leading-none truncate">
                {stage.label}
              </span>
              <span className="text-[11px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full min-w-[22px] text-center ml-1 flex-shrink-0">
                {items.length}
              </span>
            </div>

            {/* Cards area */}
            <div
              className="flex-1 overflow-y-auto space-y-1.5 p-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full"
              style={{ background: '#eef0f5' }}
            >
              {items.map(lead => {
                const lastActivity = lead.last_response_at || lead.created_at;
                const isNew     = minutesSince(lead.created_at) < 60;
                const idleHours = minutesSince(lastActivity) / 60;
                const noReply   = !['scheduled', 'completed', 'no_show'].includes(lead.stage) && idleHours >= 3;
                const isExpanded = expandedId === lead.id;
                const srcCfg = lead.source ? SOURCE_CONFIG[lead.source] : null;

                return (
                  <div
                    key={lead.id}
                    className="rounded-lg border transition-all duration-150 shadow-sm"
                    style={{
                      background:      noReply ? '#fdecec' : '#ffffff',
                      borderColor:     noReply ? '#f3c2c2' : isExpanded ? '#c3cada' : '#e2e6ee',
                      borderLeftWidth: noReply ? 3 : 1,
                      borderLeftColor: noReply ? '#ef4444' : '#e2e6ee',
                    }}
                  >
                    {/* Collapsed row — always visible */}
                    <button
                      onClick={() => toggle(lead.id)}
                      className="w-full text-left px-2 py-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-black text-[#1b2030] truncate leading-tight flex-1">
                          {lead.lead_name || 'Customer'}
                        </p>
                        <div className="flex gap-1 shrink-0">
                          {isNew && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white tracking-wide" style={{ backgroundColor: stage.headerBg }}>
                              NEW
                            </span>
                          )}
                          {noReply && !isNew && (
                            <span className="text-[8px] font-black px-1 py-0.5 rounded-full bg-[#fdecec] text-[#b91c1c] tracking-wide border border-[#f3c2c2]">
                              IDLE
                            </span>
                          )}
                          <span className="text-[#8991a3] text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[10px] text-[#8991a3] font-semibold truncate">
                          +{lead.lead_phone}
                        </p>
                        <span className={`text-[9px] font-bold ml-1 shrink-0 ${noReply ? 'text-[#b91c1c]' : 'text-[#aab1c0]'}`}>
                          {formatEntryTime(lead.last_response_at || lead.created_at)}
                        </span>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-2 pb-2 border-t border-[#e2e6ee] pt-2 space-y-1.5">
                        {/* Source badge */}
                        {srcCfg ? (
                          <span
                            className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: srcCfg.bg, color: srcCfg.color }}
                          >
                            {srcCfg.icon} {srcCfg.label}
                          </span>
                        ) : lead.source ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#e2e6ee] bg-[#f6f7fa] text-[#6b7280] capitalize">
                            {lead.source.replace(/_/g, ' ')}
                          </span>
                        ) : null}

                        {/* Service type */}
                        {lead.service_type && lead.service_type !== 'general' && (
                          <p className="text-[10px] font-semibold capitalize text-[#475569]">
                            {lead.service_type.replace(/_/g, ' ')}
                          </p>
                        )}

                        {/* AI summary */}
                        {lead.summary && (
                          <p className="text-[10px] leading-relaxed line-clamp-2 text-[#475569]">
                            🤖 {lead.summary}
                          </p>
                        )}

                        {/* Scheduled date */}
                        {lead.scheduled_at && (
                          <p className="text-[10px] text-[#059669] font-semibold">
                            📅 {new Date(lead.scheduled_at).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} ET
                          </p>
                        )}

                        {/* Score */}
                        {lead.score != null && (
                          <span
                            className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: lead.score >= 70 ? '#e3f6ee' : lead.score >= 40 ? '#fef3e0' : '#fdecec',
                              color:           lead.score >= 70 ? '#059669' : lead.score >= 40 ? '#b45309' : '#b91c1c',
                            }}
                          >
                            {lead.score}%
                          </span>
                        )}

                        {/* Open detail button */}
                        <button
                          onClick={() => onSelect(lead)}
                          className="w-full text-[10px] font-black py-1 rounded text-[#1f3864] hover:text-white hover:bg-[#1f3864] transition-colors mt-1 bg-[#eef1f6] border border-[#dbe0ea]"
                        >
                          Ver detalhes →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {!items.length && (
                <div className="rounded-lg border border-dashed p-4 text-center mt-1 border-[#d7dce6]">
                  <p className="text-xs font-medium text-[#9aa3b5]">Empty</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
