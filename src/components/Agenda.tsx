import { useState } from 'react';
import { ChevronLeft, ChevronRight, Phone, MessageSquare, MapPin, X, Volume2 } from 'lucide-react';

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
  onCall?: (phone: string) => void;
  onSms?: (aptId: string, phone: string, leadName: string) => void;
  onAudioCall?: (phone: string, leadName?: string) => void;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STAGE_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  scheduled:        { bg: 'rgba(16,185,129,0.2)',  text: '#34d399', dot: '#10b981' },
  awaiting_address: { bg: 'rgba(251,191,36,0.2)',  text: '#fbbf24', dot: '#f59e0b' },
  completed:        { bg: 'rgba(139,92,246,0.2)',  text: '#a78bfa', dot: '#8b5cf6' },
  no_show:          { bg: 'rgba(239,68,68,0.2)',   text: '#f87171', dot: '#ef4444' },
};
const STAGE_LABEL: Record<string, string> = {
  scheduled: 'Confirmed', awaiting_address: 'Pending Address',
  completed: 'Completed', no_show: 'No Show',
};

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

export default function Agenda({ appointments, onCall, onSms, onAudioCall }: Props) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [viewDate, setViewDate]   = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected]   = useState<Date | null>(null);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay    = new Date(year, month, 1).getDay();   // weekday of 1st
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  // Build 6-week grid (42 cells)
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const offset = i - firstDay;
    let d: Date;
    let inMonth = true;
    if (offset < 0) {
      d = new Date(year, month - 1, daysInPrev + offset + 1);
      inMonth = false;
    } else if (offset >= daysInMonth) {
      d = new Date(year, month + 1, offset - daysInMonth + 1);
      inMonth = false;
    } else {
      d = new Date(year, month, offset + 1);
    }
    cells.push({ date: d, inMonth });
  }

  const aptsForDay = (day: Date) =>
    appointments
      .filter(a => a.scheduled_at && sameDay(new Date(a.scheduled_at), day))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const selectedApts = selected ? aptsForDay(selected) : [];

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday   = () => { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(today); };

  return (
    <div className="flex flex-col gap-4">

      {/* Calendar card */}
      <div className="rounded-2xl overflow-hidden border border-white/10" style={{ background: 'rgba(10,20,60,0.85)' }}>

        {/* Month header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-3">
            <h2 className="text-white font-black text-lg tracking-tight">
              {MONTHS[month]} <span className="text-white/40 font-medium">{year}</span>
            </h2>
            <button
              onClick={goToday}
              className="text-xs font-bold px-3 py-1 rounded-lg border border-white/15 text-white/60 hover:text-white hover:bg-white/10 transition"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition">
              <ChevronLeft size={17} />
            </button>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition">
              <ChevronRight size={17} />
            </button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-white/10">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-black text-white/30 tracking-widest uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-7">
          {cells.map(({ date, inMonth }, i) => {
            const apts      = aptsForDay(date);
            const isToday   = sameDay(date, today);
            const isSel     = selected && sameDay(date, selected);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isLast    = i >= 35; // hide 6th row if all out-of-month

            if (!inMonth && isLast && cells.slice(35).every(c => !c.inMonth)) return null;

            return (
              <button
                key={i}
                onClick={() => setSelected(date)}
                className={`relative min-h-[72px] p-1.5 text-left border-r border-b border-white/5 transition-all last-of-row:border-r-0
                  ${isSel       ? 'bg-blue-600/15 border-blue-500/30' : 'hover:bg-white/[0.04]'}
                  ${!inMonth    ? 'opacity-35' : ''}
                  ${isWeekend && inMonth ? 'bg-white/[0.015]' : ''}
                `}
              >
                {/* Day number */}
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-black mb-1 transition-all
                  ${isToday
                    ? 'bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-lg shadow-blue-500/40'
                    : isSel
                    ? 'text-blue-300'
                    : inMonth
                    ? 'text-white/80'
                    : 'text-white/25'
                  }
                `}>
                  {date.getDate()}
                </span>

                {/* Appointment chips — max 2 visible */}
                <div className="flex flex-col gap-0.5">
                  {apts.slice(0, 2).map(apt => {
                    const s = STAGE_STYLE[apt.stage] || STAGE_STYLE.scheduled;
                    const time = new Date(apt.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    return (
                      <div
                        key={apt.id}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate"
                        style={{ background: s.bg, color: s.text }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
                        <span className="truncate">{time} {apt.lead_name}</span>
                      </div>
                    );
                  })}
                  {apts.length > 2 && (
                    <span className="text-[9px] font-black text-white/40 pl-1">+{apts.length - 2} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail panel */}
      {selected && (
        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(10,20,60,0.85)' }}>
          {/* Panel header */}
          <div className="px-5 py-3 flex items-center justify-between border-b border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-sm font-black text-white">
              {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {selectedApts.length > 0 && (
                <span className="ml-2 text-emerald-400">{selectedApts.length} appointment{selectedApts.length > 1 ? 's' : ''}</span>
              )}
            </p>
            <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition">
              <X size={14} />
            </button>
          </div>

          {selectedApts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-white/25 text-sm font-medium">No appointments scheduled</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {selectedApts.map(apt => {
                const s     = STAGE_STYLE[apt.stage] || STAGE_STYLE.scheduled;
                const label = STAGE_LABEL[apt.stage]  || apt.stage;
                const time  = new Date(apt.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={apt.id} className="px-5 py-4 flex items-center gap-4">
                    {/* Time block */}
                    <div className="shrink-0 text-center w-14">
                      <p className="text-lg font-black text-white leading-none">{time.split(':')[0]}</p>
                      <p className="text-sm font-bold text-white/40">:{time.split(':')[1]}</p>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-12 rounded-full shrink-0" style={{ background: s.dot }} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-white">{apt.lead_name || 'Customer'}</p>
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full"
                          style={{ background: s.bg, color: s.text }}
                        >
                          {label}
                        </span>
                        {apt.service_type && apt.service_type !== 'general' && (
                          <span className="text-[10px] font-semibold text-white/40 capitalize">
                            {apt.service_type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 font-medium mt-0.5">+{apt.lead_phone}</p>
                      {apt.lead_address && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin size={11} className="text-white/30 shrink-0" />
                          <p className="text-xs text-white/40 truncate">{apt.lead_address}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onCall ? onCall(`+${apt.lead_phone}`) : (window.location.href = `tel:+${apt.lead_phone}`)}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl text-white transition shadow-lg"
                          style={{ background: 'linear-gradient(135deg, #3b82f6, #4f46e5)', boxShadow: '0 4px 12px rgba(59,130,246,0.35)' }}
                        >
                          <Phone size={12} /> Call
                        </button>
                        <button
                          onClick={() => onSms?.(apt.id, apt.lead_phone, apt.lead_name || '')}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl text-white transition"
                          style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399' }}
                        >
                          <MessageSquare size={12} /> SMS
                        </button>
                      </div>
                      <button
                        onClick={() => onAudioCall?.(`+${apt.lead_phone}`, apt.lead_name || '')}
                        className="flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl text-white transition w-full"
                        style={{ background: 'rgba(147,51,234,0.2)', border: '1px solid rgba(147,51,234,0.4)', color: '#c084fc' }}
                      >
                        <Volume2 size={12} /> Áudio PT→EN
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
