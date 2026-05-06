export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, email } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: 'message required' });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER || '+19418456110';

  if (!accountSid || !authToken) return res.status(500).json({ error: 'Twilio not configured' });

  const body = `[LeadPilot Support]\nDe: ${email || 'cliente'}\n\n${message.substring(0, 400)}`;

  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: '+5561982025951', From: fromNumber, Body: body }),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    return res.status(500).json({ error: err.message || 'SMS failed' });
  }

  return res.json({ ok: true });
}
