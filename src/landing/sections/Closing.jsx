// Privacy, Price, Questions and the end of the track.
import { useRef } from 'react';
import { brand } from '../../brand/brand.config.js';
import { TRACK } from '../../brand/track.js';
import { useCurrency } from '../../lib/currency.jsx';
import { onSale } from '../../lib/money.js';
import { useEngine, useKeepAlive, useScene, useWallNeed } from '../EngineContext.jsx';
import { bars, whole } from '../draw.js';
import { canvasBox, lerp, smooth } from '../motion.js';
import { Amount, BuyLink, Html, Lamp, Was, useContent, useSectionId } from '../content.jsx';

const SYM = { RUB: '₽', EUR: '€', USD: '$' };

export function Privacy() {
  const { privacy } = useContent();
  const ref = useRef(null);
  useKeepAlive(ref);
  return (
    <section className="ch-privacy" aria-labelledby="privacy-h" ref={ref}>
      <h2 id="privacy-h" className="privacy-h">{privacy.h2}</h2>
      <p>{privacy.p}</p>
    </section>
  );
}

function Plan({ id, data, btn }) {
  return (
    <article className={`plan ${id}`}>
      <h3>{data.title}{data.note && <> <span>{data.note}</span></>}</h3>
      <p className="amount">{brand.commerce ? <><Was plan={id} label={data.wasLabel} /><Amount plan={id} /></> : <span className="amount-v">{data.amount}</span>}</p>
      <ul>{data.items.map((x) => <li key={x}>{x}</li>)}</ul>
      <BuyLink plan={id} className={`btn ${btn}`}>{data.cta}</BuyLink>
    </article>
  );
}

export function Price() {
  const { price } = useContent();
  const sid = useSectionId('price');
  const { cur, setCur } = useCurrency();
  const ref = useRef(null);
  useKeepAlive(ref);
  // Brand-owned contact handles replace the reference's inside the copy.
  const fix = (html) => html;
  return (
    <section className="ch ch-price signal" id={sid} data-ch={sid} aria-labelledby="price-h" ref={ref}>
      <div className="price-head">
        <h2 id="price-h">{price.h2}</h2>
        <p>{price.p}</p>
        <p className="sale-tag" hidden={brand.commerce ? !onSale(cur) : !price.sale}>{price.sale}</p>
        {brand.commerce && <div className="cur-row">
          <span id="cur-l">{price.currency}</span>
          <div className="seg" role="group" aria-labelledby="cur-l">
            {brand.currencies.map((c) => <button key={c} type="button" data-cur={c} aria-pressed={c === cur} onClick={() => setCur(c)}>{SYM[c]}</button>)}
          </div>
        </div>}
      </div>
      <div className="plans">
        <Plan id="life" data={price.life} btn="ink" />
        <Plan id="month" data={price.month} btn="line" />
      </div>
      {price.pcLine && <p className="pc-line">{price.pcLine}</p>}
      <div className="pay-wrap">
        <h3>{price.payH}</h3>
        <ul className="pay-list">{price.pay.map((x) => <li key={x}>{x}</li>)}</ul>
        {price.noTgHtml && <Html className="no-tg" html={fix(price.noTgHtml)} />}
      </div>
      <div className="steps-wrap">
        <h3>{price.stepsH}</h3>
        <ol className="steps">{price.steps.map((s) => <li key={s.title}><b>{s.title}</b><span>{s.text}</span></li>)}</ol>
        <Html className="after" html={fix(price.afterHtml)} />
      </div>
    </section>
  );
}

export function Faq() {
  const { faq } = useContent();
  const sid = useSectionId('faq');
  const ref = useRef(null);
  useKeepAlive(ref);
  return (
    <section className="ch ch-faq" id={sid} data-ch={sid} aria-labelledby="faq-h" ref={ref}>
      <h2 id="faq-h">{faq.h2}</h2>
      <div className="faq-cols">
        {faq.items.map((x) => <details key={x.q}><summary>{x.q}</summary><p>{x.a}</p></details>)}
      </div>
    </section>
  );
}

// The end of the track: the last bars pass the playhead and the track runs out; the playhead folds into a dot and the
// dot lands as the light of the giant mark.
export function End() {
  const { end } = useContent();
  const sid = useSectionId('end');
  const E = useEngine();
  const section = useRef(null), canvas = useRef(null), giant = useRef(null);
  useScene(section, (p) => {
    const { c, w, h, r } = canvasBox(canvas.current);
    const lamp = giant.current.querySelector('.lamp');
    const px = (E.small ? 0.5 : 0.62) * w;
    const fold = E.moving ? smooth((p - 0.7) / 0.22) : 1, all = E.moving ? smooth((p - 0.55) / 0.3) : 1;
    c.clearRect(0, 0, w, h);
    if (all < 1) {
      c.save(); c.globalAlpha = 1 - all;
      bars(E, c, w, h, { t: TRACK.duration - 12 + p * 16, x: px, cy: h * 0.5, bh: h * 0.9, open: 0, color: 1, dim: 0.4, live: E.soundOn, row: E.small ? [0.25, 0.375] : [0.5, 0.75], cx: 0.42, grow: 1 - fold, dot: 0, caps: 1 });
      c.restore();
    }
    if (all > 0) whole(E, c, w, h, all);
    if (fold > 0) {
      const lr = lamp.getBoundingClientRect(), tx = lr.left + lr.width / 2 - r.left, ty = lr.top + lr.height / 2 - r.top;
      const travel = smooth((fold - 0.3) / 0.7), x = lerp(px, tx, travel), y = lerp(h * 0.5, ty, travel), rad = lerp(4, lr.width / 2, travel);
      if (fold < 1) { c.fillStyle = brand.colors.accent; c.beginPath(); c.arc(x, y, Math.max(1, rad), 0, Math.PI * 2); c.fill(); }
    }
    lamp.classList.toggle('lit', !E.moving || fold >= 1);
  }, () => E.wallPlaying());
  useWallNeed(section, 'end');

  return (
    <section className="ch ch-end scene" id={sid} data-ch={sid} aria-labelledby="end-h" ref={section}>
      <div className="stage">
        <canvas className="end-c" ref={canvas} role="img" aria-label={end.aria} />
        <div className="end-copy">
          <h2 id="end-h">{end.h2}</h2>
          <BuyLink>{end.buy}{brand.commerce && <> <span className="price"><Amount /></span></>}</BuyLink>
        </div>
        <p className="giant" aria-hidden="true" translate="no" ref={giant}>{brand.giantMark || brand.wordmark}<Lamp /></p>
      </div>
    </section>
  );
}
