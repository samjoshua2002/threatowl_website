// The live site scanner: passive, outside-in checks of a domain, turned into findings in Threat Owls' own verdicts.
//   DNS checks run in the browser through DNS-over-HTTPS (Cloudflare's resolver; public records only).
//   Web checks (headers, redirects, well-known files) come from /api/scan (server/scan.js); without it they are
//   reported as "Not enough data": a quiet sensor means unknown, not safe.
//
// A finding: { id, area, label, verdict: 'fix' | 'review' | 'ok' | 'unknown', weight, saw, why, what }

export const VERDICTS = {
  fix: { label: 'Fix now', note: 'Evidence supports urgent action.' },
  review: { label: 'Review', note: 'Material, but needs a human look.' },
  unknown: { label: 'Not enough data', note: 'We say so instead of guessing.' },
  ok: { label: 'Looks good', note: 'Nothing to do here.' },
};

export function cleanHost(input) {
  let h = String(input || '').trim().toLowerCase();
  h = h.replace(/^[a-z]+:\/\//, '').replace(/[/?#].*$/, '').replace(/:\d+$/, '').replace(/\.$/, '');
  return /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h) ? h : null;
}
// Mail and DNS records live on the bare domain, not on "www".
const apex = (h) => h.replace(/^www\./, '');

