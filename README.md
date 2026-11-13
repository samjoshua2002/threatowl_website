# threatowl_website

The Threat Owls landing page (React 19 + Vite): a scroll-driven page where scrolling plays a scan, with live drawn
graphics instead of images, and a free passive site scanner.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Live site scanner (`#try`)

- DNS checks (SPF, DMARC, MTA-STS, DNSSEC, CAA) run in the browser via Cloudflare DNS-over-HTTPS.
- Web checks (HTTPS, redirect, security headers, version leaks, cookies, security.txt, AI crawler rules, llms.txt) run
  in `server/scan.js`: as Vite middleware in dev/preview, and as `api/scan.js` (a serverless function) in production.
  Private and internal addresses are refused, redirects included.
- Without the API (plain static hosting), web checks show **Not enough data**.

## Layout

```
src/
  brand/brand.config.js   every brand value: name, colours, fonts, contacts, which graphic goes where
  brand/owl.jsx           the owl logo (SVG and canvas)
  brand/track.js          the scan envelope the page plays
  content/landing.en.json all copy
  landing/
    engine.js             frame loop, scroll progress, the live wall, pause
    EngineContext.jsx     hooks: useScene, useBefore, useSeen, useWallNeed
    sections/*.jsx        one component per chapter
    signals/              every picture on the page, drawn in code
      signals.js            scan sheets (20 styles)
      boards.js             the four "How it works" boards
      catalog.js            which sheet goes where
      SignalCanvas.jsx      a live, animated sheet
  lib/scanner.js          the site scanner's checks and verdicts
  styles/                 land.css (page), scanner.css, brand.css (overrides)
server/scan.js, api/scan.js  the scanner's server half
```

See [docs/BRAND.md](docs/BRAND.md) for what to edit where.
