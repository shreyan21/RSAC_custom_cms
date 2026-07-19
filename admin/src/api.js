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

const API_URL = matchLocalBrowserHost(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "");
let csrfToken = "";

export const setCsrfToken = (value) => { csrfToken = value || ""; };

export const api = async (path, options = {}) => {
  const headers = { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) };
  if (csrfToken && !["GET", "HEAD"].includes(options.method || "GET")) headers["X-CSRF-Token"] = csrfToken;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error || `Request failed (${response.status})`), { status: response.status });
  return payload;
};

export const websiteUrl = matchLocalBrowserHost(import.meta.env.VITE_WEBSITE_URL || "http://localhost:5173");

export const mediaPreviewUrl = (value) => {
  const source = String(value || "").trim();
  if (!source || /^(?:https?:|data:|blob:)/i.test(source)) return source;
  const base = source.startsWith("/uploads/") ? API_URL : websiteUrl.replace(/\/+$/, "");
  return `${base}/${source.replace(/^\/+/, "")}`;
};
