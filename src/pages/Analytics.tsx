import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  TrendingUp, RefreshCw, Target, Brain, Calendar, Activity,
  ChevronUp, ChevronDown, Users, Clock, Zap, Hash, Search,
  DollarSign, BarChart2, MapPin, Star, AlertTriangle,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const CP_CLIENT_ID = '5221cab9-a741-4ddc-a752-2359826fba95';
const BUSINESS     = 'CP Cabinets & Quartz';

const STAGES: Record<string, { label: string; color: string }> = {
  new_lead:     { label: 'New Lead',    color: '#6366f1' },
  ai_responded: { label: 'Contacted',  color: '#0ea5e9' },
  scheduled:    { label: 'Visit Sched',color: '#f59e0b' },
  completed:    { label: 'Visited',    color: '#22c55e' },
  no_show:      { label: 'No Show',    color: '#ef4444' },
  lost:         { label: 'Lost',       color: '#64748b' },
};

const SOURCE_COLOR: Record<string, string> = {
  thumbtack: '#f97316',
  website:   '#a78bfa',
  referral:  '#22c55e',
  google:    '#0ea5e9',
  facebook:  '#3b82f6',
};

const EN_STOPWORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','can','shall','this',
  'that','these','those','i','me','my','you','your','we','our','they','them',
  'it','its','his','her','he','she','us','their','what','which','who','how',
  'when','where','why','not','no','yes','get','got','need','want','like',
  'just','also','very','really','hi','hello','hey','thanks','thank','please',
  'ok','okay','sure','yes','some','all','any','more','am','im','looking',
  'interested','kitchen','cabinets','quartz','quote','estimate','install',
  'interested in','would like','let me know','reach out','looking for',
]);

type Period = '7d' | '30d' | '90d' | 'all';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round((curr - prev) / prev * 100);
}

