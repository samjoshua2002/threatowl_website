# Editing the site

| To change | Edit |
|---|---|
| Words (headings, paragraphs, FAQ, signal names, scanner wording) | `src/content/landing.en.json` |
| Name, wordmark, colours, fonts, email, phone | `src/brand/brand.config.js` |
| The owl logo | `src/brand/owl.jsx` (also `public/favicon.svg`) |
| Which graphic appears in the hero wall, the 11 views, the signals | `src/landing/signals/catalog.js` |
| How a graphic looks (20 sheet styles, the 4 risk pictures) | `src/landing/signals/signals.js` |
| The four "How it works" boards (numbers, rows, labels) | `src/landing/signals/boards.js` |
| The risks frame, tour regions, AI Defender window | `brand.media` in `src/brand/brand.config.js` |
| Scanner checks, verdicts and wording | `src/lib/scanner.js` |
| Share image | `public/media/og.jpg` |

The numbers shown in the graphics (312 assets, 4,812 findings…) are illustrative; replace them with real figures when you have them.

Deploying: `npm run build` produces a static site in `dist/`. For the scanner's web checks, deploy `api/scan.js` as a serverless function at `/api/scan` (Vercel and Netlify both run it as is); without it, those checks report "Not enough data".
