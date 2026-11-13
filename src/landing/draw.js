// The track's bars, drawn on a canvas with the wall recording seen through them (first screen and the end).
import { brand } from '../brand/brand.config.js';
import { TRACK } from '../brand/track.js';
import { clamp, ease } from './motion.js';
import { FLY } from './signals/catalog.js';

const C = brand.colors;
const ENV = TRACK.env, STEP = TRACK.envStep;

// o: t (track time at the playhead), x (playhead, px), cy/bh (band centre and height), open (0 band .. 1 whole wall),
// rec (the entrance: bars exist only up to t, the rest rise with `known`), color (0 white bars .. 1 the looks inside),
// dim (the part not played yet), row/cx (the row of the wall framed at rest), holes (cells lifted out of the wall).
export function bars(E, c, w, h, o) {
  const small = E.small, bw = small ? 5 : 7, gap = small ? 2 : 3, step = bw + gap, X = o.x;
  const cy = o.cy + (h / 2 - o.cy) * o.open;
  const path = new Path2D(), list = [], tipsOf = [];
  const i0 = Math.round(o.t / STEP);
  for (let k = -Math.ceil(X / step) - 1; k <= Math.ceil((w - X) / step) + 1; k++) {
    const i = i0 + k;
    if (i < 0 || i >= ENV.length) continue;
    let rise = 1;
    if (o.rec) rise = k <= 0 ? clamp(-k / 16 + 0.35) : ease(o.known * 1.7 - k * 0.006);
    if (rise <= 0) continue;
    let bh = Math.max(3, (ENV[i] / 99) * o.bh) * rise * (o.live ? 0.55 + 0.9 * E.level : 1);
    bh += (h - bh) * o.open;
    const bw2 = bw + (gap + 1) * o.open, x = X + k * step - bw2 / 2;
    path.rect(x, cy - bh / 2, bw2, bh);
    if (o.color < 1) list.push([x, cy - bh / 2, bw2, bh, k]);
    if (o.caps) tipsOf.push([x, cy - bh / 2, bw2, bh]);
  }
  c.clearRect(0, 0, w, h);
  const src = E.wallSource();
  c.save(); c.clip(path);
  if (src && o.color > 0) frameWall(E, c, src, w, h, o, cy); else { c.fillStyle = C.barEmpty; c.fillRect(0, 0, w, h); }
  if (o.dim > 0) { c.fillStyle = `rgba(${C.dimNight}, ${o.dim})`; c.fillRect(X + 2, 0, w - X, h); }
  c.restore();
  // Before the colour comes, the bars are the plain measurement: white, then the looks flood in from the playhead.
  for (const [x, y, bw2, bh, k] of list) {
    const a = 1 - ease(o.color * 1.8 - Math.abs(k * step) / w * 0.8);
    if (a <= 0.01) continue;
    c.fillStyle = `rgba(${C.barTip}, ${a.toFixed(3)})`; c.fillRect(x, y, bw2, bh);
  }
  // Once the looks are in, every bar keeps a thin white tip at both ends: the outline of the track stays readable.
  if (o.caps && o.color > 0 && o.open < 1) {
    const a = (0.85 * Math.min(1, o.color) * (1 - o.open)).toFixed(3), tip = small ? 2 : 3;
    for (const [x, y, bw2, bh] of tipsOf) { c.fillStyle = `rgba(${C.barTip}, ${x > X ? (a * 0.5).toFixed(3) : a})`; c.fillRect(x, y, bw2, tip); c.fillRect(x, y + bh - tip, bw2, tip); }
  }
  // The playhead: the recording light's red. During the entrance it is born from the dot.
  const ph = (o.bh + (h - o.bh) * o.open) + 24, grow = o.grow ?? 1;
  if (o.dot > 0) { c.fillStyle = C.accent; c.beginPath(); c.arc(X, cy, 6 * o.dot, 0, Math.PI * 2); c.fill(); }
  if (grow > 0) { c.fillStyle = C.accent; c.fillRect(X - 1, cy - (ph / 2) * grow, 2, ph * grow); }
  return cy;
}

// At rest the bars frame one row of the wall (o.row: its top and bottom as fractions, o.cx: the centre across);
// as the band opens the camera pulls back to the whole wall.
function frameWall(E, c, src, w, h, o, cy) {
  const g = wallGeom(src, w, h, o, cy);
  c.drawImage(src, g.x, g.y, g.sw * g.k, g.sh * g.k);
  if (o.holes > 0) {
    // The four instruments leave the wall for the sentence below: their cells go dark behind them.
    const T = g.sw / E.cols();
    c.fillStyle = `rgba(${C.dimNight}, ${o.holes})`;
    for (const id of FLY) { const [col, row] = E.cell(id); c.fillRect(g.x + col * T * g.k, g.y + row * T * g.k, T * g.k + 0.5, T * g.k + 0.5); }
  }
}
function wallGeom(src, w, h, o, cy) {
  const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
  const [r0, r1] = o.row, kr = Math.max(w / sw, o.bh / (sh * (r1 - r0)));
  const xr = w / 2 - o.cx * sw * kr, yr = cy - ((r0 + r1) / 2) * sh * kr;
  const kf = Math.max(w / sw, h / sh), xf = (w - sw * kf) / 2, yf = (h - sh * kf) / 2;
  const m = o.open;
  return { sw, sh, k: kr + (kf - kr) * m, x: xr + (xf - xr) * m, y: yr + (yf - yr) * m };
}

// The whole track at once: one bar per few pixels, the loudest moment of each stretch, the looks inside.
export function whole(E, c, w, h, a) {
  const src = E.wallSource(), step = E.small ? 5 : 6, n = Math.floor(w / step), per = ENV.length / n, path = new Path2D(), tips = [];
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let k = Math.floor(i * per); k < Math.floor((i + 1) * per); k++) m = Math.max(m, ENV[k]);
    const bh = Math.max(3, (m / 99) * h * 0.86), x = i * step + 1, y = h / 2 - bh / 2;
    path.rect(x, y, step - 2, bh); tips.push([x, y, step - 2, bh]);
  }
  c.save(); c.globalAlpha = a; c.clip(path);
  if (src) {
    const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height, [r0, r1] = E.small ? [0.13 / 8, 0.865 / 8] : [0.13 / 4, 0.865 / 4];
    const k = Math.max(w / sw, (h * 0.86) / (sh * (r1 - r0)));
    c.drawImage(src, w / 2 - 0.5 * sw * k, h / 2 - ((r0 + r1) / 2) * sh * k, sw * k, sh * k);
  }
  c.restore();
  c.fillStyle = `rgba(${C.barTip}, ${(0.85 * a).toFixed(3)})`;
  for (const [x, y, bw, bh] of tips) { c.fillRect(x, y, bw, 2); c.fillRect(x, y + bh - 2, bw, 2); }
}
