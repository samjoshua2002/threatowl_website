import { createContext, useContext } from 'react';
import { useCurrency } from '../lib/currency.jsx';
import { money, priceOf, wasOf } from '../lib/money.js';
import { brand } from '../brand/brand.config.js';
import { Owl } from '../brand/owl.jsx';

// The landing's words for the current language (src/content/landing.<lang>.json).
const Ctx = createContext(null);
export const ContentProvider = ({ value, children }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;
export const useContent = () => useContext(Ctx);
// A chapter's anchor id (and transport key), renamable from the content's `ids` map.
export const useSectionId = (key) => useContext(Ctx).ids?.[key] ?? key;

// The red recording light: the only circle on the page.
export const Lamp = ({ className = '' }) => <i className={`lamp ${className}`.trim()} aria-hidden={className.includes('rec') || undefined} />;
export const Mark = ({ href, className = 'mark' }) => (
  <a className={className} href={href} aria-label={brand.name} translate="no"><Owl className="mark-owl" />{brand.wordmark}<Lamp /></a>
);

// The price in the visitor's currency.
export const Amount = ({ plan = 'life' }) => { const { cur } = useCurrency(); if (!brand.commerce) return null; return <span className="amount-v">{money(cur, priceOf(plan, cur))}</span>; };
export const Was = ({ plan, label }) => {
  const { cur } = useCurrency(), v = wasOf(plan, cur);
  return <span className="was" hidden={!v}><span className="vh">{label} </span><s className="was-v">{v ? money(cur, v) : ''}</s></span>;
};
export function useBuyHref(plan) {
  const { cur } = useCurrency(), { lang } = useContent();
  if (!brand.commerce) return brand.cta.href;
  return `/buy?plan=${plan}&cur=${cur}${lang === 'en' ? '&lang=en' : ''}`;
}
export const BuyLink = ({ plan = 'life', className = 'btn', children }) => (
  <a className={`${className} buy-link`} data-plan={plan} href={useBuyHref(plan)}>{children}</a>
);
// Links in the copy that carry their own markup (a link inside a sentence): owned, static brand copy.
export const Html = ({ as: T = 'p', html, ...rest }) => <T {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
