// The landing page: one track played from top to bottom, scroll is the playhead.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import landCss from '../styles/land.css?inline';
import scanCss from '../styles/scanner.css?inline';
import brandCss from '../styles/brand.css?inline';
import PageStyle from '../components/PageStyle.jsx';
import { brand, landingVars } from '../brand/brand.config.js';
import en from '../content/landing.en.json';
import { CurrencyProvider } from '../lib/currency.jsx';
import { shouldLeaveRoot } from '../lib/place.js';
import { store } from '../lib/store.js';
import { useMedia } from '../lib/useMedia.js';
import { EngineProvider, useKeepAlive } from './EngineContext.jsx';
import { ContentProvider, useContent } from './content.jsx';
import { Bar, Footer, OtherLang, Transport } from './sections/Chrome.jsx';
import Hero from './sections/Hero.jsx';
import Hear from './sections/Hear.jsx';
import { Pens, Sheet } from './sections/Sheet.jsx';
import Looks, { useAllLooks } from './sections/Looks.jsx';
import Out from './sections/Out.jsx';
import Scanner from './sections/Scanner.jsx';
import { AppTour, Listen } from './sections/AppTour.jsx';
import { End, Faq, Price, Privacy } from './sections/Closing.jsx';

const CONTENT = { en };
const CSS = [landCss, scanCss, brandCss].join('\n');
const VARS = landingVars();

function Page() {
  const all = useAllLooks();
  const { looks, skip } = useContent();
  const [lookId, setLook] = useState(looks.initial);
  const look = all.find((l) => l.id === lookId) || all[0];
  const footRef = useRef(null);
  useKeepAlive(footRef);
  return (
    <>
      <a className="skip" href="#main">{skip}</a>
      <OtherLang />
      <Bar />
      <Transport />
      <main id="main">
        <Hero />
        <Hear />
        <Sheet />
        <Pens />
        <Looks look={look} onPick={setLook} />
        <Out />
        <Scanner />
        <AppTour />
        <Listen />
        <Privacy />
        <Price />
        <Faq />
        <End />
      </main>
      <Footer footRef={footRef} />
    </>
  );
}

function Head({ c }) {
  const url = (p) => `https://${brand.domain}${p}`;
  return (
    <>
      <title>{c.meta.title}</title>
      <meta name="description" content={c.meta.description} />
      <link rel="canonical" href={url(brand.i18n.routes[c.lang])} />
      {brand.i18n.languages.map((l) => <link key={l} rel="alternate" hrefLang={l} href={url(brand.i18n.routes[l])} />)}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={c.meta.title} />
      <meta property="og:description" content={c.meta.description} />
      <meta property="og:url" content={url(brand.i18n.routes[c.lang])} />
      <meta property="og:image" content={url(brand.media.og)} />
      <meta property="og:locale" content={c.meta.ogLocale} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="theme-color" content={brand.colors.night} />
      {c.meta.ld.map((d, i) => <script key={i} type="application/ld+json">{JSON.stringify(d)}</script>)}
    </>
  );
}

export default function Landing({ lang }) {
  const c = CONTENT[lang] || en;
  const small = useMedia('(max-width: 767px)'), calm = useMedia('(prefers-reduced-motion: reduce)');
  const navigate = useNavigate();

  // The root page sends visitors outside Russia/CIS (who have not chosen a language) to the English page.
  useEffect(() => {
    if (lang === brand.i18n.languages[0] && brand.i18n.languages.length > 1 && brand.i18n.redirectFromRoot && shouldLeaveRoot(store.get('lang'))) {
      navigate(brand.i18n.routes.en + location.search + location.hash, { replace: true });
    }
  }, [lang, navigate]);
  useEffect(() => { document.documentElement.lang = c.lang; }, [c.lang]);

  return (
    <ContentProvider value={c}>
      <PageStyle id="landing" css={CSS} vars={VARS} />
      <Head c={c} />
      <CurrencyProvider fallback={c.defaultCurrency}>
        {/* A new layout (phone/computer) or motion preference starts a fresh engine, as the reference reloaded. */}
        <EngineProvider key={`${lang}-${small}-${calm}`} small={small} calm={calm}>
          <Page />
        </EngineProvider>
      </CurrencyProvider>
    </ContentProvider>
  );
}
