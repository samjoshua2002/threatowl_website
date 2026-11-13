// The server half of the live site scanner: the checks a browser cannot make itself because of CORS (response
// headers, redirects, certificate errors, a few well-known files). Passive only: a handful of ordinary GET requests,
// the same a visitor's browser would make. Nothing is stored.
//
// Used by the Vite dev/preview middleware (vite.config.js) and by api/scan.js (a serverless function for deployment).
// GET /api/scan?host=example.com  →  JSON (see scanHttp)
import { lookup } from 'node:dns/promises';
import net from 'node:net';

const UA = 'ThreatOwlsScanner/1.0 (+https://www.threatowls.com; passive check requested by a site visitor)';
const TIMEOUT = 6000;

export function cleanHost(input) {
  let h = String(input || '').trim().toLowerCase();
  h = h.replace(/^[a-z]+:\/\//, '').replace(/[/?#].*$/, '').replace(/:\d+$/, '').replace(/\.$/, '');
  if (!/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h)) return null;
  return h;
}

// No scanning of private, loopback, link-local or otherwise internal addresses (SSRF guard).
function isPublic(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    return true;
  }
  const v = ip.toLowerCase();
  if (v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return false;
  if (v.startsWith('::ffff:')) return isPublic(v.slice(7));
  return true;
}
async function assertPublic(host) {
  const addrs = await lookup(host, { all: true });
  if (!addrs.length || !addrs.every((a) => isPublic(a.address))) throw Object.assign(new Error('not_public'), { code: 'not_public' });
}

async function getOnce(url, body) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { redirect: 'manual', signal: ac.signal, headers: { 'user-agent': UA, accept: 'text/html,text/plain,*/*' } });
    const text = body && r.status < 300 ? (await r.text()).slice(0, 20000) : '';
    if (!text) r.body?.cancel().catch(() => {});
    return { ok: true, status: r.status, headers: Object.fromEntries(r.headers), url, text };
  } catch (e) {
    return { ok: false, error: String(e.cause?.code || e.cause?.message || e.name || e.message) };
  } finally { clearTimeout(t); }
}
// Follows up to five redirects itself, checking that every hop is still a public host.
async function get(url, { follow = false, body = false } = {}) {
  let r = await getOnce(url, body);
  for (let hop = 0; follow && r.ok && r.status >= 300 && r.status < 400 && r.headers.location && hop < 5; hop++) {
    const next = new URL(r.headers.location, url);
    if (!/^https?:$/.test(next.protocol) || !cleanHost(next.hostname)) return { ok: false, error: 'bad_redirect' };
    try { await assertPublic(next.hostname); } catch { return { ok: false, error: 'bad_redirect' }; }
    url = next.href; r = await getOnce(url, body);
  }
  return r;
}

export async function scanHttp(rawHost) {
  const host = cleanHost(rawHost);
  if (!host) return { error: 'bad_host' };
  try { await assertPublic(host); } catch (e) { return { error: e.code === 'not_public' ? 'not_public' : 'no_dns' }; }

  const [https, http] = await Promise.all([get(`https://${host}/`, { follow: true }), get(`http://${host}/`)]);
  const [sec, robots, llms] = https.ok
    ? await Promise.all([get(`https://${host}/.well-known/security.txt`, { follow: true, body: true }), get(`https://${host}/robots.txt`, { follow: true, body: true }), get(`https://${host}/llms.txt`, { follow: true })])
    : [null, null, null];
  const loc = http.ok ? http.headers.location || '' : '';
  const isText = (r) => r?.ok && r.status === 200 && !/text\/html/i.test(r.headers['content-type'] || '');
  return {
    host,
    https: https.ok ? { ok: true, status: https.status, finalUrl: https.url } : { ok: false, error: https.error },
    httpRedirect: http.ok ? { status: http.status, toHttps: http.status >= 300 && http.status < 400 && /^https:\/\//i.test(loc), location: loc } : { error: http.error },
    headers: https.ok ? pick(https.headers) : null,
    securityTxt: isText(sec) && /contact:/i.test(sec.text),
    robots: isText(robots) ? robots.text : null,
    llmsTxt: isText(llms),
  };
}
const KEEP = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'server', 'x-powered-by', 'set-cookie'];
const pick = (h) => Object.fromEntries(KEEP.filter((k) => h[k] != null).map((k) => [k, h[k]]));

// Node http handler shared by the Vite middleware and the serverless function.
export async function handle(req, res) {
  const u = new URL(req.url, 'http://x');
  const out = await scanHttp(u.searchParams.get('host'));
  res.statusCode = out.error ? 400 : 200;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(out));
}
