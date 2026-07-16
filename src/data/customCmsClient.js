const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "");
const timeoutMs = Number(import.meta.env.VITE_API_TIMEOUT || 15000);
const bootstrapCache = new Map();

export async function cmsRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      cache: options.cache || "no-cache",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `CMS request failed (${response.status})`);
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getCmsBootstrap(
  language = "en",
  { refresh = false, previewToken = "" } = {}
) {
  const lang = language === "hi" ? "hi" : "en";
  const cacheKey = previewToken ? `${lang}:preview:${previewToken}` : lang;
  if (!refresh && bootstrapCache.has(cacheKey)) return bootstrapCache.get(cacheKey);
  const path = previewToken
    ? `/api/content/preview/${encodeURIComponent(previewToken)}?lang=${lang}`
    : `/api/content/bootstrap?lang=${lang}`;
  const request = cmsRequest(path, { cache: previewToken ? "no-store" : "no-cache" })
    .then((payload) => payload.data)
    .catch((error) => {
      bootstrapCache.delete(cacheKey);
      throw error;
    });
  bootstrapCache.set(cacheKey, request);
  return request;
}

export async function getCmsVersion() {
  return (await cmsRequest("/api/content/version", { cache: "no-store" })).version || "";
}

export function clearCmsCache() {
  bootstrapCache.clear();
}

export { apiBaseUrl };
