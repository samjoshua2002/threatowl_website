import { brand } from '../brand/brand.config.js';

// localStorage that never throws (private windows, blocked storage), namespaced by the brand.
const key = (k) => `${brand.storagePrefix}.${k}`;
export const store = {
  get(k) { try { return localStorage.getItem(key(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(key(k), v); } catch { /* private window */ } },
};
