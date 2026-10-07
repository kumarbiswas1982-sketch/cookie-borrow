// Merges two copies of a player's save so progress is never lost when two devices both played.
// "base" is the copy both devices last agreed on (optional). With it, counters add up exactly.
const clone = (o) => JSON.parse(JSON.stringify(o));
const uniq = (a, b) => [...new Set([...(a || []), ...(b || [])])];
const maxMap = (a = {}, b = {}) => { const o = { ...a }; for (const k in b) o[k] = Math.max(o[k] || 0, b[k] || 0); return o; };

function mergeSaves(server, client, base) {
  const sUp = server.updated || 0, cUp = client.updated || 0;
  const [win, lose] = cUp >= sUp ? [client, server] : [server, client];
  const out = clone(win);
  const num = (k) => {
    if (base && typeof base[k] === 'number') {
      const v = (server[k] || 0) + ((client[k] || 0) - base[k]);
      return Math.max(v, 0);
    }
    return Math.max(server[k] || 0, client[k] || 0);
  };
  out.stars = num('stars');
  out.coins = num('coins');
  out.passes = Math.min(3, Math.max(server.passes || 0, client.passes || 0));
  for (const k of ['stickers', 'hats', 'items', 'pets']) out[k] = uniq(server[k], client[k]);
  for (const k of ['best', 'hi', 'speed', 'labs']) out[k] = maxMap(server[k], client[k]);
  out.petOut = (win.petOut || []).filter((id) => (out.pets || []).includes(id)).slice(0, 3);
  if (!(out.hats || []).includes(out.wear)) out.wear = 'none';
  const certs = [...(server.certs || []), ...(client.certs || [])], seen = new Set();
  out.certs = certs.filter((c) => (seen.has(c.id) ? false : seen.add(c.id)));
  out.facts = { ...(lose.facts || {}) };
  for (const k in win.facts || {}) {
    const a = win.facts[k], b = out.facts[k];
    out.facts[k] = !b || (a.r || 0) + (a.w || 0) >= (b.r || 0) + (b.w || 0) ? a : b;
  }
  out.acc = {};
  for (const k of new Set([...Object.keys(server.acc || {}), ...Object.keys(client.acc || {})])) {
    const a = (server.acc || {})[k] || { r: 0, t: 0 }, b = (client.acc || {})[k] || { r: 0, t: 0 };
    out.acc[k] = a.t >= b.t ? a : b;
  }
  out.day = (server.day && client.day && (server.day.last || '') > (client.day.last || '')) ? server.day : (win.day || lose.day);
  out.daily = { ...(win.daily || {}), best: Math.max((server.daily || {}).best || 0, (client.daily || {}).best || 0) };
  out.labDay = { ...(lose.labDay || {}), ...(win.labDay || {}) };
  out.updated = Math.max(sUp, cUp) + 1;
  return out;
}
module.exports = { mergeSaves };
