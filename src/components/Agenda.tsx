import { useState } from 'react';
import { ChevronLeft, ChevronRight, Phone, MessageSquare, MapPin } from 'lucide-react';

interface Appointment {
  id: string;
  lead_name: string;
  lead_phone: string;
  lead_address?: string;
  service_type?: string;
  scheduled_at: string;
  stage: string;
}

interface Props {
  appointments: Appointment[];
}

const STAGE_COLOR: Record<string, string> = {
  scheduled:        'bg-emerald-50 text-emerald-600 border-emerald-200',
  awaiting_address: 'bg-amber-50 text-amber-600 border-amber-200',
  completed:        'bg-violet-50 text-violet-600 border-violet-200',
  no_show:          'bg-rose-50 text-rose-500 border-rose-200',
};

const STAGE_LABEL: Record<string, string> = {
  scheduled:        'Confirmed',
  awaiting_address: 'Pending address',
  completed:        'Completed',
  no_show:          'No show',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

export default function Agenda({ appointments }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected]   = useState<Date>(() => { const t = new Date(); t.setHours(0,0,0,0); return t; });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday  = () => { setWeekStart(startOfWeek(new Date())); setSelected((() => { const t = new Date(); t.setHours(0,0,0,0); return t; })()); };

  const aptsForDay = (day: Date) =>
    appointments
      .filter(a => a.scheduled_at && sameDay(new Date(a.scheduled_at), day))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const selectedApts = aptsForDay(selected);
  const today        = new Date(); today.setHours(0,0,0,0);

  const monthLabel = (() => {
    const months = new Set(weekDays.map(d => d.getMonth()));
    if (months.size === 1) return `${MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`;
    return `${MONTHS[weekDays[0].getMonth()]} / ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;
  })();

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-900">{monthLabel}</h2>
          <button onClick={goToday} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-gray-100 transition"><ChevronLeft size={16} /></button>
          <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-gray-100 transition"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {weekDays.map((day, i) => {
          const count    = aptsForDay(day).length;
          const isToday  = sameDay(day, today);
          const isSel    = sameDay(day, selected);
          return (
            <button
              key={i}
              onClick={() => setSelected(day)}
              className={`py-3 flex flex-col items-center gap-1 transition border-r last:border-r-0 border-gray-100
                ${isSel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <span className="text-xs font-medium text-gray-400">{DAYS[day.getDay()]}</span>
              <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                ${isToday ? 'bg-blue-600 text-white' : isSel ? 'text-blue-600' : 'text-gray-800'}`}>
                {day.getDate()}
              </span>
              {count > 0 && (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day appointments */}
      <div className="min-h-48">
        <div className="px-5 py-3 border-b border-gray-50">
          <p className="text-sm font-medium text-gray-500">
            {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {selectedApts.length > 0 && (
              <span className="ml-2 text-blue-600 font-semibold">{selectedApts.length} appointment{selectedApts.length > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>

        {selectedApts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-400 text-sm">No appointments this day</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {selectedApts.map(apt => {
              const time  = new Date(apt.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              const color = STAGE_COLOR[apt.stage] || 'bg-gray-100 text-gray-600 border-gray-200';
              const label = STAGE_LABEL[apt.stage] || apt.stage;
              return (
                <div key={apt.id} className="px-5 py-4 flex items-start gap-4">
                  {/* Time */}
                  <div className="text-sm font-semibold text-blue-600 w-14 shrink-0 pt-0.5">{time}</div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{apt.lead_name || 'Customer'}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
                      {apt.service_type && (
                        <span className="text-xs text-blue-600 capitalize">{apt.service_type.replace(/_/g, ' ')}</span>
                      )}
                    </div>
                    {apt.lead_address && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin size={12} className="text-gray-400 shrink-0" />
                        <p className="text-xs text-gray-500 truncate">{apt.lead_address}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`tel:+${apt.lead_phone}`}
                      className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <Phone size={11} /> Call
                    </a>
                    <a
                      href={`sms:+${apt.lead_phone}`}
                      className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <MessageSquare size={11} /> SMS
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
