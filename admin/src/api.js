const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const matchLocalBrowserHost = (value) => {
  const source = String(value || "");
  if (typeof window === "undefined" || !localHosts.has(window.location.hostname)) return source;
  try {
    const url = new URL(source);
    if (localHosts.has(url.hostname)) url.hostname = window.location.hostname;
    return url.toString().replace(/\/$/, "");
  } catch {
    return source;
  }
};

const productionUrl = (value, fallbackPath = "") => {
  const source = String(value || "");
  if (!import.meta.env.PROD || typeof window === "undefined") return source;
  try {
    if (localHosts.has(new URL(source).hostname)) {
      return `${window.location.origin}${fallbackPath}`;
    }
  } catch {
    return `${window.location.origin}${fallbackPath}`;
  }
  return source;
};

const localWebsiteUrl = () => {
  const target = new URL(window.location.origin);
  target.port = "5173";
  target.pathname = "/";
  target.search = "";
  target.hash = "";
  return target.toString().replace(/\/$/, "");
};

const resolveWebsiteUrl = () => {
  const configured = String(import.meta.env.VITE_WEBSITE_URL || "").trim();
  if (typeof window === "undefined") return configured || "http://localhost:5173";

  // The production CMS is mounted below /cms/ by Express, while the public
  // website is served from the same origin root.
  if (/^\/cms(?:\/|$)/i.test(window.location.pathname)) return window.location.origin;

  const fallback = import.meta.env.DEV || window.location.port === "5174"
    ? localWebsiteUrl()
    : window.location.origin;
  if (!configured) return fallback;

  try {
    const target = new URL(configured, window.location.origin);
    if (localHosts.has(target.hostname) && localHosts.has(window.location.hostname)) {
      target.hostname = window.location.hostname;
      // A standalone CMS preview commonly runs its production build on 5174.
      // It must still open the public Vite website on 5173.
      if (window.location.port === "5174" && target.port === "5174") target.port = "5173";
    }
    return target.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
};

const API_URL = matchLocalBrowserHost(productionUrl(
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3000" : window.location.origin)
));
const resolvedApiUrl = (() => {
  try {
    const configured = new URL(API_URL);
    if (localHosts.has(configured.hostname) && localHosts.has(window.location.hostname)) {
      return window.location.origin;
    }
  } catch {
    return API_URL;
  }
  return API_URL;
})();
const apiBaseUrl = resolvedApiUrl.replace(/\/+$/, "");
let csrfToken = "";

export const setCsrfToken = (value) => { csrfToken = value || ""; };

export const api = async (path, options = {}) => {
  const headers = { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) };
  if (csrfToken && !["GET", "HEAD"].includes(options.method || "GET")) headers["X-CSRF-Token"] = csrfToken;
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers, credentials: "include" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error || `Request failed (${response.status})`), { status: response.status });
  return payload;
};

export const websiteUrl = resolveWebsiteUrl();

export const mediaPreviewUrl = (value) => {
  const source = String(value || "").trim();
  if (!source || /^(?:https?:|data:|blob:)/i.test(source)) return source;
  const base = source.startsWith("/uploads/") ? apiBaseUrl : websiteUrl.replace(/\/+$/, "");
  return `${base}/${source.replace(/^\/+/, "")}`;
};
