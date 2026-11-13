// ONE place for everything brand-specific: name, colours, fonts, contacts, which graphics go where.
// Components read from here and from src/content/landing.en.json; they never hardcode brand values.

export const brand = {
  name: 'Threat Owls',
  wordmark: 'threatowls',     // the lowercase mark in the header; the accent "lamp" dot is drawn after it
  giantMark: 'owls',          // the huge mark at the end of the page
  domain: 'www.threatowls.com',
  storagePrefix: 'to',
  // No shop: every call to action goes here. Set commerce: true (and prices below) to bring back plans and prices.
  commerce: false,
  cta: { href: '#contact', mail: 'mailto:contact@threatowls.com' },       // localStorage keys: `${storagePrefix}.lang`, `${storagePrefix}.cur`
  year: 2026,

  // Colours. These override the CSS custom properties of the landing (land.css) and the shop (site.css) at runtime,
  // and feed the canvas drawings (the bars, the playhead, the dot), which cannot read CSS.
  colors: {
    night: '#070909',          // landing ground
    night2: '#171714',
    inkOnNight: '#ECE8DC',     // text on night
    muteOnNight: '#9E9B90',
    paper: '#EBE8DF',          // Sheet chapter / prints ground
    ink: '#15140F',            // text on paper
    mutePaper: '#5E5A51',
    accent: '#FF5309',         // the recording light: playhead, buttons, the price chapter
    accentHover: '#FF7A3D',
    barEmpty: '#2A2924',       // bars before the media has loaded
    barTip: '236, 232, 220',   // r, g, b of the bars' white tips
    dimNight: '7, 9, 9',    // r, g, b of the shade over the part of the track not played yet
  },

  // Typefaces, as declared by @font-face in src/styles/fonts.css (files in public/fonts).
  fonts: {
    display: '"Roboto Flex", "Segoe UI", -apple-system, sans-serif',
    text: '"Golos Text", "Segoe UI", -apple-system, sans-serif',
    mono: '"Owl Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },

  contact: {
    email: 'contact@threatowls.com',
    phone: '+91 9445441023',
    website: 'https://www.threatowls.com',
  },

  i18n: {
    languages: ['en'],
    // The landing route of each language. The first one is "/" and is the default.
    routes: { en: '/' },
    // With two languages, visitors outside Russia/CIS can be sent from "/" to the English route (time zone only).
    redirectFromRoot: false,
  },

  // Prices per plan and currency; `was` = struck-through list price while on sale (omit a currency to show no sale).
  currencies: ['RUB', 'EUR', 'USD'],
  prices: {
    life: { USD: 59.9, EUR: 54.9, RUB: 4490 },
    month: { USD: 17.9, EUR: 16.9, RUB: 1490 },
    was: { life: { USD: 69.9, EUR: 64.9 }, month: { USD: 21.9, EUR: 20.9 } },
  },

  // Media. Every picture on the page is drawn by src/landing/signals (no image files except the share image).
  media: {
    og: '/media/og.jpg',
    // No wall recording and no soundtrack: the wall is a live canvas (signals/catalog.js WALL). Give a video here to
    // bring back a recorded wall and the Sound buttons.
    wall: { video: null },
    // The "risks" frame: one drawn graphic per risk (signals.js styles), in this order; the frame morphs between
    // their shapes.
    out: [
      { sheet: { style: 'inject', title: 'Poisoned email', sensor: 'Prompt injection', seed: 11 }, w: 1080, h: 1080 },
      { sheet: { style: 'perm', title: 'Over-powered assistant', sensor: 'Permissions', seed: 12 }, w: 1080, h: 1350 },
      { sheet: { style: 'loop', title: 'Runaway loop', sensor: 'Rate', seed: 13 }, w: 1600, h: 1000 },
      { sheet: { style: 'shadow', title: 'Tool nobody approved', sensor: 'Shadow AI', seed: 14 }, w: 1600, h: 900 },
    ],
    // "How it works": one drawn board per step (signals/boards.js: Discover, Prioritize, Protect, Prove), 1240×800,
    // and the region the camera frames at each step: [board, [x0, y0, x1, y1] as fractions].
    app: [{ board: 0 }, { board: 1 }, { board: 2 }, { board: 3 }],
    appRegions: [[0, [0, 0, 1, 1]], [1, [0, 0, 1, 1]], [2, [0, 0, 1, 1]], [3, [0, 0, 1, 1]]],
    appRegionsSmall: [[0, [0, 0.12, 0.62, 0.9]], [1, [0.44, 0.12, 1, 0.88]], [2, [0, 0.12, 0.62, 0.88]], [3, [0, 0.12, 0.7, 0.92]]],
    // The AI Defender window: a live sheet that floats and parks in the corner.
    listen: { sheet: { style: 'polygraph', title: 'AI Defender · live', sensor: 'Agents', seed: 31 }, w: 1800, h: 1161 },
  },
};

// Brand colours → CSS custom properties, applied over the stylesheets (see components/BrandStyle.jsx).
export const landingVars = (c = brand.colors, f = brand.fonts) => ({
  '--night': c.night, '--night-2': c.night2, '--ink-n': c.inkOnNight, '--mute-n': c.muteOnNight,
  '--paper': c.paper, '--ink': c.ink, '--mute-p': c.mutePaper, '--red': c.accent, '--red-hover': c.accentHover,
  '--display': f.display, '--text': f.text, '--mono': f.mono,
});
// The shop pages (buy, renew, order, legal) keep their own light/dark palette in src/styles/site.css :root.
