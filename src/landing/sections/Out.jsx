// 5. What comes out: the frame takes the shape of each export, starting with the look picked above. Between two shapes
// the picture goes dark, the frame changes, the next one comes up: never two recordings over each other.
import { useEffect, useRef, useState } from 'react';
import { brand } from '../../brand/brand.config.js';
import { useEngine, useScene, useSeen } from '../EngineContext.jsx';
import { clamp, smooth } from '../motion.js';
import { useContent, useSectionId } from '../content.jsx';
import SignalCanvas from '../signals/SignalCanvas.jsx';

const FMS = brand.media.out;

export default function Out() {
  const { out } = useContent();
  const sid = useSectionId('out');
  const E = useEngine();
  const section = useRef(null), frame = useRef(null), inner = useRef(null), ratio = useRef(null);
  const fms = useRef([]), crops = useRef([]), vids = useRef([]);
  const [on, setOn] = useState(0);
  const [reelSound, setReelSound] = useState(false);
  const S = useRef({ box: { w: 0, h: 0 }, sizes: [], current: -1 });

  useEffect(() => {
    const fit = () => {
      const r = frame.current.getBoundingClientRect(); S.current.box = { w: r.width, h: r.height };
      S.current.sizes = FMS.map((f) => { const a = f.w / f.h, w = Math.min(r.width, r.height * a); return { w, h: w / a }; });
      if (E.moving) fms.current.forEach((fm, i) => { fm.style.width = S.current.sizes[i].w + 'px'; fm.style.height = S.current.sizes[i].h + 'px'; });
      E.dirtyAll(); E.wake();
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(frame.current);
    return () => ro.disconnect();
  }, [E]);

  useScene(section, (p) => {
    const { sizes, box } = S.current;
    if (!E.moving || !sizes.length) return;
    const K = FMS.length, x = clamp((p - 0.05) / 0.88) * (K - 1), i = Math.min(K - 2, Math.floor(x)), tf = clamp((x - i - 0.4) / 0.6);
    const gone = smooth(tf / 0.35), g = smooth((tf - 0.2) / 0.6), come = smooth((tf - 0.65) / 0.35), a = sizes[i], b = sizes[i + 1];
    const w = a.w + (b.w - a.w) * g, h = a.h + (b.h - a.h) * g;
    inner.current.style.clipPath = `inset(${((box.h - h) / 2).toFixed(1)}px ${((box.w - w) / 2).toFixed(1)}px)`;
    fms.current.forEach((fm, k) => { fm.style.opacity = k === i ? 1 - gone : k === i + 1 ? come : 0; });
    const pos = [[-w / 2, -h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2]];
    crops.current.forEach((cr, k) => { cr.style.transform = `translate(${pos[k][0].toFixed(1)}px, ${pos[k][1].toFixed(1)}px)`; });
    ratio.current.style.transform = `translate(${(-w / 2).toFixed(1)}px, ${(-h / 2 - 24).toFixed(1)}px)`;
    const now = g > 0.5 ? i + 1 : i;
    if (now !== S.current.current) {
      S.current.current = now;
      setOn(now);
      vids.current.forEach((v, k) => v && E.playIf(v, Math.abs(k - now) <= 1));
    }
  });
  useSeen(section, (seen) => { if (!seen) vids.current.forEach((v) => v && E.playIf(v, false)); else S.current.current = -1; });

  // The reel's own sound; one source plays at a time.
  const stopReel = () => { const v = vids.current[1]; if (v) v.muted = true; setReelSound(false); };
  useEffect(() => E.registerHush('reel', stopReel), [E]);
  const toggleReel = () => {
    const v = vids.current[1], turnOn = v.muted;
    if (!v.getAttribute('src')) v.src = v.dataset.src;
    if (turnOn) { if (E.soundOn) E.setSound(false); E.hush('reel'); }
    v.muted = !turnOn; setReelSound(turnOn);
    if (turnOn) v.play().catch(() => {});
  };
  useEffect(() => { const h = () => stopReel(); addEventListener('pagehide', h); return () => removeEventListener('pagehide', h); }, []);

  return (
    <section className="ch ch-out scene" id={sid} data-ch={sid} aria-labelledby="out-h" ref={section}>
      <div className="stage">
        <div className="out-copy"><h2 id="out-h">{out.h2}</h2><p>{out.p}</p></div>
        <div className={`frame${on === 1 ? ' reel-on' : ''}`} ref={frame}>
          <div className="frame-in" ref={inner}>
            {FMS.map((f, i) => {
              return (
                <div key={i} className="fm" data-w={f.w} data-h={f.h} style={{ '--ar': `${f.w} / ${f.h}` }} ref={(el) => { fms.current[i] = el; }}>
                  {f.sheet
                    ? <SignalCanvas sheet={{ theme: 'night', code: i + 1, ...f.sheet }} className="fm-c" label={out.formats[i]?.aria} />
                    : <video ref={(el) => { vids.current[i] = el; }} data-src={f.video} poster={f.poster} width={f.w} height={f.h} muted loop playsInline preload="none" aria-label={out.formats[i]?.aria} />}
                </div>
              );
            })}
          </div>
          {FMS[1]?.video && <button type="button" className="reel-sound" aria-pressed={reelSound} onClick={toggleReel}>{out.reelSound}</button>}
          {['tl', 'tr', 'bl', 'br'].map((c, k) => <i key={c} className={`crop ${c}`} ref={(el) => { crops.current[k] = el; }} />)}
          <span className="ratio" aria-hidden="true" ref={ratio}>{out.formats[on]?.ratio}</span>
        </div>
        <ol className="fmts">
          {out.formats.map((f, k) => {
            const [before, after] = f.desc.split('{look}');
            return (
              <li key={f.ratio} data-r={f.ratio} className={k === on ? 'on' : undefined}>
                <b>{f.title}</b>
                <span className="d">{after !== undefined ? <>{before}{after}</> : f.desc}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
