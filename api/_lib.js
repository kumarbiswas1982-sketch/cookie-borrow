// Shared helpers for the Cookie's Learning Burrow API (Vercel serverless functions, Node 18+).
const crypto = require('crypto');

const env = (...names) => { for (const n of names) if (process.env[n]) return process.env[n]; return ''; };

/* ---------- Redis over REST (Upstash / Vercel KV) ---------- */
async function redis(cmd) {
  const url = env('UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL');
  const token = env('UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN');
  if (!url || !token) throw new Error('Database is not connected. Add an Upstash Redis store to the Vercel project.');
  const r = await fetch(url, { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Database error: ' + (j.error || r.status));
  return j.result;
}
const getJ = async (k) => { const v = await redis(['GET', k]); return v ? JSON.parse(v) : null; };
const setJ = (k, v) => redis(['SET', k, JSON.stringify(v)]);

// Atomic compare-and-set on the "ver" field, so two devices saving at once can never clobber each other.
const CAS = "local c=redis.call('GET',KEYS[1]); local v=0; if c then v=cjson.decode(c).ver end; if tonumber(ARGV[1])==v then redis.call('SET',KEYS[1],ARGV[2]); return 1 else return 0 end";
const cas = async (key, expectVer, value) => (await redis(['EVAL', CAS, '1', key, String(expectVer), JSON.stringify(value)])) === 1;

/* ---------- passwords and tokens ---------- */
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const makeCred = (email, pw) => { const salt = crypto.randomBytes(16).toString('hex'); return { email: email.toLowerCase().trim(), salt, hash: hashPw(pw, salt) }; };
const checkCred = (acct, email, pw) => {
  if (!acct || acct.email !== String(email || '').toLowerCase().trim()) return false;
  const a = Buffer.from(hashPw(String(pw || ''), acct.salt), 'hex'), b = Buffer.from(acct.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const secret = () => { const s = env('SESSION_SECRET'); if (!s || s.length < 16) throw new Error('SESSION_SECRET is missing (set a long random value in Vercel).'); return s; };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const mac = (s) => crypto.createHmac('sha256', secret()).update(s).digest('base64url');
const signToken = (email, days = 365) => { const p = b64({ m: email, e: Date.now() + days * 864e5 }); return p + '.' + mac(p); };
function verifyToken(t) {
  try {
    const [p, m] = String(t || '').split('.');
    const good = Buffer.from(mac(p)), got = Buffer.from(m || '');
    if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
    const o = JSON.parse(Buffer.from(p, 'base64url').toString());
    return o.e > Date.now() ? o : null;
  } catch (e) { return null; }
}
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

/* ---------- request helpers ---------- */
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch (e) { return {}; }
}
const query = (req) => req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
const send = (res, code, obj) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj)); };
const ip = (req) => String((req.headers['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || 'x').trim();
async function auth(req, res) {
  const t = String(req.headers.authorization || '').replace(/^Bearer /, '');
  const o = verifyToken(t);
  const acct = o && (await getJ('srimaa:acct'));
  if (!o || !acct || acct.email !== o.m) { send(res, 401, { error: 'Please log in again.' }); return null; }
  return acct;
}
const handler = (fn) => async (req, res) => {
  try { await fn(req, res); } catch (e) { console.error(e); send(res, 500, { error: e.message || 'Something went wrong.' }); }
};
module.exports = { redis, getJ, setJ, cas, makeCred, checkCred, signToken, verifyToken, safeEq, body, query, send, ip, auth, handler, env };
