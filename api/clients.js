const BACKEND = process.env.BACKEND_URL || 'http://asso488k40o4gsc8c0w80gcw.31.97.240.160.sslip.io';

export default async function handler(req, res) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const r = await fetch(`${BACKEND}/api/admin/clients`, {
        headers: { 'x-admin-key': key },
      });
      const data = await r.json();
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id, ...body } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      const r = await fetch(`${BACKEND}/api/admin/clients/${id}`, {
        method: 'PATCH',
        headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
