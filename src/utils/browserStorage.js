// Browser preferences and caches are optional. Privacy settings and full
// storage must never prevent the website from rendering or responding.
export const readBrowserStorage = (storage, key, fallback = null) => {
  try { return window[storage].getItem(key) ?? fallback; }
  catch { return fallback; }
};

export const writeBrowserStorage = (storage, key, value) => {
  try { window[storage].setItem(key, value); return true; }
  catch { return false; }
};

export const removeBrowserStorage = (storage, key) => {
  try { window[storage].removeItem(key); return true; }
  catch { return false; }
};
