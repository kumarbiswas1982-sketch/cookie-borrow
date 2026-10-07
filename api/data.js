const L = require('./_lib');
const { mergeSaves } = require('./_merge');
const DAY = () => Math.floor(Date.now() / 864e5);

module.exports = L.handler(async (req, res) => {
  const acct = await L.auth(req, res); if (!acct) return;
  if (req.method === 'GET') {
    const rec = await L.getJ('srimaa:data');
    if (!rec) return L.send(res, 200, { ver: 0, data: null });
    const known = Number(L.query(req).ver || -1);
    if (known === rec.ver) return L.send(res, 200, { ver: rec.ver, same: true });
    return L.send(res, 200, { ver: rec.ver, data: rec.data });
  }
  if (req.method !== 'POST') return L.send(res, 405, { error: 'GET or POST only' });
  const b = await L.body(req);
  if (!b.data || typeof b.data !== 'object' || JSON.stringify(b.data).length > 900000) return L.send(res, 400, { error: 'Bad data.' });
  for (let attempt = 0; attempt < 6; attempt++) {
    const cur = (await L.getJ('srimaa:data')) || { ver: 0, data: null };
    let data = b.data, merged = false;
    if (cur.data && Number(b.base) !== cur.ver) { data = mergeSaves(cur.data, b.data, b.baseData || null); merged = true; }
    const rec = { ver: cur.ver + 1, at: Date.now(), data };
    if (await L.cas('srimaa:data', cur.ver, rec)) {
      // one safety copy per day, rotating through seven slots, kept on the server
      try {
        const sk = 'srimaa:snap:' + (DAY() % 7), old = await L.getJ(sk);
        if (!old || old.day !== DAY()) await L.setJ(sk, { day: DAY(), ver: rec.ver, data });
      } catch (e) {}
      return L.send(res, 200, { ver: rec.ver, merged, data: merged ? data : undefined });
    }
  }
  L.send(res, 409, { error: 'Busy. Please try again.' });
});
