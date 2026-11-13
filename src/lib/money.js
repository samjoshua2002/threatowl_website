import { brand } from '../brand/brand.config.js';

// Money as people read it in each currency: "4 490 ₽", "€54.90", "$59.90".
export const money = (cur, v) => {
  if (v == null) return '';
  if (cur === 'RUB') return `${Number(v).toLocaleString('ru-RU').replace(/\s/g, ' ')} ₽`;
  return `${cur === 'EUR' ? '€' : '$'}${Number(v).toFixed(2)}`;
};
export const priceOf = (plan, cur, prices = brand.prices) => prices[plan]?.[cur];
export const wasOf = (plan, cur, prices = brand.prices) => prices.was?.[plan]?.[cur];
export const onSale = (cur, prices = brand.prices) => Object.values(prices.was || {}).some((w) => w[cur] != null);
export const isCurrency = (c) => brand.currencies.includes(c);
