// 7. The app: three real states of one window. The camera starts on the whole window, goes close to the looks, then
// steps back while the window opens Studio and goes close again, and once more for Export. Close-ups use 4× patches.
// 8. Listen: the window floats up close, then shrinks to its working size and parks in the corner, over the page.
import { useEffect, useRef, useState } from 'react';
import { brand } from '../../brand/brand.config.js';
import { useEngine, useEngineState, useScene } from '../EngineContext.jsx';
import { clamp, cssNum, lerp, smooth } from '../motion.js';
import { useContent, useSectionId } from '../content.jsx';
import SignalCanvas from '../signals/SignalCanvas.jsx';
import { drawBoard } from '../signals/boards.js';

const WW = 1240, WH = 800;
// [state, region as fractions of the window]; a phone gets tighter regions so the window's own words read at size.
const R = brand.media.appRegions, RS = brand.media.appRegionsSmall || R;
const mix = (a, b, t) => a.map((n, i) => n + (b[i] - n) * t);
const P_STATE = R.map(([st]) => st);

// One board: a fixed 1240×800 canvas drawn at 2.5× (the camera goes close), animated only while it is the one shown.
function Board({ index, active, label }) {
  const E = useEngine(), { still } = useEngineState();
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, k = 2.5, c = cv.getContext('2d');
    cv.width = WW * k; cv.height = WH * k;
    let raf = 0, t0 = performance.now(), last = 0, seen = false;
    const paint = (now) => { c.setTransform(k, 0, 0, k, 0, 0); drawBoard(c, WW, WH, index, (now - t0) / 1000); };
    const loop = (now) => { raf = 0; if (now - last > 40) { last = now; paint(now); } if (active && seen && !E.still) raf = requestAnimationFrame(loop); };
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (!raf) raf = requestAnimationFrame(loop); });
    io.observe(cv);
    document.fonts?.ready.then(() => paint(performance.now()));
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [index, active, still, E]);
  return <canvas ref={ref} className="base" role="img" aria-label={label} />;
}

export function AppTour() {
  const { app } = useContent();
  const sid = useSectionId('app');
  const E = useEngine();
  const section = useRef(null), win = useRef(null), cam = useRef(null), sts = useRef([]);
  const [step, setStep] = useState(0);
  const cur = useRef(-1);

  const view = (r) => {
    const W = win.current.clientWidth, H = win.current.clientHeight, rw = (r[2] - r[0]) * WW, rh = (r[3] - r[1]) * WH;
    const k = Math.min(W / rw, H / rh, E.small ? 3 : 2.2), fw = WW * k, fh = WH * k;
    let tx = W / 2 - ((r[0] + r[2]) / 2) * fw, ty = H / 2 - ((r[1] + r[3]) / 2) * fh;
    tx = fw >= W ? clamp(tx, W - fw, 0) : (W - fw) / 2;
    ty = fh >= H ? clamp(ty, H - fh, 0) : (H - fh) / 2;
    return [tx, ty, k];
  };
  useScene(section, (p) => {
    if (!E.moving) return;
    const P = E.small ? RS : R, K = P.length, x = clamp((p - 0.05) / 0.85) * (K - 1), i = Math.min(K - 2, Math.floor(x)), g = smooth((x - i - 0.4) / 0.6);
    const [sa, ra] = P[i], [sb, rb] = P[i + 1];
    let v;
    if (sa === sb) v = mix(view(ra), view(rb), g);
    else { const all = view([0, 0, 1, 1]); v = g < 0.5 ? mix(view(ra), all, smooth(g / 0.5)) : mix(all, view(rb), smooth((g - 0.5) / 0.5)); }
    cam.current.style.transform = `translate(${v[0].toFixed(1)}px, ${v[1].toFixed(1)}px) scale(${v[2].toFixed(4)})`;
    const swap = sa === sb ? 0 : smooth((g - 0.42) / 0.16);
    sts.current.forEach((st, k) => { st.style.opacity = k === sa ? 1 - swap : k === sb ? swap : 0; });
    const now = g > 0.5 ? i + 1 : i;
    if (now !== cur.current) { cur.current = now; setStep(now); }
  });

  return (
    <section className="ch ch-app scene" id={sid} data-ch={sid} aria-labelledby="app-h" ref={section}>
      <div className="stage">
        <div className="app-head">
          <h2 id="app-h">{app.h2}</h2>
          <ol className="steps-app">
            {app.steps.map((s, k) => <li key={s.title} className={k === step ? 'on' : undefined}><b>{s.title}</b><span>{s.text}</span></li>)}
          </ol>
        </div>
        <div className="win" ref={win}>
          <div className="cam" ref={cam}>
            {brand.media.app.map((m, k) => (
              <div key={k} className={`st${k === 0 ? ' on' : ''}`} ref={(el) => { sts.current[k] = el; }}>
                {m.board != null ? <Board index={m.board} active={k === (P_STATE[step] ?? 0)} label={app.alts[k]} /> : <img className="base" src={m.base} width="2480" height="1600" alt={app.alts[k]} decoding="async" />}
                {m.patch && <img className="patch" src={m.patch} alt="" loading="lazy" decoding="async" style={m.at} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Listen() {
  const { listen } = useContent();
  const sid = useSectionId('listen');
  const E = useEngine();
  const section = useRef(null), stage = useRef(null), copy = useRef(null), lw = useRef(null);
  useScene(section, (p) => {
    if (!E.moving) return;
    const W = stage.current.clientWidth, H = stage.current.clientHeight, gut = cssNum('--gut', 24), tp = cssNum('--tp', 44), bar = cssNum('--bar', 64);
    const cr = copy.current.getBoundingClientRect(), L = brand.media.listen, A = L.w / L.h;
    // On a wide screen the window starts large beside the words; on a narrow one, large under them.
    const narrow = W < 1100, under = cr.bottom - stage.current.getBoundingClientRect().top + 24;
    const big = narrow ? Math.min(W - 2 * gut, (H - under - tp - 16) * A, 760) : Math.min(W - cr.width - 3 * gut, (H - bar - tp - 80) * A, 980);
    const park = E.small ? Math.min(W * 0.6, 280) : Math.min(380, W * 0.3);
    const g = smooth((p - 0.2) / 0.55), wd = lerp(big, park, g);
    const bx = narrow ? (W - big) / 2 : W - gut - big, by = narrow ? under : bar + (H - bar - tp - big / A) / 2;
    const x = lerp(bx, W - gut - park, g), y = lerp(by, H - tp - 20 - park / A, g);
    lw.current.style.width = big + 'px';
    lw.current.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(wd / big).toFixed(4)})`;
    section.current.style.setProperty('--g', g.toFixed(3));
  });
  return (
    <section className="ch ch-listen scene" id={sid} data-ch={sid} aria-labelledby="listen-h" ref={section}>
      <div className="stage" ref={stage}>
        <div className="listen-copy" ref={copy}>
          <h2 id="listen-h">{listen.h2}</h2>
          <p>{listen.p}</p>
          <p className="fine">{listen.fine}</p>
        </div>
        <figure className="listen-win" ref={lw}>{brand.media.listen.sheet
          ? <SignalCanvas sheet={{ theme: 'night', code: 1, ...brand.media.listen.sheet }} className="listen-c" label={listen.alt} />
          : <img src={brand.media.listen.src} alt={listen.alt} width={brand.media.listen.w} height={brand.media.listen.h} loading="lazy" decoding="async" />}</figure>
      </div>
    </section>
  );
}
