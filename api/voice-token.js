// Proxy para o backend que já tem todas as credenciais Twilio configuradas
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const backendUrl = process.env.BACKEND_URL || 'http://asso488k40o4gsc8c0w80gcw.31.97.240.160.sslip.io';

  try {
    const response = await fetch(`${backendUrl}/api/admin/voice-token`, {
      method: 'POST',
      headers: { 'x-admin-key': key },
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Backend indisponível: ' + err.message });
  }
}
