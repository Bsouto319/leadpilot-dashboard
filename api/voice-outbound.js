export default function handler(req, res) {
  const to   = ((req.body && req.body.To) || req.query.To || '').replace(/[\s\-\(\)]/g, '');
  const from = process.env.TWILIO_FROM_NUMBER || '+19418456110';

  res.setHeader('Content-Type', 'text/xml');

  if (!to || !/^\+?\d{7,15}$/.test(to)) {
    return res.send('<Response><Say>Invalid number.</Say></Response>');
  }

  res.send(`<Response><Dial callerId="${from}"><Number>${to}</Number></Dial></Response>`);
}
