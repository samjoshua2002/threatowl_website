// The four "How it works" boards: Discover, Prioritize, Protect, Prove. Each is a full picture of one step, drawn on
// a 1240×800 surface (the tour's camera moves over it) and animated by `t` (seconds).
import { brand } from '../../brand/brand.config.js';
import { drawOwl } from '../../brand/owl.jsx';

const C = {
  bg: '#0F1115', panel: '#151820', ink: '#E7E9EE', mute: '#7D8594', faint: 'rgba(231,233,238,.08)', line: 'rgba(231,233,238,.14)',
  accent: '#FF6A2B', amber: '#FDB022', green: '#47CD89', blue: '#84ADFF', purple: '#B692F6', red: '#F97066',
};
const TAU = Math.PI * 2;
const disp = (px, w = 900) => `${w} ${px}px ${brand.fonts.display}`;
const mono = (px, w = 500) => `${w} ${px}px ${brand.fonts.mono}`;
const text = (px, w = 500) => `${w} ${px}px ${brand.fonts.text}`;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ease = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);

function frame(c, W, H, n, title, sub, stats) {
  c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
  c.fillStyle = C.accent; c.font = mono(14, 600); c.fillText(`0${n}`, 48, 62);
  c.fillStyle = C.ink; c.font = disp(34); c.fillText(title, 84, 66);
  c.fillStyle = C.mute; c.font = text(15, 400); c.fillText(sub, 48, 96);
  drawOwl(c, W - 196, 56, 26, C.ink, C.accent);
  c.fillStyle = C.ink; c.font = disp(19); c.fillText(brand.wordmark, W - 176, 63);
  c.fillStyle = C.accent; c.beginPath(); c.arc(W - 176 + c.measureText(brand.wordmark).width + 5, 59, 3, 0, TAU); c.fill();
  c.fillStyle = C.line; c.fillRect(48, H - 74, W - 96, 1);
  let x = 48;
  for (const [k, v, col] of stats) {
    c.fillStyle = C.mute; c.font = mono(11); c.fillText(k, x, H - 46);
    c.fillStyle = col || C.ink; c.font = mono(17, 600); c.fillText(v, x, H - 24);
    x += Math.max(c.measureText(v).width + 60, 170);
  }
}
// Text cut to a width, with an ellipsis.
function fit(c, s, w) { if (c.measureText(s).width <= w) return s; while (s.length > 1 && c.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; }
function chip(c, x, y, label, col, filled) {
  c.font = mono(11, 700); const w = c.measureText(label).width + 14;
  if (filled) { c.fillStyle = col; c.fillRect(x, y - 13, w, 19); c.fillStyle = C.bg; }
  else { c.strokeStyle = col; c.lineWidth = 1; c.strokeRect(x + 0.5, y - 12.5, w - 1, 18); c.fillStyle = col; }
  c.fillText(label, x + 7, y + 1);
  return w;
}

// 01 Discover: everything you run, joined into one map; the scan sweeps across and lights what it finds.
function discover(c, W, H, t) {
  frame(c, W, H, 1, 'Discover', 'Every device, account, cloud service and AI agent, and what each one can reach.',
    [['DISCOVERED', '2,183'], ['SOURCES', '12'], ['AI AGENTS', '47', C.purple], ['REACH LINKS', '1,906']]);
  const r = rng(7), top = 130, bh = H - 230;
  const groups = [
    ['CLOUD', 412, C.blue, 0.13, 0.3], ['ENDPOINTS', 388, C.ink, 0.13, 0.78], ['IDENTITIES', 1240, C.green, 0.44, 0.26],
    ['SAAS', 96, C.amber, 0.44, 0.8], ['AI AGENTS', 47, C.purple, 0.84, 0.52],
  ];
  const nodes = groups.map(([name, n, col, gx, gy]) => {
    const cx = 48 + gx * (W - 96), cy = top + gy * bh, count = name === 'AI AGENTS' ? 16 : 34, R = name === 'AI AGENTS' ? 70 : 92;
    return { name, n, col, cx, cy, R, pts: Array.from({ length: count }, (_, i) => { const a = i * 2.39996, d = R * Math.sqrt((i + 0.5) / count); return [cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8]; }) };
  });
  const sweep = 48 + (((t * 0.16) % 1.15) - 0.075) * (W - 96);
  const lit = (x) => x < sweep;
  // reach links from the agents
  const agents = nodes[4].pts, others = nodes.slice(0, 4).flatMap((g) => g.pts.map((p) => [p, g]));
  agents.forEach((a, i) => {
    for (let k = 0; k < 3; k++) {
      const [p] = others[Math.floor(r() * others.length)], hot = i % 5 === 0 && k === 0;
      c.strokeStyle = hot ? C.accent : C.purple; c.globalAlpha = hot ? 0.75 : lit(p[0]) ? 0.16 : 0.05; c.lineWidth = hot ? 1.6 : 1;
      c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo((a[0] + p[0]) / 2, Math.min(a[1], p[1]) - 40, p[0], p[1]); c.stroke();
    }
  });
  c.globalAlpha = 1;
  for (const g of nodes) {
    c.strokeStyle = C.line; c.setLineDash([3, 5]); c.beginPath(); c.ellipse(g.cx, g.cy, g.R + 22, (g.R + 22) * 0.8, 0, 0, TAU); c.stroke(); c.setLineDash([]);
    for (const [x, y] of g.pts) {
      c.globalAlpha = lit(x) ? 1 : 0.22; c.fillStyle = g.col;
      if (g.name === 'AI AGENTS') { c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); } else c.fillRect(x - 3, y - 3, 6, 6);
    }
    c.globalAlpha = 1; c.fillStyle = g.col; c.font = mono(12, 700); c.fillText(g.name, g.cx - g.R - 10, g.cy - g.R * 0.8 - 30);
    c.fillStyle = C.mute; c.font = mono(12); c.fillText(g.n.toLocaleString('en'), g.cx - g.R - 10 + c.measureText(g.name).width + 12, g.cy - g.R * 0.8 - 30);
  }
  // the sweep
  const grd = c.createLinearGradient(sweep - 120, 0, sweep, 0); grd.addColorStop(0, 'rgba(255,106,43,0)'); grd.addColorStop(1, 'rgba(255,106,43,.16)');
  c.fillStyle = grd; c.fillRect(sweep - 120, top - 10, 120, bh + 20);
  c.fillStyle = C.accent; c.fillRect(sweep - 1, top - 10, 2, bh + 20);
}

