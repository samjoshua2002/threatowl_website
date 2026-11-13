// 2. What the app hears: four of the wall's own instruments, cut out of the same recording at type height. They fly
// there: as the wall leaves the screen, their cells empty and the four tiles travel into their places in the sentence.
import { Fragment, useEffect, useRef } from 'react';
import { useBefore, useEngine, useScene, useWallNeed } from '../EngineContext.jsx';
import { canvasBox, clamp, lerp, smooth } from '../motion.js';
import { useContent, useSectionId } from '../content.jsx';

const crop = (col, row, T, f) => [lerp(col * T, (col + 0.06) * T, f), lerp(row * T, (row + 0.2) * T, f), lerp(T, 0.88 * T, f), lerp(T, 0.6 * T, f)];

export default function Hear() {
  const { hear } = useContent();
  const sid = useSectionId('hear');
  const E = useEngine();
  const section = useRef(null), tiles = useRef([]);

  useScene(section, () => {
    const src = E.wallSource();
    if (!src) return;
    const sw = src.videoWidth || src.naturalWidth || src.width, T = sw / E.cols();
    for (const t of tiles.current) {
      if (!t) continue;
      const [col, row] = E.cell(t.dataset.tile), { c, w, h } = canvasBox(t);
      c.drawImage(src, ...crop(col, row, T, 1), 0, 0, w, h);
    }
  }, () => E.wallPlaying());
  useWallNeed(section, 'hear');

  // The flight. The flyers live inside the wall's own stage and leave only once the stage lets go and scrolls with the
  // words: from then on the wall, the sentence and the flyers all move with the page, so the browser carries them and
  // the script only changes how far along the flight is. Each keeps one canvas size and is scaled by transform.
  const fe = useRef(0);
  useBefore((now, dt) => {
    const hero = E.dom.heroStage?.parentElement, hearEl = section.current, flyers = E.dom.flyers || [], ts = tiles.current.filter(Boolean);
    if (!E.moving || !hero || !hearEl || !flyers.length) return false;
    const vh = innerHeight, hr = hero.getBoundingClientRect(), er = hearEl.getBoundingClientRect();
    if (hr.bottom < -vh || er.top > vh * 2.2) {
      if (E.flyState.f !== 0) { E.flyState.f = fe.current = 0; flyers.forEach((f) => (f.style.display = 'none')); ts.forEach((t) => t.classList.remove('away')); }
      return false;
    }
    // From the moment the wall's stage lets go to the moment the sentence stands a fifth down the screen.
    const y0 = hr.top + (hr.height - vh), y1 = er.top - vh * 0.2, target = clamp(-y0 / Math.max(1, y1 - y0));
    fe.current = fe.current + (target - fe.current) * (1 - Math.exp(-dt / 0.085));
    if (Math.abs(target - fe.current) < 0.0005) fe.current = target;
    const f0 = (E.flyState.f = fe.current);
    const src = E.wallSource(), on = f0 > 0 && f0 < 1 && src;
    ts.forEach((t) => t.classList.toggle('away', !!on));
    if (!on) { flyers.forEach((f) => (f.style.display = 'none')); return target !== f0; }
    const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height, T = sw / E.cols();
    const st = E.dom.heroStage.getBoundingClientRect(), sx = -st.left, sy = -st.top;
    const hb = E.dom.heroCanvas.getBoundingClientRect(), kf = Math.max(hb.width / sw, hb.height / sh), xf = hb.left + (hb.width - sw * kf) / 2, yf = hb.top + (hb.height - sh * kf) / 2;
    const dpr = Math.min(2, devicePixelRatio || 1);
    ts.forEach((t, n) => {
      const f = smooth((f0 - n * 0.05) / 0.85), [col, row] = E.cell(t.dataset.tile), d = t.getBoundingClientRect();
      const s = [xf + col * T * kf, yf + row * T * kf, T * kf, T * kf];
      const z = smooth(f * 1.8), x = lerp(s[0], d.left, f) + sx, y = lerp(s[1], d.top, f) + sy - Math.sin(f * Math.PI) * vh * 0.05, wd = lerp(s[2], d.width, z), ht = lerp(s[3], d.height, z);
      const cv = flyers[n], W = Math.round(d.width * dpr * 1.6), H = Math.round(d.height * dpr * 1.6);
      if (!cv) return;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv.style.width = d.width + 'px'; cv.style.height = d.height + 'px'; }
      cv.style.display = 'block';
      cv.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${(wd / d.width).toFixed(4)}, ${(ht / d.height).toFixed(4)})`;
      cv.getContext('2d').drawImage(src, ...crop(col, row, T, f), 0, 0, W, H);
    });
    return true;
  });
  // Wake the loop well before the sentence arrives so the flight starts on time.
  useEffect(() => {
    const io = new IntersectionObserver(() => E.wake(), { rootMargin: '100% 0px' });
    io.observe(section.current);
    return () => io.disconnect();
  }, [E]);

  let n = 0;
  return (
    <section className="ch ch-hear" id={sid} data-ch={sid} aria-labelledby="hear-h" ref={section}>
      <h2 id="hear-h" className="said">
        {hear.tokens.map((tk, i) => {
          const sep = i > 0 ? ' ' : '';
          if (tk.w) return <Fragment key={i}>{sep}<span className="w">{tk.w}</span></Fragment>;
          if (tk.val) return <Fragment key={i}>{sep}<span className="val">{tk.val.map((v, j) => <Fragment key={j}>{j > 0 && ' '}<span className="w">{v}</span></Fragment>)}</span></Fragment>;
          const k = n++;
          return <Fragment key={i}>{sep}<canvas className="tile" data-tile={tk.tile} width="240" height="200" aria-hidden="true" title={tk.title} ref={(el) => { tiles.current[k] = el; }} /></Fragment>;
        })}
      </h2>
      <p className="hear-p">{hear.p}</p>
    </section>
  );
}
