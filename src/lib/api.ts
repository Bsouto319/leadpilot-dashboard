const API = import.meta.env.VITE_API_URL as string;
const KEY = import.meta.env.VITE_ADMIN_KEY as string;

const headers = { 'Content-Type': 'application/json', 'x-admin-key': KEY };

export async function fetchStats(clientId: string) {
  const res = await fetch(`${API}/api/admin/stats?clientId=${clientId}`, { headers });
  return res.json();
}

export async function fetchLeads(params: { page?: number; search?: string; stage?: string; clientId: string; limit?: number }) {
  const q = new URLSearchParams({
    page:     String(params.page || 1),
    limit:    String(params.limit || 200),
    search:   params.search  || '',
    stage:    params.stage   || '',
    clientId: params.clientId,
  });
  const res = await fetch(`${API}/api/admin/leads?${q}`, { headers });
  return res.json();
}

export async function fetchLead(id: string) {
  const res = await fetch(`${API}/api/admin/leads/${id}`, { headers });
  return res.json();
}

export async function updateLead(id: string, data: { stage?: string; notes?: string; scheduled_at?: string }) {
  const res = await fetch(`${API}/api/admin/leads/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchAppointments(clientId: string) {
  const res = await fetch(`${API}/api/admin/appointments?clientId=${clientId}`, { headers });
  return res.json();
}

export function exportLeadsUrl(clientId: string) {
  return `${API}/api/admin/leads/export/csv?clientId=${clientId}`;
}
