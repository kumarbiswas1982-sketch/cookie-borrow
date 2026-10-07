const L = require('./_lib');
module.exports = L.handler(async (req, res) => {
  if (req.method !== 'POST') return L.send(res, 405, { error: 'POST only' });
  const fk = 'srimaa:fail:' + L.ip(req);
  const fails = Number((await L.redis(['GET', fk])) || 0);
  if (fails >= 8) return L.send(res, 429, { error: 'Too many tries. Please wait 15 minutes and try again.' });
  const b = await L.body(req);
  const acct = await L.getJ('srimaa:acct');
  if (!acct) return L.send(res, 404, { error: 'No account yet. Please set it up first.' });
  if (!L.checkCred(acct, b.email, b.password)) {
    await L.redis(['INCR', fk]); await L.redis(['EXPIRE', fk, '900']);
    return L.send(res, 401, { error: 'That email or password is not right.' });
  }
  await L.redis(['DEL', fk]);
  L.send(res, 200, { token: L.signToken(acct.email), email: acct.email });
});
