const BACKEND = process.env.BACKEND_URL || 'http://asso488k40o4gsc8c0w80gcw.31.97.240.160.sslip.io';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const r = await fetch(`${BACKEND}/api/admin/invite-client`, {
      method: 'POST',
      headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