async function doh(name, type) {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}&do=1`, { headers: { accept: 'application/dns-json' } });
  if (!r.ok) throw new Error('doh');
  const j = await r.json();
  const txt = (d) => d.replace(/^"|"$/g, '').replace(/"\s+"/g, '');
  return { status: j.Status, ad: !!j.AD, answers: (j.Answer || []).filter((a) => a.name.replace(/\.$/, '') === name || type === 'A').map((a) => (type === 'TXT' ? txt(a.data) : a.data)) };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Runs the scan, reporting each step as it goes: onStep({ key, label, state: 'run' | 'done', verdicts }).
export async function runScan(input, onStep = () => {}) {
  const host = cleanHost(input);
  if (!host) throw Object.assign(new Error('bad_host'), { code: 'bad_host' });
  const dom = apex(host);
  const findings = [];
  const add = (f) => findings.push(f);

  const step = async (key, label, fn) => {
    onStep({ key, label, state: 'run' });
    const t0 = performance.now();
    const before = findings.length;
    try { await fn(); } catch { /* each check reports its own unknowns */ }
    await wait(Math.max(0, 380 - (performance.now() - t0))); // pace the log so it can be read
    onStep({ key, label, state: 'done', found: findings.slice(before) });
  };

  // Start the slow server half straight away; it runs while the DNS checks are shown.
  const web = fetch(`/api/scan?host=${encodeURIComponent(host)}`).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) })).catch(() => null);

  let a = null;
  await step('dns', `Resolving ${host}`, async () => {
    a = await doh(host, 'A');
    if (a.status === 3 || !a.answers.length) {
      add({ id: 'dns', area: 'DNS', label: 'Name resolves', verdict: 'fix', weight: 20, saw: `${host} does not resolve to an address.`, why: 'If the name does not resolve, nobody can reach the site, and an abandoned name can be taken over.', what: 'Check the spelling, or the A record at your DNS provider.' });
    }
  });
  if (a && (a.status === 3 || !a.answers.length)) return finish(host, findings);

  let mx = [];
  await step('spf', 'Email: who may send as you (SPF)', async () => {
    mx = (await doh(dom, 'MX')).answers;
    const spf = (await doh(dom, 'TXT')).answers.find((t) => /^v=spf1/i.test(t));
    if (!spf) add({ id: 'spf', area: 'Email', label: 'SPF', verdict: 'fix', weight: 12, saw: `No SPF record on ${dom}.`, why: `Any server can claim to send mail for ${dom}, which makes scams on your customers easy.`, what: mx.length ? 'Publish a TXT record listing the services that send your mail, ending in "-all".' : 'You do not receive mail here: publish "v=spf1 -all" so nobody can send as you.' });
    else if (/[+]all\b/i.test(spf)) add({ id: 'spf', area: 'Email', label: 'SPF', verdict: 'fix', weight: 12, saw: spf, why: '"+all" lets the whole internet send mail as you.', what: 'Change "+all" to "-all" (or "~all" while you test).' });
    else if (/\?all\b/i.test(spf) || !/[-~]all\b/i.test(spf)) add({ id: 'spf', area: 'Email', label: 'SPF', verdict: 'review', weight: 12, saw: spf, why: 'Your SPF record does not say what to do with mail from servers it does not list.', what: 'End the record with "-all" (strict) or "~all" (soft).' });
    else add({ id: 'spf', area: 'Email', label: 'SPF', verdict: 'ok', weight: 12, saw: spf });
  });

  await step('dmarc', 'Email: spoofing policy (DMARC)', async () => {
    const d = (await doh(`_dmarc.${dom}`, 'TXT')).answers.find((t) => /^v=DMARC1/i.test(t));
    const p = d && (d.match(/;\s*p=(\w+)/i) || [])[1]?.toLowerCase();
    if (!d) add({ id: 'dmarc', area: 'Email', label: 'DMARC', verdict: 'fix', weight: 14, saw: `No DMARC record at _dmarc.${dom}.`, why: `Anyone can send email that looks like it came from ${dom}, and nobody tells you when they do.`, what: 'Publish a DMARC record: start with "v=DMARC1; p=none; rua=mailto:…" to see reports, then move to "quarantine".' });
    else if (p === 'none') add({ id: 'dmarc', area: 'Email', label: 'DMARC', verdict: 'fix', weight: 10, saw: d, why: 'Your DMARC policy is "none": fake mail in your name is still delivered.', what: 'Change one DNS setting (DMARC) from "none" to "quarantine", then to "reject".' });
    else add({ id: 'dmarc', area: 'Email', label: 'DMARC', verdict: 'ok', weight: 14, saw: d });
  });

  await step('dnssec', 'DNS: signed records (DNSSEC) and certificate rules (CAA)', async () => {
    const soa = await doh(dom, 'SOA');
    add(soa.ad
      ? { id: 'dnssec', area: 'DNS', label: 'DNSSEC', verdict: 'ok', weight: 3, saw: 'Answers for this domain are signed and validated.' }
      : { id: 'dnssec', area: 'DNS', label: 'DNSSEC', verdict: 'review', weight: 3, saw: 'DNS answers are not signed.', why: 'Without DNSSEC, a resolver can be fooled into sending your visitors and your mail somewhere else.', what: 'Turn on DNSSEC at your DNS provider (usually one switch) and add the DS record at your registrar.' });
    const caa = (await doh(dom, 'CAA')).answers;
    add(caa.length
      ? { id: 'caa', area: 'DNS', label: 'CAA', verdict: 'ok', weight: 2, saw: caa.slice(0, 3).join(' · ') }
      : { id: 'caa', area: 'DNS', label: 'CAA', verdict: 'review', weight: 2, saw: 'No CAA record.', why: 'Any certificate authority may issue a certificate for your name.', what: 'Add a CAA record naming the one authority you use (for example letsencrypt.org).' });
    if (mx.length) {
      const sts = (await doh(`_mta-sts.${dom}`, 'TXT')).answers.find((t) => /^v=STSv1/i.test(t));
      add(sts
        ? { id: 'mtasts', area: 'Email', label: 'MTA-STS', verdict: 'ok', weight: 2, saw: sts }
        : { id: 'mtasts', area: 'Email', label: 'MTA-STS', verdict: 'review', weight: 2, saw: 'No MTA-STS policy.', why: 'Mail sent to you can be quietly downgraded to an unencrypted connection.', what: 'Publish an MTA-STS policy so other servers must use TLS when they deliver to you.' });
    }
  });

  let w = null;
  await step('web', `Web: HTTPS and headers of ${host}`, async () => {
    w = await web;
    if (!w || w.status === 404 || !w.body) {
      for (const [id, label] of [['https', 'HTTPS'], ['headers', 'Security headers']]) add({ id, area: 'Web', label, verdict: 'unknown', weight: 0, saw: 'The web sensor is not connected on this site.', why: 'A quiet sensor means unknown, not safe.', what: 'Ask us for the full scan.' });
      return;
    }
    if (w.body.error) { add({ id: 'https', area: 'Web', label: 'HTTPS', verdict: 'unknown', weight: 0, saw: w.body.error === 'not_public' ? 'This name points to a private address; we do not scan those.' : 'We could not look this name up from our side.', why: 'A quiet sensor means unknown, not safe.', what: 'Check the name and try again.' }); return; }
    webFindings(w.body, add);
  });

  await step('ai', 'AI: rules for AI crawlers and agents', async () => {
    if (!w?.body || w.body.error || !w.body.https?.ok) { add({ id: 'aibots', area: 'AI', label: 'AI crawler rules', verdict: 'unknown', weight: 0, saw: 'Not checked.', why: 'A quiet sensor means unknown, not safe.', what: 'Ask us for the full scan.' }); return; }
    const robots = w.body.robots;
    const named = robots && (robots.match(/user-agent:\s*(GPTBot|ChatGPT-User|ClaudeBot|Claude-Web|anthropic-ai|CCBot|Google-Extended|PerplexityBot|Bytespider|Applebot-Extended)/gi) || []);
    add(named?.length
      ? { id: 'aibots', area: 'AI', label: 'AI crawler rules', verdict: 'ok', weight: 2, saw: `robots.txt names ${[...new Set(named.map((n) => n.split(':')[1].trim()))].join(', ')}.` }
      : { id: 'aibots', area: 'AI', label: 'AI crawler rules', verdict: 'review', weight: 2, saw: robots ? 'robots.txt does not mention any AI crawler.' : 'No robots.txt.', why: 'AI crawlers and agents decide for themselves what to read and reuse from your site.', what: 'Decide which AI crawlers may read the site and say so in robots.txt (GPTBot, ClaudeBot, Google-Extended…).' });
    add(w.body.llmsTxt
      ? { id: 'llms', area: 'AI', label: 'llms.txt', verdict: 'ok', weight: 1, saw: 'An llms.txt guide for AI agents is published.' }
      : { id: 'llms', area: 'AI', label: 'llms.txt', verdict: 'review', weight: 1, saw: 'No llms.txt.', why: 'Agents that visit you guess what matters and what they may use.', what: 'Optional: publish /llms.txt, a short plain-text guide for AI agents.' });
  });

  return finish(host, findings);
}

function webFindings(b, add) {
  if (!b.https?.ok) {
    const cert = /CERT|SSL|TLS|SELF_SIGNED|ALTNAME/i.test(b.https?.error || '');
    add({ id: 'https', area: 'Web', label: 'HTTPS', verdict: 'fix', weight: 20, saw: cert ? `The certificate is not valid (${b.https.error}).` : `The site does not answer over HTTPS (${b.https?.error || 'no answer'}).`, why: 'Visitors, and the AI agents that read your site, can be shown a forged copy or have what they send read on the way.', what: cert ? 'Renew or fix the certificate; a free one from Let’s Encrypt renews itself.' : 'Turn on HTTPS at your host with a free certificate.' });
    return;
  }
  add({ id: 'https', area: 'Web', label: 'HTTPS', verdict: 'ok', weight: 20, saw: `Valid certificate; ${b.https.finalUrl} answers ${b.https.status}.` });
  const r = b.httpRedirect || {};
  if (r.error) add({ id: 'redirect', area: 'Web', label: 'HTTP to HTTPS', verdict: 'ok', weight: 6, saw: 'Plain HTTP is closed.' });
  else if (r.toHttps) add({ id: 'redirect', area: 'Web', label: 'HTTP to HTTPS', verdict: 'ok', weight: 6, saw: `http:// redirects (${r.status}) to ${r.location}.` });
  else add({ id: 'redirect', area: 'Web', label: 'HTTP to HTTPS', verdict: 'fix', weight: 6, saw: `http://${b.host} answers ${r.status} without sending visitors to HTTPS.`, why: 'Anyone who types your name without "https" uses an unprotected connection that can be tampered with.', what: 'Redirect every http:// request to https:// (one setting at most hosts and CDNs).' });

  const h = b.headers || {};
  const hsts = h['strict-transport-security'], age = +((hsts || '').match(/max-age=(\d+)/i) || [])[1] || 0;
  add(hsts && age >= 15552000
    ? { id: 'hsts', area: 'Web', label: 'HSTS', verdict: 'ok', weight: 6, saw: hsts }
    : { id: 'hsts', area: 'Web', label: 'HSTS', verdict: 'review', weight: 6, saw: hsts ? `HSTS is set, but only for ${Math.round(age / 86400)} days.` : 'No Strict-Transport-Security header.', why: 'Browsers may still try plain HTTP first, which leaves a moment for an attacker on the network.', what: 'Send "Strict-Transport-Security: max-age=31536000; includeSubDomains".' });
  const csp = h['content-security-policy'];
  add(csp
    ? { id: 'csp', area: 'Web', label: 'Content Security Policy', verdict: /unsafe-inline/.test(csp) && !/nonce-|strict-dynamic/.test(csp) ? 'review' : 'ok', weight: 6, saw: csp.length > 120 ? csp.slice(0, 117) + '…' : csp, why: 'The policy allows inline scripts, which takes away most of its protection.', what: 'Replace ’unsafe-inline’ with nonces or hashes.' }
    : { id: 'csp', area: 'Web', label: 'Content Security Policy', verdict: 'review', weight: 6, saw: 'No Content-Security-Policy header.', why: 'If one injected script gets onto a page, nothing stops it from running and sending data away.', what: 'Start with a report-only Content-Security-Policy, then enforce it.' });
  const frame = h['x-frame-options'] || (csp && /frame-ancestors/i.test(csp));
  add(frame
    ? { id: 'frame', area: 'Web', label: 'Clickjacking guard', verdict: 'ok', weight: 4, saw: h['x-frame-options'] ? `X-Frame-Options: ${h['x-frame-options']}` : 'CSP frame-ancestors is set.' }
    : { id: 'frame', area: 'Web', label: 'Clickjacking guard', verdict: 'review', weight: 4, saw: 'Any site may load yours in a frame.', why: 'A hostile page can frame your site and trick people into clicking buttons they cannot see.', what: 'Send "X-Frame-Options: DENY" or a CSP "frame-ancestors ’self’".' });
  add(/nosniff/i.test(h['x-content-type-options'] || '')
    ? { id: 'nosniff', area: 'Web', label: 'MIME sniffing', verdict: 'ok', weight: 2, saw: 'X-Content-Type-Options: nosniff' }
    : { id: 'nosniff', area: 'Web', label: 'MIME sniffing', verdict: 'review', weight: 2, saw: 'No X-Content-Type-Options header.', why: 'Browsers may guess a file’s type and run an upload as a script.', what: 'Send "X-Content-Type-Options: nosniff".' });
  add(h['referrer-policy']
    ? { id: 'referrer', area: 'Web', label: 'Referrer policy', verdict: 'ok', weight: 2, saw: `Referrer-Policy: ${h['referrer-policy']}` }
    : { id: 'referrer', area: 'Web', label: 'Referrer policy', verdict: 'review', weight: 2, saw: 'No Referrer-Policy header.', why: 'Full addresses, sometimes with tokens in them, can leak to every site you link to.', what: 'Send "Referrer-Policy: strict-origin-when-cross-origin".' });
  const banner = [h.server, h['x-powered-by']].filter(Boolean).find((v) => /\d/.test(v));
  add(banner
    ? { id: 'banner', area: 'Web', label: 'Version leak', verdict: 'review', weight: 4, saw: `Your server announces "${banner}".`, why: 'Attackers match exact versions against known holes before they even try.', what: 'Hide version numbers in the Server and X-Powered-By headers.' }
    : { id: 'banner', area: 'Web', label: 'Version leak', verdict: 'ok', weight: 4, saw: 'No software versions in the headers.' });
  const cookie = h['set-cookie'];
  if (cookie) add(/secure/i.test(cookie) && /httponly/i.test(cookie)
    ? { id: 'cookies', area: 'Web', label: 'Cookies', verdict: 'ok', weight: 3, saw: 'Cookies are Secure and HttpOnly.' }
    : { id: 'cookies', area: 'Web', label: 'Cookies', verdict: 'review', weight: 3, saw: 'A cookie is set without Secure or HttpOnly.', why: 'Session cookies can be read by scripts or sent over plain HTTP.', what: 'Mark cookies Secure, HttpOnly and SameSite.' });
  add(b.securityTxt
    ? { id: 'sectxt', area: 'Web', label: 'security.txt', verdict: 'ok', weight: 2, saw: '/.well-known/security.txt lists a contact.' }
    : { id: 'sectxt', area: 'Web', label: 'security.txt', verdict: 'review', weight: 2, saw: 'No /.well-known/security.txt.', why: 'People who find a hole in your site have no clear way to tell you.', what: 'Publish /.well-known/security.txt with a contact address.' });
}

function finish(host, findings) {
  const rated = findings.filter((f) => f.verdict !== 'unknown' && f.weight > 0);
  const total = rated.reduce((s, f) => s + f.weight, 0);
  const lost = rated.reduce((s, f) => s + (f.verdict === 'fix' ? f.weight : f.verdict === 'review' ? f.weight * 0.45 : 0), 0);
  const score = total ? Math.round(100 * (1 - lost / total)) : null;
  const grade = score == null ? '?' : score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 65 ? 'C' : score >= 50 ? 'D' : 'F';
  const order = { fix: 0, review: 1, unknown: 2, ok: 3 };
  findings.sort((a, b) => order[a.verdict] - order[b.verdict] || b.weight - a.weight);
  const count = (v) => findings.filter((f) => f.verdict === v).length;
  return { host, score, grade, findings, counts: { fix: count('fix'), review: count('review'), unknown: count('unknown'), ok: count('ok') }, at: Date.now() };
}
