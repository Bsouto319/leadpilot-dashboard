import { Phone, MessageSquare, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface Lead {
  id: string;
  lead_name: string;
  lead_phone: string;
  service_type?: string;
  stage: string;
  created_at: string;
  followup_d3_sent_at?: string;
  followup_d7_sent_at?: string;
  email_body?: string;
}

interface Props {
  leads: Lead[];
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Followups({ leads }: Props) {
  const coldLeads = leads
    .filter(l => ['new_lead', 'ai_responded'].includes(l.stage))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const urgent   = coldLeads.filter(l => daysSince(l.created_at) >= 2 && !l.followup_d3_sent_at);
  const pending  = coldLeads.filter(l => l.followup_d3_sent_at && !l.followup_d7_sent_at);
  const followedUp = coldLeads.filter(l => l.followup_d7_sent_at);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          label="Need follow-up"
          value={urgent.length}
          color="text-red-600"
          bg="bg-red-50 border-red-200"
          icon={<AlertCircle size={16} className="text-red-500" />}
        />
        <SummaryCard
          label="D+3 sent"
          value={pending.length}
          color="text-yellow-600"
          bg="bg-yellow-50 border-yellow-200"
          icon={<Clock size={16} className="text-yellow-500" />}
        />
        <SummaryCard
          label="D+7 sent"
          value={followedUp.length}
          color="text-gray-500"
          bg="bg-gray-50 border-gray-200"
          icon={<CheckCircle size={16} className="text-gray-400" />}
        />
      </div>

      {/* Urgent — needs follow-up soon */}
      {urgent.length > 0 && (
        <Section
          title="Need follow-up"
          subtitle="Responded but never scheduled — D+3 SMS not sent yet"
          accent="border-l-red-400"
          leads={urgent}
        />
      )}

      {/* D+3 sent — waiting for D+7 */}
      {pending.length > 0 && (
        <Section
          title="D+3 sent — waiting"
          subtitle="Follow-up sent 3 days ago. D+7 will fire automatically."
          accent="border-l-yellow-400"
          leads={pending}
        />
      )}

      {/* D+7 sent — fully followed up */}
      {followedUp.length > 0 && (
        <Section
          title="Fully followed up"
          subtitle="D+7 sent — no response. Consider calling manually."
          accent="border-l-gray-300"
          leads={followedUp}
        />
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

function Section({ title, subtitle, accent, leads }: { title: string; subtitle: string; accent: string; leads: Lead[] }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${accent} overflow-hidden`}>
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="divide-y divide-gray-50">
        {leads.map(lead => (
          <LeadRow key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  const days = daysSince(lead.created_at);
  return (
    <div className="px-5 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{lead.lead_name || 'Customer'}</p>
          {lead.service_type && (
            <span className="text-xs text-blue-600 capitalize">{lead.service_type.replace(/_/g, ' ')}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-xs text-gray-400">+{lead.lead_phone}</p>
          <p className="text-xs text-gray-400">{days}d ago</p>
          {lead.followup_d3_sent_at && (
            <span className="text-xs text-yellow-600">D+3 sent {formatDate(lead.followup_d3_sent_at)}</span>
          )}
          {lead.followup_d7_sent_at && (
            <span className="text-xs text-gray-400">D+7 sent {formatDate(lead.followup_d7_sent_at)}</span>
          )}
        </div>
        {lead.email_body && (
          <p className="text-xs text-gray-400 mt-1 italic truncate max-w-sm">"{lead.email_body}"</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`tel:+${lead.lead_phone}`}
          className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg transition"
        >
          <Phone size={11} /> Call
        </a>
        <a
          href={`sms:+${lead.lead_phone}`}
          className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 px-2.5 py-1.5 rounded-lg transition"
        >
          <MessageSquare size={11} /> SMS
        </a>
      </div>
    </div>
  );
}
