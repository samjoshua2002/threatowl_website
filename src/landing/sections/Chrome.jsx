// The page's chrome: the language banner, the header bar, the transport (chapters, time, sound, pause) and the footer.
import { useEffect, useRef, useState } from 'react';
import { brand } from '../../brand/brand.config.js';
import { TRACK } from '../../brand/track.js';
import { speaks } from '../../lib/place.js';
import { store } from '../../lib/store.js';
import { useBefore, useEngine, useEngineState } from '../EngineContext.jsx';
import { clamp, mmss } from '../motion.js';
import { BuyLink, Lamp, Mark, useContent } from '../content.jsx';

const route = (l) => brand.i18n.routes[l];

export function OtherLang() {
  const { lang, otherLang } = useContent();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!otherLang || store.get('lang')) return;
    const s = speaks();
    setShown(!!s[0] && s[0] !== lang && (otherLang.for === 'en' ? s[0] !== 'ru' : s.includes('ru')));
  }, [lang, otherLang]);
  if (!otherLang) return null;
  return (
    <div className="other-lang" data-for={otherLang.for} hidden={!shown}>
      <span>{otherLang.text}</span>
      <a href={route(otherLang.for)} hrefLang={otherLang.for} onClick={() => store.set('lang', otherLang.for)}>{otherLang.link}</a>
      <button type="button" aria-label={otherLang.close} onClick={() => { setShown(false); store.set('lang', lang); }} />
    </div>
  );
}

export function Bar() {
  const { lang, header } = useContent();
  return (
    <header className="bar">
      <Mark href={route(lang)} />
      {brand.i18n.languages.length > 1 && <span className="lang">
        {brand.i18n.languages.map((l) => (
          <a key={l} href={route(l)} hrefLang={l} aria-current={l === lang ? 'page' : undefined} onClick={() => store.set('lang', l)}>{l.toUpperCase()}</a>
        ))}
      </span>}
      <BuyLink className="btn small">{header.buy}</BuyLink>
    </header>
  );
}

const Wave = () => (
  <svg viewBox="0 0 200 24" preserveAspectRatio="none" focusable="false"><path d={TRACK.miniPath} /></svg>
);

export function Transport() {
  const { transport: T } = useContent();
  const E = useEngine(), { still, soundOn } = useEngineState();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(T.chapters[0].id);
  const listRef = useRef(null), btnRef = useRef(null), tNow = useRef(null), miniRef = useRef(null);

  // The chapter in the middle of the screen names itself in the transport.
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setCurrent(e.target.dataset.ch);
    }, { rootMargin: '-50% 0px -49% 0px' });
    document.querySelectorAll('[data-ch]').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!open) return;
    (listRef.current.querySelector('[aria-current="true"]') || listRef.current.querySelector('a'))?.focus();
    const key = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current.focus(); } };
    const down = (e) => { if (!e.target.closest('.tp-chap')) setOpen(false); };
    addEventListener('keydown', key); addEventListener('pointerdown', down);
    return () => { removeEventListener('keydown', key); removeEventListener('pointerdown', down); };
  }, [open]);

  // The track's time follows the page: the start of the looks at the top, the end of the track at the bottom.
  const shown = useRef(-1);
  useBefore(() => {
    const s = Math.floor(TRACK.startAt + E.pageAt() * (TRACK.duration - TRACK.startAt));
    if (s !== shown.current && tNow.current) { shown.current = s; tNow.current.textContent = mmss(s); }
    return false;
  });
  // The small waveform is a playhead you can put down anywhere.
  const seek = (e) => {
    const r = miniRef.current.getBoundingClientRect();
    scrollTo({ top: clamp((e.clientX - r.left) / r.width) * (document.documentElement.scrollHeight - innerHeight), behavior: E.calm ? 'auto' : 'smooth' });
  };
  const label = T.chapters.find((c) => c.id === current)?.label;

  return (
    <nav className="transport" aria-label={T.aria}>
      <div className="tp-chap">
        <button type="button" className="tp-now" ref={btnRef} aria-expanded={open} aria-controls="chap-list" onClick={() => setOpen(!open)}>
          <Lamp className="rec" /><span className="now">{label}</span><span className="vh">{T.chaptersVh}</span>
        </button>
        <ol className="chap" id="chap-list" ref={listRef} hidden={!open} onClick={(e) => { if (e.target.closest('a')) setOpen(false); }}>
          {T.chapters.map((c) => <li key={c.id}><a href={`#${c.id}`} data-go={c.id} aria-current={String(c.id === current)}>{c.label}</a></li>)}
        </ol>
      </div>
      <span className="mini" aria-hidden="true" ref={miniRef} onClick={seek}><Wave /><span className="mini-fill"><Wave /></span></span>
      <span className="tp-time" aria-hidden="true"><span className="t-now" ref={tNow}>{mmss(TRACK.startAt)}</span><span className="t-all"> / {T.timeAll}</span></span>
      {brand.media.wall.video && <button type="button" className="tp sound" aria-pressed={soundOn} aria-label={T.soundAria} onClick={() => E.setSound(!soundOn)}>{T.sound}</button>}
      <button type="button" className="tp still" aria-pressed={still} aria-label={T.pauseAria} onClick={() => E.setStill(!still)}>{T.pause}</button>
    </nav>
  );
}

export function Footer({ footRef }) {
  const { footer } = useContent();
  // Footer links point at the shop pages; the language travels as ?lang=en like the reference.
  const href = (h) => h;
  return (
    <footer className="foot" ref={footRef}>
      <nav aria-label={footer.aria}>
        {footer.links.map((l) => {
          const h = href(l.href), label = l.href.startsWith('mailto:') ? brand.contact.email : l.label;
          return <a key={l.href} href={h} rel={h.startsWith('http') ? 'noopener' : undefined}>{label}</a>;
        })}
      </nav>
      <span>{footer.copy || `© ${brand.year} ${brand.name}`}</span>
    </footer>
  );
}
