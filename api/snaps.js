// Server-side safety copies: list them (GET) or restore one (POST {n}).
const L = require('./_lib');
module.exports = L.handler(async (req, res) => {
  const acct = await L.auth(req, res); if (!acct) return;
  if (req.method === 'GET') {
    const out = [];
    for (let n = 0; n < 7; n++) { const s = await L.getJ('srimaa:snap:' + n); if (s && s.data) out.push({ n, day: s.day, stars: s.data.stars || 0, carrots: s.data.coins || 0 }); }
    return L.send(res, 200, { snaps: out.sort((a, b) => b.day - a.day) });
  }
  const b = await L.body(req), s = await L.getJ('srimaa:snap:' + Number(b.n));
  if (!s || !s.data) return L.send(res, 404, { error: 'That copy is not there.' });
  for (let i = 0; i < 6; i++) {
    const cur = (await L.getJ('srimaa:data')) || { ver: 0 };
    const data = { ...s.data, updated: Date.now() };
    if (await L.cas('srimaa:data', cur.ver, { ver: cur.ver + 1, at: Date.now(), data })) return L.send(res, 200, { ver: cur.ver + 1, data });
  }
  L.send(res, 409, { error: 'Busy. Please try again.' });
});
