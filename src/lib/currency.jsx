import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { isCurrency } from './money.js';
import { place } from './place.js';
import { store } from './store.js';

// The visitor's currency, shared by every price on a page. A choice made with the currency buttons is kept;
// before any choice, the currency of the visitor's place is used without being kept.
const Ctx = createContext(null);

export function initialCurrency(fallback, fromQuery) {
  if (isCurrency(fromQuery)) return fromQuery;
  const kept = store.get('cur');
  if (isCurrency(kept)) return kept;
  const guess = place.currency();
  return isCurrency(guess) ? guess : fallback;
}

export function CurrencyProvider({ fallback = 'USD', fromQuery, children }) {
  const [cur, setCurState] = useState(() => initialCurrency(fallback, fromQuery));
  const setCur = useCallback((c) => { if (!isCurrency(c)) return; setCurState(c); store.set('cur', c); }, []);
  const value = useMemo(() => ({ cur, setCur }), [cur, setCur]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useCurrency = () => useContext(Ctx);
