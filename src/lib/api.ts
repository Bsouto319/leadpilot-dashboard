import { supabase } from './supabase';

const API = import.meta.env.VITE_API_URL as string;
const KEY = import.meta.env.VITE_ADMIN_KEY as string;

// ── Reads: direct Supabase (no API dependency) ────────────────────────────────

export async function fetchLeads(params: { page?: number; search?: string; stage?: string; clientId: string; limit?: number }) {
  const limit = params.limit || 200;
  const from  = ((params.page || 1) - 1) * limit;

  let query = supabase
    .from('conversations')
    .select('*', { count: 'exact' })
    .eq('client_id', params.clientId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (params.stage)  query = query.eq('stage', params.stage);
  if (params.search) query = query.or(`lead_name.ilike.%${params.search}%,lead_phone.ilike.%${params.search}%`);

  const { data, count, error } = await query;
  if (error) console.error('fetchLeads', error.message);
  return { data: data || [], count: count || 0 };
}

export async function fetchStats(clientId: string) {
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

  const [todayRes, weekRes, callsRes, schedRes] = await Promise.all([
    supabase.from('conversations').select('id', { count: 'exact' }).eq('client_id', clientId).gte('created_at', today.toISOString()),
    supabase.from('conversations').select('id', { count: 'exact' }).eq('client_id', clientId).gte('created_at', weekAgo.toISOString()),
    supabase.from('conversations').select('id', { count: 'exact' }).eq('client_id', clientId).gte('created_at', today.toISOString()).not('call_sid', 'is', null),
    supabase.from('conversations').select('id', { count: 'exact' }).eq('client_id', clientId).eq('stage', 'scheduled'),
  ]);

  const leadsToday = todayRes.count || 0;
  const callsToday = callsRes.count || 0;

  return {
    leadsToday,
    callsToday,
    scheduled:    schedRes.count || 0,
    leadsWeek:    weekRes.count  || 0,
    responseRate: leadsToday > 0 ? Math.round((callsToday / leadsToday) * 100) : 0,
  };
}

export async function fetchAppointments(clientId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('client_id', clientId)
    .in('stage', ['scheduled', 'awaiting_address'])
    .order('scheduled_at', { ascending: true });

  if (error) console.error('fetchAppointments', error.message);
  return data || [];
}

export async function fetchLead(id: string) {
  const { data } = await supabase.from('conversations').select('*').eq('id', id).single();
  return data;
}

// ── Writes: direct Supabase ───────────────────────────────────────────────────

export async function updateLead(id: string, data: {
  stage?: string; notes?: string; scheduled_at?: string;
  lead_name?: string; lead_address?: string; service_type?: string;
}) {
  const { error } = await supabase.from('conversations').update(data).eq('id', id);
  if (error) console.error('updateLead', error.message);
  return { ok: !error };
}

export async function deleteLead(id: string) {
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  if (error) console.error('deleteLead', error.message);
  return { ok: !error };
}

// ── Export: still via API (needs auth) ───────────────────────────────────────

export function exportLeadsUrl(clientId: string) {
  return `${API}/api/admin/leads/export/csv?clientId=${clientId}&x-admin-key=${KEY}`;
}
