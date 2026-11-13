import { useInsertionEffect } from 'react';

// The landing (land.css) and the shop pages (site.css) are two different stylesheets that both style <body>, so each
// page mounts its own sheet while it is shown and removes it when it leaves. `vars` are brand overrides written after
// the sheet on :root (see brand.config.js), so rebranding colours never means editing the stylesheet.
export default function PageStyle({ id, css, vars, htmlAttrs }) {
  useInsertionEffect(() => {
    const el = document.createElement('style');
    el.dataset.page = id;
    const over = vars ? `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}` : '';
    el.textContent = css + '\n' + over;
    document.head.append(el);
    const html = document.documentElement, set = Object.entries(htmlAttrs || {});
    for (const [k, v] of set) html.setAttribute(k, v);
    return () => { el.remove(); for (const [k] of set) html.removeAttribute(k); };
  }, [id, css, vars, htmlAttrs]);
  return null;
}
