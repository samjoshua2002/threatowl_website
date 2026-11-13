// 1. The first screen as an event, about seven beats of the track: a red light; it becomes the playhead and records
// the first 30 seconds as white bars; the rest of the track is known at once; the looks flood the bars; the words and
// the controls arrive on the beat. Any scroll, key or touch ends it at once.
import { Fragment, useEffect, useRef } from 'react';
import { brand } from '../../brand/brand.config.js';
import { TRACK } from '../../brand/track.js';
import { useEngine, useEngineState, useScene, useSeen, useWallNeed } from '../EngineContext.jsx';
import { bars } from '../draw.js';
import { FLY } from '../signals/catalog.js';
import { clamp, canvasBox, cssNum, ease, lerp, mmss, smooth } from '../motion.js';
import { Amount, BuyLink, useContent, useSectionId } from '../content.jsx';

const IN = { dot: 0.42, sweep: 1.75, known: 2.15, color: 2.95, h1a: 0.5, h1b: 2.15, foot: 2.35, end: 3.05 };
const W = brand.media.wall;

export default function Hero() {
  const { hero } = useContent();
  const sid = useSectionId('top');
  const E = useEngine(), { soundOn } = useEngineState();
  const root = document.documentElement;
  const section = useRef(null), stage = useRef(null), canvas = useRef(null);
  const readout = useRef(null), rdT = useRef(null), h1 = useRef(null), foot = useRef(null), actions = useRef(null);
  const flyers = useRef([]);
  const intro = useRef({ t0: performance.now(), done: !E.moving || scrollY > 8 });
  const room = useRef(null);

  // The wall and the shared elements other chapters draw from.
  useEffect(() => {
    E.initWall();
    E.dom.heroStage = stage.current; E.dom.heroCanvas = canvas.current; E.dom.flyers = flyers.current.filter(Boolean);
  }, [E]);

  // The entrance, and how anything a person does ends it.
  useEffect(() => {
    const I = intro.current;
    const skip = () => {
      if (I.done) return; I.done = true;
      root.classList.add('i1', 'i2', 'i3');
      setTimeout(() => root.classList.remove('intro', 'i1', 'i2', 'i3'), 50);
      E.dirtyAll(); E.wake();
    };
    E.skipIntro = skip;
    if (!I.done) root.classList.add('intro');
    const evs = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    for (const ev of evs) addEventListener(ev, skip, { once: true, passive: true });
    return () => { for (const ev of evs) removeEventListener(ev, skip); };
  }, [E, root]);

  // The band takes the room the words leave: between the headline and the foot, less the readout.
  const measure = () => {
    if (!h1.current || !foot.current || !readout.current) return;
    const H = stage.current.clientHeight, top = h1.current.offsetTop + h1.current.offsetHeight, bottom = foot.current.offsetTop, rh = readout.current.offsetHeight;
    const a = E.small ? top + rh + 30 : top + 30, b = E.small ? bottom - 18 : bottom - rh - 36;
    const bh = clamp(b - a, 80, H * 0.34);
    room.current = { c: (a + b) / 2 / H, h: bh / H };
  };
  useEffect(() => {
    addEventListener('resize', measure);
    document.fonts?.ready.then(() => { measure(); E.dirtyAll(); E.wake(); });
    return () => removeEventListener('resize', measure);
  }, [E]); // eslint-disable-line react-hooks/exhaustive-deps

  const introT = (now) => (intro.current.done ? 99 : (now - intro.current.t0) / 1000);
  useScene(section, (p, now) => {
    const { c, w, h } = canvasBox(canvas.current);
    const I = intro.current;
    if (!room.current) measure();
    const restC = room.current ? room.current.c : 0.53, restH = room.current ? room.current.h : 0.3;
    const T = introT(now), px = (E.small ? 0.16 : 0.22) * w, x0 = cssNum('--gut', 24);
    if (!I.done) {
      root.classList.toggle('i1', T >= IN.h1a); root.classList.toggle('i2', T >= IN.h1b); root.classList.toggle('i3', T >= IN.foot);
      if (T >= IN.end) { I.done = true; setTimeout(() => root.classList.remove('intro', 'i1', 'i2', 'i3'), 700); }
    }
    const sweep = smooth((T - IN.dot) / (IN.sweep - IN.dot)), rec = T < IN.color;
    const open = E.moving ? smooth((p - 0.1) / 0.5) : 0;
    // The looks inside play the track from startAt, so the playhead stops there and runs on with the page.
    const t = rec ? TRACK.startAt * sweep : TRACK.startAt + E.pageAt() * (TRACK.duration - TRACK.startAt);
    const x = rec ? lerp(x0, px, sweep) : px;
    const cy = bars(E, c, w, h, {
      t, x, cy: restC * h, bh: restH * h, open, rec,
      known: clamp((T - IN.sweep) / (IN.known - IN.sweep)), color: rec ? clamp((T - IN.known) / (IN.color - IN.known)) : 1,
      dot: T < IN.sweep ? ease(T / 0.28) * (0.75 + 0.25 * Math.cos(clamp((T - 0.28) / 0.14) * Math.PI * 2)) * (1 - smooth((T - IN.dot) / 0.5)) : 0,
      grow: T < IN.dot ? 0 : smooth((T - IN.dot) / 0.35),
      dim: 0.4 * (1 - open), live: E.soundOn, row: E.small ? [0.13 / 8, 0.865 / 8] : [0.13 / 4, 0.865 / 4], cx: 0.5, caps: 1,
      holes: E.flyState.f > 0 && E.flyState.f < 1 ? 1 : 0,
    });
    // The readout rides on top of the playhead: the time it has reached, then what was measured.
    const rd = readout.current;
    rd.style.setProperty('--rx', x.toFixed(1) + 'px');
    rd.style.setProperty('--ry-a', (cy - (restH * h) / 2 - 18).toFixed(1) + 'px');
    rd.style.setProperty('--ry-b', (cy + (restH * h) / 2 + 14).toFixed(1) + 'px');
    rdT.current.textContent = mmss(t);
  }, () => introT(performance.now()) < IN.end + 0.1 || E.wallPlaying());
  useWallNeed(section, 'hero');

  // The header's own Buy steps back while this screen's is in view, so one action is offered at a time.
  useSeen(actions, (on) => root.classList.toggle('hero-cta', on && E.moving));

  return (
    <section className="ch ch-hero scene" id={sid} data-ch={sid} aria-labelledby="h1" ref={section}>
      <div className="stage" ref={stage}>
        <div className="band">
          <canvas className="band-c" ref={canvas} role="img" aria-label={hero.canvasAria} />
        </div>
        <div className="readout" ref={readout}>
          <span className="rd-t" ref={rdT} aria-hidden="true">0:00</span>
          <span className="rd-f">{hero.readout.map((r) => <span key={r}>{r}</span>)}</span>
          {W.video && (
            <button type="button" className="hero-sound" aria-pressed={soundOn} onClick={() => E.setSound(!soundOn)}>
              <span className="on">{hero.soundOn}</span><span className="off">{hero.soundOff}</span>
            </button>
          )}
        </div>
        <div className="hero-copy">
          <h1 id="h1" ref={h1}>
            {hero.lines.map((l, i) => <Fragment key={i}>{i > 0 && ' '}<span className="ln"><span>{l}</span></span></Fragment>)}
          </h1>
          <div className="hero-foot" ref={foot}>
            <p className="lead">{hero.lead}</p>
            <div className="actions" ref={actions}>
              <BuyLink>{hero.buy}{brand.commerce && <> <span className="price"><Amount /></span></>}</BuyLink>
              <a className="btn ghost" href={hero.tryHref || '#try'}>{hero.try}</a>
            </div>
            <p className="pc-note">{hero.pcNote}</p>
          </div>
        </div>
        <p className="wall-note">{hero.wallNote}</p>
        {E.moving && FLY.map((id, i) => <canvas key={id} className="flyer" aria-hidden="true" ref={(el) => { flyers.current[i] = el; }} />)}
      </div>
    </section>
  );
}
