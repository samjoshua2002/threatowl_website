// The landing page's motion engine (a port of the reference land.js core). The page plays one track from top to bottom
// and scroll is the playhead. One frame loop runs only while a moving chapter is on screen (an IntersectionObserver
// turns chapters on and off): it reads where each chapter stands, eases that with a little mass, writes it as --p and
// lets the chapter draw. No scroll listeners.
//
// React components register with it through hooks (EngineContext.jsx): a chapter calls useScene(ref, draw), work done
// once per frame before the chapters goes through useBefore(fn). Everything that runs at 60 fps stays imperative (refs,
// canvas, style properties); React state is used only for things a person changes (pause, sound, the chosen look).
import { brand } from '../brand/brand.config.js';
import { TRACK } from '../brand/track.js';
import { clamp } from './motion.js';
import { drawSheet } from './signals/signals.js';
import { WALL } from './signals/catalog.js';

const SDT = typeof CSS !== 'undefined' && !!CSS.supports?.('animation-timeline: scroll()');

export class Engine {
  constructor({ small, calm }) {
    this.small = small;           // phone layout (max-width: 767px)
    this.calm = calm;             // prefers-reduced-motion
    this.moving = !calm;
    this.still = calm;            // the Pause button
    this.soundOn = false;
    this.level = 0;               // live loudness while the sound is on, 0..1
    this.scenes = [];
    this.before = [];
    this.raf = 0; this.last = 0;
    this.io = null;
    this.dom = {};                // shared elements: heroStage, heroCanvas, flyers
    this.flyState = { f: 0 };
    // The live wall every chapter cuts from (initWall).
    this.wall = null; this.wallWants = new Set();
    // One source plays at a time: the wall, the reel or the demo. Components register how to hush themselves.
    this.hushers = new Map();
    this.listeners = new Set();
    this.snap = { still: this.still, soundOn: false };
    this.audio = null;
    this.alive = false;
    this.tick = this.tick.bind(this);
    this.onResize = () => { this.dirtyAll(); this.wake(); };
  }

  // ------------------------------------------------------------ React subscription (pause and sound buttons)
  subscribe = (fn) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  getSnapshot = () => this.snap;
  emit() { this.snap = { still: this.still, soundOn: this.soundOn }; for (const f of this.listeners) f(); }

  // ------------------------------------------------------------ lifecycle
  ensureIO() {
    if (this.io) return;
    this.io = new IntersectionObserver((entries) => {
      for (const e of entries) { const s = this.scenes.find((x) => x.el === e.target); if (s) { s.on = e.isIntersecting; if (s.on) s.dirty = true; } }
      this.wake();
    }, { rootMargin: '15% 0px' });
    for (const s of this.scenes) this.io.observe(s.el);
  }
  start() {
    this.alive = true;
    const root = document.documentElement;
    root.classList.add('js');
    root.classList.toggle('moving', this.moving);
    root.classList.toggle('still', this.still);
    this.ensureIO();
    addEventListener('resize', this.onResize);
    this.wake();
    return () => this.stop();
  }
  stop() {
    this.alive = false;
    cancelAnimationFrame(this.raf); this.raf = 0; this.last = 0;
    this.io?.disconnect(); this.io = null;
    removeEventListener('resize', this.onResize);
    document.documentElement.classList.remove('js', 'moving', 'still', 'intro', 'i1', 'i2', 'i3', 'hero-cta');
    document.documentElement.style.removeProperty('--page');
  }