// 02 Prioritize: thousands of findings in, a short ranked list out.
const LIST = [
  ['VPN gateway with a known exploited flaw', 'vpn.northwind.example', 100, 'FIX NOW', C.accent],
  ['Admin token held by the support agent', 'support-agent · Entra ID', 94, 'FIX NOW', C.accent],
  ['Customer list reachable from the email agent', 'crm.export_contacts', 88, 'FIX NOW', C.accent],
  ['AI tool nobody approved on 14 laptops', 'ChatPDF Pro', 71, 'REVIEW', C.amber],
  ['Service account unused for 200 days', 'svc-backup-legacy', 58, 'REVIEW', C.amber],
  ['Old TLS on an internal test server', 'test-07.corp', 22, 'DEPRIORITIZE', C.mute],
];
function prioritize(c, W, H, t) {
  frame(c, W, H, 2, 'Prioritize', 'Ranked by what an attacker could really reach, with the reason in plain words.',
    [['FINDINGS IN', '4,812'], ['FIX NOW', '3', C.accent], ['REVIEW', '2', C.amber], ['DEPRIORITIZED', '4,807', C.mute]]);
  const r = rng(11), fx = 48, fw = 430, top = 140, fh = H - 250;
  // the field of findings
  for (let i = 0; i < 1400; i++) {
    const x = fx + r() * fw, y = top + r() * fh, v = r();
    c.fillStyle = v > 0.985 ? C.accent : v > 0.96 ? C.amber : C.ink; c.globalAlpha = v > 0.96 ? 0.9 : 0.16;
    c.fillRect(x, y, 2, 2);
  }
  c.globalAlpha = 1;
  c.fillStyle = C.ink; c.font = disp(54); c.fillText('4,812', fx, top + fh + 4 - 0);
  c.fillStyle = C.mute; c.font = mono(12); c.fillText('FINDINGS FROM 12 SOURCES', fx + 170, top + fh - 6);
  // the funnel and what flows through it
  const lx = 590, ly = top + 26, rowH = 76;
  c.strokeStyle = C.line; c.lineWidth = 1;
  c.beginPath(); c.moveTo(fx + fw + 10, top); c.lineTo(lx - 30, ly + 10); c.moveTo(fx + fw + 10, top + fh); c.lineTo(lx - 30, ly + rowH * 6 - 20); c.stroke();
  for (let i = 0; i < 26; i++) {
    const f = ((t * 0.35 + i / 26) % 1), row = i % 6, sx = fx + fw * 0.6 + (i * 37 % 160), sy = top + (i * 97 % fh);
    const ex = lx - 14, ey = ly + rowH * row + 22, e = ease(f);
    c.fillStyle = LIST[row][4]; c.globalAlpha = 1 - f * 0.6;
    c.beginPath(); c.arc(sx + (ex - sx) * e, sy + (ey - sy) * e, 2.5, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
  // the list
  c.fillStyle = C.mute; c.font = mono(12, 700); c.fillText('FIX FIRST', lx, ly - 10);
  LIST.forEach(([title, asset, score, verdict, col], i) => {
    const y = ly + rowH * i, show = ease((t * 0.6) - i * 0.12 + 0.4);
    c.globalAlpha = Math.max(0.15, show);
    c.fillStyle = C.panel; c.fillRect(lx, y, W - 48 - lx, rowH - 10);
    if (i < 3) { c.fillStyle = C.accent; c.fillRect(lx, y, 3, rowH - 10); }
    c.fillStyle = C.mute; c.font = mono(13, 600); c.fillText(String(i + 1).padStart(2, '0'), lx + 18, y + 28);
    c.fillStyle = C.ink; c.font = text(17, 600); c.fillText(title, lx + 56, y + 28);
    c.fillStyle = C.mute; c.font = mono(12); c.fillText(asset, lx + 56, y + 50);
    const bx = W - 48 - 340, bw = 120;
    c.fillStyle = C.faint; c.fillRect(bx, y + 38, bw, 6);
    c.fillStyle = col; c.fillRect(bx, y + 38, bw * (score / 100) * show, 6);
    c.fillStyle = C.ink; c.font = mono(14, 700); c.fillText(String(score), bx + bw + 12, y + 46);
    chip(c, W - 48 - 128, y + 30, verdict, col, i < 3);
  });
  c.globalAlpha = 1;
}

// 03 Protect: every action an agent tries passes the rules you approved.
const LANES = [
  ['support-agent', 'send email to a customer', 'ALLOWED', C.green],
  ['support-agent', 'export 48,000 customer records', 'WAITING FOR A PERSON', C.amber],
  ['hr-assistant', 'call tool export_all_salaries', 'DECOY TOUCHED', C.accent],
  ['invoice-bot', 'use a tool whose definition changed', 'BLOCKED', C.red],
  ['report-writer', 'query revenue table (12 rows)', 'ALLOWED', C.green],
];
function protect(c, W, H, t) {
  frame(c, W, H, 3, 'Protect', 'Rules you approve decide. Risky actions wait for a person. Decoys catch the rest.',
    [['ACTIONS / MIN', '214'], ['ALLOWED', '97.8 %', C.green], ['HELD', '3', C.amber], ['BLOCKED', '2', C.red], ['DECOYS TOUCHED', '1', C.accent]]);
  const top = 150, lh = (H - 260) / LANES.length, gx = 640, left = 48, right = W - 48;
  // the gate
  c.fillStyle = C.panel; c.fillRect(gx - 34, top - 24, 68, lh * LANES.length + 8);
  c.strokeStyle = C.accent; c.lineWidth = 2; c.strokeRect(gx - 34, top - 24, 68, lh * LANES.length + 8); c.lineWidth = 1;
  c.save(); c.translate(gx + 5, top + (lh * LANES.length) / 2 - 12); c.rotate(-Math.PI / 2);
  c.fillStyle = C.accent; c.font = mono(12, 700); c.textAlign = 'center'; c.fillText('RULES YOU APPROVE', 0, 0); c.restore(); c.textAlign = 'left';
  LANES.forEach(([agent, action, outcome, col], i) => {
    const y = top + lh * i + lh * 0.38;
    c.fillStyle = C.ink; c.font = mono(14, 600); c.fillText(agent, left, y - 8);
    c.fillStyle = C.mute; c.font = text(14, 400); c.fillText(action, left, y + 14);
    c.strokeStyle = C.line; c.setLineDash([2, 6]); c.beginPath(); c.moveTo(left + 290, y); c.lineTo(right - 230, y); c.stroke(); c.setLineDash([]);
    const passes = outcome === 'ALLOWED' || outcome === 'DECOY TOUCHED';
    const f = (t * 0.28 + i * 0.21) % 1, start = left + 300, stop = passes ? right - 250 : gx - 44;
    const x = start + (stop - start) * ease(Math.min(1, f * 1.25));
    const at = f * 1.25 >= 1;
    c.fillStyle = passes ? col : at ? col : C.ink;
    c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill();
    if (outcome === 'WAITING FOR A PERSON' && at) { c.strokeStyle = C.amber; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + TAU * ((t * 0.5) % 1)); c.stroke(); c.lineWidth = 1; }
    if (outcome === 'BLOCKED' && at) { c.strokeStyle = C.red; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - 7 + 22, y - 7); c.lineTo(x + 7 + 22, y + 7); c.moveTo(x + 7 + 22, y - 7); c.lineTo(x - 7 + 22, y + 7); c.stroke(); c.lineWidth = 1; }
    if (outcome === 'DECOY TOUCHED') {
      const dx = right - 250, burst = at ? (t * 2) % 1 : 0;
      c.strokeStyle = C.accent; c.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; c.lineTo(dx + Math.cos(a) * 14, y + Math.sin(a) * 14); } c.closePath(); c.stroke();
      if (burst) { c.globalAlpha = 1 - burst; c.beginPath(); c.arc(dx, y, 14 + burst * 30, 0, TAU); c.stroke(); c.globalAlpha = 1; }
    }
    chip(c, right - 214, y + 4, outcome, col, outcome !== 'ALLOWED');
  });
}