function extractKeywords(texts: string[]): { word: string; count: number }[] {
  const freq: Record<string, number> = {};
  for (const t of texts) {
    const words = t.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !EN_STOPWORDS.has(w));
    for (const w of words) freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

function getRange(period: Period) {
  const now = new Date();
  if (period === 'all') return { from: '2020-01-01T00:00:00Z', to: now.toISOString() };
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return {
    from: new Date(now.getTime() - days * 86400000).toISOString(),
    to:   now.toISOString(),
  };
}

function getPrevRange(period: Period) {
  if (period === 'all') return null;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const now  = new Date();
  const from = new Date(now.getTime() - days * 86400000);
  return {
    from: new Date(from.getTime() - days * 86400000).toISOString(),
    to:   from.toISOString(),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DeltaBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const up = value > 0;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${up ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
      {up ? <ChevronUp size={9}/> : <ChevronDown size={9}/>}
      {Math.abs(value)}%
    </span>
  );
}

function KpiCard({ label, value, sub, delta, color = 'emerald', icon: Icon }: {
  label: string; value: string; sub?: string; delta?: number; color?: string; icon: any;
}) {
  const g: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-600',
    sky:     'from-sky-500 to-blue-600',
    amber:   'from-amber-500 to-orange-500',
    rose:    'from-rose-500 to-red-600',
    violet:  'from-violet-500 to-purple-600',
    orange:  'from-orange-500 to-red-500',
    indigo:  'from-indigo-500 to-blue-700',
  };
  return (
    <div className="rounded-2xl border border-white/10 p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${g[color] ?? g.emerald} flex items-center justify-center shadow-lg`}>
          <Icon size={15} className="text-white"/>
        </div>
        {delta !== undefined && <DeltaBadge value={delta}/>}
      </div>
      <div>
        <p className="text-white font-black text-2xl leading-none">{value}</p>
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mt-1">{label}</p>
        {sub && <p className="text-white/25 text-[10px] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, sub, color = 'text-sky-400' }: { icon: any; title: string; sub?: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon size={14} className={color}/>
      <span className="text-white font-black text-sm uppercase tracking-widest">{title}</span>
      <div className="flex-1 h-px bg-white/8 ml-2"/>
      {sub && <span className="text-white/20 text-[10px]">{sub}</span>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [period, setPeriod]   = useState<Period>('30d');
  const [leads, setLeads]     = useState<any[]>([]);
  const [prevLeads, setPrev]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to }     = getRange(period);
    const prev             = getPrevRange(period);

    const [curRes, prevRes] = await Promise.all([
      supabase.from('conversations')
        .select('id,lead_name,lead_email,lead_address,source,stage,email_body,service_type,created_at,scheduled_at,call_status,follow_up_count,last_response_at')
        .eq('client_id', CP_CLIENT_ID)
        .gte('created_at', from).lte('created_at', to),
      prev
        ? supabase.from('conversations')
            .select('id,stage,source,created_at,scheduled_at')
            .eq('client_id', CP_CLIENT_ID)
            .gte('created_at', prev.from).lte('created_at', prev.to)
        : Promise.resolve({ data: [] }),
    ]);

    setLeads(curRes.data || []);
    setPrev((prevRes as any).data || []);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // ─── Derived metrics ──────────────────────────────────────────────────────

  const total       = leads.length;
  const prevTotal   = prevLeads.length;
  const scheduled   = leads.filter(l => ['scheduled','completed','no_show'].includes(l.stage)).length;
  const visited     = leads.filter(l => l.stage === 'completed').length;
  const noShow      = leads.filter(l => l.stage === 'no_show').length;
  const convRate    = total > 0 ? Math.round(scheduled / total * 100) : 0;
  const visitRate   = scheduled > 0 ? Math.round(visited / scheduled * 100) : 0;
  const prevSched   = prevLeads.filter(l => ['scheduled','completed','no_show'].includes(l.stage)).length;
  const deltaLeads  = pctChange(total, prevTotal);
  const deltaSched  = pctChange(scheduled, prevSched);

  // avg hours to schedule
  const withSched   = leads.filter(l => l.scheduled_at && l.created_at);
  const avgHrsSched = withSched.length > 0
    ? Math.round(withSched.reduce((s, l) => s + (new Date(l.scheduled_at).getTime() - new Date(l.created_at).getTime()) / 3600000, 0) / withSched.length)
    : null;

  // Sources
  const sourceMap: Record<string, { count: number; sched: number }> = {};
  for (const l of leads) {
    const s = l.source || 'unknown';
    if (!sourceMap[s]) sourceMap[s] = { count: 0, sched: 0 };
    sourceMap[s].count++;
    if (['scheduled','completed','no_show'].includes(l.stage)) sourceMap[s].sched++;
  }
  const sources = Object.entries(sourceMap)
    .map(([src, d]) => ({ src, ...d, rate: d.count > 0 ? Math.round(d.sched / d.count * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
  const bestSource = sources[0];

  // Stage funnel
  const stageCounts: Record<string, number> = {};
  for (const l of leads) stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1;

  // Heatmap: DOW (0=Sun..6=Sat) × hour (EST — UTC-5)
  const heatmap: Record<number, Record<number, number>> = {};
  for (let d = 0; d < 7; d++) heatmap[d] = {};
  for (const l of leads) {
    const ts  = new Date(new Date(l.created_at).getTime() - 5 * 3600000); // EST
    const dow = ts.getUTCDay();
    const h   = ts.getUTCHours();
    heatmap[dow][h] = (heatmap[dow][h] || 0) + 1;
  }
  const heatmax = Math.max(...Object.values(heatmap).flatMap(r => Object.values(r)), 1);

  // Best hours
  const hourTotals: { h: number; count: number }[] = Array.from({ length: 24 }, (_, h) => ({
    h,
    count: Object.values(heatmap).reduce((s, row) => s + (row[h] || 0), 0),
  })).sort((a, b) => b.count - a.count);
  const topHours = hourTotals.slice(0, 3);

  // Best days
  const DOW_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dowTotals = Array.from({ length: 7 }, (_, d) => ({
    d,
    label: DOW_LABELS[d],
    count: Object.values(heatmap[d] || {}).reduce((s, v) => s + v, 0),
  })).sort((a, b) => b.count - a.count);

  // Keywords from subjects + notes
  const texts = leads.flatMap(l => [l.email_body || '', l.service_type || ''].filter(Boolean));
  const keywords = extractKeywords(texts);

  // Project types (from subject / service_type)
  const projMap: Record<string, number> = {};
  for (const l of leads) {
    const t = (l.service_type || '').trim();
    if (t) projMap[t] = (projMap[t] || 0) + 1;
  }
  const projects = Object.entries(projMap)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Avg days to visit
  const completedLeads = leads.filter(l => l.stage === 'completed' && l.scheduled_at);
  const avgDaysToVisit = completedLeads.length > 0
    ? Math.round(completedLeads.reduce((s, l) => s + (new Date(l.scheduled_at).getTime() - new Date(l.created_at).getTime()) / 86400000, 0) / completedLeads.length)
    : null;

  // Google Ads keyword groups
  const adsKeywordGroups = [
    { group: 'Kitchen Cabinets', keywords: ['kitchen cabinets', 'kitchen cabinet installation', 'new kitchen cabinets', 'custom kitchen cabinets', 'kitchen remodel'], cpcEst: '$3–8' },
    { group: 'Quartz Countertops', keywords: ['quartz countertops', 'quartz countertop installation', 'granite countertops', 'countertop replacement', 'kitchen countertops'], cpcEst: '$4–10' },
    { group: 'Bathroom Vanity', keywords: ['bathroom vanity', 'bathroom cabinets', 'bathroom remodel', 'bathroom renovation', 'vanity installation'], cpcEst: '$3–7' },
    { group: 'Local Intent', keywords: ['"cabinet installer near me"', '"quartz countertops near me"', '"kitchen remodel South Carolina"', '"flooring contractor SC"'], cpcEst: '$5–12' },
  ];

  // ROI estimator
  const estCPC     = 6;    // avg $6 CPC for cabinet/quartz keywords
  const estCVR     = 0.08; // 8% form submission rate from paid click
  const estClose   = total > 0 && scheduled > 0 ? scheduled / total : 0.25;
  const estRevenue = 8500; // avg project value CP Cabinets
  const budgets    = [500, 1000, 2000, 3000];

  const periodoLabel = period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : period === '90d' ? 'Last 90 days' : 'All time';

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 py-4 space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="text-white font-black text-xl">Analytics & Ads Intelligence</h2>
          <p className="text-white/30 text-xs mt-0.5">{BUSINESS} · {periodoLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            {(['7d','30d','90d','all'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-[11px] font-black transition ${period === p ? 'bg-amber-600 text-white' : 'text-white/40 hover:text-white/70'}`}>
                {p === '7d' ? '7d' : p === '30d' ? '30d' : p === '90d' ? '90d' : 'All'}
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-40">
            <RefreshCw size={13} className={`text-white/50 ${loading ? 'animate-spin' : ''}`}/>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-2 text-white/30 text-sm">
          <RefreshCw size={15} className="animate-spin"/> Loading data...
        </div>
      ) : (
        <>
          {/* ── KPI Overview ─────────────────────────────────────────────── */}
          <SectionHeader icon={BarChart2} title="Performance Overview" sub={periodoLabel} color="text-amber-400"/>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Total Leads" value={String(total)} icon={Users} color="indigo" delta={deltaLeads} sub="vs prev period"/>
            <KpiCard label="Visits Sched." value={String(scheduled)} icon={Calendar} color="amber" delta={deltaSched} sub={`${convRate}% conv rate`}/>
            <KpiCard label="Completed" value={String(visited)} icon={Star} color="emerald" sub={`${visitRate}% show rate`}/>
            <KpiCard label="No Shows" value={String(noShow)} icon={AlertTriangle} color={noShow > scheduled * 0.2 ? 'rose' : 'sky'} sub={`${scheduled > 0 ? Math.round(noShow/scheduled*100) : 0}% rate`}/>
            <KpiCard label="Conv. Rate" value={`${convRate}%`} icon={TrendingUp} color={convRate >= 40 ? 'emerald' : convRate >= 20 ? 'amber' : 'rose'} sub="lead → visit"/>
            <KpiCard label="Avg. to Sched." value={avgHrsSched !== null ? `${avgHrsSched}h` : '—'} icon={Clock} color="sky" sub="hours lead → appt"/>
          </div>

          {/* ── Conversion Funnel ────────────────────────────────────────── */}
          <SectionHeader icon={Activity} title="Conversion Funnel" color="text-violet-400"/>

          <div className="rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="space-y-2.5">
              {Object.entries(STAGES).map(([key, { label, color }]) => {
                const val  = stageCounts[key] || 0;
                const bar  = total > 0 ? Math.round(val / total * 100) : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <p className="text-white/40 text-[10px] font-bold w-24 shrink-0 text-right">{label}</p>
                    <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-lg flex items-center px-3 gap-2 transition-all duration-700"
                        style={{ width: `${Math.max(bar, 3)}%`, backgroundColor: color + 'cc' }}>
                        <span className="text-white font-black text-[11px] shrink-0">{val}</span>
                      </div>
                    </div>
                    <span className="text-white/25 text-[10px] w-8 text-right font-mono">{bar}%</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-white/8 flex flex-wrap gap-4 text-[10px]">
              <span className="text-white/30">Lead → Visit: <strong className={`${convRate >= 30 ? 'text-emerald-400' : convRate >= 15 ? 'text-amber-400' : 'text-rose-400'}`}>{convRate}%</strong></span>
              {avgDaysToVisit !== null && <span className="text-white/30">Avg days lead → completed visit: <strong className="text-sky-400">{avgDaysToVisit}d</strong></span>}
            </div>
          </div>

          {/* ── Lead Sources ─────────────────────────────────────────────── */}
          <SectionHeader icon={MapPin} title="Lead Sources" sub={`${sources.length} sources`} color="text-orange-400"/>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sources.map(s => {
              const color = SOURCE_COLOR[s.src] || '#6366f1';
              const pct   = total > 0 ? Math.round(s.count / total * 100) : 0;
              return (
                <div key={s.src} className="rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-sm capitalize" style={{ color }}>{s.src}</span>
                    <span className="text-white/20 text-[10px] font-mono">{pct}% of leads</span>
                  </div>
                  <p className="text-white font-black text-2xl leading-none">{s.count}</p>
                  <p className="text-white/30 text-[10px] mt-1">leads · {s.sched} scheduled ({s.rate}%)</p>
                  <div className="mt-3 h-1.5 rounded-full bg-white/8">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }}/>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[9px] text-white/20">Conv. rate</span>
                    <span className={`text-[10px] font-black ${s.rate >= 40 ? 'text-emerald-400' : s.rate >= 20 ? 'text-amber-400' : 'text-rose-400'}`}>{s.rate}%</span>
                  </div>
                </div>
              );
            })}
            {sources.length === 0 && (
              <div className="col-span-3 text-center py-10 text-white/20 text-sm">No leads in this period</div>
            )}
          </div>

          {/* ── Heatmap & Best Times for Ads ──────────────────────────────── */}
          <SectionHeader icon={Clock} title="Best Times — Google Ads Scheduling" sub="When leads come in (EST)" color="text-sky-400"/>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Heatmap */}
            <div className="rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-white/50 text-xs font-black uppercase tracking-wider mb-4">Day × Hour Heatmap</p>
              <div className="overflow-x-auto">
                <div className="min-w-[420px]">
                  <div className="flex items-center mb-1 gap-0.5 pl-8">
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="flex-1 text-center text-[7px] text-white/20 font-mono">{h}</div>
                    ))}
                  </div>
                  {[1,2,3,4,5,6,0].map(dow => (
                    <div key={dow} className="flex items-center gap-0.5 mb-0.5">
                      <span className={`text-[9px] font-black w-8 shrink-0 text-right pr-1.5 ${[0,6].includes(dow) ? 'text-white/20' : 'text-white/40'}`}>
                        {DOW_LABELS[dow]}
                      </span>
                      {Array.from({ length: 24 }, (_, h) => {
                        const val     = heatmap[dow]?.[h] || 0;
                        const intense = val / heatmax;
                        const bg = intense === 0 ? 'rgba(255,255,255,0.03)'
                          : intense < 0.25 ? 'rgba(251,146,60,0.20)'
                          : intense < 0.5  ? 'rgba(251,146,60,0.40)'
                          : intense < 0.75 ? 'rgba(251,146,60,0.65)'
                          : 'rgba(251,146,60,0.90)';
                        return (
                          <div key={h} title={`${DOW_LABELS[dow]} ${h}h: ${val} leads`}
                            className="flex-1 h-5 rounded-sm flex items-center justify-center"
                            style={{ backgroundColor: bg }}>
                            {val > 0 && intense >= 0.5 && <span className="text-white text-[7px] font-black">{val}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <span className="text-white/20 text-[10px]">Intensity:</span>
                {[0.15, 0.4, 0.7, 0.9].map((v, i) => (
                  <span key={i} className="flex items-center gap-1 text-[10px] text-white/40">
                    <span className="w-4 h-3 rounded-sm inline-block" style={{ backgroundColor: `rgba(251,146,60,${v})` }}/>
                    {['low','med','high','peak'][i]}
                  </span>
                ))}
              </div>
            </div>

            {/* Ads scheduling recommendations */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-amber-500/25 p-4" style={{ background: 'rgba(251,146,60,0.06)' }}>
                <p className="text-amber-300 text-xs font-black uppercase tracking-wider mb-3">🔥 Peak Lead Hours</p>
                <div className="space-y-2">
                  {topHours.map(({ h, count }, i) => (
                    <div key={h} className="flex items-center gap-3">
                      <span className="text-amber-300 font-black text-sm w-14 shrink-0">
                        {String(h).padStart(2,'0')}:00
                      </span>
                      <div className="flex-1 h-4 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500/60 transition-all"
                          style={{ width: `${topHours[0].count > 0 ? Math.round(count/topHours[0].count*100) : 0}%` }}/>
                      </div>
                      <span className="text-white/40 text-[10px] font-mono w-12 text-right">{count} leads</span>
                      {i === 0 && <span className="text-[9px] font-black text-amber-400">peak</span>}
                    </div>
                  ))}
                </div>
                <p className="text-amber-200/40 text-[10px] mt-3">→ Enable ads 1h before these windows for best ROI</p>
              </div>

              <div className="rounded-2xl border border-sky-500/25 p-4" style={{ background: 'rgba(14,165,233,0.06)' }}>
                <p className="text-sky-300 text-xs font-black uppercase tracking-wider mb-3">📅 Best Days to Advertise</p>
                <div className="space-y-1.5">
                  {dowTotals.slice(0, 5).map(({ d, label, count }, i) => (
                    <div key={d} className="flex items-center gap-3">
                      <span className={`text-[11px] font-black w-8 shrink-0 ${[0,6].includes(d) ? 'text-white/30' : 'text-sky-300'}`}>{label}</span>
                      <div className="flex-1 h-3.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${dowTotals[0].count > 0 ? Math.round(count/dowTotals[0].count*100) : 0}%`, backgroundColor: 'rgba(14,165,233,0.55)' }}/>
                      </div>
                      <span className="text-white/35 text-[10px] font-mono w-14 text-right">{count} leads</span>
                      {i === 0 && <span className="text-[9px] font-black text-sky-300">best</span>}
                    </div>
                  ))}
                </div>
                <p className="text-sky-200/40 text-[10px] mt-3">→ Increase budget on top days, reduce on bottom 2</p>
              </div>
            </div>
          </div>

          {/* ── Keywords for Google Ads ───────────────────────────────────── */}
          <SectionHeader icon={Search} title="Keywords for Google Ads" sub="Extracted from lead messages" color="text-emerald-400"/>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Word cloud from lead data */}
            <div className="rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Hash size={13} className="text-emerald-400"/>
                <span className="text-white/50 text-xs font-black uppercase tracking-wider">What Leads Are Saying</span>
                <span className="text-white/20 text-[10px] ml-auto">from subjects & notes</span>
              </div>
              {keywords.length === 0 ? (
                <p className="text-white/20 text-sm text-center py-6">No text data in this period</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw, i) => {
                    const max    = keywords[0]?.count || 1;
                    const pct    = Math.round(kw.count / max * 100);
                    const sz     = pct >= 80 ? 'text-base' : pct >= 50 ? 'text-sm' : pct >= 30 ? 'text-xs' : 'text-[10px]';
                    const style  = pct >= 80 ? 'bg-emerald-500/25 border-emerald-500/40 text-emerald-200'
                      : pct >= 50 ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'
                      : pct >= 30 ? 'bg-white/8 border-white/15 text-white/50'
                      : 'bg-white/4 border-white/8 text-white/30';
                    return (
                      <span key={i} className={`px-2.5 py-1 rounded-full border font-bold ${sz} ${style} flex items-center gap-1`}>
                        <Hash size={8} className="opacity-50"/>
                        {kw.word}
                        <span className="opacity-50 text-[9px] ml-0.5">{kw.count}</span>
                      </span>
                    );
                  })}
                </div>
              )}
              <p className="text-white/15 text-[10px] mt-3">Use high-frequency words as broad/phrase match keywords in your campaigns</p>
            </div>

            {/* Suggested keyword groups */}
            <div className="rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Target size={13} className="text-violet-400"/>
                <span className="text-white/50 text-xs font-black uppercase tracking-wider">Suggested Ad Groups</span>
                <span className="text-white/20 text-[10px] ml-auto">est. CPC range</span>
              </div>
              <div className="space-y-3">
                {adsKeywordGroups.map((g, i) => {
                  const COLORS = ['#22c55e','#0ea5e9','#f59e0b','#a78bfa'];
                  return (
                    <div key={g.group} className="rounded-xl border border-white/8 p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black" style={{ color: COLORS[i] }}>{g.group}</span>
                        <span className="text-[10px] font-mono text-white/30">{g.cpcEst} CPC</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {g.keywords.map(kw => (
                          <span key={kw} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/8 font-mono">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Project Types ─────────────────────────────────────────────── */}
          {projects.length > 0 && (
            <>
              <SectionHeader icon={Zap} title="Most Requested Projects" sub="From lead intake" color="text-amber-400"/>

              <div className="rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="space-y-2.5">
                  {projects.map((p, i) => {
                    const bar = Math.round(p.count / (projects[0]?.count || 1) * 100);
                    const COLORS = ['#f59e0b','#22c55e','#0ea5e9','#a78bfa','#f97316','#06b6d4','#e11d48','#84cc16','#ec4899','#14b8a6'];
                    return (
                      <div key={p.type} className="flex items-center gap-3">
                        <span className="text-white/20 text-[10px] font-black w-4 text-right shrink-0">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white/70 text-[11px] font-bold truncate">{p.type}</span>
                            <span className="text-white font-black text-xs ml-2 shrink-0">{p.count}x</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/8">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${bar}%`, backgroundColor: COLORS[i % COLORS.length] }}/>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-white/15 text-[10px] mt-4 pt-3 border-t border-white/8">
                  💡 Build separate ad groups for your top 3 project types — higher relevance = lower CPC
                </p>
              </div>
            </>
          )}

          {/* ── Google Ads ROI Estimator ─────────────────────────────────── */}
          <SectionHeader icon={DollarSign} title="Google Ads ROI Estimator" sub="Based on your real data" color="text-emerald-400"/>

          <div className="rounded-2xl border border-emerald-500/20 p-4" style={{ background: 'rgba(16,185,129,0.04)' }}>
            <div className="grid grid-cols-3 gap-4 mb-5 text-center">
              <div>
                <p className="text-emerald-300 font-black text-xl">{Math.round(convRate)}%</p>
                <p className="text-white/30 text-[10px] font-bold mt-1">Your Conv. Rate</p>
                <p className="text-white/20 text-[9px]">lead → visit scheduled</p>
              </div>
              <div>
                <p className="text-amber-300 font-black text-xl">${estCPC}</p>
                <p className="text-white/30 text-[10px] font-bold mt-1">Est. CPC</p>
                <p className="text-white/20 text-[9px]">avg cabinet/quartz keywords</p>
              </div>
              <div>
                <p className="text-sky-300 font-black text-xl">${estRevenue.toLocaleString()}</p>
                <p className="text-white/30 text-[10px] font-bold mt-1">Avg Job Value</p>
                <p className="text-white/20 text-[9px]">est. revenue per closed job</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Monthly Budget','Est. Clicks','Est. Leads','Est. Visits','Est. Closes','Est. Revenue','ROI'].map(h => (
                      <th key={h} className="py-2 px-3 text-white/30 font-black uppercase text-[9px] tracking-wider text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {budgets.map(budget => {
                    const clicks   = Math.round(budget / estCPC);
                    const estLeads = Math.round(clicks * estCVR);
                    const visits   = Math.round(estLeads * (convRate / 100));
                    const closes   = Math.round(visits * 0.60); // 60% close rate at visit
                    const revenue  = closes * estRevenue;
                    const roi      = budget > 0 ? Math.round((revenue - budget) / budget * 100) : 0;
                    return (
                      <tr key={budget} className="border-b border-white/6 hover:bg-white/3 transition-colors">
                        <td className="py-2.5 px-3 text-amber-300 font-black">${budget.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-white/60 font-mono">{clicks}</td>
                        <td className="py-2.5 px-3 text-sky-300 font-black">{estLeads}</td>
                        <td className="py-2.5 px-3 text-amber-300 font-black">{visits}</td>
                        <td className="py-2.5 px-3 text-emerald-300 font-black">{closes}</td>
                        <td className="py-2.5 px-3 text-emerald-300 font-black">${revenue.toLocaleString()}</td>
                        <td className="py-2.5 px-3">
                          <span className={`font-black ${roi >= 300 ? 'text-emerald-400' : roi >= 100 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {roi}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-white/15 text-[10px] mt-3">
              Assumptions: {Math.round(estCVR*100)}% form CVR from click · {Math.round(estClose*100)}% visit rate from your real data · 60% close rate at visit · ${estRevenue.toLocaleString()} avg job
            </p>
          </div>

          {/* ── Campaign Recommendations ────────────────────────────────── */}
          <SectionHeader icon={Brain} title="Campaign Recommendations" sub="Based on your data" color="text-violet-400"/>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                title: 'Ad Schedule',
                icon: Clock,
                color: '#f59e0b',
                items: [
                  `Run ads ${topHours[0] ? `${String(topHours[0].h).padStart(2,'0')}:00–${String(topHours[0].h+2).padStart(2,'0')}:00` : 'during peak hours'} — your busiest lead window`,
                  `Focus budget on ${dowTotals[0]?.label || 'Mon'}–${dowTotals[1]?.label || 'Wed'} (your top 2 lead days)`,
                  `Reduce bids on ${dowTotals[6]?.label || 'Sun'} — lowest lead volume`,
                ],
              },
              {
                title: 'Audience Targeting',
                icon: Users,
                color: '#0ea5e9',
                items: [
                  'Target homeowners 35–65 within 40mi of Columbia, SC',
                  'Use "In-market: Kitchen & Bathroom Remodeling" audience',
                  'Add Customer Match with your existing lead emails',
                  bestSource ? `${bestSource.src} converts at ${bestSource.rate}% — consider similar targeting` : 'Track source UTMs to identify best channels',
                ],
              },
              {
                title: 'Ad Copy Insights',
                icon: Zap,
                color: '#22c55e',
                items: [
                  `Highlight top requested project: "${projects[0]?.type || 'Kitchen Cabinets'}"`,
                  'Use "Free In-Home Estimate" CTA — low friction for homeowners',
                  'Include "Licensed & Insured" and certifications in ad text',
                  'Test "Quartz + Cabinets Bundle" offers — premium positioning',
                ],
              },
              {
                title: 'Budget Strategy',
                icon: DollarSign,
                color: '#a78bfa',
                items: [
                  `Start with $1,000–1,500/mo — est. ${Math.round(1000/estCPC * estCVR * (convRate/100))} visits/mo`,
                  'Use Target CPA bidding after 30+ conversions tracked',
                  'Set conversion action: form submit + phone call',
                  'Add call extensions — cabinet buyers prefer to call',
                ],
              },
            ].map(card => (
              <div key={card.title} className="rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: card.color + '22', border: `1px solid ${card.color}40` }}>
                    <card.icon size={14} style={{ color: card.color }}/>
                  </div>
                  <span className="text-white font-black text-xs">{card.title}</span>
                </div>
                <ul className="space-y-2">
                  {card.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-white/50">
                      <span className="text-[10px] mt-0.5 shrink-0" style={{ color: card.color }}>→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="rounded-xl border border-white/6 px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-white/15 text-[10px]">
              Data: {total} leads · {periodoLabel} · Supabase live · ROI estimates based on industry benchmarks + your actual conversion rate
            </p>
          </div>
        </>
      )}
    </div>
  );
}
