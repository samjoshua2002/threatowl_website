import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Engine } from './engine.js';

const Ctx = createContext(null);

// One engine per landing mount. The landing is remounted (new key) when the phone/computer layout or the
// reduced-motion preference changes, which is what the reference did with location.reload().
export function EngineProvider({ small, calm, children }) {
  const [engine] = useState(() => new Engine({ small, calm }));
  useLayoutEffect(() => engine.start(), [engine]);
  return <Ctx.Provider value={engine}>{children}</Ctx.Provider>;
}
export const useEngine = () => useContext(Ctx);
export const useEngineState = () => { const e = useEngine(); return useSyncExternalStore(e.subscribe, e.getSnapshot); };

// Keeps the latest callback without re-registering.
const useLatest = (fn) => { const r = useRef(fn); r.current = fn; return r; };

// A chapter: draw(p, now, dt) is called with its eased scroll progress whenever it changes while on screen;
// keep() asks for a redraw even when the progress has not changed (a video playing inside it).
export function useScene(ref, draw, keep) {
  const e = useEngine(), d = useLatest(draw), k = useLatest(keep);
  useEffect(() => e.scene(ref.current, (...a) => d.current?.(...a), () => k.current?.()), [e, ref, d, k]);
}
// Work done once per frame before the chapters draw; return true to keep the loop awake.
export function useBefore(fn) {
  const e = useEngine(), f = useLatest(fn);
  useEffect(() => e.addBefore((...a) => f.current(...a)), [e, f]);
}
// Calls on(true/false) as the element enters and leaves the screen.
export function useSeen(ref, on, options) {
  const f = useLatest(on);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([x]) => f.current(x.isIntersecting, x), options);
    io.observe(el);
    return () => io.disconnect();
  }, [ref, f]); // eslint-disable-line react-hooks/exhaustive-deps
}
// The wall recording plays while any of the chapters that show it is on screen.
export function useWallNeed(ref, key) {
  const e = useEngine();
  useSeen(ref, (on) => e.wallNeed(key, on));
  useEffect(() => () => e.wallNeed(key, false), [e, key]);
}
// Chapters that do not move still keep the frame loop awake while seen, so the transport's time stays true.
export function useKeepAlive(ref) { useScene(ref, () => {}); }
