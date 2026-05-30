import { Phone, Clock, AlertCircle, CheckCircle, Mail, MailX } from 'lucide-react';

interface Lead {
  id: string;
  lead_name: string;
  lead_phone: string;
  lead_email?: string | null;
  service_type?: string;
  stage: string;
  source?: string;
  created_at: string;
  follow_up_count?: number;
  last_follow_up_at?: string | null;
}

interface Props {
  leads: Lead[];
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Followups({ leads }: Props) {
  const coldLeads = leads
    .filter(l => ['new_lead', 'ai_responded'].includes(l.stage))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // No email — can't receive follow-ups, needs manual call
  const noEmail = coldLeads.filter(l => !l.lead_email);

  // Has email — segment by follow_up_count
  const withEmail = coldLeads.filter(l => !!l.lead_email);
  const step0 = withEmail.filter(l => !l.follow_up_count || l.follow_up_count === 0);
  const step1 = withEmail.filter(l => l.follow_up_count === 1);
  const step2 = withEmail.filter(l => l.follow_up_count === 2);
  const step3 = withEmail.filter(l => (l.follow_up_count ?? 0) >= 3);

  return (
    <div className="space-y-5">

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="No email" value={noEmail.length}
          color="text-gray-500" bg="bg-gray-50 border-gray-200"
          icon={<MailX size={16} className="text-gray-400" />} />
        <SummaryCard label="Catalog pending" value={step0.length}
          color="text-red-600" bg="bg-red-50 border-red-200"
          icon={<AlertCircle size={16} className="text-red-500" />} />
        <SummaryCard label="Step 1 sent" value={step1.length}
          color="text-amber-600" bg="bg-amber-50 border-amber-200"
          icon={<Clock size={16} className="text-amber-500" />} />
        <SummaryCard label="Fully followed up" value={step2.length + step3.length}
          color="text-gray-400" bg="bg-gray-50 border-gray-200"
          icon={<CheckCircle size={16} className="text-gray-400" />} />
      </div>

      {/* No email — manual call needed */}
      {noEmail.length > 0 && (
        <Section title="No email captured — call manually"
          subtitle="These leads have no email. Alice sent the call, but no follow-up emails possible."
          accent="border-l-gray-300" leads={noEmail} step={null} />
      )}

      {/* Catalog not yet sent */}
      {step0.length > 0 && (
        <Section title="Catalog email pending"
          subtitle="Has email — catalog will be sent automatically after missed call, or trigger manually."
          accent="border-l-red-400" leads={step0} step={0} />
      )}

      {/* Step 1 sent — waiting for Day 2 */}
      {step1.length > 0 && (
        <Section title="Step 1 sent — waiting Day 2"
          subtitle="Catalog email sent. Day 2 follow-up will fire automatically at 48h."
          accent="border-l-amber-400" leads={step1} step={1} />
      )}

      {/* Step 2 sent — waiting for Day 5 */}
      {step2.length > 0 && (
        <Section title="Step 2 sent — waiting Day 5"
          subtitle="Day 2 follow-up sent. Final email (Day 5) will fire automatically."
          accent="border-l-yellow-300" leads={step2} step={2} />
      )}

      {/* Fully followed up */}
      {step3.length > 0 && (
        <Section title="Fully followed up"
          subtitle="All 3 emails sent — no response. Consider a personal call."
          accent="border-l-gray-200" leads={step3} step={3} />
      )}

      {coldLeads.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">No cold leads right now</p>
          <p className="text-gray-400 text-xs mt-1">All leads either scheduled or already converted</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, bg, icon }: { label: string; value: number; color: string; bg: string; icon: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-medium text-gray-500">{label}</span></div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Section({ title, subtitle, accent, leads, step }: { title: string; subtitle: string; accent: string; leads: Lead[]; step: number | null }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${accent} overflow-hidden`}>
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="divide-y divide-gray-50">
        {leads.map(lead => <LeadRow key={lead.id} lead={lead} step={step} />)}
      </div>
    </div>
  );
}

function LeadRow({ lead, step }: { lead: Lead; step: number | null }) {
  const days = daysSince(lead.created_at);
  const stepLabels: Record<number, string> = { 1: 'Catalog sent', 2: 'Day 2 sent', 3: 'Day 5 sent' };

  return (
    <div className="px-5 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900">{lead.lead_name || 'Customer'}</p>
          {lead.service_type && <span className="text-xs text-blue-600 capitalize">{lead.service_type.replace(/_/g, ' ')}</span>}
          {lead.lead_email
            ? <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold"><Mail size={10} /> {lead.lead_email}</span>
            : <span className="flex items-center gap-0.5 text-[10px] text-gray-400"><MailX size={10} /> no email</span>
          }
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <p className="text-xs text-gray-400">+{lead.lead_phone}</p>
          <p className="text-xs text-gray-400">{days}d ago</p>
          {step != null && step > 0 && lead.last_follow_up_at && (
            <span className="text-xs text-amber-600">{stepLabels[step] || `Step ${step}`} — {formatDate(lead.last_follow_up_at)}</span>
          )}
          {lead.source && <span className="text-[10px] text-gray-300 capitalize">{lead.source}</span>}
        </div>
      </div>
      <a
        href={`tel:+${lead.lead_phone}`}
        className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg transition shrink-0"
      >
        <Phone size={11} /> Call
      </a>
    </div>
  );
}
