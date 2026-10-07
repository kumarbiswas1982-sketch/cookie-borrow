// Emergency password reset for the owner. Needs RESET_KEY set in Vercel.
// curl -X POST https://YOUR-SITE/api/reset -H "content-type: application/json" -d '{"key":"<RESET_KEY>","password":"new password"}'
const L = require('./_lib');
module.exports = L.handler(async (req, res) => {
  if (req.method !== 'POST') return L.send(res, 405, { error: 'POST only' });
  const b = await L.body(req), k = L.env('RESET_KEY');
  if (!k || !L.safeEq(b.key || '', k)) return L.send(res, 403, { error: 'Not allowed.' });
  if (String(b.password || '').length < 8) return L.send(res, 400, { error: 'Password needs at least 8 characters.' });
  const acct = await L.getJ('srimaa:acct');
  if (!acct) return L.send(res, 404, { error: 'No account yet.' });
  await L.setJ('srimaa:acct', L.makeCred(b.email || acct.email, b.password));
  L.send(res, 200, { ok: true });
});
