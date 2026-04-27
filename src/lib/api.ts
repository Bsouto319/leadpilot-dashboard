const API = import.meta.env.VITE_API_URL as string;
const KEY = import.meta.env.VITE_ADMIN_KEY as string;

const headers = { 'Content-Type': 'application/json', 'x-admin-key': KEY };

export async function fetchStats(clientId: string) {
  const res = await fetch(`${API}/api/admin/stats?clientId=${clientId}`, { headers });
  return res.json();
}

export async function fetchLeads(params: { page?: number; search?: string; stage?: string; clientId: string }) {
  const q = new URLSearchParams({
    page:     String(params.page || 1),
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

export async function fetchAppointments(clientId: string) {
  const res = await fetch(`${API}/api/admin/appointments?clientId=${clientId}`, { headers });
  return res.json();
}
