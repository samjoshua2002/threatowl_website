// 3. The map prints as you scroll: a scan sheet drawn live by the signal generator, with its own readout of how much
// is mapped. At 100 % the finished report comes down over it behind a red line, then settles as a sheet of its own.
// Then the eleven views drift past as the paper goes by.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEngine, useScene } from '../EngineContext.jsx';
import { clamp, smooth } from '../motion.js';
import { useContent, useSectionId } from '../content.jsx';
import { drawSheet, sheetUrl } from '../signals/signals.js';
import { PENS } from '../signals/catalog.js';

const PRINT = { style: 'polygraph', seed: 3, theme: 'paper', title: 'Exposure scan', code: 1, sensor: 'Polygraph' };
const W = 1080, H = 1350;

// Images drawn once the fonts are in (the sheets use the page's typefaces).
function useSheetUrls(make) {
  const [urls, setUrls] = useState(null);
  useEffect(() => {
    let on = true;
    (document.fonts?.ready || Promise.resolve()).then(() => { if (on) setUrls(make()); });
    return () => { on = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return urls;
}

export function Sheet() {
  const { sheet } = useContent();
  const sid = useSectionId('sheet');
  const E = useEngine();
  const section = useRef(null), canvas = useRef(null), figure = useRef(null), pct = useRef(null), shown = useRef(-1);
  const poster = useSheetUrls(() => sheetUrl(W, Math.round(W * 1.414), { ...PRINT, style: 'heat', title: 'Exposure report', seed: 9, p: 1 }));

  const draw = (q) => {
    const cv = canvas.current; if (!cv) return;
    const k = Math.round(q * 240) / 240; // 240 printing steps
    if (k === shown.current) return;
    shown.current = k;
    drawSheet(cv.getContext('2d'), 0, 0, W, H, { ...PRINT, p: k });
    pct.current.textContent = String(Math.round(k * 100));
  };
  useEffect(() => { document.fonts?.ready.then(() => { shown.current = -1; draw(E.moving ? 0 : 1); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useScene(section, (p) => {
    const q = E.moving ? clamp((p - 0.04) / 0.74) : 1;
    draw(q);
    if (E.moving) { figure.current.style.setProperty('--r', smooth((p - 0.8) / 0.12).toFixed(4)); figure.current.style.setProperty('--s', smooth((p - 0.93) / 0.06).toFixed(4)); }
  });

  return (
    <section className="ch ch-sheet scene paper" id={sid} data-ch={sid} aria-labelledby="sheet-h" ref={section}>
      <div className="stage">
        <div className="sheet-copy"><h2 id="sheet-h">{sheet.h2}</h2><p>{sheet.p}</p></div>
        <p className="pct" aria-hidden="true"><span className="pct-n" ref={pct}>0</span><span className="pct-u">%</span><span className="pct-l">{sheet.pctLabel}</span></p>
        <figure className="print" ref={figure}>
          <canvas className="print-c" ref={canvas} width={W} height={H} role="img" aria-label={sheet.aria} />
          <i className="trim l" aria-hidden="true" /><i className="trim r" aria-hidden="true" />
          <div className="poster">{poster && <img src={poster} width={W} height={Math.round(W * 1.414)} alt={sheet.posterAlt} decoding="async" />}</div>
          <i className="wipe" aria-hidden="true" />
        </figure>
        <p className="poster-cap"><b>{sheet.capTitle}</b> {sheet.capText}</p>
      </div>
    </section>
  );
}

export function Pens() {
  const { pens } = useContent();
  const E = useEngine();
  const section = useRef(null), track = useRef(null), row = useRef(null), travel = useRef(0);
  const urls = useSheetUrls(() => PENS.map((v) => sheetUrl(720, 720, { style: v.style, seed: v.seed, theme: 'paper', title: v.name, code: v.code, sensor: v.style, p: 1 })));
  const items = useMemo(() => PENS.map((v, i) => ({ ...v, ...(pens.items?.[i] ? { name: pens.items[i].name, sub: pens.items[i].sub } : {}) })), [pens]);
  useEffect(() => {
    const measure = () => {
      const tr = track.current;
      travel.current = Math.max(0, row.current.scrollWidth - tr.clientWidth + 2 * parseFloat(getComputedStyle(tr).paddingLeft || 0));
    };
    measure(); addEventListener('resize', measure);
    return () => removeEventListener('resize', measure);
  }, [urls]);
  useScene(section, (p) => { if (E.moving) row.current.style.setProperty('--d', (smooth((p - 0.18) / 0.62) * travel.current).toFixed(1)); });

  return (
    <section className="ch-pens paper" aria-labelledby="pens-h" ref={section}>
      <div className="pens-copy"><h3 id="pens-h">{pens.h3}</h3><p>{pens.p}</p></div>
      <div className="pens-track" ref={track}>
        <ul className="pens" ref={row}>
          {items.map((it, i) => (
            <li key={it.id}>{urls ? <img src={urls[i]} alt="" width="1080" height="1080" decoding="async" /> : <img alt="" width="1080" height="1080" />}<b>{it.name}</b><span>{it.sub}</span></li>
          ))}
        </ul>
      </div>
    </section>
  );
}
