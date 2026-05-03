import twilio from 'twilio';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const appSid     = process.env.TWILIO_TWIML_APP_SID;
  const fromNumber = process.env.TWILIO_FROM_NUMBER || '+19418456110';

  if (!appSid)     return res.status(500).json({ error: 'TWILIO_TWIML_APP_SID não configurado no Vercel' });
  if (!accountSid) return res.status(500).json({ error: 'TWILIO_ACCOUNT_SID não configurado' });

  const { AccessToken } = twilio.jwt;
  const { VoiceGrant }  = AccessToken;

  const voiceGrant = new VoiceGrant({ outgoingApplicationSid: appSid, incomingAllow: false });
  const token = new AccessToken(accountSid, accountSid, authToken, { identity: 'admin', ttl: 3600 });
  token.addGrant(voiceGrant);

  res.json({ token: token.toJwt(), fromNumber });
}