// 04 Prove: every action recorded, explained and chained, ready for leaders and auditors.
const LEDGER = [
  ['10:42:18', 'support-agent', 'Export 48,000 customer records', 'HELD', C.amber, 'bulk export of a crown jewel'],
  ['10:41:55', 'invoice-bot', 'Read supplier phone number', 'ALLOWED', C.green, 'inside its limits'],
  ['10:40:12', 'hr-assistant', 'Call tool export_all_salaries', 'BLOCKED', C.red, 'decoy touched · token revoked'],
  ['10:39:47', 'cursor (eng)', 'terraform apply in production', 'WATCHED', C.blue, 'needs approval when enforcing'],
  ['10:38:30', 'support-agent', 'Send email about ticket 8812', 'ALLOWED', C.green, 'inside its limits'],
  ['10:36:02', 'report-writer', 'Query revenue table (12 rows)', 'ALLOWED', C.green, 'read-only, small result'],
  ['10:35:44', 'invoice-bot', 'Use a changed tool definition', 'BLOCKED', C.red, 'definition changed since approval'],
];
function prove(c, W, H, t) {
  frame(c, W, H, 4, 'Prove', 'Every action recorded and explained: who did what, what decided it, and why.',
    [['ACTIONS TODAY', '1,284'], ['EXPLAINED', '100 %', C.green], ['CHAIN', 'VERIFIED', C.green], ['REPORT', 'AUDITOR PDF']]);
  const top = 150, rh = 66, lx = 48, tw = 800, cut = Math.floor(t * 0.5) % LEDGER.length;
  const rows = LEDGER.slice(cut).concat(LEDGER.slice(0, cut)).slice(0, 7);
  c.fillStyle = C.mute; c.font = mono(11, 700);
  [['TIME', 0], ['AGENT', 92], ['ACTION', 222], ['DECISION', 500], ['WHY', 590]].forEach(([h, x]) => c.fillText(h, lx + 36 + x, top - 14));
  rows.forEach(([time, agent, action, dec, col, why], i) => {
    const y = top + i * rh, fresh = i === 0 ? ease((t * 0.5) % 1 * 3) : 1;
    c.globalAlpha = fresh;
    // the chain
    c.fillStyle = C.line; if (i < rows.length - 1) c.fillRect(lx + 9, y + 18, 2, rh);
    c.fillStyle = i === 0 ? C.accent : C.ink; c.fillRect(lx + 4, y + 8, 12, 12);
    c.fillStyle = C.panel; c.fillRect(lx + 30, y - 4, tw, rh - 12);
    c.fillStyle = C.mute; c.font = mono(13); c.fillText(time, lx + 36, y + 22);
    c.fillStyle = C.ink; c.font = mono(13, 600); c.fillText(agent, lx + 128, y + 22);
    c.font = text(15, 500); c.fillText(fit(c, action, 268), lx + 258, y + 22);
    chip(c, lx + 536, y + 22, dec, col, dec === 'BLOCKED' || dec === 'HELD');
    c.fillStyle = C.mute; c.font = text(13, 400); c.fillText(fit(c, why, tw - 600), lx + 626, y + 22);
    c.font = mono(10); c.fillText(`#${(0x9a3f17 + i * 7919 + cut * 31).toString(16)}…`, lx + 36, y + 42);
  });
  c.globalAlpha = 1;
  // the report
  const rx = lx + tw + 60, ry = top - 20, rw = W - 48 - rx, rhh = H - 250;
  c.fillStyle = '#EBE8DF'; c.fillRect(rx, ry, rw, rhh);
  c.fillStyle = '#15140F'; c.font = disp(22); c.fillText('Monthly report', rx + 22, ry + 40);
  c.fillStyle = '#7A766C'; c.font = mono(11); c.fillText('AI AGENTS · OCTOBER', rx + 22, ry + 60);
  [['Actions', '38,520'], ['Held for a person', '37'], ['Blocked', '4'], ['Unexplained', '0']].forEach(([k, v], i) => {
    const y = ry + 104 + i * 52;
    c.fillStyle = '#7A766C'; c.font = text(13, 400); c.fillText(k, rx + 22, y);
    c.fillStyle = i === 3 ? '#2F8F5B' : '#15140F'; c.font = disp(26); c.fillText(v, rx + 22, y + 28);
  });
  for (let i = 0; i < 14; i++) { const h = 20 + ((i * 37) % 50); c.fillStyle = i === 13 ? '#FF5309' : 'rgba(21,20,15,.75)'; c.fillRect(rx + 22 + i * ((rw - 44) / 14), ry + rhh - 30 - h, (rw - 44) / 14 - 4, h); }
}

export const BOARDS = [discover, prioritize, protect, prove];
export const drawBoard = (c, W, H, i, t) => BOARDS[i](c, W, H, t);
