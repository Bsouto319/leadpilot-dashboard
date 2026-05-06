export default async function handler(req, res) {
  const from = req.body?.From || req.query?.From || '';
  const to   = req.body?.To   || req.query?.To   || '';

  // Answer Twilio immediately with voice greeting
  res.setHeader('Content-Type', 'text/xml');
  res.send(`<Response>
  <Say voice="alice" language="en-US">
    Hi! Thanks for calling. We just sent you a text message to get you scheduled for your free estimate. Talk soon!
  </Say>
  <Hangup/>
</Response>`);

  // After responding, trigger the SMS automation for this caller
  if (!from || !to) return;

  try {
    // Find which client owns this Twilio number
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pvphgusjofufwtyiyviu.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

    let clientId = null;
    if (supabaseKey) {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/clients?twilio_number=eq.${encodeURIComponent(to)}&select=id&limit=1`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      const rows = await r.json();
      if (Array.isArray(rows) && rows[0]) clientId = rows[0].id;
    }

    // Trigger the backend SMS pipeline as if the caller sent a message
    const backendUrl = process.env.BACKEND_URL || 'http://asso488k40o4gsc8c0w80gcw.31.97.240.160.sslip.io';
    await fetch(`${backendUrl}/webhook/sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        From:     from,
        To:       to,
        Body:     'Hi, I just called and would like a free estimate',
        NumMedia: '0',
      }),
    });
  } catch (_) {
    // Non-critical — Twilio already got the TwiML response
  }
}
