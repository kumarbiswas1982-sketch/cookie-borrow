// One-time creation of Srimaa's account. Refuses once an account exists.
const L = require('./_lib');
module.exports = L.handler(async (req, res) => {
  if (req.method !== 'POST') return L.send(res, 405, { error: 'POST only' });
  if (await L.getJ('srimaa:acct')) return L.send(res, 409, { error: 'The account already exists. Please log in instead.' });
  const b = await L.body(req);
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return L.send(res, 400, { error: 'Please enter a real email address.' });
  if (String(b.password || '').length < 8) return L.send(res, 400, { error: 'Please choose a password with at least 8 characters.' });
  const code = L.env('SETUP_CODE');
  if (code && !L.safeEq(b.code || '', code)) return L.send(res, 403, { error: 'That setup code is not right.' });
  const data = b.data && typeof b.data === 'object' ? b.data : {};
  await L.setJ('srimaa:acct', L.makeCred(email, b.password));
  const rec = { ver: 1, at: Date.now(), data };
  await L.setJ('srimaa:data', rec);
  L.send(res, 200, { token: L.signToken(email), ver: 1 });
});
