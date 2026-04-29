interface Props { appointment: any; onClick: () => void; }

export default function AppointmentRow({ appointment: apt, onClick }: Props) {
  const date = apt.scheduled_at
    ? new Date(apt.scheduled_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Date TBD';

  const isPast = apt.scheduled_at && new Date(apt.scheduled_at) < new Date();

  return (
    <button onClick={onClick} className="w-full text-left px-4 py-4 hover:bg-gray-50 transition flex items-center gap-4">
      <div className={`w-2 h-10 rounded-full shrink-0 ${isPast ? 'bg-gray-300' : 'bg-green-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{apt.lead_name || 'Customer'}</p>
          {apt.service_type && <p className="text-xs text-blue-600 capitalize">{apt.service_type.replace(/_/g, ' ')}</p>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-xs text-gray-500">📅 {date}</p>
          {apt.lead_address && <p className="text-xs text-gray-500 truncate">📍 {apt.lead_address}</p>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <a
          href={`tel:+${apt.lead_phone}`}
          onClick={e => e.stopPropagation()}
          className="text-xs font-medium text-blue-600 hover:underline block"
        >
          +{apt.lead_phone}
        </a>
      </div>
    </button>
  );
}
