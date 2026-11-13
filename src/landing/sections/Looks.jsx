// 4. Sixty looks: the one picked plays beside the list and becomes the square of the export frame further down.
// The name lights up at once and the picture shows the look's still at once; the recording itself loads only when the
// pointer rests, so sliding over the list stays smooth.
import { useMemo, useRef } from 'react';
import { useKeepAlive } from '../EngineContext.jsx';
import SignalCanvas from '../signals/SignalCanvas.jsx';
import { lookStyle } from '../signals/catalog.js';
import { Lamp, useContent, useSectionId } from '../content.jsx';

export const useAllLooks = () => {
  const { looks } = useContent();
  return useMemo(() => looks.groups.flatMap((g) => g.items).map((it, i) => ({ ...it, style: it.style || lookStyle(it.id, i), seed: 700 + i * 13, code: i + 1 })), [looks]);
};

export default function Looks({ look, onPick }) {
  const { looks } = useContent();
  const sid = useSectionId('looks');
  const section = useRef(null);
  useKeepAlive(section);
  const fine = useMemo(() => matchMedia('(hover: hover) and (pointer: fine)').matches, []);
  const sheet = { style: look.style, seed: look.seed, theme: 'paper', title: look.label, code: look.code, sensor: look.style };

  return (
    <section className="ch ch-looks" id={sid} data-ch={sid} aria-labelledby="looks-h" ref={section}>
      <div className="looks-intro">
        <p className="sixty" aria-hidden="true">{looks.big}</p>
        <h2 id="looks-h">{looks.h2}</h2>
        <p className="looks-p">{looks.p}</p>
      </div>
      <div className="looks-stage">
        <figure className="preview">
          <div className="pv"><SignalCanvas sheet={sheet} className="pv-c" label={`${look.name}: ${look.sub}`} /></div>
          <figcaption aria-live="polite"><span className="pv-now"><Lamp />{looks.playing}</span><b>{look.name}</b><span className="pv-sub">{look.sub}</span></figcaption>
        </figure>
      </div>
      <div className="index">
        {looks.groups.map((g) => (
          <div className="grp" key={g.name}>
            <h3>{g.name}</h3>
            <ul>
              {g.items.map((it) => (
                <li key={it.id}>
                  <button type="button" data-id={it.id} aria-pressed={it.id === look.id} onClick={() => onPick(it.id)} onPointerEnter={fine ? () => onPick(it.id) : undefined}>{it.label}</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="more">{looks.more}</p>
      </div>
    </section>
  );
}