  // ------------------------------------------------------------ chapters
  scene(el, draw, keep) {
    if (!el) return () => {};
    const s = { el, draw, keep, on: false, p: 0, shown: -1, dirty: true };
    this.scenes.push(s);
    this.io?.observe(el);
    return () => { this.scenes = this.scenes.filter((x) => x !== s); this.io?.unobserve(el); };
  }
  addBefore(fn) { this.before.push(fn); return () => { this.before = this.before.filter((f) => f !== fn); }; }
  dirtyAll() { for (const s of this.scenes) s.dirty = true; }
  progress(el) {
    const r = el.getBoundingClientRect(), vh = innerHeight, span = r.height - vh;
    return span > 2 ? clamp(-r.top / span) : clamp((vh - r.top) / (vh + r.height));
  }
  pageAt() { return clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)); }
  wake() { if (this.alive && !this.raf) this.raf = requestAnimationFrame(this.tick); }
  tick(now) {
    this.raf = 0;
    if (!this.alive) return;
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016); this.last = now;
    let busy = !SDT;
    if (this.wallTick(now, dt)) busy = true;
    for (const f of this.before) if (f(now, dt)) busy = true;
    for (const s of this.scenes) {
      if (!s.on || !s.el.isConnected) continue;
      const target = this.progress(s.el);
      // Motion with mass: the chapter follows the scroll a little behind, never jumps.
      s.p = this.moving ? s.p + (target - s.p) * (1 - Math.exp(-dt / 0.085)) : target;
      if (Math.abs(target - s.p) < 0.0004) s.p = target;
      if (s.p !== s.shown || s.dirty || s.keep?.()) { s.el.style.setProperty('--p', s.p.toFixed(4)); s.draw(s.p, now, dt); s.shown = s.p; s.dirty = false; }
      busy = true;
    }
    if (!SDT) document.documentElement.style.setProperty('--page', this.pageAt().toFixed(4));
    if (busy) this.raf = requestAnimationFrame(this.tick); else this.last = 0;
  }

  // ------------------------------------------------------------ the wall: 24 live scan sheets in one canvas
  // Every chapter that shows "the wall" (the hero's bars, the flying tiles, the end) cuts from this one canvas.
  cols() { return this.small ? 3 : 6; }
  rows() { return this.small ? 8 : 4; }
  cell(id) { const k = WALL.findIndex((w) => w.id === id), c = this.cols(); return [k % c, Math.floor(k / c)]; }
  initWall() {
    if (this.wall) return;
    const size = this.small ? 260 : 300, cv = document.createElement('canvas');
    cv.width = this.cols() * size; cv.height = this.rows() * size;
    this.wall = { canvas: cv, ctx: cv.getContext('2d'), size, live: false, t: 0, last: 0 };
    this.drawWall(0);
    document.fonts?.ready.then(() => { this.drawWall(this.wall.t); this.dirtyAll(); this.wake(); });
  }
  drawWall(t) {
    const W = this.wall, n = this.cols() * this.rows();
    W.ctx.fillStyle = brand.colors.night; W.ctx.fillRect(0, 0, W.canvas.width, W.canvas.height);
    for (let i = 0; i < n; i++) {
      const c = WALL[i], col = i % this.cols(), row = Math.floor(i / this.cols()), g = 2;
      drawSheet(W.ctx, col * W.size + g, row * W.size + g, W.size - g * 2, W.size - g * 2, { style: c.style, seed: c.seed, theme: 'night', title: c.title, code: c.code, sensor: c.style, t: t + i * 0.37, live: true });
    }
  }
  // Called once per frame: the wall moves at about 24 fps while a chapter that shows it is on screen.
  wallTick(now, dt) {
    const W = this.wall; if (!W?.live) return false;
    W.t += dt;
    if (now - W.last > 40) { W.last = now; this.drawWall(W.t); }
    return true;
  }
  wallSource() { return this.wall?.canvas || null; }
  wallUpdate() { if (!this.wall) return; this.wall.live = this.wallWants.size > 0 && !this.still; if (this.wall.live) this.wake(); }
  wallNeed(key, on) { if (on) this.wallWants.add(key); else this.wallWants.delete(key); this.wallUpdate(); }
  wallPlaying() { return !!this.wall?.live; }

  // ------------------------------------------------------------ pause
  setStill(on) {
    this.still = on;
    document.documentElement.classList.toggle('still', on);
    this.wallUpdate();
    if (on) for (const v of document.querySelectorAll('video')) v.pause();
    this.emit(); this.dirtyAll(); this.wake();
  }
  hush(except) { for (const [k, f] of this.hushers) if (k !== except) f(); }
  registerHush(key, fn) { this.hushers.set(key, fn); return () => this.hushers.delete(key); }
  // There is no soundtrack on this page; kept so a brand with a wall recording can bring the Sound button back.
  setSound(on) { this.soundOn = on; this.emit(); }

  // A video that plays only while seen and while the page is not paused.
  playIf(v, on) {
    if (!v) return;
    if (on && !this.still) { if (!v.getAttribute('src') && v.dataset.src) v.src = v.dataset.src; v.play().catch(() => {}); } else if (!v.paused) v.pause();
  }
}

export { TRACK };
