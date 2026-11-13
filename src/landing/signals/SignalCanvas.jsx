// A live scan sheet: scrolls while it is on screen and the page is not paused.
import { useEffect, useRef } from 'react';
import { useEngine, useEngineState } from '../EngineContext.jsx';
import { drawSheet } from './signals.js';

export default function SignalCanvas({ sheet, className, label }) {
  const E = useEngine(), { still } = useEngineState();
  const ref = useRef(null), st = useRef({ t: 0, seen: false, raf: 0, last: 0 });
  const sheetRef = useRef(sheet); sheetRef.current = sheet;

  useEffect(() => {
    const cv = ref.current, S = st.current;
    const paint = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      if (!r.width) return;
      const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawSheet(c, 0, 0, r.width, r.height, { ...sheetRef.current, t: S.t, live: true });
    };
    const loop = (now) => {
      S.raf = 0;
      if (!S.seen || E.still) { paint(); return; }
      S.t += Math.min(0.05, S.last ? (now - S.last) / 1000 : 0.016); S.last = now;
      paint(); S.raf = requestAnimationFrame(loop);
    };
    S.kick = () => { if (!S.raf) { S.last = 0; S.raf = requestAnimationFrame(loop); } };
    const io = new IntersectionObserver(([e]) => { S.seen = e.isIntersecting; S.kick(); }, { rootMargin: '100px 0px' });
    io.observe(cv);
    const ro = new ResizeObserver(() => S.kick()); ro.observe(cv);
    document.fonts?.ready.then(() => S.kick());
    return () => { io.disconnect(); ro.disconnect(); cancelAnimationFrame(S.raf); S.raf = 0; };
  }, [E]);
  useEffect(() => { st.current.kick?.(); }, [sheet, still]);

  return <canvas ref={ref} className={className} role="img" aria-label={label} />;
}
